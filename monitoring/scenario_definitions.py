"""Declarative scenario source; generated evidence is kept elsewhere."""

from .models import ScenarioSpec


_SCENARIOS = (
    ScenarioSpec("smart-seat-bundles-baseline", 45_000, "checkout_latency", "p95", 600, 10,
                 (("checkout_completion", 72, 100),), ("seat_bundle_viewed", "checkout_completed"), "checkout"),
    ScenarioSpec("smart-seat-bundles-rollout-50", 45_000, "checkout_latency", "p95", 1_280, 50,
                 (("checkout_completion", 59, 100), ("checkout_completion_reference", 72, 100)),
                 ("seat_bundle_viewed", "seat_bundle_viewed", "seat_bundle_viewed", "checkout_completed"), "seat_scoring"),
    ScenarioSpec("smart-seat-bundles-restored", 45_000, "checkout_latency", "p95", 610, 10,
                 (("checkout_completion", 72, 100),), ("seat_bundle_viewed", "checkout_completed"), "checkout"),
    ScenarioSpec("flexible-date-search-candidate", 45_000, "search_latency", "p95", 430, None,
                 (("zero_results_reference", 88, 1_000), ("zero_results", 100, 1_000),
                  ("flight_selection_reference", 650, 1_000), ("flight_selection", 642, 1_000)),
                 ("search_submitted", "flight_selected"), "seven_day"),
    ScenarioSpec("booking-timeout-retry-candidate", 45_000, "booking_latency", "p99", 2_280, None,
                 (("booking_completion_reference", 72, 100), ("booking_completion", 64, 100)),
                 ("fault_experiment_started", "fault_experiment_completed"), "retry", "op-204"),
    ScenarioSpec("booking-timeout-retry-repair-candidate", 45_000, "booking_latency", "p99", 920, None,
                 (("booking_completion_reference", 72, 100), ("booking_completion", 71, 100)),
                 ("fault_experiment_started", "fault_experiment_completed"), "repair", "op-204"),
    ScenarioSpec("booking-timeout-retry-telemetry-gap", 45_000, None, None, None, None, (),
                 ("fault_experiment_started", "fault_experiment_completed"), "gap", "op-204"),
)


def load_scenarios() -> tuple[ScenarioSpec, ...]:
    """Return source scenarios in their stable public order."""
    return _SCENARIOS
