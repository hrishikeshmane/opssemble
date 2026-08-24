"""The exact twelve-tool contract split across four independent MCP servers."""

from hashlib import sha256
import json
from pathlib import Path
from typing import Any, Awaitable, Callable

from fastmcp import FastMCP

from monitoring.lifecycle import journey_for
from monitoring.replay import InvalidCursor, ReplayService, SessionIncomplete
from monitoring.scenario_definitions import load_scenarios
from monitoring.store import SessionStore


SNAPSHOT_ROOT = Path(__file__).parents[1] / "monitoring" / "snapshots"


def _snapshot_name(scenario_id: str) -> str:
    if scenario_id.startswith("smart-seat-bundles"):
        return "smart-seat-bundles.json"
    if scenario_id == "flexible-date-search-candidate":
        return "flexible-date-search.json"
    return "booking-timeout-retry.json"


def _public(value: Any) -> Any:
    if isinstance(value, list):
        return [_public(item) for item in value]
    if isinstance(value, dict):
        return {
            key: _public(item) for key, item in value.items()
            if not key.startswith("_") and key not in {"labels", "scenarioId", "routingLabel"}
        }
    return value


class ActionTracker:
    def __init__(self, store: SessionStore, replay: ReplayService, repository_url: str,
                 on_repair_session: Callable[[str], Awaitable[None]]):
        self.store = store
        self.replay = replay
        self.repository_url = repository_url
        self.on_repair_session = on_repair_session

    def _set_state(self, action: dict[str, Any], state: str) -> None:
        if action["state"] == state:
            return
        action["state"] = state
        action["history"].append({"state": state, "at": self.store.clock()})
        session_id = action["mcpSessionId"]
        if self.store.get_session(session_id):
            self.store.append_action_event(session_id, {
                "actionId": action["actionId"], "state": state,
            })

    def request_repair(self, session_id: str) -> dict[str, Any]:
        session = self.store.get_session(session_id)
        if session is None:
            return {"error": {"code": "SESSION_NOT_FOUND", "message": "Unknown session"}}
        for action in self.store.actions.values():
            if action.get("mcpSessionId") == session_id and action.get("type") == "request_repair":
                return _public(action)
        change = self.store.changes.get(session.change_id, {})
        token = sha256(f"{session.id}:{session.merge_sha}".encode()).hexdigest()[:12]
        task_id = f"repair-{token}"
        action_id = f"action-{token}"
        changed_paths = [item.get("path") for item in change.get("changedFiles", []) if item.get("path")]
        approved_scope = changed_paths or [
            "app/api/book/route.ts", "lib/booking-provider.ts", "tests/booking-api.test.ts",
        ]
        handoff = {
            "taskId": task_id,
            "repositoryUrl": change.get("repositoryUrl") or self.repository_url,
            "baseSha": change.get("baseSha") or change.get("headSha") or session.merge_sha,
            "faultySha": session.merge_sha,
            "mcpSessionId": session.id,
            "changeId": session.change_id,
            "approvedScope": approved_scope,
            "acceptanceCriteria": [
                "A timeout after reservation commit creates at most one reservation and payment per operation.",
                "Retries reuse one stable idempotency key.",
                "Booking p99 remains below 1500 ms under the response-timeout reproduction.",
                "Existing and commit-then-timeout regression tests pass.",
            ],
            "reproductionCommand": "npm test -- tests/booking-api.test.ts",
            "evidenceQueryHints": [
                {"tool": "get_logs", "query": {"operationId": "op-204"}},
                {"tool": "get_traces", "query": {"operationId": "op-204"}},
                {"tool": "get_events", "query": {"operationId": "op-204"}},
            ],
            "branchConvention": f"opssemble/repair/{task_id}",
            "requiredPrBodyMarker": f"Opssemble-Repair-Task: {task_id}",
        }
        action = {
            "actionId": action_id,
            "type": "request_repair",
            "taskId": task_id,
            "state": "awaiting_agent",
            "mcpSessionId": session.id,
            "changeId": session.change_id,
            "handoff": handoff,
            "history": [{"state": "awaiting_agent", "at": self.store.clock()}],
        }
        self.store.actions[action_id] = action
        self.store.append_action_event(session.id, {"actionId": action_id, "state": "awaiting_agent"})
        return _public(action)

    async def handle_change(self, change: dict[str, Any]) -> dict[str, Any] | None:
        task_id = change.get("_repairTaskId")
        action = next((item for item in self.store.actions.values() if item.get("taskId") == task_id), None)
        if action is None:
            return None
        action["pullRequest"] = {
            "number": change.get("number"), "url": change.get("url"),
            "state": change.get("state"), "checks": change.get("checks"),
            "mergeSha": change.get("mergeSha"),
        }
        if change.get("state") != "merged":
            self._set_state(action, "pr_open")
            check_state = change.get("checks", {}).get("state")
            self._set_state(action, "ready" if check_state == "success" else "checks_running")
            return {"actionId": action["actionId"]}
        if change.get("checks", {}).get("state") != "success":
            self._set_state(action, "checks_running")
            return {"actionId": action["actionId"]}

        self._set_state(action, "ready")
        self._set_state(action, "merged")
        faulty_session = self.store.get_session(action["mcpSessionId"])
        if faulty_session is None:
            return {"actionId": action["actionId"]}
        repair_session = self.store.create_session(
            change_id=change["changeId"],
            repository=change["repository"],
            pr_number=int(change["number"]),
            merge_sha=change["mergeSha"],
            scenario_id="booking-timeout-retry-repair-candidate",
        )
        action["repairSessionId"] = repair_session.id
        self._set_state(action, "revalidating")
        await self.on_repair_session(repair_session.id)
        return {"actionId": action["actionId"], "repairSessionId": repair_session.id}

    def get_status(self, action_id: str) -> dict[str, Any]:
        action = self.store.actions.get(action_id)
        if action is None:
            return {"error": {"code": "ACTION_NOT_FOUND", "message": "Unknown action"}}
        repair_session_id = action.get("repairSessionId")
        if repair_session_id:
            self.replay.materialize_session_events(repair_session_id)
            repair_session = self.store.get_session(repair_session_id)
            if repair_session and repair_session.state == "complete":
                self._set_state(action, "complete")
        return _public(action)


