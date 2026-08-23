import json
from pathlib import Path


ROOT = Path(__file__).parents[1]
PORTFOLIO = ROOT / "monitoring" / "flightlab-prs"


def test_portfolio_has_three_deterministic_patches_and_exact_routing_labels():
    manifest = json.loads((PORTFOLIO / "portfolio.json").read_text())
    assert [(change["id"], change["label"]) for change in manifest["changes"]] == [
        ("smart-seat-bundles", "opssemble:smart-seat-bundles"),
        ("flexible-date-search", "opssemble:flexible-date-search"),
        ("booking-timeout-retry", "opssemble:booking-timeout-retry"),
    ]
    for change in manifest["changes"]:
        patch = (PORTFOLIO / change["patch"]).read_text()
        assert patch.startswith("diff --git")
        assert "demo-data/" not in patch
        assert "scenarioId" not in patch
        assert "provider fixture" not in patch.lower()


def test_patches_exercise_the_expected_real_routes_and_latent_bug_shape():
    seat = (PORTFOLIO / "smart-seat-bundles.patch").read_text()
    flexible = (PORTFOLIO / "flexible-date-search.patch").read_text()
    booking = (PORTFOLIO / "booking-timeout-retry.patch").read_text()

    assert 'route: "/api/seat-scores"' in seat
    assert "for (const bundle of seatBundles)" in seat
    assert "await scoreBundle" in seat
    assert 'route: "/api/search/flexible"' in flexible
    assert "Math.min(7" in flexible
    assert 'route: "/api/book"' in booking
    assert 'new DemoBookingProvider("after-commit")' in booking
    assert "return provider.reserveAndCharge(booking.operationId, createAttemptKey())" in booking
    assert "commit-then-timeout" not in booking
