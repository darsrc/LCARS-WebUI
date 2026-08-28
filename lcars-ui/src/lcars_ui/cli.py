"""Command-line entry points for LCARS UI."""

from __future__ import annotations

import argparse
from collections.abc import Sequence

from lcars_ui.migration import run_migrate_command


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="lcars", description="LCARS UI developer tools.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    migrate = subparsers.add_parser(
        "migrate",
        help="scan Python source for v7 migration work",
        description=(
            "Statically scan Python files for LCARS UI v7 migration work. "
            "The scanner never imports, executes, or rewrites target code."
        ),
        epilog=(
            "This command is report-only. Converting return-value control flow such as "
            "`if lcars.button(...)` into an action handler is not mechanically safe, "
            "so lcars migrate never rewrites code."
        ),
    )
    migrate.add_argument(
        "paths",
        metavar="PATH",
        nargs="+",
        help="Python file or directory to scan recursively (may be repeated)",
    )
    migrate.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="emit stable machine-readable JSON instead of the text report",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the public ``lcars`` command and return its process exit code."""
    parser = _parser()
    args = parser.parse_args(argv)
    if args.command == "migrate":
        return run_migrate_command(args.paths, json_output=args.json_output)
    parser.error(f"unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