class ToolServices:
    def __init__(self, store: SessionStore, replay: ReplayService, *, repository_url: str,
                 on_repair_session: Callable[[str], Awaitable[None]] | None = None):
        self.store = store
        self.replay = replay
        self.repository_url = repository_url

        async def no_op(_session_id: str) -> None:
            return None

        self.actions = ActionTracker(store, replay, repository_url, on_repair_session or no_op)

    def list_scenarios(self) -> dict[str, Any]:
        return {
            "dataMode": "simulated",
            "items": [{
                "id": scenario.id,
                "observationWindowMs": scenario.observation_window_ms,
            } for scenario in load_scenarios()],
        }

    def set_scenario(self, demo_session_id: str, scenario_id: str) -> dict[str, Any]:
        supported = {scenario.id for scenario in load_scenarios()}
        if scenario_id not in supported:
            return {"error": {"code": "UNKNOWN_SCENARIO", "message": "Unknown scenario"}}
        self.reset_demo_session(demo_session_id)
        snapshot = json.loads((SNAPSHOT_ROOT / _snapshot_name(scenario_id)).read_text())
        snapshot["_scenarioId"] = scenario_id
        self.store.changes[snapshot["changeId"]] = snapshot
        session = self.store.create_session(
            change_id=snapshot["changeId"],
            repository=snapshot["repository"],
            pr_number=int(snapshot["number"]),
            merge_sha=snapshot.get("mergeSha") or snapshot["headSha"],
            scenario_id=scenario_id,
            session_id=demo_session_id,
            deduplicate=False,
        )
        self.store.transition(session.id, "awaiting_deployment")
        self.store.transition(session.id, "exercising")
        session.release_sha = session.merge_sha
        journey = journey_for(session)
        session.route = journey.route
        session.request_id = journey.request_id
        session.operation_id = "op-204" if scenario_id.startswith("booking-") else (
            "search-204" if scenario_id == "flexible-date-search-candidate" else "seat-204"
        )
        self.store.start_stream(session.id)
        return {
            "demoSessionId": session.id,
            "changeId": session.change_id,
            "streamState": "streaming",
            "dataMode": "simulated",
        }

    def get_demo_state(self, demo_session_id: str) -> dict[str, Any]:
        session = self.store.get_session(demo_session_id)
        if session is None:
            return {"demoSessionId": demo_session_id, "state": "empty", "actions": []}
        return {
            "demoSessionId": session.id,
            "state": session.state,
            "scenarioId": session.scenario_id,
            "changeId": session.change_id,
            "actions": [_public(action) for action in self.store.actions.values()
                        if action.get("mcpSessionId") == session.id],
        }

    def reset_demo_session(self, demo_session_id: str) -> dict[str, Any]:
        related_actions = [
            (action_id, action) for action_id, action in self.store.actions.items()
            if action.get("mcpSessionId") == demo_session_id
        ]
        for action_id, action in related_actions:
            for derived_key in ("repairSessionId", "restorationSessionId"):
                if action.get(derived_key):
                    self.store.reset(action[derived_key])
            self.store.actions.pop(action_id, None)
        return {"demoSessionId": demo_session_id, "reset": self.store.reset(demo_session_id)}

    def list_changes(self, _demo_session_id: str | None = None) -> dict[str, Any]:
        items = [_public(change) for change in self.store.changes.values()]
        mode = "snapshot" if items and all(item.get("dataMode") == "snapshot" for item in items) else "live"
        return {"dataMode": mode, "items": items, "itemCount": len(items)}

    def get_change_context(self, change_id: str) -> dict[str, Any]:
        change = self.store.changes.get(change_id)
        if change is None:
            return {"error": {"code": "CHANGE_NOT_FOUND", "message": "Unknown change"}}
        return _public(change)

    async def evidence(self, session_id: str, stream: str, query: dict[str, Any] | None,
                       cursor: str | None, wait_ms: int, limit: int) -> dict[str, Any]:
        normalized_query = query or {}
        request_id = "mcp-" + sha256(
            f"{session_id}:{stream}:{json.dumps(normalized_query, sort_keys=True)}:{cursor or ''}".encode()
        ).hexdigest()[:12]
        base = {
            "dataMode": "simulated",
            "provider": "generated",
            "requestId": request_id,
            "demoSessionId": session_id,
            "items": [],
            "itemCount": 0,
            "query": normalized_query,
            "warnings": [],
        }
        try:
            batch = await self.replay.query(
                session_id, stream, normalized_query, cursor=cursor, wait_ms=wait_ms, limit=limit,
            )
        except InvalidCursor:
            return {**base, "error": {"code": "INVALID_CURSOR", "message": "Cursor does not match this query"}}
        except SessionIncomplete as error:
            return {**base, "error": {"code": "SESSION_INCOMPLETE", "message": str(error)}}
        except KeyError:
            return {**base, "error": {"code": "SESSION_NOT_FOUND", "message": "Unknown session"}}
        except ValueError as error:
            return {**base, "error": {"code": "INVALID_ARGUMENT", "message": str(error)}}
        return {**base, "items": batch["items"], "itemCount": len(batch["items"]), "stream": batch["stream"]}

    def execute_action(self, session_id: str, action_type: str, parameters: dict[str, Any] | None) -> dict[str, Any]:
        if action_type == "request_repair":
            return self.actions.request_repair(session_id)
        if action_type == "restore_rollout":
            session = self.store.get_session(session_id)
            if session is None:
                return {"error": {"code": "SESSION_NOT_FOUND", "message": "Unknown session"}}
            if not session.scenario_id.startswith("smart-seat-bundles"):
                return {"error": {"code": "INVALID_ACTION", "message": "Rollout restore requires a smart-seat session"}}
            token = sha256(f"{session_id}:restore_rollout".encode()).hexdigest()[:12]
            action_id = f"action-{token}"
            existing = self.store.actions.get(action_id)
            if existing is not None:
                return _public(existing)
            restored_session = self.store.create_session(
                change_id=session.change_id,
                repository=session.repository,
                pr_number=session.pr_number,
                merge_sha=session.merge_sha,
                scenario_id="smart-seat-bundles-restored",
                session_id=f"{session.id}-restored",
                deduplicate=False,
            )
            self.store.transition(restored_session.id, "awaiting_deployment")
            self.store.transition(restored_session.id, "exercising")
            restored_session.release_sha = session.release_sha or session.merge_sha
            restored_session.route = session.route
            restored_session.request_id = session.request_id
            restored_session.operation_id = session.operation_id
            self.store.start_stream(restored_session.id)
            action = {
                "actionId": action_id, "type": action_type, "state": "complete",
                "mcpSessionId": session_id, "parameters": parameters or {},
                "restorationSessionId": restored_session.id,
            }
            self.store.actions[action["actionId"]] = action
            if self.store.get_session(session_id):
                self.store.append_action_event(session_id, action)
            return _public(action)
        return {"error": {"code": "UNSUPPORTED_ACTION", "message": "Unsupported action type"}}


