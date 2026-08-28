"""Static, report-only migration analysis for the v7 application lifecycle."""

from __future__ import annotations

import ast
import json
import sys
from collections import Counter, defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1

RERUN_WIDGETS = frozenset(
    {
        "button",
        "checkbox",
        "command_input",
        "file_upload",
        "number_input",
        "radio",
        "radio_toggle",
        "select",
        "text_input",
        "toggle",
        "tri_state",
    }
)

# The v7 public authoring surface has a small ordinary ``ui`` namespace and an
# explicit ``advanced`` namespace for specialist composition/surface widgets.
ADVANCED_CALLS = frozenset(
    {
        "anchor_card",
        "auto",
        "assertion_card",
        "atom_legend",
        "commitment_selector",
        "composition",
        "constraint_band",
        "contender_list",
        "context_tags",
        "edge_anchor",
        "environments",
        "frontier",
        "fr",
        "gap_panel",
        "graph_workspace",
        "node_canvas",
        "minmax",
        "px",
        "shader",
        "support_panel",
        "surface",
        "three_scene",
        "tri_state",
    }
)

UI_CALLS = frozenset(
    {
        "alert",
        "append_log",
        "bar",
        "box",
        "bracket",
        "button",
        "candlestick",
        "chart",
        "checkbox",
        "col",
        "columns",
        "command_input",
        "console",
        "control_panel",
        "data_panel",
        "diagnostic",
        "file_upload",
        "form",
        "gauge",
        "header",
        "hide_hint",
        "hint",
        "input_column",
        "log",
        "markdown",
        "metric",
        "mic_button",
        "notify",
        "number_input",
        "padd",
        "popup",
        "progress",
        "radio",
        "radio_toggle",
        "raw",
        "renko",
        "row",
        "section",
        "select",
        "set_alert_condition",
        "set_theme",
        "show_hint",
        "sparkline",
        "sweep",
        "table",
        "text",
        "text_input",
        "toggle",
        "update",
        "video_hls",
    }
)

FLAT_CALLS = UI_CALLS | ADVANCED_CALLS
APP_LIFECYCLE_CALLS = frozenset({"config", "nav", "page"})
REMOVED_IMPORTS = FLAT_CALLS | APP_LIFECYCLE_CALLS | {"live", "run"}
KINDS = (
    "removed_import",
    "run_call",
    "module_global_live",
    "app_lifecycle_call",
    "flat_widget_call",
    "rerun_return_value",
    "parse_error",
)


@dataclass(frozen=True)
class Finding:
    """One source location requiring human migration work."""

    file: str
    line: int
    column: int
    kind: str
    source: str
    replacement: str

    def as_dict(self) -> dict[str, object]:
        """Return the stable JSON representation of this finding."""
        return {
            "file": self.file,
            "line": self.line,
            "column": self.column,
            "kind": self.kind,
            "source": self.source,
            "replacement": self.replacement,
        }


@dataclass(frozen=True)
class ScanReport:
    """Deterministic results for one or more input paths."""

    paths: tuple[str, ...]
    findings: tuple[Finding, ...]

    @property
    def counts(self) -> dict[str, int]:
        counts = Counter(finding.kind for finding in self.findings)
        return {kind: counts[kind] for kind in KINDS if counts[kind]}

    def as_dict(self) -> dict[str, object]:
        grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
        for finding in self.findings:
            grouped[finding.file].append(finding.as_dict())
        return {
            "schema_version": SCHEMA_VERSION,
            "command": "migrate",
            "paths": list(self.paths),
            "files": [
                {"path": path, "findings": findings}
                for path, findings in sorted(grouped.items())
            ],
            "summary": {"total": len(self.findings), "by_kind": self.counts},
        }


class _ImportCollector(ast.NodeVisitor):
    def __init__(self) -> None:
        self.module_aliases: set[str] = set()
        self.imported_names: dict[str, str] = {}

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            if alias.name == "lcars_ui":
                self.module_aliases.add(alias.asname or "lcars_ui")

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.level == 0 and node.module == "lcars_ui":
            for alias in node.names:
                if alias.name != "*":
                    self.imported_names[alias.asname or alias.name] = alias.name


