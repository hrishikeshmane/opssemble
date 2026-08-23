"""In-memory lifecycle, replay, cursor, and event contracts."""

from dataclasses import dataclass

import pytest


@dataclass
class Clock:
    value: float = 1_700_000_000.0

    def __call__(self) -> float:
        return self.value

    def advance(self, seconds: float) -> None:
        self.value += seconds


def _streaming_session(store, scenario_id="booking-timeout-retry-candidate"):
    session = store.create_session(
        change_id="change-204",
        repository="Prathamesh-Pawar/flylab",
        pr_number=204,
        merge_sha="a" * 40,
        scenario_id=scenario_id,
    )
    store.transition(session.id, "awaiting_deployment")
    store.transition(session.id, "exercising")
    session.release_sha = session.merge_sha
    session.route = "/api/book"
    session.request_id = "req-204"
    session.operation_id = "op-204"
    store.start_stream(session.id)
    return session


@pytest.mark.asyncio
async def test_replay_reveals_monotonic_batches_and_binds_live_correlation():
    """Catches early evidence release and unbound generated placeholders."""
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore

    clock = Clock()
    store = SessionStore(clock=clock)
    session = _streaming_session(store)
    replay = ReplayService(store, clock=clock, cursor_secret=b"cursor-secret")

    first = await replay.query(session.id, "metrics", {}, limit=2)
    assert len(first["items"]) == 2
    assert all(item["availableAfterMs"] == 0 for item in first["items"])
    assert {item["releaseSha"] for item in first["items"]} == {"a" * 40}
    assert {item["sessionId"] for item in first["items"]} == {session.id}
    assert {item["requestId"] for item in first["items"]} == {"req-204"}
    assert first["stream"]["state"] == "streaming"
    assert first["stream"]["hasMore"] is True

    second = await replay.query(session.id, "metrics", {}, cursor=first["stream"]["cursor"], limit=10)
    assert {item["evidenceId"] for item in first["items"]}.isdisjoint(
        {item["evidenceId"] for item in second["items"]}
    )
    clock.advance(5)
    third = await replay.query(session.id, "metrics", {}, cursor=second["stream"]["cursor"], limit=10)
    assert third["items"]
    assert min(item["availableAfterMs"] for item in third["items"]) == 5_000


@pytest.mark.asyncio
async def test_cursor_is_bound_to_session_tool_and_canonical_query():
    """Catches cursor replay against a broader or unrelated evidence query."""
    from monitoring.replay import InvalidCursor, ReplayService
    from monitoring.store import SessionStore

    clock = Clock()
    store = SessionStore(clock=clock)
    first_session = _streaming_session(store)
    second_session = store.create_session(
        change_id="other", repository="Prathamesh-Pawar/flylab", pr_number=205,
        merge_sha="b" * 40, scenario_id="booking-timeout-retry-candidate",
    )
    replay = ReplayService(store, clock=clock, cursor_secret=b"cursor-secret")
    batch = await replay.query(first_session.id, "logs", {"name": "request_received"})
    cursor = batch["stream"]["cursor"]

    with pytest.raises(InvalidCursor, match="INVALID_CURSOR"):
        await replay.query(first_session.id, "metrics", {"name": "request_received"}, cursor=cursor)
    with pytest.raises(InvalidCursor, match="INVALID_CURSOR"):
        await replay.query(first_session.id, "logs", {}, cursor=cursor)
    with pytest.raises(InvalidCursor, match="INVALID_CURSOR"):
        await replay.query(second_session.id, "logs", {"name": "request_received"}, cursor=cursor)
    tampered = cursor[:-1] + ("A" if cursor[-1] != "A" else "B")
    with pytest.raises(InvalidCursor, match="INVALID_CURSOR"):
        await replay.query(first_session.id, "logs", {"name": "request_received"}, cursor=tampered)


@pytest.mark.asyncio
async def test_replay_speed_completion_and_sse_resume_are_elapsed_time_derived():
    """Catches scheduler-dependent completion or duplicate resumed events."""
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore

    clock = Clock()
    store = SessionStore(clock=clock)
    session = _streaming_session(store, "flexible-date-search-candidate")
    replay = ReplayService(store, clock=clock, replay_speed=2, cursor_secret=b"cursor-secret")
    initial = store.events_after(session.id, None)
    last_initial_id = initial[-1].id

    await replay.query(session.id, "logs", {}, limit=100)
    after_initial = store.events_after(session.id, last_initial_id)
    assert after_initial
    assert {event.type for event in after_initial} == {"observation.available"}
    resume_id = after_initial[-1].id

    clock.advance(22.5)
    batch = await replay.query(session.id, "logs", {}, limit=100)
    assert batch["stream"]["state"] == "complete"
    resumed = store.events_after(session.id, resume_id)
    assert resumed
    assert resumed[-1].type == "session.state"
    assert resumed[-1].data["state"] == "complete"
    assert all(int(event.id) > int(resume_id) for event in resumed)


def test_store_enforces_ttl_capacity_reset_and_explicit_incomplete_state():
    """Catches leaked sessions, active-session eviction, and fake completion on failure."""
    from monitoring.store import CapacityError, SessionStore

    clock = Clock()
    store = SessionStore(clock=clock, ttl_seconds=10, max_sessions=1)
    session = store.create_session(
        change_id="one", repository="Prathamesh-Pawar/flylab", pr_number=1,
        merge_sha="1" * 40, scenario_id="smart-seat-bundles-rollout-50",
    )
    with pytest.raises(CapacityError):
        store.create_session(
            change_id="two", repository="Prathamesh-Pawar/flylab", pr_number=2,
            merge_sha="2" * 40, scenario_id="flexible-date-search-candidate",
        )
    store.mark_incomplete(session.id, "DEPLOYMENT_TIMEOUT", "release SHA never matched")
    assert store.get_session(session.id).completion_status == "incomplete"
    assert store.get_session(session.id).stream_started_at is None
    assert store.reset(session.id) is True
    assert store.reset(session.id) is False

    replacement = store.create_session(
        change_id="three", repository="Prathamesh-Pawar/flylab", pr_number=3,
        merge_sha="3" * 40, scenario_id="flexible-date-search-candidate",
    )
    clock.advance(11)
    assert store.get_session(replacement.id) is None


def test_cursor_round_trip_is_safe_for_arbitrary_signature_bytes():
    """Catches binary signature bytes being mistaken for token delimiters."""
    from monitoring.replay import ReplayService
    from monitoring.store import SessionStore

    replay = ReplayService(SessionStore(), cursor_secret=b"secret-5")
    cursor = replay._encode_cursor("session-test", "logs", {}, 0)

    assert replay._decode_cursor(cursor, "session-test", "logs", {}) == 0