def create_profiles(services: ToolServices) -> dict[str, FastMCP]:
    control = FastMCP("Opssemble Control")
    planner = FastMCP("Opssemble Planner")
    agent = FastMCP("Opssemble Agent")
    actions = FastMCP("Opssemble Actions")

    @control.tool(name="list_scenarios")
    def list_scenarios() -> dict[str, Any]:
        return services.list_scenarios()

    @control.tool(name="set_scenario")
    def set_scenario(demoSessionId: str, scenarioId: str) -> dict[str, Any]:
        return services.set_scenario(demoSessionId, scenarioId)

    @control.tool(name="get_demo_state")
    def get_demo_state(demoSessionId: str) -> dict[str, Any]:
        return services.get_demo_state(demoSessionId)

    @control.tool(name="reset_demo_session")
    def reset_demo_session(demoSessionId: str) -> dict[str, Any]:
        return services.reset_demo_session(demoSessionId)

    @planner.tool(name="list_changes")
    def list_changes(demoSessionId: str | None = None) -> dict[str, Any]:
        return services.list_changes(demoSessionId)

    @planner.tool(name="get_change_context")
    def get_change_context(demoSessionId: str, changeId: str,
                           include: list[str] | None = None) -> dict[str, Any]:
        return services.get_change_context(changeId)

    async def evidence(stream: str, demoSessionId: str, query: dict[str, Any] | None,
                       cursor: str | None, waitMs: int, limit: int) -> dict[str, Any]:
        return await services.evidence(demoSessionId, stream, query, cursor, waitMs, limit)

    @agent.tool(name="get_metrics")
    async def get_metrics(demoSessionId: str, query: dict[str, Any] | None = None,
                          cursor: str | None = None, waitMs: int = 0,
                          limit: int = 100) -> dict[str, Any]:
        return await evidence("metrics", demoSessionId, query, cursor, waitMs, limit)

    @agent.tool(name="get_logs")
    async def get_logs(demoSessionId: str, query: dict[str, Any] | None = None,
                       cursor: str | None = None, waitMs: int = 0,
                       limit: int = 100) -> dict[str, Any]:
        return await evidence("logs", demoSessionId, query, cursor, waitMs, limit)

    @agent.tool(name="get_traces")
    async def get_traces(demoSessionId: str, query: dict[str, Any] | None = None,
                         cursor: str | None = None, waitMs: int = 0,
                         limit: int = 100) -> dict[str, Any]:
        return await evidence("traces", demoSessionId, query, cursor, waitMs, limit)

    @agent.tool(name="get_events")
    async def get_events(demoSessionId: str, query: dict[str, Any] | None = None,
                         cursor: str | None = None, waitMs: int = 0,
                         limit: int = 100) -> dict[str, Any]:
        return await evidence("events", demoSessionId, query, cursor, waitMs, limit)

    @actions.tool(name="execute_action")
    def execute_action(demoSessionId: str, type: str,
                       parameters: dict[str, Any] | None = None) -> dict[str, Any]:
        return services.execute_action(demoSessionId, type, parameters)

    @actions.tool(name="get_action_status")
    def get_action_status(actionId: str) -> dict[str, Any]:
        return services.actions.get_status(actionId)

    return {"control": control, "planner": planner, "agent": agent, "actions": actions}
