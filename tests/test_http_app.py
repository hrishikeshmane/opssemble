"""ASGI health, ingress, SSE, and Prometheus boundary tests."""

import json

from starlette.testclient import TestClient


class Clock:
    def __init__(self):
        self.value = 1_700_000_000.0

    def __call__(self):
        return self.value


class FlightLab:
    async def get_version(self):
        return {"service": "flightlab", "releaseSha": "none"}

    async def exercise(self, journey):
        return 200

    async def aclose(self):
        return None


class Snapshotter:
    async def snapshot(self, payload):
        raise AssertionError("not expected")

    async def aclose(self):
        return None


def _config(**changes):
    from monitoring.config import Settings

    values = {
        "flightlab_base_url": "https://flightlab.example",
        "github_repository": "Prathamesh-Pawar/flylab",
        "github_token": "github-token",
        "github_webhook_secret": "github-secret",
        "ingest_secret": "ingress-secret",
        "mcp_token": "mcp-token",
        "replay_speed": 1.0,
        "session_ttl_seconds": 7_200,
        "max_sessions": 100,
    }
    values.update(changes)
    return Settings(**values)


def test_health_and_readiness_report_one_replica_without_exposing_secrets():
    """Catches unhealthy startup and secret-bearing readiness diagnostics."""
    from monitoring.app import create_app

    app = create_app(_config(), flightlab=FlightLab(), snapshotter=Snapshotter())
    with TestClient(app) as client:
        health = client.get("/healthz")
        ready = client.get("/readyz")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert ready.status_code == 200
    assert ready.json()["storage"] == "memory"
    assert ready.json()["replicaLimit"] == 1
    assert "github-token" not in ready.text
    assert "ingress-secret" not in ready.text


def test_readiness_names_missing_configuration_without_values():
    """Catches a service claiming readiness without its live integration boundary."""
    from monitoring.app import create_app

    app = create_app(_config(github_token="", mcp_token=""), flightlab=FlightLab(), snapshotter=Snapshotter())
    with TestClient(app) as client:
        response = client.get("/readyz")

    assert response.status_code == 503
    assert set(response.json()["missing"]) == {"GITHUB_TOKEN", "MCP_TOKEN"}


def test_runtime_ingress_route_uses_raw_body_signature_and_neutral_shape():
    """Catches ASGI parsing that accidentally verifies reserialized JSON."""
    from hashlib import sha256
    import hmac

    from monitoring.app import create_app
    from monitoring.store import SessionStore

    store = SessionStore()
    session = store.create_session(
        change_id="change", repository="Prathamesh-Pawar/flylab", pr_number=8,
        merge_sha="8" * 40, scenario_id="flexible-date-search-candidate",
    )
    store.transition(session.id, "awaiting_deployment")
    store.transition(session.id, "exercising")
    session.release_sha = session.merge_sha
    session.route = "/api/search/flexible"
    session.request_id = "request-8"
    app = create_app(_config(), store=store, flightlab=FlightLab(), snapshotter=Snapshotter())
    envelope = {
        "eventId": "event-8", "observedAt": "2026-08-23T20:00:00Z", "service": "flightlab",
        "releaseSha": session.merge_sha, "route": session.route, "requestId": session.request_id,
        "operationId": "search-8", "statusCode": 200, "durationMs": 430,
    }
    body = json.dumps(envelope, indent=2).encode()
    signature = hmac.new(b"ingress-secret", body, sha256).hexdigest()

    with TestClient(app) as client:
        accepted = client.post(
            "/monitoring/v1/ingest/runtime", content=body,
            headers={"X-Opssemble-Signature-256": f"sha256={signature}", "Content-Type": "application/json"},
        )
        rejected = client.post("/monitoring/v1/ingest/runtime", content=body)

    assert accepted.status_code == 202
    assert accepted.json()["sessionId"] == session.id
    assert rejected.status_code == 401


def test_completed_sse_resumes_after_event_id_and_metrics_show_only_visible_state():
    """Catches duplicate SSE replay and metrics detached from replay visibility."""
    from monitoring.app import create_app
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore

    clock = Clock()
    store = SessionStore(clock=clock)
    session = store.create_session(
        change_id="change", repository="Prathamesh-Pawar/flylab", pr_number=9,
        merge_sha="9" * 40, scenario_id="flexible-date-search-candidate",
    )
    store.transition(session.id, "awaiting_deployment")
    store.transition(session.id, "exercising")
    session.release_sha = session.merge_sha
    session.route = "/api/search/flexible"
    session.request_id = "request-9"
    session.operation_id = "search-9"
    store.start_stream(session.id)
    resume_after = store.events_after(session.id, None)[-1].id
    clock.value += 45
    replay = ReplayService(store, clock=clock, cursor_secret=b"cursor")
    app = create_app(
        _config(), store=store, replay=replay, flightlab=FlightLab(), snapshotter=Snapshotter()
    )

    with TestClient(app) as client:
        events = client.get(
            f"/monitoring/v1/sessions/{session.id}/events",
            headers={"Last-Event-ID": resume_after},
        )
        metrics = client.get("/metrics")

    assert events.status_code == 200
    assert "event: observation.available" in events.text
    assert "event: session.state" in events.text
    assert f"id: {resume_after}\n" not in events.text
    assert metrics.status_code == 200
    assert "opssemble_search_latency" in metrics.text
    assert f'session_id="{session.id}"' in metrics.text


def test_prometheus_snapshot_emits_only_one_sample_per_series():
    """Catches invalid Prometheus text containing duplicate label sets in one scrape."""
    from monitoring.prometheus import render_metrics
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore

    clock = Clock()
    store = SessionStore(clock=clock)
    replay = ReplayService(store, clock=clock)
    session = store.create_session(
        change_id="change", repository="Prathamesh-Pawar/flylab", pr_number=10,
        merge_sha="a" * 40, scenario_id="booking-timeout-retry-candidate",
    )
    store.transition(session.id, "awaiting_deployment")
    store.transition(session.id, "exercising")
    session.release_sha = session.merge_sha
    session.route = "/api/book"
    session.request_id = "request-10"
    session.operation_id = "op-204"
    store.start_stream(session.id)
    clock.value += 45

    lines = [line for line in render_metrics(store, replay).splitlines() if line and not line.startswith("#")]
    series = [line.rsplit(" ", 1)[0] for line in lines]
    assert len(series) == len(set(series))
