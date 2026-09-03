"""Command-line entry points for LCARS UI."""

from __future__ import annotations

import argparse
import os
import sys
import traceback
from collections.abc import Sequence
from pathlib import Path
from typing import TYPE_CHECKING, Any

from lcars_ui._cli_discovery import SEARCH_ORDER, AppDiscoveryError, DiscoveredApp, discover_app
from lcars_ui._cli_scaffold import DEFAULT_DEV_PORT, ScaffoldError, scaffold_project
from lcars_ui.migration import run_migrate_command

if TYPE_CHECKING:  # pragma: no cover - typing only
    from lcars_ui.core.models import Manifest

DEFAULT_HOST = "127.0.0.1"

#: Environment used to hand the resolved target to `lcars dev`'s reload worker,
#: which is a fresh process and therefore cannot inherit the parent's imports.
TARGET_ENV = "LCARS_CLI_TARGET"
SYS_PATH_ENV = "LCARS_CLI_SYS_PATH"
PROJECT_ROOT_ENV = "LCARS_CLI_PROJECT_ROOT"

_TARGET_HELP = (
    "application to load: a path such as src/myapp/app.py, a dotted module "
    "such as myapp.app, or an explicit myapp.app:app. Omit it to search "
    + ", ".join(SEARCH_ORDER)
)


def _add_target_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("target", nargs="?", default=None, help=_TARGET_HELP)
    parser.add_argument(
        "--dir",
        dest="root",
        default=None,
        metavar="PATH",
        help="project directory to search and to resolve relative targets from (default: .)",
    )


