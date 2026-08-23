"""Small stable records shared by generation and future runtime loaders."""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Scenario:
    id: str
    observation_window_ms: int


@dataclass(frozen=True)
class ScenarioSpec(Scenario):
    latency_name: str | None
    latency_percentile: str | None
    latency_value: int | None
    flag_percent: int | None
    product_counts: tuple[tuple[str, int, int], ...]
    event_names: tuple[str, ...]
    trace_style: str
    operation_id: str = "{{operation_id}}"


@dataclass(frozen=True)
class Observation:
    evidence_id: str
    available_after_ms: int
    observed_at: str
    provider: str
    kind: str
    name: str
    release_sha: str
    route: str
    request_id: str
    operation_id: str
    trace_id: str
    session_id: str
    attributes: dict[str, Any]
    unit: str | None = None

    def as_dict(self) -> dict[str, Any]:
        record = {
            "evidenceId": self.evidence_id,
            "availableAfterMs": self.available_after_ms,
            "observedAt": self.observed_at,
            "provider": self.provider,
            "kind": self.kind,
            "name": self.name,
            "releaseSha": self.release_sha,
            "route": self.route,
            "requestId": self.request_id,
            "operationId": self.operation_id,
            "traceId": self.trace_id,
            "sessionId": self.session_id,
            "attributes": self.attributes,
        }
        if self.unit is not None:
            record["unit"] = self.unit
        return record
