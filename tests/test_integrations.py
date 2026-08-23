"""GitHub, deployment, journey, and neutral-ingress integration contracts."""

from dataclasses import dataclass
from hashlib import sha256
import hmac
import json
import base64

import httpx
import pytest


@dataclass
class Clock:
    value: float = 1_700_000_000.0

    def __call__(self) -> float:
        return self.value

    async def sleep(self, seconds: float) -> None:
        self.value += seconds


def _signed(secret: str, body: bytes, header="X-Hub-Signature-256") -> dict[str, str]:
    digest = hmac.new(secret.encode(), body, sha256).hexdigest()
    return {header: f"sha256={digest}"}


def _pull_request_payload(*, action="closed", labels=None, merged=True, repository="Prathamesh-Pawar/flylab"):
    return {
        "action": action,
        "repository": {"full_name": repository, "html_url": f"https://github.com/{repository}"},
        "pull_request": {
            "number": 204,
            "title": "Retry booking timeouts",
            "body": "Exercise the booking path.",
            "state": "closed" if action == "closed" else "open",
            "merged": merged,
            "merged_at": "2026-08-23T20:00:00Z" if merged else None,
            "head": {"sha": "a" * 40, "ref": "feature/booking"},
            "base": {"sha": "0" * 40, "ref": "main"},
            "merge_commit_sha": "b" * 40 if merged else None,
            "html_url": "https://github.com/Prathamesh-Pawar/flylab/pull/204",
            "labels": [{"name": label} for label in (labels or [])],
        },
    }


class Snapshotter:
    def __init__(self):
        self.calls = 0

    async def snapshot(self, payload):
        self.calls += 1
        pull = payload["pull_request"]
        return {
            "changeId": f"Prathamesh-Pawar/flylab#{pull['number']}",
            "dataMode": "live",
            "repository": payload["repository"]["full_name"],
            "number": pull["number"],
            "title": pull["title"],
            "state": "merged" if pull["merged"] else pull["state"],
            "headSha": pull["head"]["sha"],
            "mergeSha": pull["merge_commit_sha"],
            "releaseSha": None,
            "changedFiles": [{"path": "app/api/book/route.ts", "additions": 20, "deletions": 0}],
            "diff": "diff --git a/app/api/book/route.ts b/app/api/book/route.ts\n",
            "repositoryDocs": {"README.md": "FlightLab"},
            "checks": {"state": "success", "required": []},
            "deployment": {"state": "pending", "url": None},
        }


@pytest.mark.asyncio
async def test_github_webhook_verifies_allowlists_deduplicates_and_hides_routing_labels():
    """Catches forged/cross-repo deliveries and leaked internal selectors."""
    from monitoring.github import WebhookError, WebhookService
    from monitoring.store import SessionStore

    store = SessionStore()
    snapshotter = Snapshotter()
    started = []

    async def on_session(session_id):
        started.append(session_id)

    service = WebhookService(
        store=store,
        repository="Prathamesh-Pawar/flylab",
        webhook_secret="github-secret",
        snapshotter=snapshotter,
        on_session=on_session,
    )
    payload = _pull_request_payload(labels=["opssemble:booking-timeout-retry"])
    body = json.dumps(payload).encode()
    headers = {**_signed("github-secret", body), "X-GitHub-Delivery": "delivery-1"}

    result = await service.handle(headers, body)
    duplicate = await service.handle(headers, body)

    assert result["sessionId"] == duplicate["sessionId"]
    assert snapshotter.calls == 1
    assert started == [result["sessionId"]]
    public = service.public_change(result["changeId"])
    assert "labels" not in public
    assert "scenarioId" not in public
    assert "routingLabel" not in public
    assert public["dataMode"] == "live"

    with pytest.raises(WebhookError) as bad_signature:
        await service.handle({"X-GitHub-Delivery": "delivery-2"}, body)
    assert bad_signature.value.status_code == 401

    foreign = json.dumps(_pull_request_payload(
        labels=["opssemble:booking-timeout-retry"], repository="someone/else"
    )).encode()
    with pytest.raises(WebhookError) as bad_repository:
        await service.handle({**_signed("github-secret", foreign), "X-GitHub-Delivery": "delivery-3"}, foreign)
    assert bad_repository.value.status_code == 403


