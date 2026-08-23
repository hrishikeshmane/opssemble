"""Command line interface for deterministic monitoring artifacts."""

import argparse
from pathlib import Path

from .generator import check_generated, generate


DEFAULT_OUTPUT = Path(__file__).parent / "generated" / "v1"


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m monitoring")
    subparsers = parser.add_subparsers(dest="command", required=True)
    generate_parser = subparsers.add_parser("generate")
    generate_parser.add_argument("--check", action="store_true")
    generate_parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    arguments = parser.parse_args()
    if arguments.command == "generate" and arguments.check:
        return 0 if check_generated(arguments.output) else 1
    generate(arguments.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
