"""Ordinary LCARS building blocks.

This is the surface an operations application needs: panels and sections, text,
readouts, the common controls, tables, charts and forms. Everything specialist
lives in :mod:`lcars_ui.advanced`.

Declare these inside an ``@app.page`` function::

    from lcars_ui import App, ui

    app = App()

    @app.page("Bridge", id="bridge")
    def bridge() -> None:
        with ui.data_panel("Status", id="status-panel"):
            ui.metric("Shields", "100%", id="shields")
        ui.button("Engage", id="engage")
"""

from lcars_ui.dsl.api import (
    alert,
    bar,
    box,
    button,
    chart,
    checkbox,
    col,
    columns,
    command_input,
    control_panel,
    data_panel,
    file_upload,
    form,
    gauge,
    header,
    hide_hint,
    hint,
    log,
    markdown,
    metric,
    number_input,
    progress,
    radio,
    radio_toggle,
    row,
    section,
    select,
    show_hint,
    sparkline,
    table,
    text,
    text_input,
    toggle,
)

__all__ = [
    "alert",
    "bar",
    "box",
    "button",
    "chart",
    "checkbox",
    "col",
    "columns",
    "command_input",
    "control_panel",
    "data_panel",
    "file_upload",
    "form",
    "gauge",
    "header",
    "hide_hint",
    "hint",
    "log",
    "markdown",
    "metric",
    "number_input",
    "progress",
    "radio",
    "radio_toggle",
    "row",
    "section",
    "select",
    "show_hint",
    "sparkline",
    "table",
    "text",
    "text_input",
    "toggle",
]
