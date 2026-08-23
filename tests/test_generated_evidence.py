"""Generated evidence behavior, checked independently from source declarations."""

from collections import Counter


def _records(generated, stream):
    return generated.streams[stream]


def test_generated_loader_exposes_exact_metric_values_and_raw_product_counts(tmp_path):
    """Catches a changed telemetry value or a derived product outcome in evidence."""
    from monitoring.generator import generate
    from monitoring.loader import load_generated_scenario

    generate(tmp_path)
    rollout = load_generated_scenario("smart-seat-bundles-rollout-50", tmp_path)
    flexible = load_generated_scenario("flexible-date-search-candidate", tmp_path)
    retry = load_generated_scenario("booking-timeout-retry-candidate", tmp_path)
    repair = load_generated_scenario("booking-timeout-retry-repair-candidate", tmp_path)

    rollout_latency = [r for r in _records(rollout, "metrics") if r["name"] == "checkout_latency"]
    assert [r["attributes"]["value"] for r in rollout_latency] == [1_280] * 10
    assert {r["attributes"]["percent"] for r in _records(rollout, "events") if r["name"] == "feature_flag_evaluated"} == {50}
    assert [(r["attributes"]["numerator"], r["attributes"]["denominator"])
            for r in _records(flexible, "events") if r["name"] == "zero_results"] == [(100, 1_000)]
    assert [(r["attributes"]["numerator"], r["attributes"]["denominator"])
            for r in _records(flexible, "events") if r["name"] == "flight_selection"] == [(642, 1_000)]
    assert [r["attributes"]["value"] for r in _records(retry, "metrics") if r["name"] == "booking_latency"] == [2_280] * 10
    assert [r["attributes"]["value"] for r in _records(repair, "metrics") if r["name"] == "booking_latency"] == [920] * 10
    assert not any({"rate", "delta", "conclusion"} & r["attributes"].keys() for r in _records(flexible, "events"))


def test_generated_evidence_preserves_required_retry_correlation_and_counts(tmp_path):
    """Catches broken retry identity, missing timeout links, or invalid stream volumes."""
    from monitoring.generator import generate
    from monitoring.loader import load_generated_scenario

    generate(tmp_path)
    retry = load_generated_scenario("booking-timeout-retry-candidate", tmp_path)
    repair = load_generated_scenario("booking-timeout-retry-repair-candidate", tmp_path)
    gap = load_generated_scenario("booking-timeout-retry-telemetry-gap", tmp_path)

    assert {r["operationId"] for records in retry.streams.values() for r in records} == {"op-204"}
    retry_logs = _records(retry, "logs")
    assert {r["attributes"].get("reservationId") for r in retry_logs if r["name"] == "reservation_committed"} == {"res-204-a", "res-204-b"}
    assert {r["attributes"].get("attemptKey") for r in retry_logs if r["name"] == "reservation_committed"} == {"attempt-204-a", "attempt-204-b"}
    assert Counter(r["name"] for r in retry_logs)["payment_intent_created"] == 2
    assert {r["attributes"].get("attemptKey") for r in _records(repair, "logs")
            if r["name"] in {"reservation_committed", "retry_started"}} == {"booking-op-204"}
    assert Counter(r["name"] for r in _records(repair, "logs"))["payment_intent_created"] == 1
    assert not any("payment" in r["name"] for records in gap.streams.values() for r in records)
    assert not any(r["name"] == "booking_latency" for r in _records(gap, "metrics"))
    for generated in (retry, repair, gap):
        assert 20 <= len(_records(generated, "logs")) <= 40
        assert 6 <= len(_records(generated, "traces")) <= 12


def test_every_stream_keeps_session_request_operation_and_trace_correlation(tmp_path):
    """Catches observations that cannot be joined across evidence types."""
    from monitoring.generator import generate
    from monitoring.loader import load_generated_scenario

    generate(tmp_path)
    retry = load_generated_scenario("booking-timeout-retry-candidate", tmp_path)
    records = [record for stream in retry.streams.values() for record in stream]

    assert {record["sessionId"] for record in records} == {"{{session_id}}"}
    assert {record["requestId"] for record in records} == {"{{request_id}}"}
    assert {record["operationId"] for record in records} == {"op-204"}
    assert {record["traceId"] for record in records} == {"trace-204"}


def test_metrics_have_ten_hand_timed_five_second_samples(tmp_path):
    """Catches missing observation-window samples or uneven sampling intervals."""
    from monitoring.generator import generate
    from monitoring.loader import load_generated_scenario

    generate(tmp_path)
    generated = load_generated_scenario("smart-seat-bundles-baseline", tmp_path)
    checkout = [r for r in _records(generated, "metrics") if r["name"] == "checkout_latency"]

    assert [r["attributes"]["sampleAtMs"] for r in checkout] == [
        0, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 35_000, 40_000, 45_000,
    ]


def test_generated_streams_include_cpu_and_booking_side_effect_events(tmp_path):
    """Catches missing system saturation or provider-side booking evidence."""
    from monitoring.generator import generate
    from monitoring.loader import load_generated_scenario

    generate(tmp_path)
    faulty = load_generated_scenario("booking-timeout-retry-candidate", tmp_path)
    metric_names = {record["name"] for record in faulty.streams["metrics"]}
    event_names = [record["name"] for record in faulty.streams["events"]]

    assert {"cpu_utilization", "worker_saturation", "request_rate", "booking_latency"} <= metric_names
    assert event_names.count("reservation_committed") == 2
    assert event_names.count("payment_intent_created") == 2
    assert "response_timeout" in event_names
    assert "retry_started" in event_names
