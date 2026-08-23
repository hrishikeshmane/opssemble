"""In-process offline rehearsal with a small read-only dashboard server."""

from __future__ import annotations

import argparse
import asyncio
from copy import deepcopy
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from typing import Any, Awaitable, Callable
from urllib.parse import urlparse
import webbrowser

from fastmcp import Client

from monitoring.generator import GENERATOR_SEED, check_generated
from monitoring.replay import ReplayService
from monitoring.store import SessionStore
from opssemble_mcp.profiles import ToolServices, create_profiles


SCENARIO_ID = "booking-timeout-retry-candidate"
DEMO_SESSION_ID = "offline-bad-booking-pr"
REPOSITORY_URL = "https://github.com/Prathamesh-Pawar/flylab"
ASSET_ROOT = Path(__file__).parents[1] / "mcp" / "dashboard"
DEFAULT_STEP_DELAY = 1.75

STAGES = (
    {
        "id": "boot", "label": "Initialize session", "detail": "Incident recorder online",
        "headline": "Starting incident session",
        "activity": "Preparing the release and evidence channels.",
        "tool": "session.initialize", "target": "pr-panel",
    },
    {
        "id": "select", "label": "Accept merged release", "detail": "control.set_scenario",
        "headline": "Release merge detected",
        "activity": "Control is opening the booking incident stream.",
        "tool": "control.set_scenario", "target": "pr-panel",
    },
    {
        "id": "context", "label": "Inspect changed code", "detail": "planner.get_change_context",
        "headline": "Reading the merged change",
        "activity": "Planner is retrieving the PR diff, files, and checks.",
        "tool": "planner.get_change_context", "target": "pr-panel",
    },
    {
        "id": "generate", "label": "Open telemetry stream", "detail": "Evidence buffer connected",
        "headline": "Telemetry stream connected",
        "activity": "Correlated observations are entering the 45-second replay window.",
        "tool": "monitoring.replay", "target": "evidence-panel",
    },
    {
        "id": "metrics", "label": "Receive metrics", "detail": "agent.get_metrics",
        "headline": "Receiving booking latency metrics",
        "activity": "The agent is calling get_metrics for operation op-204.",
        "tool": "agent.get_metrics", "target": "metric-panel",
    },
    {
        "id": "logs", "label": "Receive logs", "detail": "agent.get_logs",
        "headline": "Receiving booking service logs",
        "activity": "The agent is pulling correlated logs for operation op-204.",
        "tool": "agent.get_logs", "target": "evidence-panel",
    },
    {
        "id": "traces", "label": "Receive traces", "detail": "agent.get_traces",
        "headline": "Following the retry trace",
        "activity": "The agent is resolving reservation and payment spans.",
        "tool": "agent.get_traces", "target": "evidence-panel",
    },
    {
        "id": "events", "label": "Receive events", "detail": "agent.get_events",
        "headline": "Reconstructing payment side effects",
        "activity": "Reservation, timeout, retry, and payment events are arriving.",
        "tool": "agent.get_events", "target": "sequence-panel",
    },
    {
        "id": "repair", "label": "Create repair handoff", "detail": "actions.execute_action",
        "headline": "Opening the repair handoff",
        "activity": "Actions is packaging the evidence and acceptance criteria.",
        "tool": "actions.execute_action", "target": "repair-panel",
    },
    {
        "id": "done", "label": "Session complete", "detail": "All evidence received",
        "headline": "Incident evidence delivered",
        "activity": "The downstream agent has the change context and correlated evidence.",
        "tool": "session.complete", "target": "raw-panel",
    },
)


class DemoClock:
    """Controllable clock that completes a 45-second replay without a 45-second test."""

    def __init__(self, value: float = 1_700_000_000.0):
        self.value = value

    def __call__(self) -> float:
        return self.value

    def advance(self, seconds: float) -> None:
        self.value += seconds


