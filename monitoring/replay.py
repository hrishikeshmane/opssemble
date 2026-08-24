"""Elapsed-time observation visibility and authenticated cursor batches."""

import asyncio
import base64
import binascii
from copy import deepcopy
from hashlib import sha256
import hmac
import json
from pathlib import Path
import time
from typing import Any, Awaitable, Callable

from .loader import GeneratedScenario, load_generated_scenario
from .store import Session, SessionStore


GENERATED_ROOT = Path(__file__).parent / "generated" / "v1"
STREAM_NAMES = ("metrics", "logs", "traces", "events")


class InvalidCursor(ValueError):
    def __init__(self):
        super().__init__("INVALID_CURSOR")


class SessionIncomplete(RuntimeError):
    pass


def _canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


class ReplayService:
    def __init__(self, store: SessionStore, *, generated_root: Path = GENERATED_ROOT,
                 clock: Callable[[], float] = time.time, replay_speed: float = 1.0,
                 cursor_secret: bytes | None = None,
                 sleep: Callable[[float], Awaitable[None]] = asyncio.sleep):
        if replay_speed <= 0:
            raise ValueError("replay speed must be positive")
        self.store = store
        self.generated_root = Path(generated_root)
        self.clock = clock
        self.replay_speed = replay_speed
        self.cursor_secret = cursor_secret or sha256(str(id(store)).encode()).digest()
        self.sleep = sleep
        self._cache: dict[str, GeneratedScenario] = {}

    def _generated(self, scenario_id: str) -> GeneratedScenario:
        if scenario_id not in self._cache:
            self._cache[scenario_id] = load_generated_scenario(scenario_id, self.generated_root)
        return self._cache[scenario_id]

    def _elapsed_ms(self, session: Session) -> int:
        if session.stream_started_at is None:
            return 0
        return max(0, int((self.clock() - session.stream_started_at) * 1_000 * self.replay_speed))

    @staticmethod
    def _replace(value: Any, bindings: dict[str, str]) -> Any:
        if isinstance(value, str):
            return bindings.get(value, value)
        if isinstance(value, list):
            return [ReplayService._replace(item, bindings) for item in value]
        if isinstance(value, dict):
            return {key: ReplayService._replace(item, bindings) for key, item in value.items()}
        return value

    def _bound_records(self, session: Session, stream: str) -> list[dict[str, Any]]:
        bindings = {
            "{{release_sha}}": session.release_sha or session.merge_sha,
            "{{route}}": session.route or "",
            "{{request_id}}": session.request_id or "",
            "{{operation_id}}": session.operation_id or "",
            "{{trace_id}}": session.trace_id or "",
            "{{session_id}}": session.id,
        }
        return [self._replace(deepcopy(record), bindings)
                for record in self._generated(session.scenario_id).streams[stream]]

    @staticmethod
    def _matches(record: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            if expected is None:
                continue
            actual = record.get(key, record.get("attributes", {}).get(key))
            if isinstance(expected, list):
                if actual not in expected:
                    return False
            elif actual != expected:
                return False
        return True

    def _query_hash(self, query: dict[str, Any]) -> str:
        return sha256(_canonical(query)).hexdigest()

    def _encode_cursor(self, session_id: str, stream: str, query: dict[str, Any], index: int) -> str:
        payload = _canonical({
            "session": session_id,
            "tool": stream,
            "query": self._query_hash(query),
            "index": index,
        })
        signature = hmac.new(self.cursor_secret, payload, sha256).digest()
        encoded_payload = base64.urlsafe_b64encode(payload).decode().rstrip("=")
        encoded_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
        return f"{encoded_payload}.{encoded_signature}"

    def _decode_cursor(self, cursor: str, session_id: str, stream: str,
                       query: dict[str, Any]) -> int:
        try:
            encoded_payload, encoded_signature = cursor.split(".")
            payload = base64.urlsafe_b64decode(encoded_payload + "=" * (-len(encoded_payload) % 4))
            signature = base64.urlsafe_b64decode(
                encoded_signature + "=" * (-len(encoded_signature) % 4)
            )
            if not hmac.compare_digest(signature, hmac.new(self.cursor_secret, payload, sha256).digest()):
                raise InvalidCursor()
            decoded = json.loads(payload)
            if decoded != {
                "session": session_id,
                "tool": stream,
                "query": self._query_hash(query),
                "index": decoded.get("index"),
            } or not isinstance(decoded["index"], int) or decoded["index"] < 0:
                raise InvalidCursor()
            return decoded["index"]
        except (ValueError, KeyError, json.JSONDecodeError, UnicodeDecodeError, binascii.Error):
            raise InvalidCursor() from None

    def _materialize_events(self, session: Session, elapsed_ms: int) -> None:
        for stream in STREAM_NAMES:
            for record in self._bound_records(session, stream):
                if record["availableAfterMs"] <= elapsed_ms:
                    self.store.append_observation_event(session.id, record)

    async def query(self, session_id: str, stream: str, query: dict[str, Any], *,
                    cursor: str | None = None, limit: int = 100, wait_ms: int = 0) -> dict[str, Any]:
        if stream not in STREAM_NAMES:
            raise ValueError("unknown evidence stream")
        if not 0 <= wait_ms <= 5_000:
            raise ValueError("waitMs must be between 0 and 5000")
        if not 1 <= limit <= 500:
            raise ValueError("limit must be between 1 and 500")
        session = self.store.get_session(session_id)
        if session is None:
            raise KeyError("session not found")
        index = self._decode_cursor(cursor, session_id, stream, query) if cursor else 0
        if session.completion_status == "incomplete":
            raise SessionIncomplete(session.error_code or "SESSION_INCOMPLETE")
        if session.stream_started_at is None:
            return {
                "items": [],
                "stream": {
                    "mode": "replay", "state": "pending",
                    "cursor": self._encode_cursor(session_id, stream, query, index),
                    "hasMore": False, "nextPollAfterMs": 1_000,
                },
            }

        elapsed_ms = self._elapsed_ms(session)
        records = [record for record in self._bound_records(session, stream) if self._matches(record, query)]
        records.sort(key=lambda record: (record["availableAfterMs"], record["evidenceId"]))
        visible_count = sum(record["availableAfterMs"] <= elapsed_ms for record in records)
        end = min(visible_count, index + limit)
        items = records[index:end] if index <= visible_count else []
        if not items and wait_ms and elapsed_ms < 45_000:
            await self.sleep(wait_ms / 1_000)
            return await self.query(session_id, stream, query, cursor=cursor, limit=limit, wait_ms=0)

        self._materialize_events(session, elapsed_ms)
        if elapsed_ms >= 45_000 and session.state == "streaming":
            self.store.transition(session.id, "complete")
        state = "complete" if session.state == "complete" else "streaming"
        stream_data: dict[str, Any] = {
            "mode": "replay",
            "state": state,
            "cursor": self._encode_cursor(session_id, stream, query, end),
            "hasMore": end < visible_count,
        }
        if items:
            stream_data["watermark"] = items[-1]["observedAt"]
        if state == "streaming" and not stream_data["hasMore"]:
            future = [record["availableAfterMs"] for record in records if record["availableAfterMs"] > elapsed_ms]
            stream_data["nextPollAfterMs"] = max(1, int((min(future) - elapsed_ms) / self.replay_speed)) if future else 1_000
        return {"items": items, "stream": stream_data}

    def materialize_session_events(self, session_id: str) -> None:
        session = self.store.get_session(session_id)
        if session is None or session.stream_started_at is None:
            return
        elapsed_ms = self._elapsed_ms(session)
        self._materialize_events(session, elapsed_ms)
        if elapsed_ms >= 45_000 and session.state == "streaming":
            self.store.transition(session.id, "complete")

    def visible_records(self, session_id: str, stream: str) -> list[dict[str, Any]]:
        """Return the current authoritative visible snapshot for rendering/export."""
        if stream not in STREAM_NAMES:
            raise ValueError("unknown evidence stream")
        session = self.store.get_session(session_id)
        if session is None or session.stream_started_at is None:
            return []
        elapsed_ms = self._elapsed_ms(session)
        records = self._bound_records(session, stream)
        visible = [record for record in records if record["availableAfterMs"] <= elapsed_ms]
        visible.sort(key=lambda record: (record["availableAfterMs"], record["evidenceId"]))
        self._materialize_events(session, elapsed_ms)
        if elapsed_ms >= 45_000 and session.state == "streaming":
            self.store.transition(session.id, "complete")
        return visible
