"""Prometheus rendering over the currently visible replay snapshot."""

import re

from .replay import ReplayService
from .store import SessionStore


def _safe(value: str) -> str:
    sanitized = re.sub(r"[^a-zA-Z0-9_:]", "_", value)
    if not sanitized or sanitized[0].isdigit():
        sanitized = "_" + sanitized
    return sanitized


def _quote(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def render_metrics(store: SessionStore, replay: ReplayService) -> str:
    lines = ["# Opssemble currently visible generated metrics"]
    for session in list(store.sessions.values()):
        latest: dict[tuple[str, tuple[tuple[str, str], ...]], tuple[dict, dict[str, str]]] = {}
        for record in replay.visible_records(session.id, "metrics"):
            value = record.get("attributes", {}).get("value")
            if not isinstance(value, (int, float)):
                continue
            name = _safe("opssemble_" + record["name"])
            labels = {
                "session_id": session.id,
                "release_sha": record["releaseSha"],
                "route": record["route"],
                "operation_id": record["operationId"],
                "provider": record["provider"],
                "unit": record.get("unit", ""),
            }
            series = (name, tuple(sorted((key, str(value)) for key, value in labels.items())))
            latest[series] = (record, labels)
        for (name, _series_labels), (record, labels) in sorted(latest.items()):
            rendered_labels = ",".join(
                f'{_safe(key)}="{_quote(str(label))}"' for key, label in sorted(labels.items())
            )
            lines.append(f"{name}{{{rendered_labels}}} {record['attributes']['value']}")
    return "\n".join(lines) + "\n"