class DemoState:
    """Thread-safe state shared by the async rehearsal and HTTP dashboard."""

    def __init__(self):
        self._lock = threading.RLock()
        initial = STAGES[0]
        self._value: dict[str, Any] = {
            "title": "MCP Evidence Flight Recorder",
            "status": "starting",
            "mode": "offline",
            "displayMode": "real-time replay",
            "revision": 0,
            "sessionId": DEMO_SESSION_ID,
            "dataBoundary": {
                "pr": "snapshot",
                "telemetry": "simulated",
                "delivery": "in-process MCP",
            },
            "stages": [
                {
                    "id": stage["id"], "label": stage["label"], "detail": stage["detail"],
                    "target": stage["target"], "status": "pending",
                }
                for stage in STAGES
            ],
            "focus": {
                "stepId": initial["id"], "stepNumber": 1, "totalSteps": len(STAGES),
                "status": "pending", "headline": initial["headline"],
                "detail": initial["activity"], "tool": initial["tool"],
                "target": initial["target"], "progressPercent": 0,
            },
            "calls": [],
            "pr": None,
            "evidence": {"metrics": None, "logs": None, "traces": None, "events": None},
            "generatedArtifacts": [],
            "generation": {
                "seed": GENERATOR_SEED,
                "verified": False,
                "scenarioId": SCENARIO_ID,
            },
            "paymentSequence": [],
            "summary": {
                "bookingP99Ms": None,
                "reservationCount": 0,
                "paymentIntentCount": 0,
                "referenceCompletions": None,
                "candidateCompletions": None,
            },
            "repair": None,
            "error": None,
        }

    def _bump(self) -> None:
        self._value["revision"] += 1

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return deepcopy(self._value)

    def set_status(self, status: str) -> None:
        with self._lock:
            self._value["status"] = status
            self._bump()

    def stage(self, stage_id: str, status: str) -> None:
        with self._lock:
            for index, stage in enumerate(self._value["stages"]):
                if stage["id"] == stage_id:
                    stage["status"] = status
                    definition = STAGES[index]
                    completed = sum(item["status"] == "complete" for item in self._value["stages"])
                    self._value["focus"] = {
                        "stepId": stage_id,
                        "stepNumber": index + 1,
                        "totalSteps": len(STAGES),
                        "status": status,
                        "headline": definition["headline"],
                        "detail": definition["activity"],
                        "tool": definition["tool"],
                        "target": definition["target"],
                        "progressPercent": int(completed / len(STAGES) * 100),
                    }
                    self._bump()
                    break

    def set_value(self, key: str, value: Any) -> None:
        with self._lock:
            self._value[key] = deepcopy(value)
            self._bump()

    def set_evidence(self, stream: str, value: dict[str, Any]) -> None:
        with self._lock:
            self._value["evidence"][stream] = deepcopy(value)
            self._bump()

    def add_call(self, profile: str, tool: str, arguments: dict[str, Any], response: Any) -> None:
        with self._lock:
            self._value["calls"].append({
                "sequence": len(self._value["calls"]) + 1,
                "profile": profile,
                "tool": tool,
                "arguments": deepcopy(arguments),
                "response": deepcopy(response),
            })
            self._bump()

    def fail(self, error: BaseException) -> None:
        with self._lock:
            self._value["status"] = "failed"
            self._value["error"] = {"type": type(error).__name__, "message": str(error)}
            for stage in self._value["stages"]:
                if stage["status"] == "active":
                    stage["status"] = "failed"
            self._value["focus"]["status"] = "failed"
            self._bump()


async def _pause(step_delay: float, sleep: Callable[[float], Awaitable[None]]) -> None:
    if step_delay > 0:
        await sleep(step_delay)


async def _call_tool(
    profiles: dict[str, Any],
    state: DemoState,
    *,
    stage_id: str,
    profile: str,
    tool: str,
    arguments: dict[str, Any],
    step_delay: float,
    sleep: Callable[[float], Awaitable[None]],
) -> dict[str, Any]:
    state.stage(stage_id, "active")
    await _pause(step_delay, sleep)
    async with Client(profiles[profile]) as client:
        response = (await client.call_tool(tool, arguments)).data
    state.add_call(profile, tool, arguments, response)
    state.stage(stage_id, "complete")
    return response


