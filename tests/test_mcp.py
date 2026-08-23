"""Exact FastMCP profile catalogs, query envelopes, and repair handoffs."""

import json
from hashlib import sha256
import hmac

import pytest
from fastmcp import Client


async def _tool_names(server):
    async with Client(server) as client:
        return {tool.name for tool in await client.list_tools()}


@pytest.mark.asyncio
async def test_profiles_expose_exact_twelve_tool_contract_without_cross_profile_access():
    """Catches a privileged control/action tool leaking into an agent profile."""
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore
    from opssemble_mcp.profiles import ToolServices, create_profiles

    store = SessionStore()
    profiles = create_profiles(ToolServices(store, ReplayService(store), repository_url="https://github.com/Prathamesh-Pawar/flylab"))

    assert await _tool_names(profiles["control"]) == {
        "list_scenarios", "set_scenario", "get_demo_state", "reset_demo_session",
    }
    assert await _tool_names(profiles["planner"]) == {"list_changes", "get_change_context"}
    assert await _tool_names(profiles["agent"]) == {"get_metrics", "get_logs", "get_traces", "get_events"}
    assert await _tool_names(profiles["actions"]) == {"execute_action", "get_action_status"}


@pytest.mark.asyncio
async def test_controller_snapshot_flows_to_redacted_planner_and_cursor_agent_batches():
    """Catches fallback selection that leaks scenario routing into planner/agent evidence."""
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore
    from opssemble_mcp.profiles import ToolServices, create_profiles

    store = SessionStore()
    services = ToolServices(store, ReplayService(store), repository_url="https://github.com/Prathamesh-Pawar/flylab")
    profiles = create_profiles(services)
    async with Client(profiles["control"]) as control:
        selected = (await control.call_tool("set_scenario", {
            "demoSessionId": "offline-booking",
            "scenarioId": "booking-timeout-retry-candidate",
        })).data
    async with Client(profiles["planner"]) as planner:
        changes = (await planner.call_tool("list_changes", {"demoSessionId": "offline-booking"})).data
        context = (await planner.call_tool("get_change_context", {
            "demoSessionId": "offline-booking", "changeId": selected["changeId"],
        })).data
    async with Client(profiles["agent"]) as agent:
        metrics = (await agent.call_tool("get_metrics", {
            "demoSessionId": "offline-booking", "limit": 2,
        })).data
        invalid = (await agent.call_tool("get_logs", {
            "demoSessionId": "offline-booking", "cursor": metrics["stream"]["cursor"],
        })).data

    assert selected["streamState"] == "streaming"
    assert changes["dataMode"] == "snapshot"
    assert context["dataMode"] == "snapshot"
    planner_text = json.dumps({"changes": changes, "context": context})
    assert "opssemble:" not in planner_text
    assert "scenarioId" not in planner_text
    assert metrics["dataMode"] == "simulated"
    assert metrics["itemCount"] == 2
    assert metrics["stream"]["mode"] == "replay"
    assert invalid["error"]["code"] == "INVALID_CURSOR"


@pytest.mark.asyncio
async def test_controller_keeps_explicit_demo_sessions_independent():
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore
    from opssemble_mcp.profiles import ToolServices

    store = SessionStore()
    services = ToolServices(
        store,
        ReplayService(store),
        repository_url="https://github.com/Prathamesh-Pawar/flylab",
    )

    first = services.set_scenario(
        "demo-one", "booking-timeout-retry-candidate"
    )
    second = services.set_scenario(
        "demo-two", "booking-timeout-retry-candidate"
    )

    assert first["demoSessionId"] == "demo-one"
    assert second["demoSessionId"] == "demo-two"
    assert store.get_session("demo-one") is not None
    assert store.get_session("demo-two") is not None


@pytest.mark.asyncio
async def test_request_repair_returns_real_handoff_and_idempotent_action_status():
    """Catches simulated repair metadata or a handoff missing the real PR marker contract."""
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore
    from opssemble_mcp.profiles import ToolServices, create_profiles

    store = SessionStore()
    services = ToolServices(store, ReplayService(store), repository_url="https://github.com/Prathamesh-Pawar/flylab")
    services.set_scenario("faulty-session", "booking-timeout-retry-candidate")
    profiles = create_profiles(services)
    async with Client(profiles["actions"]) as actions:
        first = (await actions.call_tool("execute_action", {
            "demoSessionId": "faulty-session", "type": "request_repair",
        })).data
        second = (await actions.call_tool("execute_action", {
            "demoSessionId": "faulty-session", "type": "request_repair",
        })).data
        status = (await actions.call_tool("get_action_status", {"actionId": first["actionId"]})).data

    assert first["actionId"] == second["actionId"]
    handoff = first["handoff"]
    assert handoff["repositoryUrl"] == "https://github.com/Prathamesh-Pawar/flylab"
    assert handoff["faultySha"]
    assert handoff["baseSha"]
    assert handoff["mcpSessionId"] == "faulty-session"
    assert handoff["branchConvention"] == f"opssemble/repair/{handoff['taskId']}"
    assert handoff["requiredPrBodyMarker"] == f"Opssemble-Repair-Task: {handoff['taskId']}"
    assert handoff["acceptanceCriteria"]
    assert handoff["reproductionCommand"]
    assert handoff["evidenceQueryHints"]
    assert status["state"] == "awaiting_agent"