@pytest.mark.asyncio
async def test_github_records_open_and_unsupported_or_multiply_labeled_merges_without_streams():
    """Catches accidental scenario activation from absent or ambiguous labels."""
    from monitoring.github import WebhookService
    from monitoring.store import SessionStore

    store = SessionStore()
    service = WebhookService(
        store=store, repository="Prathamesh-Pawar/flylab", webhook_secret="secret",
        snapshotter=Snapshotter(), on_session=lambda _session_id: _completed(),
    )
    deliveries = [
        _pull_request_payload(action="opened", merged=False),
        _pull_request_payload(labels=[]),
        _pull_request_payload(labels=["opssemble:booking-timeout-retry", "opssemble:flexible-date-search"]),
    ]
    deliveries[2]["pull_request"]["number"] = 206
    deliveries[2]["pull_request"]["head"]["sha"] = "e" * 40
    deliveries[2]["pull_request"]["merge_commit_sha"] = "f" * 40
    results = []
    for index, payload in enumerate(deliveries):
        body = json.dumps(payload).encode()
        results.append(await service.handle(
            {**_signed("secret", body), "X-GitHub-Delivery": f"delivery-{index}"}, body
        ))

    assert results[0]["routingStatus"] == "not_merged"
    assert results[1]["routingStatus"] == "unsupported"
    assert results[2]["routingStatus"] == "ambiguous"
    assert not store.sessions


async def _completed():
    return None


class FlightLab:
    def __init__(self, versions, *, response_status=504, on_exercise=None, error=None):
        self.versions = list(versions)
        self.response_status = response_status
        self.on_exercise = on_exercise
        self.error = error
        self.journeys = []

    async def get_version(self):
        if len(self.versions) > 1:
            return self.versions.pop(0)
        return self.versions[0]

    async def exercise(self, journey):
        self.journeys.append(journey)
        if self.error:
            raise self.error
        if self.on_exercise:
            await self.on_exercise(journey, self.response_status)
        return self.response_status


@pytest.mark.asyncio
async def test_lifecycle_waits_for_matching_release_and_valid_signed_trigger_before_streaming():
    """Catches streams starting from a stale deployment or unsigned browser traffic."""
    from monitoring.lifecycle import LifecycleCoordinator
    from monitoring.runtime_ingress import RuntimeIngress
    from monitoring.store import SessionStore

    clock = Clock()
    store = SessionStore(clock=clock)
    session = store.create_session(
        change_id="change-204", repository="Prathamesh-Pawar/flylab", pr_number=204,
        merge_sha="b" * 40, scenario_id="booking-timeout-retry-candidate",
    )
    store.changes[session.change_id] = {
        "changeId": session.change_id,
        "releaseSha": None,
        "deployment": {"state": "pending", "url": None},
    }
    ingress = RuntimeIngress(store, secret="ingress-secret")

    async def trigger(journey, status):
        envelope = {
            "eventId": "event-204", "observedAt": "2026-08-23T20:00:04Z",
            "service": "flightlab", "releaseSha": "b" * 40,
            "route": journey.route, "requestId": journey.request_id,
            "operationId": "op-204", "statusCode": status, "durationMs": 2280,
        }
        body = json.dumps(envelope, sort_keys=True, separators=(",", ":")).encode()
        result = ingress.ingest(_signed("ingress-secret", body, "X-Opssemble-Signature-256"), body)
        assert result["accepted"] is True

    flightlab = FlightLab(
        [{"service": "flightlab", "releaseSha": "old"},
         {"service": "flightlab", "releaseSha": "b" * 40}],
        on_exercise=trigger,
    )
    coordinator = LifecycleCoordinator(
        store, flightlab, clock=clock, sleep=clock.sleep,
        deployment_poll_seconds=2, deployment_timeout_seconds=6, trigger_timeout_seconds=2,
    )

    await coordinator.run(session.id)

    current = store.get_session(session.id)
    assert current.state == "streaming"
    assert current.stream_started_at == clock.value
    assert len(flightlab.journeys) == 1
    assert flightlab.journeys[0].route == "/api/book"
    assert clock.value == 1_700_000_002.0
    assert store.changes[session.change_id]["releaseSha"] == "b" * 40
    assert store.changes[session.change_id]["deployment"]["state"] == "deployed"


@pytest.mark.asyncio
async def test_lifecycle_keeps_failed_deployment_traffic_and_missing_trigger_incomplete():
    """Catches fabricated success when a required external gate fails."""
    from monitoring.lifecycle import LifecycleCoordinator
    from monitoring.store import SessionStore

    async def run_case(flightlab, expected_code):
        clock = Clock()
        store = SessionStore(clock=clock)
        session = store.create_session(
            change_id=expected_code, repository="Prathamesh-Pawar/flylab", pr_number=205,
            merge_sha="c" * 40, scenario_id="booking-timeout-retry-candidate",
        )
        coordinator = LifecycleCoordinator(
            store, flightlab, clock=clock, sleep=clock.sleep,
            deployment_poll_seconds=1, deployment_timeout_seconds=2, trigger_timeout_seconds=2,
        )
        await coordinator.run(session.id)
        current = store.get_session(session.id)
        assert current.completion_status == "incomplete"
        assert current.error_code == expected_code
        assert current.stream_started_at is None
        return current

    await run_case(FlightLab([{"service": "flightlab", "releaseSha": "old"}]), "DEPLOYMENT_TIMEOUT")
    await run_case(FlightLab([{"service": "flightlab", "releaseSha": "c" * 40}], error=OSError("offline")), "TRAFFIC_ERROR")
    await run_case(FlightLab([{"service": "flightlab", "releaseSha": "c" * 40}]), "MISSING_TRIGGER")


