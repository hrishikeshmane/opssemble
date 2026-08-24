"""Signed GitHub webhook routing and change snapshot bookkeeping."""

import json
import re
from typing import Any, Awaitable, Callable, Mapping, Protocol

from .signing import verify_sha256
from .store import SessionStore


LABEL_TO_SCENARIO = {
    "opssemble:smart-seat-bundles": "smart-seat-bundles-rollout-50",
    "opssemble:flexible-date-search": "flexible-date-search-candidate",
    "opssemble:booking-timeout-retry": "booking-timeout-retry-candidate",
}
REPAIR_MARKER = re.compile(r"^Opssemble-Repair-Task:\s*([A-Za-z0-9._-]+)\s*$", re.MULTILINE)


class Snapshotter(Protocol):
    async def snapshot(self, payload: dict[str, Any]) -> dict[str, Any]: ...


class WebhookError(ValueError):
    def __init__(self, status_code: int, code: str):
        super().__init__(code)
        self.status_code = status_code
        self.code = code


class WebhookService:
    def __init__(self, *, store: SessionStore, repository: str, webhook_secret: str,
                 snapshotter: Snapshotter,
                 on_session: Callable[[str], Awaitable[None]],
                 repair_tracker: Any = None):
        self.store = store
        self.repository = repository
        self.webhook_secret = webhook_secret
        self.snapshotter = snapshotter
        self.on_session = on_session
        self.repair_tracker = repair_tracker

    @staticmethod
    def _header(headers: Mapping[str, str], name: str) -> str | None:
        return {key.lower(): value for key, value in headers.items()}.get(name.lower())

    async def handle(self, headers: Mapping[str, str], body: bytes) -> dict[str, Any]:
        if not verify_sha256(headers, "X-Hub-Signature-256", body, self.webhook_secret):
            raise WebhookError(401, "INVALID_SIGNATURE")
        delivery_id = self._header(headers, "X-GitHub-Delivery")
        if not delivery_id:
            raise WebhookError(400, "MISSING_DELIVERY_ID")
        if delivery_id in self.store.deliveries:
            return self.store.deliveries[delivery_id]
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as error:
            raise WebhookError(400, "INVALID_JSON") from error
        if payload.get("repository", {}).get("full_name") != self.repository:
            raise WebhookError(403, "REPOSITORY_NOT_ALLOWED")
        pull = payload.get("pull_request")
        if not isinstance(pull, dict):
            result = {"accepted": True, "ignored": True}
            self.store.deliveries[delivery_id] = result
            return result
        action = payload.get("action")
        if action not in {"opened", "synchronize", "closed"}:
            result = {"accepted": True, "ignored": True}
            self.store.deliveries[delivery_id] = result
            return result

        head_sha = pull.get("head", {}).get("sha") or ""
        merge_sha = pull.get("merge_commit_sha") or ""
        event_key = (self.repository, int(pull["number"]), action, merge_sha or head_sha)
        if event_key in self.store.change_events:
            result = self.store.change_events[event_key]
            self.store.deliveries[delivery_id] = result
            return result

        snapshot = await self.snapshotter.snapshot(payload)
        approved_labels = [
            label.get("name") for label in pull.get("labels", [])
            if label.get("name") in LABEL_TO_SCENARIO
        ]
        merged = action == "closed" and pull.get("merged") is True and bool(merge_sha)
        if not merged:
            routing_status = "not_merged"
        elif len(approved_labels) == 0:
            routing_status = "unsupported"
        elif len(approved_labels) > 1:
            routing_status = "ambiguous"
        else:
            routing_status = "routed"
        marker = REPAIR_MARKER.search(pull.get("body") or "")
        stored = {
            **snapshot,
            "routingStatus": routing_status,
            "_routingLabel": approved_labels[0] if len(approved_labels) == 1 else None,
            "_scenarioId": LABEL_TO_SCENARIO.get(approved_labels[0]) if len(approved_labels) == 1 else None,
            "_repairTaskId": marker.group(1) if marker else None,
        }
        change_id = snapshot["changeId"]
        self.store.changes[change_id] = stored
        repair_result = None
        if marker and self.repair_tracker is not None:
            routing_status = "repair"
            stored["routingStatus"] = routing_status
            repair_result = await self.repair_tracker.handle_change(stored)
        result: dict[str, Any] = {
            "accepted": True,
            "changeId": change_id,
            "routingStatus": routing_status,
        }
        if repair_result is not None:
            result.update(repair_result)
        elif routing_status == "routed":
            session = self.store.create_session(
                change_id=change_id,
                repository=self.repository,
                pr_number=int(pull["number"]),
                merge_sha=merge_sha,
                scenario_id=stored["_scenarioId"],
            )
            result["sessionId"] = session.id
            await self.on_session(session.id)
        self.store.change_events[event_key] = result
        self.store.deliveries[delivery_id] = result
        return result

    def public_change(self, change_id: str) -> dict[str, Any]:
        return {key: value for key, value in self.store.changes[change_id].items()
                if not key.startswith("_") and key != "labels"}

    def public_changes(self) -> list[dict[str, Any]]:
        return [self.public_change(change_id) for change_id in sorted(self.store.changes)]
