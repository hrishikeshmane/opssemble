"""Environment configuration for local and remote monitoring deployments."""

from dataclasses import dataclass
import os
from typing import Mapping


@dataclass(frozen=True)
class Settings:
    flightlab_base_url: str
    github_repository: str
    github_token: str
    github_webhook_secret: str
    ingest_secret: str
    mcp_token: str
    replay_speed: float = 1.0
    session_ttl_seconds: int = 7_200
    max_sessions: int = 100

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> "Settings":
        values = os.environ if environ is None else environ
        return cls(
            flightlab_base_url=values.get("FLIGHTLAB_BASE_URL", ""),
            github_repository=values.get("GITHUB_REPOSITORY", "Prathamesh-Pawar/flylab"),
            github_token=values.get("GITHUB_TOKEN", ""),
            github_webhook_secret=values.get("GITHUB_WEBHOOK_SECRET", ""),
            ingest_secret=values.get("OPSSEMBLE_INGEST_SECRET", ""),
            mcp_token=values.get("MCP_TOKEN", ""),
            replay_speed=float(values.get("REPLAY_SPEED", "1")),
            session_ttl_seconds=int(values.get("SESSION_TTL_SECONDS", "7200")),
            max_sessions=int(values.get("MAX_SESSIONS", "100")),
        )

    def missing(self) -> list[str]:
        required = {
            "FLIGHTLAB_BASE_URL": self.flightlab_base_url,
            "GITHUB_REPOSITORY": self.github_repository,
            "GITHUB_TOKEN": self.github_token,
            "GITHUB_WEBHOOK_SECRET": self.github_webhook_secret,
            "OPSSEMBLE_INGEST_SECRET": self.ingest_secret,
            "MCP_TOKEN": self.mcp_token,
        }
        return [name for name, value in required.items() if not value]
