from pathlib import Path


ROOT = Path(__file__).parents[1]


def test_container_runs_as_non_root_and_prometheus_is_optional_and_pinned():
    dockerfile = (ROOT / "Dockerfile").read_text()
    compose = (ROOT / "docker-compose.yml").read_text()

    assert "FROM python:3.12-slim" in dockerfile
    assert "USER opssemble" in dockerfile
    assert '"monitoring.app:app"' in dockerfile
    assert "prom/prometheus:v3.13.2" in compose
    assert 'profiles: ["prometheus"]' in compose


def test_environment_template_keeps_the_three_secrets_distinct():
    keys = {
        line.split("=", 1)[0]
        for line in (ROOT / ".env.example").read_text().splitlines()
        if line and not line.startswith("#")
    }
    assert {"GITHUB_WEBHOOK_SECRET", "OPSSEMBLE_INGEST_SECRET", "MCP_TOKEN"} <= keys