def _incident_sequence(events: dict[str, Any]) -> list[dict[str, Any]]:
    names = {
        "reservation_committed", "response_timeout", "retry_started", "payment_intent_created",
    }
    return [
        {
            "name": item["name"],
            "observedAt": item["observedAt"],
            "availableAfterMs": item["availableAfterMs"],
            "attributes": item.get("attributes", {}),
            "traceId": item.get("traceId"),
        }
        for item in events.get("items", [])
        if item.get("name") in names
    ]


def _summary(metrics: dict[str, Any], events: dict[str, Any]) -> dict[str, Any]:
    metric_values = [
        item.get("attributes", {}).get("value")
        for item in metrics.get("items", [])
        if item.get("name") == "booking_latency"
    ]
    reservation_count = sum(item.get("name") == "reservation_committed" for item in events.get("items", []))
    payment_count = sum(item.get("name") == "payment_intent_created" for item in events.get("items", []))
    reference = next(
        (item.get("attributes", {}).get("numerator") for item in events.get("items", [])
         if item.get("name") == "booking_completion_reference"),
        None,
    )
    candidate = next(
        (item.get("attributes", {}).get("numerator") for item in events.get("items", [])
         if item.get("name") == "booking_completion"),
        None,
    )
    return {
        "bookingP99Ms": metric_values[0] if metric_values else None,
        "reservationCount": reservation_count,
        "paymentIntentCount": payment_count,
        "referenceCompletions": reference,
        "candidateCompletions": candidate,
    }


async def run_offline_flow(
    state: DemoState | None = None,
    *,
    step_delay: float = DEFAULT_STEP_DELAY,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
) -> dict[str, Any]:
    """Run the bad-booking rehearsal entirely through in-process MCP clients."""
    state = state or DemoState()
    clock = DemoClock()
    store = SessionStore(clock=clock)
    replay = ReplayService(store, clock=clock, cursor_secret=b"offline-flight-recorder")
    services = ToolServices(store, replay, repository_url=REPOSITORY_URL)
    profiles = create_profiles(services)

    try:
        state.set_status("running")
        state.stage("boot", "active")
        await _pause(step_delay, sleep)
        state.stage("boot", "complete")

        selected = await _call_tool(
            profiles, state,
            stage_id="select", profile="control", tool="set_scenario",
            arguments={"demoSessionId": DEMO_SESSION_ID, "scenarioId": SCENARIO_ID},
            step_delay=step_delay, sleep=sleep,
        )
        context = await _call_tool(
            profiles, state,
            stage_id="context", profile="planner", tool="get_change_context",
            arguments={"demoSessionId": DEMO_SESSION_ID, "changeId": selected["changeId"]},
            step_delay=step_delay, sleep=sleep,
        )
        state.set_value("pr", context)

        state.stage("generate", "active")
        await _pause(step_delay, sleep)
        if not check_generated(replay.generated_root):
            raise RuntimeError("checked-in monitoring evidence differs from a fresh seeded generation")
        state.set_value("generation", {
            "seed": GENERATOR_SEED,
            "verified": True,
            "scenarioId": SCENARIO_ID,
        })
        clock.advance(45.001)
        state.set_value("generatedArtifacts", [
            f"monitoring/generated/v1/{SCENARIO_ID}/{stream}.ndjson"
            for stream in ("metrics", "logs", "traces", "events")
        ])
        state.stage("generate", "complete")

        query = {"operationId": "op-204"}
        metrics = await _call_tool(
            profiles, state,
            stage_id="metrics", profile="agent", tool="get_metrics",
            arguments={
                "demoSessionId": DEMO_SESSION_ID,
                "query": {**query, "name": "booking_latency"},
                "limit": 100,
            },
            step_delay=step_delay, sleep=sleep,
        )
        state.set_evidence("metrics", metrics)
        state.set_value("summary", _summary(metrics, {"items": []}))
        logs = await _call_tool(
            profiles, state,
            stage_id="logs", profile="agent", tool="get_logs",
            arguments={"demoSessionId": DEMO_SESSION_ID, "query": query, "limit": 100},
            step_delay=step_delay, sleep=sleep,
        )
        state.set_evidence("logs", logs)
        traces = await _call_tool(
            profiles, state,
            stage_id="traces", profile="agent", tool="get_traces",
            arguments={"demoSessionId": DEMO_SESSION_ID, "query": query, "limit": 100},
            step_delay=step_delay, sleep=sleep,
        )
        state.set_evidence("traces", traces)
        events = await _call_tool(
            profiles, state,
            stage_id="events", profile="agent", tool="get_events",
            arguments={"demoSessionId": DEMO_SESSION_ID, "query": query, "limit": 100},
            step_delay=step_delay, sleep=sleep,
        )
        state.set_evidence("events", events)
        state.set_value("paymentSequence", _incident_sequence(events))
        state.set_value("summary", _summary(metrics, events))

        repair = await _call_tool(
            profiles, state,
            stage_id="repair", profile="actions", tool="execute_action",
            arguments={"demoSessionId": DEMO_SESSION_ID, "type": "request_repair"},
            step_delay=step_delay, sleep=sleep,
        )
        state.set_value("repair", repair)
        state.stage("done", "active")
        await _pause(step_delay, sleep)
        state.stage("done", "complete")
        state.set_status("complete")
        return state.snapshot()
    except BaseException as error:
        state.fail(error)
        raise


