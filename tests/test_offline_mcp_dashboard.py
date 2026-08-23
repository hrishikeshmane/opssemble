"""One-command offline MCP rehearsal and dashboard contract."""

import json
from pathlib import Path

import pytest


@pytest.mark.asyncio
async def test_offline_flow_uses_real_mcp_profiles_and_exposes_bad_booking_evidence():
    """Catches a dashboard that bypasses MCP or invents its own incident payload."""
    from opssemble_mcp.offline_demo import DemoState, run_offline_flow

    state = DemoState()
    report = await run_offline_flow(state, step_delay=0)

    assert report["status"] == "complete"
    assert report["generation"] == {
        "seed": 204,
        "verified": True,
        "scenarioId": "booking-timeout-retry-candidate",
    }
    assert [stage["status"] for stage in report["stages"]] == ["complete"] * len(report["stages"])
    assert [(call["profile"], call["tool"]) for call in report["calls"]] == [
        ("control", "set_scenario"),
        ("planner", "get_change_context"),
        ("agent", "get_metrics"),
        ("agent", "get_logs"),
        ("agent", "get_traces"),
        ("agent", "get_events"),
        ("actions", "execute_action"),
    ]

    pr = report["pr"]
    assert pr["dataMode"] == "snapshot"
    assert pr["title"] == "Retry booking provider response timeouts"
    assert "createAttemptKey" in pr["diff"]
    assert "scenarioId" not in json.dumps(pr)
    assert "opssemble:" not in json.dumps(pr)

    metrics = report["evidence"]["metrics"]
    assert metrics["dataMode"] == "simulated"
    assert metrics["provider"] == "generated"
    assert metrics["stream"]["mode"] == "replay"
    assert {item["attributes"]["value"] for item in metrics["items"]} == {2280}

    events = report["evidence"]["events"]
    assert events["dataMode"] == "simulated"
    incident = [
        (item["name"], item["attributes"])
        for item in events["items"]
        if item["name"] in {
            "reservation_committed", "response_timeout", "retry_started", "payment_intent_created",
        }
    ]
    assert [name for name, _ in incident] == [
        "reservation_committed",
        "response_timeout",
        "retry_started",
        "reservation_committed",
        "payment_intent_created",
        "payment_intent_created",
    ]
    assert {attrs.get("reservationId") for _, attrs in incident if attrs.get("reservationId")} == {
        "res-204-a", "res-204-b",
    }
    assert {attrs.get("paymentIntentId") for _, attrs in incident if attrs.get("paymentIntentId")} == {
        "pi-204-a", "pi-204-b",
    }
    assert report["summary"] == {
        "bookingP99Ms": 2280,
        "reservationCount": 2,
        "paymentIntentCount": 2,
        "referenceCompletions": 72,
        "candidateCompletions": 64,
    }

    repair = report["repair"]
    assert repair["state"] == "awaiting_agent"
    assert repair["handoff"]["requiredPrBodyMarker"].startswith("Opssemble-Repair-Task: repair-")


@pytest.mark.asyncio
async def test_offline_flow_uses_visible_pacing_for_every_stage_by_default():
    """Catches a rehearsal that completes too quickly to follow on screen."""
    from opssemble_mcp.offline_demo import DemoState, run_offline_flow

    delays = []

    async def record_delay(seconds):
        delays.append(seconds)

    await run_offline_flow(DemoState(), sleep=record_delay)

    assert delays == [1.75] * 10


@pytest.mark.asyncio
async def test_metric_readout_updates_before_the_log_step_waits():
    """Catches evidence that arrives through MCP but stays hidden until a later tool call."""
    from opssemble_mcp.offline_demo import DemoState, run_offline_flow

    state = DemoState()
    stage_snapshots = []

    async def capture_stage(_seconds):
        stage_snapshots.append(state.snapshot())

    await run_offline_flow(state, sleep=capture_stage)

    logs_wait = next(item for item in stage_snapshots if item["focus"]["stepId"] == "logs")
    assert logs_wait["evidence"]["metrics"]["itemCount"] == 10
    assert logs_wait["summary"]["bookingP99Ms"] == 2280


def test_active_stage_drives_the_real_time_spotlight_and_panel_focus():
    """Catches an active tool call that is not visible or tied to its receiving panel."""
    from opssemble_mcp.offline_demo import DemoState

    state = DemoState()
    for stage_id in ("boot", "select", "context", "generate"):
        state.stage(stage_id, "complete")
    state.stage("metrics", "active")
    snapshot = state.snapshot()

    assert snapshot["displayMode"] == "real-time replay"
    assert snapshot["focus"] == {
        "stepId": "metrics",
        "stepNumber": 5,
        "totalSteps": 10,
        "status": "active",
        "headline": "Receiving booking latency metrics",
        "detail": "The agent is calling get_metrics for operation op-204.",
        "tool": "agent.get_metrics",
        "target": "metric-panel",
        "progressPercent": 40,
    }
    assert snapshot["revision"] > 0


def test_dashboard_assets_present_the_boundary_and_poll_only_local_state():
    """Catches a dashboard that loses the live spotlight or exposes rehearsal jargon."""
    dashboard = Path(__file__).parents[1] / "mcp" / "dashboard"
    html = (dashboard / "index.html").read_text()
    script = (dashboard / "app.js").read_text()
    styles = (dashboard / "styles.css").read_text()

    assert "MCP Evidence Flight Recorder" in html
    assert "REAL-TIME REPLAY" in html
    assert "Current activity" in html
    assert "Release merged" in html
    assert "Telemetry streaming" in html
    assert "Evidence delivered" in html
    assert "Payment side-effect sequence" in html
    assert "Raw MCP responses" in html
    assert "SIMULATED" not in html
    assert 'fetch("/api/state"' in script
    assert "renderFocus" in script
    assert "textContent" in script
    assert "focus-target" in script
    assert "prefers-reduced-motion" in styles


def test_demo_state_snapshot_is_safe_json_and_starts_with_pending_stages():
    from opssemble_mcp.offline_demo import DemoState

    snapshot = DemoState().snapshot()

    assert snapshot["status"] == "starting"
    assert snapshot["displayMode"] == "real-time replay"
    assert snapshot["dataBoundary"]["pr"] == "snapshot"
    assert snapshot["dataBoundary"]["telemetry"] == "simulated"
    assert all(stage["status"] == "pending" for stage in snapshot["stages"])
    json.dumps(snapshot)
