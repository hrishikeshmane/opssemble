"""Validation and session matching for FlightLab's neutral runtime trigger."""

from datetime import datetime
import json
from typing import Any, Mapping

from .signing import verify_sha256
from .store import SessionStore


FIELDS = {
    "eventId", "observedAt", "service", "releaseSha", "route",
    "requestId", "operationId", "statusCode", "durationMs",
}


class IngressError(ValueError):
    def __init__(self, status_code: int, code: str):
        super().__init__(code)
        self.status_code = status_code
        self.code = code


class RuntimeIngress:
    def __init__(self, store: SessionStore, *, secret: str):
        self.store = store
        self.secret = secret

    @staticmethod
    def _validate(envelope: Any) -> dict[str, Any]:
        if not isinstance(envelope, dict) or set(envelope) != FIELDS:
            raise IngressError(400, "INVALID_ENVELOPE")
        string_fields = FIELDS - {"statusCode", "durationMs"}
        if any(not isinstance(envelope[field], str) or not envelope[field] for field in string_fields):
            raise IngressError(400, "INVALID_ENVELOPE")
        if type(envelope["statusCode"]) is not int or type(envelope["durationMs"]) is not int:
            raise IngressError(400, "INVALID_ENVELOPE")
        if envelope["durationMs"] < 0 or not 100 <= envelope["statusCode"] <= 599:
            raise IngressError(400, "INVALID_ENVELOPE")
        try:
            datetime.fromisoformat(envelope["observedAt"].replace("Z", "+00:00"))
        except ValueError as error:
            raise IngressError(400, "INVALID_ENVELOPE") from error
        if envelope["service"] != "flightlab":
            raise IngressError(400, "INVALID_SERVICE")
        return envelope

    def ingest(self, headers: Mapping[str, str], body: bytes) -> dict[str, Any]:
        if not verify_sha256(headers, "X-Opssemble-Signature-256", body, self.secret):
            raise IngressError(401, "INVALID_SIGNATURE")
        try:
            envelope = self._validate(json.loads(body))
        except json.JSONDecodeError as error:
            raise IngressError(400, "INVALID_JSON") from error

        for session in self.store.sessions.values():
            if envelope["eventId"] in session.trigger_event_ids:
                return {"accepted": True, "duplicate": True, "sessionId": session.id}

        candidates = [
            session for session in self.store.sessions.values()
            if session.state == "exercising"
            and session.release_sha == envelope["releaseSha"]
            and session.route == envelope["route"]
            and session.request_id == envelope["requestId"]
        ]
        if len(candidates) != 1:
            raise IngressError(409, "NO_MATCHING_SESSION")
        session = candidates[0]
        session.trigger_event_ids.add(envelope["eventId"])
        session.pending_trigger = envelope
        session.operation_id = envelope["operationId"]
        return {"accepted": True, "duplicate": False, "sessionId": session.id}
