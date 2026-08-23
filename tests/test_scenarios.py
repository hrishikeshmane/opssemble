"""Scenario declaration contracts."""

import hashlib
import json


def test_load_scenarios_exposes_the_seven_supported_scenarios():
    """Catches a missing or accidentally renamed monitoring scenario."""
    from monitoring import load_scenarios

    scenarios = load_scenarios()

    assert [scenario.id for scenario in scenarios] == [
        "smart-seat-bundles-baseline",
        "smart-seat-bundles-rollout-50",
        "smart-seat-bundles-restored",
        "flexible-date-search-candidate",
        "booking-timeout-retry-candidate",
        "booking-timeout-retry-repair-candidate",
        "booking-timeout-retry-telemetry-gap",
    ]
    assert {scenario.observation_window_ms for scenario in scenarios} == {45_000}


def test_generator_writes_versioned_observations_with_a_hash_manifest(tmp_path):
    """Catches omitted evidence streams or an unverifiable generated artifact."""
    from monitoring.generator import generate

    manifest = generate(tmp_path)

    assert manifest["version"] == 1
    assert len(manifest["files"]) == 28
    for scenario_id in (
        "smart-seat-bundles-baseline",
        "smart-seat-bundles-rollout-50",
        "smart-seat-bundles-restored",
        "flexible-date-search-candidate",
        "booking-timeout-retry-candidate",
        "booking-timeout-retry-repair-candidate",
        "booking-timeout-retry-telemetry-gap",
    ):
        for stream in ("metrics", "logs", "traces", "events"):
            path = tmp_path / scenario_id / f"{stream}.ndjson"
            assert path.exists()
            first_record = __import__("json").loads(path.read_text().splitlines()[0])
            assert {
                "evidenceId", "availableAfterMs", "observedAt", "provider", "kind", "name",
                "releaseSha", "route", "requestId", "operationId", "traceId", "sessionId",
            } <= first_record.keys()
            assert first_record["releaseSha"] == "{{release_sha}}"
            assert first_record["sessionId"] == "{{session_id}}"

    for relative, expected_hash in manifest["files"].items():
        assert hashlib.sha256((tmp_path / relative).read_bytes()).hexdigest() == expected_hash


def test_check_mode_detects_missing_and_changed_generated_bytes(tmp_path):
    """Catches stale checked-in observations instead of trusting manifest text."""
    from monitoring.generator import check_generated, generate

    assert check_generated(tmp_path) is False
    generate(tmp_path)
    assert check_generated(tmp_path) is True
    metric_path = tmp_path / "smart-seat-bundles-baseline" / "metrics.ndjson"
    metric_path.write_bytes(metric_path.read_bytes() + b"{}\n")
    assert check_generated(tmp_path) is False


def test_observations_do_not_embed_agent_conclusions(tmp_path):
    """Catches hidden verdict/root-cause/policy hints in generated evidence."""
    from monitoring.generator import generate

    generate(tmp_path)
    forbidden = {
        "verdict", "rootcause", "repairinstruction", "policyresult",
        "expectedoutcome", "healthy", "unsafe", "repaired",
    }
    for path in tmp_path.rglob("*.ndjson"):
        for record in map(json.loads, path.read_text().splitlines()):
            flattened = json.dumps(record, sort_keys=True).lower().replace("_", "").replace("-", "")
            assert forbidden.isdisjoint({word for word in forbidden if word in flattened})


def test_fallback_change_snapshots_have_real_context_without_internal_routing_metadata():
    """Catches fallback PR context that leaks the hidden scenario selector."""
    snapshot_root = __import__("pathlib").Path("monitoring/snapshots")
    snapshots = [json.loads(path.read_text()) for path in sorted(snapshot_root.glob("*.json"))]

    assert len(snapshots) == 3
    for snapshot in snapshots:
        assert snapshot["dataMode"] == "snapshot"
        assert snapshot["repository"] == "Prathamesh-Pawar/flylab"
        assert snapshot["changedFiles"]
        assert snapshot["diff"].startswith("diff --git")
        assert snapshot["repositoryDocs"]["README.md"]
        assert snapshot["checks"]["state"] in {"pending", "success"}
        flattened = json.dumps(snapshot).lower()
        assert "opssemble:" not in flattened
        assert "scenarioid" not in flattened.replace("_", "")
        assert "labels" not in snapshot