def test_runtime_ingress_rejects_bad_shapes_mismatches_and_deduplicates_event_ids():
    """Catches unsigned, extra-field, wrong-release, and duplicate neutral triggers."""
    from monitoring.runtime_ingress import IngressError, RuntimeIngress
    from monitoring.store import SessionStore

    store = SessionStore()
    session = store.create_session(
        change_id="change", repository="Prathamesh-Pawar/flylab", pr_number=7,
        merge_sha="d" * 40, scenario_id="flexible-date-search-candidate",
    )
    store.transition(session.id, "awaiting_deployment")
    store.transition(session.id, "exercising")
    session.release_sha = session.merge_sha
    session.route = "/api/search/flexible"
    session.request_id = "request-7"
    ingress = RuntimeIngress(store, secret="ingress")
    envelope = {
        "eventId": "event-7", "observedAt": "2026-08-23T20:00:04Z", "service": "flightlab",
        "releaseSha": session.merge_sha, "route": session.route, "requestId": session.request_id,
        "operationId": "search-7", "statusCode": 200, "durationMs": 430,
    }
    body = json.dumps(envelope, sort_keys=True, separators=(",", ":")).encode()
    headers = _signed("ingress", body, "X-Opssemble-Signature-256")

    assert ingress.ingest(headers, body) == {"accepted": True, "duplicate": False, "sessionId": session.id}
    assert ingress.ingest(headers, body) == {"accepted": True, "duplicate": True, "sessionId": session.id}

    with pytest.raises(IngressError) as unsigned:
        ingress.ingest({}, body)
    assert unsigned.value.status_code == 401
    extra = {**envelope, "provider": "cloudwatch"}
    extra_body = json.dumps(extra, sort_keys=True, separators=(",", ":")).encode()
    with pytest.raises(IngressError) as bad_shape:
        ingress.ingest(_signed("ingress", extra_body, "X-Opssemble-Signature-256"), extra_body)
    assert bad_shape.value.status_code == 400


@pytest.mark.asyncio
async def test_live_snapshotter_collects_files_diff_docs_and_checks_from_github():
    """Catches planner context built only from webhook summary metadata."""
    from monitoring.github_client import GitHubSnapshotter

    def response(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/pulls/204/files"):
            return httpx.Response(200, json=[{
                "filename": "app/api/book/route.ts", "additions": 20, "deletions": 0,
                "status": "added", "patch": "@@ -0,0 +1 @@\n+export async function POST() {}",
            }])
        if path.endswith("/commits/" + "a" * 40 + "/check-runs"):
            return httpx.Response(200, json={"check_runs": [{
                "name": "test", "status": "completed", "conclusion": "success",
                "html_url": "https://github.example/check/1",
            }]})
        if "/contents/" in path:
            name = path.split("/contents/", 1)[1]
            if name in {"README.md", "docs/ARCHITECTURE.md", "docs/RUNBOOK.md", "docs/PRODUCT_METRICS.md"}:
                return httpx.Response(200, json={
                    "encoding": "base64", "content": base64.b64encode(f"contents of {name}".encode()).decode(),
                })
            return httpx.Response(404)
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(response), base_url="https://api.github.com")
    snapshotter = GitHubSnapshotter("Prathamesh-Pawar/flylab", "token", client=client)
    snapshot = await snapshotter.snapshot(_pull_request_payload(action="opened", merged=False))
    await snapshotter.aclose()

    assert snapshot["dataMode"] == "live"
    assert snapshot["baseSha"] == "0" * 40
    assert snapshot["changedFiles"] == [{
        "path": "app/api/book/route.ts", "additions": 20, "deletions": 0, "status": "added",
    }]
    assert snapshot["diff"].startswith("diff --git a/app/api/book/route.ts")
    assert set(snapshot["repositoryDocs"]) == {
        "README.md", "docs/ARCHITECTURE.md", "docs/RUNBOOK.md", "docs/PRODUCT_METRICS.md",
    }
    assert snapshot["checks"]["state"] == "success"
    assert "labels" not in snapshot


@pytest.mark.asyncio
async def test_live_snapshotter_does_not_treat_absent_checks_as_success():
    """Catches repair revalidation passing before GitHub has reported required checks."""
    from monitoring.github_client import GitHubSnapshotter

    def response(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/pulls/204/files"):
            return httpx.Response(200, json=[])
        if "/check-runs" in request.url.path:
            return httpx.Response(200, json={"check_runs": []})
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(response), base_url="https://api.github.com")
    snapshotter = GitHubSnapshotter("Prathamesh-Pawar/flylab", "token", client=client)
    snapshot = await snapshotter.snapshot(_pull_request_payload(action="opened", merged=False))
    await snapshotter.aclose()

    assert snapshot["checks"]["state"] == "pending"
