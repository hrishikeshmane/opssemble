"""Deterministically materialize declarative monitoring scenarios."""

from datetime import UTC, datetime, timedelta
from hashlib import sha256
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from .models import Observation, ScenarioSpec
from .scenario_definitions import load_scenarios


STREAMS = ("metrics", "logs", "traces", "events")
_START = datetime(2026, 8, 23, 16, 0, tzinfo=UTC)
GENERATOR_SEED = 204


def _trace_id(spec: ScenarioSpec) -> str:
    if spec.trace_style == "retry":
        return "trace-204"
    if spec.trace_style == "repair":
        return "trace-204-repair"
    if spec.trace_style == "gap":
        return "trace-204-gap"
    return "{{trace_id}}"


def _observation(spec: ScenarioSpec, stream: str, sequence: int, name: str, *, provider: str,
                 attributes: dict, unit: str | None = None, available_after_ms: int | None = None) -> dict:
    token = sha256(f"{spec.id}:{stream}:{sequence}:{name}".encode()).hexdigest()[:12]
    observed_at = (_START + timedelta(milliseconds=sequence * 500)).isoformat().replace("+00:00", "Z")
    return Observation(
        evidence_id=f"ev-{token}",
        available_after_ms=available_after_ms if available_after_ms is not None else min(sequence * 1_000, 45_000),
        observed_at=observed_at,
        provider=provider,
        kind=stream[:-1],
        name=name,
        release_sha="{{release_sha}}",
        route="{{route}}",
        request_id="{{request_id}}",
        operation_id=spec.operation_id,
        trace_id=_trace_id(spec),
        session_id="{{session_id}}",
        attributes=attributes,
        unit=unit,
    ).as_dict()


def _metric_records(spec: ScenarioSpec) -> list[dict]:
    measurements = [
        ("request_rate", "requests_per_second", 42),
        ("cpu_utilization", "percent", 46),
        ("worker_saturation", "percent", 38),
    ]
    if spec.latency_name:
        measurements.append((spec.latency_name, "milliseconds", spec.latency_value))
    records: list[dict] = []
    for metric_index, (name, unit, value) in enumerate(measurements):
        for sample_index, at_ms in enumerate(range(0, 45_001, 5_000)):
            attributes = {"value": value, "sampleAtMs": at_ms}
            if name.endswith("latency"):
                attributes["percentile"] = spec.latency_percentile
            if name == "worker_saturation" and spec.trace_style == "seat_scoring":
                attributes["value"] = 88
            records.append(_observation(spec, "metrics", metric_index * 10 + sample_index, name,
                                        provider="metrics", attributes=attributes, unit=unit,
                                        available_after_ms=at_ms))
    return records


def _log_names(spec: ScenarioSpec) -> list[tuple[str, dict]]:
    common = [("request_received", {"sequence": index}) for index in range(15)]
    if spec.trace_style == "retry":
        return common + [
            ("reservation_committed", {"reservationId": "res-204-a", "attemptKey": "attempt-204-a"}),
            ("response_timeout", {"afterCommit": 1, "attemptKey": "attempt-204-a"}),
            ("retry_started", {"attemptKey": "attempt-204-b"}),
            ("reservation_committed", {"reservationId": "res-204-b", "attemptKey": "attempt-204-b"}),
            ("payment_intent_created", {"paymentIntentId": "pi-204-a"}),
            ("payment_intent_created", {"paymentIntentId": "pi-204-b"}),
        ]
    if spec.trace_style == "repair":
        return common + [
            ("reservation_committed", {"reservationId": "res-204-a", "attemptKey": "booking-op-204"}),
            ("response_timeout", {"afterCommit": 1, "attemptKey": "booking-op-204"}),
            ("retry_started", {"attemptKey": "booking-op-204"}),
            ("payment_intent_created", {"paymentIntentId": "pi-204-a", "attemptKey": "booking-op-204"}),
            ("payment_succeeded", {"paymentIntentId": "pi-204-a", "status": "succeeded"}),
        ]
    if spec.trace_style == "gap":
        return common + [("response_timeout", {"afterCommit": 1, "attemptKey": "attempt-204-a"})] + [
            ("retry_started", {"attemptKey": "attempt-204-b"}) for _ in range(5)
        ]
    return common + [("request_completed", {"sequence": index}) for index in range(10)]


def _log_records(spec: ScenarioSpec) -> list[dict]:
    return [_observation(spec, "logs", index, name, provider="logs", attributes=attributes)
            for index, (name, attributes) in enumerate(_log_names(spec))]


