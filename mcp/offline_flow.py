#!/usr/bin/env python3
"""Thin entry point for the offline MCP flight recorder."""

from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from opssemble_mcp.offline_demo import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