class _Scanner(ast.NodeVisitor):
    def __init__(
        self,
        *,
        path: Path,
        lines: list[str],
        modules: set[str],
        imported_names: dict[str, str],
        tree: ast.Module,
    ) -> None:
        self.path = path
        self.lines = lines
        self.modules = modules
        self.imported_names = imported_names
        self.findings: list[Finding] = []
        self._ancestors: list[ast.AST] = []
        self._scope: list[ast.AST] = [tree]
        self._rerun_calls: dict[int, ast.Call] = {}

    def visit(self, node: ast.AST) -> Any:
        self._ancestors.append(node)
        try:
            return super().visit(node)
        finally:
            self._ancestors.pop()

    def finish(self) -> None:
        for call in self._rerun_calls.values():
            call_name = self._lcars_name(call.func)
            assert call_name is not None
            self._add(
                call,
                "rerun_return_value",
                (
                    f'Declare `{self._namespace(call_name)}.{call_name}(..., id="...")` in an '
                    f'`@app.page(...)`, then move the return-value-dependent logic into '
                    f'`@app.action("...")` (read the event value from `ctx.value` when needed).'
                ),
            )

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            if alias.name == "lcars_ui":
                self._add(
                    node,
                    "removed_import",
                    "Use `from lcars_ui import App, ui, advanced` and create `app = App()`.",
                )

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.level != 0 or node.module != "lcars_ui":
            return
        for alias in node.names:
            if alias.name == "*" or alias.name in REMOVED_IMPORTS:
                if alias.name in ADVANCED_CALLS:
                    replacement = (
                        f"Import `advanced` and replace `{alias.name}` with "
                        f"`advanced.{alias.name}`."
                    )
                elif alias.name in APP_LIFECYCLE_CALLS:
                    replacement = (
                        f"Import `App`, create `app = App()`, and replace `{alias.name}` "
                        "with the application-scoped v7 lifecycle."
                    )
                elif alias.name in FLAT_CALLS:
                    replacement = f"Import `ui` and replace `{alias.name}` with `ui.{alias.name}`."
                else:
                    replacement = (
                        "Import `App` plus `ui`/`advanced` as needed, create `app = App()`, "
                        "and use the application-scoped v7 lifecycle."
                    )
                self._add(node, "removed_import", replacement)

    def visit_Call(self, node: ast.Call) -> None:
        name = self._lcars_name(node.func)
        if name == "run":
            self._add(
                node,
                "run_call",
                (
                    "Create `app = App()`, register declarative functions with "
                    "`@app.page(...)`, author their contents through `ui`, and serve the "
                    "v7 App lifecycle instead of calling `run(ui)`."
                ),
            )
        elif name in APP_LIFECYCLE_CALLS:
            replacements = {
                "config": (
                    "Create `app = App()` and move this application configuration into the "
                    "v7 App lifecycle."
                ),
                "nav": (
                    "Register the destination with `@app.page(..., nav=True)`; App page "
                    "registration owns v7 navigation."
                ),
                "page": (
                    "Replace the context-manager page with a function decorated by "
                    "`@app.page(\"...\", path=\"/...\", nav=True)` and author its body "
                    "through `ui`."
                ),
            }
            self._add(node, "app_lifecycle_call", replacements[name])
        elif name in FLAT_CALLS:
            namespace = self._namespace(name)
            self._add(
                node,
                "flat_widget_call",
                f"Inside an `@app.page(...)`, replace this call with `{namespace}.{name}(...)`.",
            )

        if name in RERUN_WIDGETS and self._direct_return_value_use(node):
            self._rerun_calls[id(node)] = node
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._visit_function(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._visit_function(node)

    def _visit_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        if isinstance(self._scope[-1], ast.Module):
            for decorator in node.decorator_list:
                candidate = decorator.func if isinstance(decorator, ast.Call) else decorator
                if self._lcars_name(candidate) == "live":
                    self._add(
                        decorator,
                        "module_global_live",
                        (
                            "Create `app = App()` and replace this decorator with "
                            "`@app.live(interval=..., audience=\"all\")` (choose `\"session\"` "
                            "instead when updates must be session-scoped)."
                        ),
                    )
        for decorator in node.decorator_list:
            self.visit(decorator)
        for default in (*node.args.defaults, *node.args.kw_defaults):
            if default is not None:
                self.visit(default)
        self._scope.append(node)
        try:
            for statement in node.body:
                self.visit(statement)
        finally:
            self._scope.pop()

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        for decorator in node.decorator_list:
            self.visit(decorator)
        for base in node.bases:
            self.visit(base)
        for keyword in node.keywords:
            self.visit(keyword.value)
        self._scope.append(node)
        try:
            for statement in node.body:
                self.visit(statement)
        finally:
            self._scope.pop()

    def visit_Lambda(self, node: ast.Lambda) -> None:
        for default in (*node.args.defaults, *node.args.kw_defaults):
            if default is not None:
                self.visit(default)
        self._scope.append(node)
        try:
            self.visit(node.body)
        finally:
            self._scope.pop()

    def _lcars_name(self, node: ast.AST) -> str | None:
        if (
            isinstance(node, ast.Attribute)
            and isinstance(node.value, ast.Name)
            and node.value.id in self.modules
        ):
            return node.attr
        if isinstance(node, ast.Name):
            return self.imported_names.get(node.id)
        return None

    def _direct_return_value_use(self, node: ast.Call) -> bool:
        for parent in reversed(self._ancestors[:-1]):
            # A call used as a complete expression merely declares the widget and
            # discards its result. Every other enclosing expression consumes or
            # retains the return value: conditions, operators, arguments,
            # collection literals, interpolation, assignments, and returns.
            if isinstance(parent, ast.Expr):
                return parent.value is not node
            if isinstance(parent, ast.stmt):
                return True
        return False

    @staticmethod
    def _namespace(name: str) -> str:
        return "advanced" if name in ADVANCED_CALLS else "ui"

    def _add(self, node: ast.AST, kind: str, replacement: str) -> None:
        line = getattr(node, "lineno", 1)
        column = getattr(node, "col_offset", 0) + 1
        source = self.lines[line - 1].rstrip() if 0 < line <= len(self.lines) else ""
        self.findings.append(
            Finding(str(self.path), line, column, kind, source, replacement)
        )


def _python_files(paths: Sequence[str | Path]) -> tuple[Path, ...]:
    files: set[Path] = set()
    for raw_path in paths:
        path = Path(raw_path).expanduser()
        if not path.exists():
            raise ValueError(f"path does not exist: {path}")
        if path.is_file():
            if path.suffix != ".py":
                raise ValueError(f"target file is not Python source: {path}")
            files.add(path.resolve())
        elif path.is_dir():
            files.update(candidate.resolve() for candidate in path.rglob("*.py"))
        else:
            raise ValueError(f"target is not a regular file or directory: {path}")
    return tuple(sorted(files, key=str))


def scan_paths(paths: Sequence[str | Path]) -> ScanReport:
    """Parse paths without importing them and return all migration findings."""
    normalized_paths = tuple(str(Path(path).expanduser().resolve()) for path in paths)
    findings: list[Finding] = []
    for path in _python_files(paths):
        source = path.read_text(encoding="utf-8")
        lines = source.splitlines()
        try:
            tree = ast.parse(source, filename=str(path))
        except SyntaxError as error:
            line = error.lineno or 1
            findings.append(
                Finding(
                    file=str(path),
                    line=line,
                    column=error.offset or 1,
                    kind="parse_error",
                    source=lines[line - 1].rstrip() if 0 < line <= len(lines) else "",
                    replacement="Fix this syntax error so `lcars migrate` can analyze the file.",
                )
            )
            continue

        imports = _ImportCollector()
        imports.visit(tree)
        scanner = _Scanner(
            path=path,
            lines=lines,
            modules=imports.module_aliases,
            imported_names=imports.imported_names,
            tree=tree,
        )
        scanner.visit(tree)
        scanner.finish()
        findings.extend(scanner.findings)

    ordered = tuple(
        sorted(findings, key=lambda item: (item.file, item.line, item.column, item.kind))
    )
    return ScanReport(normalized_paths, ordered)


def format_text(report: ScanReport) -> str:
    """Format a human-readable report grouped by file."""
    output: list[str] = []
    grouped: dict[str, list[Finding]] = defaultdict(list)
    for finding in report.findings:
        grouped[finding.file].append(finding)
    if not grouped:
        output.append("No LCARS UI v7 migration findings.")
    for path, findings in sorted(grouped.items()):
        output.append(f"{path}:")
        for finding in findings:
            output.append(
                f"  {finding.line}:{finding.column} [{finding.kind}] {finding.source.strip()}"
            )
            output.append(f"    Replacement: {finding.replacement}")
        output.append("")
    output.append(f"Summary: {len(report.findings)} finding(s)")
    for kind, count in report.counts.items():
        output.append(f"  {kind}: {count}")
    return "\n".join(output)


def run_migrate_command(paths: Sequence[str], *, json_output: bool = False) -> int:
    """Run one migration scan, print it, and return 1 until the input is clean."""
    try:
        report = scan_paths(paths)
    except (OSError, UnicodeError, ValueError) as error:
        print(f"lcars migrate: error: {error}", file=sys.stderr)
        return 2
    if json_output:
        print(json.dumps(report.as_dict(), indent=2, sort_keys=True))
    else:
        print(format_text(report))
    return 1 if report.findings else 0


__all__ = ["Finding", "ScanReport", "format_text", "run_migrate_command", "scan_paths"]