def _trace_records(spec: ScenarioSpec) -> list[dict]:
    if spec.trace_style == "seat_scoring":
        names = [("seat_scoring", {"spanOrder": index, "durationMs": 120 + index}) for index in range(8)]
    elif spec.trace_style == "seven_day":
        names = [("search_aggregation", {"dayOffset": index, "durationMs": 30 + index}) for index in range(7)]
    elif spec.trace_style == "retry":
        names = [
            ("reservation_attempt", {"attemptKey": "attempt-204-a", "spanOrder": 1}),
            ("response_timeout", {"attemptKey": "attempt-204-a", "spanOrder": 2}),
            ("reservation_attempt", {"attemptKey": "attempt-204-b", "spanOrder": 3}),
            ("response_timeout", {"attemptKey": "attempt-204-b", "spanOrder": 4}),
            ("payment_intent", {"paymentIntentId": "pi-204-a", "spanOrder": 5}),
            ("payment_intent", {"paymentIntentId": "pi-204-b", "spanOrder": 6}),
        ]
    elif spec.trace_style == "repair":
        names = [("reservation_attempt", {"attemptKey": "booking-op-204", "spanOrder": index}) for index in range(6)]
    elif spec.trace_style == "gap":
        names = [
            ("fault_experiment", {"spanOrder": 1}),
            ("reservation_attempt", {"attemptKey": "attempt-204-a", "spanOrder": 2}),
            ("response_timeout", {"attemptKey": "attempt-204-a", "spanOrder": 3}),
            ("retry_started", {"attemptKey": "attempt-204-b", "spanOrder": 4}),
            ("provider_wait", {"spanOrder": 5}),
            ("request_closed", {"spanOrder": 6}),
        ]
    else:
        names = [("checkout_request", {"spanOrder": index, "durationMs": 80 + index}) for index in range(6)]
    return [_observation(spec, "traces", index, name, provider="tracing", attributes=attributes)
            for index, (name, attributes) in enumerate(names)]


def _event_records(spec: ScenarioSpec) -> list[dict]:
    events = list(spec.event_names)
    if spec.flag_percent is not None:
        events.insert(0, "feature_flag_evaluated")
    records = []
    for index, name in enumerate(events):
        attributes = {"sequence": index}
        if name == "feature_flag_evaluated":
            attributes["percent"] = spec.flag_percent
        if name == "fault_experiment_completed":
            attributes["status"] = "completed"
        records.append(_observation(spec, "events", index, name, provider="events", attributes=attributes))
    if spec.trace_style == "retry":
        side_effects = [
            ("reservation_committed", {"reservationId": "res-204-a", "attemptKey": "attempt-204-a"}),
            ("response_timeout", {"afterCommit": 1, "attemptKey": "attempt-204-a"}),
            ("retry_started", {"attemptKey": "attempt-204-b"}),
            ("reservation_committed", {"reservationId": "res-204-b", "attemptKey": "attempt-204-b"}),
            ("payment_intent_created", {"paymentIntentId": "pi-204-a", "attemptKey": "attempt-204-a"}),
            ("payment_intent_created", {"paymentIntentId": "pi-204-b", "attemptKey": "attempt-204-b"}),
        ]
    elif spec.trace_style == "repair":
        side_effects = [
            ("reservation_committed", {"reservationId": "res-204-a", "attemptKey": "booking-op-204"}),
            ("response_timeout", {"afterCommit": 1, "attemptKey": "booking-op-204"}),
            ("retry_started", {"attemptKey": "booking-op-204"}),
            ("payment_intent_created", {"paymentIntentId": "pi-204-a", "attemptKey": "booking-op-204"}),
        ]
    else:
        side_effects = []
    for name, attributes in side_effects:
        records.append(_observation(
            spec, "events", len(records), name, provider="booking", attributes=attributes,
        ))
    for count_index, (name, numerator, denominator) in enumerate(spec.product_counts, start=len(records)):
        records.append(_observation(
            spec,
            "events",
            count_index,
            name,
            provider="product",
            attributes={"numerator": numerator, "denominator": denominator},
            unit="count",
        ))
    return records


def records_for(spec: ScenarioSpec) -> dict[str, list[dict]]:
    """Build every evidence stream without reading or writing external state."""
    return {"metrics": _metric_records(spec), "logs": _log_records(spec),
            "traces": _trace_records(spec), "events": _event_records(spec)}


def _ndjson(records: list[dict]) -> bytes:
    return ("".join(json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n" for record in records)).encode()


def generate(output_dir: Path) -> dict:
    """Write all version-one artifacts and return their deterministic manifest."""
    output_dir = Path(output_dir)
    files: dict[str, str] = {}
    for spec in load_scenarios():
        for stream, records in records_for(spec).items():
            relative = f"{spec.id}/{stream}.ndjson"
            payload = _ndjson(records)
            path = output_dir / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
            files[relative] = sha256(payload).hexdigest()
    manifest = {"version": 1, "seed": GENERATOR_SEED, "files": files}
    (output_dir / "manifest.json").write_text(json.dumps(manifest, sort_keys=True, indent=2) + "\n")
    return manifest


def check_generated(output_dir: Path) -> bool:
    """Return whether output_dir is byte-for-byte equal to a fresh generation."""
    output_dir = Path(output_dir)
    if not output_dir.is_dir():
        return False
    with TemporaryDirectory(prefix="opssemble-generate-") as temporary:
        expected_dir = Path(temporary)
        generate(expected_dir)
        expected_files = {path.relative_to(expected_dir) for path in expected_dir.rglob("*") if path.is_file()}
        actual_files = {path.relative_to(output_dir) for path in output_dir.rglob("*") if path.is_file()}
        if actual_files != expected_files:
            return False
        return all((output_dir / relative).read_bytes() == (expected_dir / relative).read_bytes()
                   for relative in expected_files)