def _add_serve_arguments(parser: argparse.ArgumentParser, *, port: int) -> None:
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"interface to bind (default: {DEFAULT_HOST})",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=port,
        help=f"port to bind (default: {port})",
    )


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="lcars",
        description="LCARS UI developer tools.",
        epilog=(
            "Start with: lcars new my-app && cd my-app && lcars dev\n"
            "Run `lcars <command> --help` for the options of one command."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True, metavar="COMMAND")

    new = subparsers.add_parser(
        "new",
        help="scaffold a ready-to-run application project",
        description=(
            "Create a new project directory holding a two-page application, an "
            "action handler, and a test that passes without any editing."
        ),
        epilog=(
            "Example:\n"
            "  lcars new bridge-ops\n"
            "  cd bridge-ops\n"
            "  pip install -e '.[dev]' && pytest -q && lcars dev"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    new.add_argument("name", help="project directory and distribution name, e.g. bridge-ops")
    new.add_argument(
        "--dir",
        dest="root",
        default=None,
        metavar="PATH",
        help="directory to create the project in (default: .)",
    )
    new.add_argument(
        "--port",
        type=int,
        default=DEFAULT_DEV_PORT,
        help=f"development port baked into the generated project (default: {DEFAULT_DEV_PORT})",
    )

    dev = subparsers.add_parser(
        "dev",
        help="serve the application with reload on save",
        description=(
            "Serve the discovered application on one reloading worker process. "
            "Editing any file under the project directory restarts it."
        ),
        epilog=(
            "Examples:\n"
            "  lcars dev\n"
            "  lcars dev src/myapp/app.py --port 8078\n"
            "  lcars dev myapp.app:app --open"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    _add_target_arguments(dev)
    _add_serve_arguments(dev, port=DEFAULT_DEV_PORT)
    dev.add_argument(
        "--no-reload",
        action="store_true",
        help="serve one process without the file watcher",
    )
    dev.add_argument(
        "--open",
        action="store_true",
        dest="open_browser",
        help="open the application in a browser once it is listening",
    )

    check = subparsers.add_parser(
        "check",
        help="build and validate the application without serving it",
        description=(
            "Import the application, run every declared page, and validate the "
            "manifest it produces. Nothing is served and no port is bound, so "
            "this is what a CI job runs. Exits non-zero on any failure."
        ),
        epilog="Example:\n  lcars check src/myapp/app.py",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    _add_target_arguments(check)

    run = subparsers.add_parser(
        "run",
        help="serve one production process",
        description=(
            "Serve the discovered application on one process, with no reload "
            "watcher and no browser."
        ),
        epilog="Example:\n  lcars run --host 0.0.0.0 --port 8077",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    _add_target_arguments(run)
    _add_serve_arguments(run, port=DEFAULT_DEV_PORT)

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


def _fail(command: str, message: str) -> int:
    print(f"lcars {command}: error: {message}", file=sys.stderr)
    return 2


def _load(command: str, args: argparse.Namespace) -> DiscoveredApp | None:
    """Resolve the application for one command, reporting failures uniformly."""
    try:
        return discover_app(target=args.target, root=args.root, command=command)
    except AppDiscoveryError as error:
        _fail(command, str(error))
        return None
    except Exception as error:  # a declaration error inside the target module
        traceback.print_exc()
        _fail(command, f"failed to import the application: {type(error).__name__}: {error}")
        return None


def _count_widgets(manifest: Manifest) -> int:
    """Count every declared widget in a built manifest, at any nesting depth."""

    def walk(node: Any) -> int:
        if isinstance(node, dict):
            own = 1 if "id" in node and isinstance(node.get("type"), str) else 0
            return own + sum(walk(value) for value in node.values())
        if isinstance(node, list):
            return sum(walk(item) for item in node)
        return 0

    return sum(walk(page.model_dump(mode="python")) for page in manifest.pages.values())


def _cmd_new(args: argparse.Namespace) -> int:
    from lcars_ui import __version__

    try:
        project = scaffold_project(
            args.name,
            args.root,
            library_version=__version__,
            port=args.port,
        )
    except ScaffoldError as error:
        return _fail("new", str(error))
    except OSError as error:
        return _fail("new", f"could not write the project: {error}")

    print(f"Created {project.root}")
    for path in project.files:
        print(f"  {path.relative_to(project.root)}")
    print()
    print("Next:")
    print(f"  cd {args.name}")
    print("  pip install -e '.[dev]'")
    print("  pytest -q")
    print(f"  lcars dev            # http://{DEFAULT_HOST}:{args.port}/")
    return 0


def _cmd_check(args: argparse.Namespace) -> int:
    discovered = _load("check", args)
    if discovered is None:
        return 2
    try:
        manifest = discovered.app.build_manifest()
    except Exception as error:
        traceback.print_exc()
        print(
            f"lcars check: error: manifest construction failed: "
            f"{type(error).__name__}: {error}",
            file=sys.stderr,
        )
        return 1
    pages = ", ".join(manifest.pages)
    print(f"lcars check: ok - {discovered.describe()}")
    print(f"  {len(manifest.pages)} page(s): {pages}")
    print(f"  {_count_widgets(manifest)} widget(s)")
    print(f"  {len(discovered.app.action_handlers)} action handler(s)")
    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    discovered = _load("run", args)
    if discovered is None:
        return 2
    print(f"lcars run: serving {discovered.describe()} on http://{args.host}:{args.port}/")
    discovered.app.serve(host=args.host, port=args.port, open_browser=False)
    return 0


def _cmd_dev(args: argparse.Namespace) -> int:
    discovered = _load("dev", args)
    if discovered is None:
        return 2

    url = f"http://{args.host}:{args.port}/"
    print(f"lcars dev: serving {discovered.describe()} on {url}")
    if args.no_reload:
        discovered.app.serve(host=args.host, port=args.port, open_browser=args.open_browser)
        return 0

    import threading
    import webbrowser

    import uvicorn

    os.environ[TARGET_ENV] = discovered.import_string
    os.environ[SYS_PATH_ENV] = str(discovered.sys_path_entry)
    os.environ[PROJECT_ROOT_ENV] = str(discovered.root)
    print(f"lcars dev: reloading on changes under {discovered.root}")
    if args.open_browser:
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(
        "lcars_ui.cli:asgi_from_environment",
        factory=True,
        host=args.host,
        port=args.port,
        reload=True,
        reload_dirs=[str(discovered.root)],
    )
    return 0


def asgi_from_environment() -> Any:
    """Build the ASGI application named by :data:`TARGET_ENV`.

    ``lcars dev`` passes this import string to uvicorn's reloader, which runs
    each worker in a fresh process. The worker re-imports the target itself, so
    every reload picks up the edited source.
    """
    target = os.environ.get(TARGET_ENV)
    if not target:
        raise RuntimeError(
            f"{TARGET_ENV} is not set; asgi_from_environment is only for `lcars dev`"
        )
    root = os.environ.get(SYS_PATH_ENV) or "."
    discovered = discover_app(target=target, root=Path(root))
    project_root = os.environ.get(PROJECT_ROOT_ENV)
    if project_root:
        discovered.app._set_project_root(Path(project_root))

    from lcars_ui.app import create_app

    return create_app(manifest=discovered.app.build_manifest(), app=discovered.app)


def main(argv: Sequence[str] | None = None) -> int:
    """Run the public ``lcars`` command and return its process exit code."""
    parser = _parser()
    args = parser.parse_args(argv)
    if args.command == "migrate":
        return run_migrate_command(args.paths, json_output=args.json_output)
    if args.command == "new":
        return _cmd_new(args)
    if args.command == "check":
        return _cmd_check(args)
    if args.command == "run":
        return _cmd_run(args)
    if args.command == "dev":
        return _cmd_dev(args)
    parser.error(f"unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
