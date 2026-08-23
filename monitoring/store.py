"""Bounded in-memory state for one-replica monitoring sessions."""

from dataclasses import dataclass, field
from hashlib import sha256
import time
from typing import Any, Callable


LIFECYCLE = ("merged", "awaiting_deployment", "exercising", "streaming", "complete")


class CapacityError(RuntimeError):
    pass


@dataclass(frozen=True)
class SSEEvent:
    id: str
    type: str
    data: dict[str, Any]


@dataclass
class Session:
    id: str
    change_id: str
    repository: str
    pr_number: int
    merge_sha: str
    scenario_id: str
    state: str
    completion_status: str
    created_at: float
    updated_at: float
    release_sha: str | None = None
    route: str | None = None
    request_id: str | None = None
    operation_id: str | None = None
    trace_id: str | None = None
    stream_started_at: float | None = None
    error_code: str | None = None
    error_detail: str | None = None
    pending_trigger: dict[str, Any] | None = None
    trigger_event_ids: set[str] = field(default_factory=set)
    announced_evidence_ids: set[str] = field(default_factory=set)
    events: list[SSEEvent] = field(default_factory=list)


class SessionStore:
    """Authoritative ephemeral state; intentionally unsuitable for multiple replicas."""

    def __init__(self, *, clock: Callable[[], float] = time.time, ttl_seconds: int = 7_200,
                 max_sessions: int = 100):
        self.clock = clock
        self.ttl_seconds = ttl_seconds
        self.max_sessions = max_sessions
        self.sessions: dict[str, Session] = {}
        self.merge_keys: dict[tuple[str, int, str], str] = {}
        self.changes: dict[str, dict[str, Any]] = {}
        self.deliveries: dict[str, dict[str, Any]] = {}
        self.change_events: dict[tuple[str, int, str, str], dict[str, Any]] = {}
        self.actions: dict[str, dict[str, Any]] = {}

    def _append_event(self, session: Session, event_type: str, data: dict[str, Any]) -> SSEEvent:
        event = SSEEvent(str(len(session.events) + 1), event_type, data)
        session.events.append(event)
        session.updated_at = self.clock()
        return event

    def _purge_expired(self) -> None:
        cutoff = self.clock() - self.ttl_seconds
        for session_id, session in list(self.sessions.items()):
            if session.created_at <= cutoff:
                self._delete(session_id)

    def _delete(self, session_id: str) -> None:
        session = self.sessions.pop(session_id, None)
        if session:
            merge_key = (session.repository, session.pr_number, session.merge_sha)
            if self.merge_keys.get(merge_key) == session_id:
                self.merge_keys.pop(merge_key, None)

    def create_session(self, *, change_id: str, repository: str, pr_number: int, merge_sha: str,
                       scenario_id: str, session_id: str | None = None,
                       deduplicate: bool = True) -> Session:
        self._purge_expired()
        merge_key = (repository, pr_number, merge_sha)
        existing_id = self.merge_keys.get(merge_key) if deduplicate else None
        if existing_id and existing_id in self.sessions:
            return self.sessions[existing_id]
        if len(self.sessions) >= self.max_sessions:
            evictable = sorted(
                (session for session in self.sessions.values()
                 if session.state == "complete" or session.completion_status == "incomplete"),
                key=lambda session: session.updated_at,
            )
            if not evictable:
                raise CapacityError("session capacity reached")
            self._delete(evictable[0].id)
        now = self.clock()
        token = sha256(f"{repository}:{pr_number}:{merge_sha}".encode()).hexdigest()[:16]
        session = Session(
            id=session_id or f"session-{token}",
            change_id=change_id,
            repository=repository,
            pr_number=pr_number,
            merge_sha=merge_sha,
            scenario_id=scenario_id,
            state="merged",
            completion_status="pending",
            created_at=now,
            updated_at=now,
            trace_id=f"trace-{token[:10]}",
        )
        self.sessions[session.id] = session
        if deduplicate:
            self.merge_keys[merge_key] = session.id
        self._append_event(session, "session.state", {"state": "merged", "completionStatus": "pending"})
        return session

    def get_session(self, session_id: str) -> Session | None:
        self._purge_expired()
        return self.sessions.get(session_id)

    def transition(self, session_id: str, state: str) -> Session:
        session = self.sessions[session_id]
        if state not in LIFECYCLE:
            raise ValueError("invalid session state")
        current_index = LIFECYCLE.index(session.state)
        target_index = LIFECYCLE.index(state)
        if target_index != current_index + 1:
            if target_index == current_index:
                return session
            raise ValueError(f"invalid transition {session.state} -> {state}")
        session.state = state
        if state == "complete":
            session.completion_status = "complete"
        self._append_event(session, "session.state", {
            "state": state,
            "completionStatus": session.completion_status,
        })
        return session

    def start_stream(self, session_id: str) -> Session:
        session = self.transition(session_id, "streaming")
        session.stream_started_at = self.clock()
        session.completion_status = "streaming"
        session.events[-1] = SSEEvent(session.events[-1].id, "session.state", {
            "state": "streaming", "completionStatus": "streaming",
        })
        return session

    def mark_incomplete(self, session_id: str, code: str, detail: str) -> Session:
        session = self.sessions[session_id]
        session.completion_status = "incomplete"
        session.error_code = code
        session.error_detail = detail
        session.stream_started_at = None
        self._append_event(session, "session.state", {
            "state": session.state,
            "completionStatus": "incomplete",
            "errorCode": code,
        })
        return session

    def append_observation_event(self, session_id: str, record: dict[str, Any]) -> None:
        session = self.sessions[session_id]
        evidence_id = record["evidenceId"]
        if evidence_id in session.announced_evidence_ids:
            return
        session.announced_evidence_ids.add(evidence_id)
        self._append_event(session, "observation.available", {
            "evidenceId": evidence_id,
            "kind": record["kind"],
            "name": record["name"],
            "availableAfterMs": record["availableAfterMs"],
        })

    def append_action_event(self, session_id: str, action: dict[str, Any]) -> None:
        self._append_event(self.sessions[session_id], "action.updated", action)

    def events_after(self, session_id: str, last_event_id: str | None) -> list[SSEEvent]:
        session = self.sessions[session_id]
        after = int(last_event_id or 0)
        return [event for event in session.events if int(event.id) > after]

    def reset(self, session_id: str) -> bool:
        if session_id not in self.sessions:
            return False
        self._delete(session_id)
        return True
