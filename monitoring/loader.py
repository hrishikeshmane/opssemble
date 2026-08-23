"""Validated readers for generated monitoring artifacts."""

from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
from typing import Any

from .generator import STREAMS
from .scenario_definitions import load_scenarios


_REQUIRED_FIELDS = {
    "evidenceId": str,
    "availableAfterMs": int,
    "observedAt": str,
    "provider": str,
    "kind": str,
    "name": str,
    "releaseSha": str,
    "route": str,
    "requestId": str,
    "operationId": str,
    "traceId": str,
    "sessionId": str,
    "attributes": dict,
}


@dataclass(frozen=True)
class GeneratedScenario:
    scenario_id: str
    streams: dict[str, list[dict[str, Any]]]


def _read_manifest(root: Path) -> dict[str, Any]:
    manifest_path = root / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("generated manifest is missing or invalid") from error
    if manifest.get("version") != 1 or not isinstance(manifest.get("files"), dict):
        raise ValueError("unsupported generated manifest")
    return manifest


def _read_stream(path: Path, expected_hash: str) -> list[dict[str, Any]]:
    try:
        payload = path.read_bytes()
    except OSError as error:
        raise ValueError(f"generated stream is missing: {path.name}") from error
    if sha256(payload).hexdigest() != expected_hash:
        raise ValueError(f"generated stream hash mismatch: {path.name}")
    records: list[dict[str, Any]] = []
    for line_number, line in enumerate(payload.decode().splitlines(), start=1):
        try:
            record = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid NDJSON at {path.name}:{line_number}") from error
        if not isinstance(record, dict) or any(
            field not in record or not isinstance(record[field], field_type)
            for field, field_type in _REQUIRED_FIELDS.items()
        ):
            raise ValueError(f"invalid observation at {path.name}:{line_number}")
        if record["availableAfterMs"] < 0 or record["availableAfterMs"] > 45_000:
            raise ValueError(f"invalid observation offset at {path.name}:{line_number}")
        records.append(record)
    return records


def load_generated_scenario(scenario_id: str, root: Path) -> GeneratedScenario:
    """Load one scenario after verifying its generated hashes and record shape."""
    supported = {scenario.id for scenario in load_scenarios()}
    if scenario_id not in supported:
        raise ValueError("unknown scenario")
    root = Path(root)
    manifest = _read_manifest(root)
    streams: dict[str, list[dict[str, Any]]] = {}
    for stream in STREAMS:
        relative = f"{scenario_id}/{stream}.ndjson"
        expected_hash = manifest["files"].get(relative)
        if not isinstance(expected_hash, str):
            raise ValueError(f"stream not listed in manifest: {relative}")
        streams[stream] = _read_stream(root / relative, expected_hash)
    return GeneratedScenario(scenario_id=scenario_id, streams=streams)