def _dashboard_handler(state: DemoState) -> type[BaseHTTPRequestHandler]:
    assets = {
        "/": (ASSET_ROOT / "index.html", "text/html; charset=utf-8"),
        "/index.html": (ASSET_ROOT / "index.html", "text/html; charset=utf-8"),
        "/styles.css": (ASSET_ROOT / "styles.css", "text/css; charset=utf-8"),
        "/app.js": (ASSET_ROOT / "app.js", "text/javascript; charset=utf-8"),
    }

    class DashboardHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
            path = urlparse(self.path).path
            if path == "/api/state":
                body = json.dumps(state.snapshot(), separators=(",", ":")).encode()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/json; charset=utf-8")
            elif path in assets:
                asset, content_type = assets[path]
                try:
                    body = asset.read_bytes()
                except FileNotFoundError:
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", content_type)
            else:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, _format: str, *_args: Any) -> None:
            return

    return DashboardHandler


def create_dashboard_server(state: DemoState, host: str, port: int) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), _dashboard_handler(state))


def _run_worker(state: DemoState, step_delay: float) -> None:
    try:
        asyncio.run(run_offline_flow(state, step_delay=step_delay))
    except BaseException:
        return


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the offline bad-booking MCP flight recorder")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--step-delay", type=float, default=DEFAULT_STEP_DELAY)
    parser.add_argument("--no-open", action="store_true", help="Do not open the dashboard in a browser")
    parser.add_argument("--once", action="store_true", help="Run once, print the final JSON, and exit")
    args = parser.parse_args(argv)

    if args.step_delay < 0:
        parser.error("--step-delay must not be negative")
    state = DemoState()
    if args.once:
        report = asyncio.run(run_offline_flow(state, step_delay=args.step_delay))
        print(json.dumps(report, indent=2))
        return 0

    server = create_dashboard_server(state, args.host, args.port)
    worker = threading.Thread(target=_run_worker, args=(state, args.step_delay), daemon=True)
    worker.start()
    url = f"http://{args.host}:{args.port}"
    print(f"MCP flight recorder: {url}")
    print("Press Ctrl+C to stop.")
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nStopping MCP flight recorder.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
