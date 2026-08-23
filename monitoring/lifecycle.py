"""Deployment, real-journey, and signed-trigger gates for merged sessions."""

import asyncio
from dataclasses import dataclass
from hashlib import sha256
import time
from typing import Any, Awaitable, Callable, Protocol

from .store import Session, SessionStore


@dataclass(frozen=True)
class Journey:
    route: str
    request_id: str
    body: dict[str, Any]
    expected_status: int | None = None


class FlightLabClient(Protocol):
    async def get_version(self) -> dict[str, Any]: ...
    async def exercise(self, journey: Journey) -> int: ...


def journey_for(session: Session) -> Journey:
    request_id = f"req-{sha256(session.id.encode()).hexdigest()[:12]}"
    if session.scenario_id.startswith("smart-seat-bundles"):
        return Journey("/api/seat-scores", request_id, {
            "flightId": "FL-204", "preferredBundleId": "extra-legroom",
        })
    if session.scenario_id == "flexible-date-search-candidate":
        return Journey("/api/search/flexible", request_id, {
            "origin": "SFO", "destination": "JFK", "departureDate": "2026-09-04", "days": 7,
        })
    expected = None if session.scenario_id == "booking-timeout-retry-repair-candidate" else 504
    return Journey("/api/book", request_id, {
        "flightId": "FL-204", "travelerName": "Avery Chen",
        "travelerEmail": "avery@example.com",
    }, expected_status=expected)


class LifecycleCoordinator:
    def __init__(self, store: SessionStore, flightlab: FlightLabClient, *,
                 clock: Callable[[], float] = time.time,
                 sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
                 deployment_poll_seconds: float = 2,
                 deployment_timeout_seconds: float = 180,
                 trigger_timeout_seconds: float = 10):
        self.store = store
        self.flightlab = flightlab
        self.clock = clock
        self.sleep = sleep
        self.deployment_poll_seconds = deployment_poll_seconds
        self.deployment_timeout_seconds = deployment_timeout_seconds
        self.trigger_timeout_seconds = trigger_timeout_seconds

    async def run(self, session_id: str) -> None:
        session = self.store.get_session(session_id)
        if session is None or session.state != "merged":
            return
        self.store.transition(session.id, "awaiting_deployment")
        change = self.store.changes.get(session.change_id)
        if change is not None:
            change["deployment"] = {**change.get("deployment", {}), "state": "awaiting_deployment"}
        deadline = self.clock() + self.deployment_timeout_seconds
        matched = False
        last_version: dict[str, Any] | None = None
        while self.clock() < deadline:
            try:
                last_version = await self.flightlab.get_version()
            except Exception:
                last_version = None
            if last_version and last_version.get("service") == "flightlab" \
                    and last_version.get("releaseSha") == session.merge_sha:
                matched = True
                break
            await self.sleep(self.deployment_poll_seconds)
        if not matched:
            if change is not None:
                change["deployment"] = {**change.get("deployment", {}), "state": "failed"}
            self.store.mark_incomplete(session.id, "DEPLOYMENT_TIMEOUT", "matching release SHA was not deployed")
            return

        session.release_sha = session.merge_sha
        if change is not None:
            change["releaseSha"] = session.merge_sha
            change["deployment"] = {
                **change.get("deployment", {}),
                "state": "deployed",
                "releaseSha": session.merge_sha,
            }
        self.store.transition(session.id, "exercising")
        journey = journey_for(session)
        session.route = journey.route
        session.request_id = journey.request_id
        try:
            status = await self.flightlab.exercise(journey)
        except Exception as error:
            self.store.mark_incomplete(session.id, "TRAFFIC_ERROR", str(error))
            return
        if journey.expected_status is not None:
            status_ok = status == journey.expected_status
        else:
            status_ok = 200 <= status < 300
        if not status_ok:
            self.store.mark_incomplete(session.id, "TRAFFIC_STATUS", f"unexpected HTTP status {status}")
            return

        trigger_deadline = self.clock() + self.trigger_timeout_seconds
        while session.pending_trigger is None and self.clock() < trigger_deadline:
            await self.sleep(min(0.25, self.trigger_timeout_seconds))
        trigger = session.pending_trigger
        if trigger is None:
            self.store.mark_incomplete(session.id, "MISSING_TRIGGER", "no matching signed trigger arrived")
            return
        if trigger["statusCode"] != status:
            self.store.mark_incomplete(session.id, "TRIGGER_STATUS_MISMATCH", "trigger and journey statuses differ")
            return
        session.operation_id = trigger["operationId"]
        self.store.start_stream(session.id)
