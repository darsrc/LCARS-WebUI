"""Coverage for the report-only v7 static migration scanner."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lcars_ui.cli import main
from lcars_ui.core.widget_base import RENDERED_COLOR_TOKENS
from lcars_ui.migration import RERUN_WIDGETS, scan_paths


def _write_module(tmp_path: Path, source: str, name: str = "app.py") -> Path:
    path = tmp_path / name
    path.write_text(source, encoding="utf-8")
    return path


def _findings_of_kind(path: Path, kind: str) -> list[object]:
    return [finding for finding in scan_paths([path]).findings if finding.kind == kind]


def test_flat_module_import_remains_and_removed_from_imports_are_reported(
    tmp_path: Path,
) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
from lcars_ui import App, ButtonOptions, button as engage, run as start
""",
    )

    findings = _findings_of_kind(path, "removed_import")

    assert len(findings) == 2
    assert any("ui.button" in finding.replacement for finding in findings)
    assert any("App" in finding.replacement for finding in findings)
    assert all(finding.line == 2 for finding in findings)


def test_run_and_module_global_live_have_app_replacements(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars

@lcars.live(interval=2)
def refresh():
    pass

lcars.run(refresh)
""",
    )
    report = scan_paths([path])

    run_finding = next(finding for finding in report.findings if finding.kind == "run_call")
    live_finding = next(
        finding for finding in report.findings if finding.kind == "module_global_live"
    )
    assert "@app.page" in run_finding.replacement
    assert "@app.live" in live_finding.replacement
    assert 'audience="all"' in live_finding.replacement


def test_page_config_and_nav_move_to_the_app_lifecycle(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
lcars.config("Demo")
lcars.nav("Home", page="home")
with lcars.page("Home", id="home"):
    pass
""",
    )

    findings = _findings_of_kind(path, "app_lifecycle_call")

    assert len(findings) == 3
    assert "app = App()" in findings[0].replacement
    assert "@app.page(..., nav=True)" in findings[1].replacement
    assert '@app.page("...", path="/...", nav=True)' in findings[2].replacement


def test_live_nested_under_module_guard_is_still_module_global(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
if __name__ == "__main__":
    @lcars.live()
    def refresh():
        pass
""",
    )

    assert len(_findings_of_kind(path, "module_global_live")) == 1


def test_flat_calls_report_ui_and_advanced_namespaces(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
lcars.text("hello")
lcars.surface(id="plot")
""",
    )

    findings = _findings_of_kind(path, "flat_widget_call")

    assert len(findings) == 2
    assert "ui.text" in findings[0].replacement
    assert "advanced.surface" in findings[1].replacement


@pytest.mark.parametrize("widget", sorted(RERUN_WIDGETS))
def test_every_rerun_widget_is_detected_in_a_condition(tmp_path: Path, widget: str) -> None:
    path = _write_module(
        tmp_path,
        f"""\
import lcars_ui as lcars
if lcars.{widget}("control"):
    pass
""",
    )

    findings = _findings_of_kind(path, "rerun_return_value")

    assert len(findings) == 1
    assert f".{widget}(" in findings[0].source


def test_rerun_contexts_include_while_bool_ternary_comprehension_and_argument(
    tmp_path: Path,
) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
while lcars.toggle("loop"):
    break
flag = lcars.checkbox("left") and ready
label = "on" if lcars.radio("mode", ["a"]) else "off"
items = [item for item in values if lcars.select("pick", values)]
consume(lcars.file_upload("data"))
""",
    )

    findings = _findings_of_kind(path, "rerun_return_value")

    assert len(findings) == 5
    assert {finding.line for finding in findings} == {2, 4, 5, 6, 7}


def test_assignment_then_boolean_or_comparison_is_detected_once(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
from lcars_ui import button as engage
result = engage("Engage")
if result is not None:
    pass
while result:
    break
""",
    )

    findings = _findings_of_kind(path, "rerun_return_value")

    assert len(findings) == 1
    assert findings[0].line == 2
    assert findings[0].column == 10
    assert "ctx.value" in findings[0].replacement


def test_assignment_retains_a_return_value_even_when_later_reassigned(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
result = lcars.button("Engage")
result = False
if result:
    pass
""",
    )

    findings = _findings_of_kind(path, "rerun_return_value")

    assert len(findings) == 1
    assert findings[0].line == 2


def test_discarded_rerun_widget_call_is_declarative_not_return_value_use(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
lcars.button("Declared with no return-value use")
""",
    )

    assert _findings_of_kind(path, "rerun_return_value") == []