@pytest.mark.asyncio
async def test_reset_clears_session_actions_and_restore_starts_the_restored_stream():
    """Catches stale action state and a rollout restore with no observable follow-up session."""
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore
    from opssemble_mcp.profiles import ToolServices

    store = SessionStore()
    services = ToolServices(store, ReplayService(store), repository_url="https://github.com/Prathamesh-Pawar/flylab")
    services.set_scenario("seat-rollout", "smart-seat-bundles-rollout-50")
    restored = services.execute_action("seat-rollout", "restore_rollout", None)

    restoration = store.get_session(restored["restorationSessionId"])
    assert restoration is not None
    assert restoration.scenario_id == "smart-seat-bundles-restored"
    assert restoration.state == "streaming"

    reset = services.reset_demo_session("seat-rollout")
    assert reset["reset"] is True
    assert not [action for action in store.actions.values() if action.get("mcpSessionId") == "seat-rollout"]


def test_mcp_http_mounts_require_the_shared_bearer_token():
    """Catches an authenticated tool catalog exposed over an unprotected mount."""
    from monitoring.app import create_app
    from monitoring.config import Settings
    from starlette.testclient import TestClient

    settings = Settings(
        flightlab_base_url="https://flightlab.example",
        github_repository="Prathamesh-Pawar/flylab",
        github_token="github", github_webhook_secret="webhook",
        ingest_secret="ingress", mcp_token="shared-token",
    )
    app = create_app(settings)
    with TestClient(app) as client:
        unauthorized = client.get("/mcp/control/")
        authorized = client.get("/mcp/control/", headers={"Authorization": "Bearer shared-token"})

    assert unauthorized.status_code == 401
    assert authorized.status_code != 401


@pytest.mark.asyncio
async def test_marked_repair_pr_tracks_checks_and_only_starts_revalidation_after_merge():
    """Catches repair telemetry activation from merely opening a branch or PR."""
    from monitoring.github import WebhookService
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore
    from opssemble_mcp.profiles import ToolServices
    from tests.test_integrations import Snapshotter, _pull_request_payload

    class Clock:
        value = 1_700_000_000.0
        def __call__(self):
            return self.value

    clock = Clock()
    store = SessionStore(clock=clock)
    replay = ReplayService(store, clock=clock, cursor_secret=b"cursor")
    started = []

    async def on_session(session_id):
        started.append(session_id)

    services = ToolServices(
        store, replay, repository_url="https://github.com/Prathamesh-Pawar/flylab",
        on_repair_session=on_session,
    )
    services.set_scenario("faulty", "booking-timeout-retry-candidate")
    requested = services.actions.request_repair("faulty")
    marker = requested["handoff"]["requiredPrBodyMarker"]
    webhook = WebhookService(
        store=store, repository="Prathamesh-Pawar/flylab", webhook_secret="secret",
        snapshotter=Snapshotter(), on_session=on_session, repair_tracker=services.actions,
    )

    opened_payload = _pull_request_payload(action="opened", merged=False)
    opened_payload["pull_request"]["number"] = 300
    opened_payload["pull_request"]["body"] = marker
    opened_body = json.dumps(opened_payload).encode()
    opened_headers = {
        "X-GitHub-Delivery": "repair-open",
        "X-Hub-Signature-256": "sha256=" + hmac.new(b"secret", opened_body, sha256).hexdigest(),
    }
    opened = await webhook.handle(opened_headers, opened_body)

    assert opened["routingStatus"] == "repair"
    assert services.actions.get_status(requested["actionId"])["state"] == "ready"
    assert started == []

    merged_payload = _pull_request_payload(labels=[])
    merged_payload["pull_request"]["number"] = 300
    merged_payload["pull_request"]["body"] = marker
    merged_payload["pull_request"]["head"]["sha"] = "e" * 40
    merged_payload["pull_request"]["merge_commit_sha"] = "f" * 40
    merged_body = json.dumps(merged_payload).encode()
    merged_headers = {
        "X-GitHub-Delivery": "repair-merged",
        "X-Hub-Signature-256": "sha256=" + hmac.new(b"secret", merged_body, sha256).hexdigest(),
    }
    merged = await webhook.handle(merged_headers, merged_body)

    action = services.actions.get_status(requested["actionId"])
    repair_session = store.get_session(merged["repairSessionId"])
    assert action["state"] == "revalidating"
    assert repair_session.scenario_id == "booking-timeout-retry-repair-candidate"
    assert started == [repair_session.id]
    assert [item["state"] for item in action["history"]] == [
        "awaiting_agent", "pr_open", "ready", "merged", "revalidating",
    ]

    store.transition(repair_session.id, "awaiting_deployment")
    store.transition(repair_session.id, "exercising")
    repair_session.release_sha = repair_session.merge_sha
    repair_session.route = "/api/book"
    repair_session.request_id = "repair-request"
    repair_session.operation_id = "op-204"
    store.start_stream(repair_session.id)
    clock.value += 45
    assert services.actions.get_status(requested["actionId"])["state"] == "complete"