def test_discarded_declarative_value_and_non_lcars_button_are_not_rerun_findings(
    tmp_path: Path,
) -> None:
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
lcars.text("hi")
if toolbar.button("not LCARS"):
    pass
""",
    )
    report = scan_paths([path])

    assert [finding.kind for finding in report.findings].count("flat_widget_call") == 1
    assert not any(finding.kind == "rerun_return_value" for finding in report.findings)


def test_parse_error_is_reported_instead_of_crashing(tmp_path: Path) -> None:
    path = _write_module(tmp_path, "if broken syntax\n")

    findings = scan_paths([path]).findings

    assert len(findings) == 1
    assert findings[0].kind == "parse_error"
    assert findings[0].line == 1


def test_cli_exit_is_nonzero_with_findings_and_zero_when_clean(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    dirty = _write_module(tmp_path, "from lcars_ui import run\n", "dirty.py")
    clean = _write_module(tmp_path, "from lcars_ui import App\n", "clean.py")

    assert main(["migrate", str(dirty)]) == 1
    assert "removed_import" in capsys.readouterr().out
    assert main(["migrate", str(clean)]) == 0
    assert "No LCARS UI v7 migration findings." in capsys.readouterr().out


def test_json_output_shape_is_stable_and_parseable(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    path = _write_module(
        tmp_path,
        "import lcars_ui as lcars\nif lcars.button('go'):\n    pass\n",
    )

    assert main(["migrate", "--json", str(path)]) == 1
    payload = json.loads(capsys.readouterr().out)

    assert list(payload) == ["command", "files", "paths", "schema_version", "summary"]
    assert payload["schema_version"] == 1
    assert payload["command"] == "migrate"
    assert payload["paths"] == [str(path.resolve())]
    assert list(payload["summary"]) == ["by_kind", "total"]
    assert payload["summary"]["total"] == 2
    assert set(payload["files"][0]) == {"path", "findings"}
    finding = payload["files"][0]["findings"][0]
    assert set(finding) == {"file", "line", "column", "kind", "source", "replacement"}


def test_scanner_runs_over_repository_examples_without_crashing() -> None:
    examples = Path(__file__).resolve().parents[2] / "examples"

    report = scan_paths([examples])

    # examples/ is fully migrated as of wave 1f: a clean scan is the correct
    # result here. The test still proves the scanner walks a real tree without
    # crashing, which is what it is named for.
    assert report.paths
    assert report.counts == {}


def test_retired_color_tokens_are_reported_across_the_v7_namespaces(tmp_path: Path) -> None:
    """`color=` values the v7 schema dropped are flagged before they raise at build time."""
    path = _write_module(
        tmp_path,
        """\
import lcars_ui as lcars
from lcars_ui import App, advanced, ui

app = App()
app.config("Demo", header_color="purple")


@app.page("Home", id="home")
def home() -> None:
    ui.button("Go", color="rust", id="go")
    advanced.console("C", color="tanoi", id="c")
    lcars.metric("m", "1", color="husk")
    ui.text("fine", color="lilac", id="ok")
""",
    )

    findings = _findings_of_kind(path, "removed_color_token")

    assert [finding.source.strip() for finding in findings] == [
        'app.config("Demo", header_color="purple")',
        'ui.button("Go", color="rust", id="go")',
        'advanced.console("C", color="tanoi", id="c")',
        'lcars.metric("m", "1", color="husk")',
    ]
    for finding in findings:
        for accepted in RENDERED_COLOR_TOKENS:
            assert accepted in finding.replacement


def test_retired_color_detection_ignores_calls_that_are_not_lcars(tmp_path: Path) -> None:
    """`purple` and `rust` are ordinary words: a false positive costs more than a miss."""
    path = _write_module(
        tmp_path,
        """\
import matplotlib.pyplot as plt

plt.plot([1, 2], color="purple")
some_object.draw(color="rust")
""",
    )

    assert _findings_of_kind(path, "removed_color_token") == []


def test_color_tokens_that_still_render_are_never_reported(tmp_path: Path) -> None:
    path = _write_module(
        tmp_path,
        """\
from lcars_ui import App, ui

app = App()


@app.page("Home", id="home")
def home() -> None:
    ui.button("Go", color="golden-tanoi", id="go")
    ui.text("t", color="#f89800", id="t")
""",
    )

    assert _findings_of_kind(path, "removed_color_token") == []
