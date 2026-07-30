"""Manifest builder for DSL mode."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any, Literal, cast

from lcars_ui.core.models import (
    Column,
    Header,
    Layout,
    Manifest,
    Meta,
    Page,
    Row,
    Sidebar,
    SidebarItem,
    SidebarSegment,
    Widget,
)
from lcars_ui.core.widget_base import BaseWidget, Hint, LayoutSizing
from lcars_ui.dsl._normalize import normalize_manifest_for_strict
from lcars_ui.widgets.inputs import InputWidget
from lcars_ui.widgets.primitives import WebUISettings

_FORM_CHILD_WIDGET_TYPES = {
    "button",
    "toggle",
    "lcars_checkbox",
    "select",
    "lcars_radio",
    "lcars_radio_toggle",
    "text_input",
    "number_input",
}

SETTINGS_PAGE_ID = "lcars-options"
SETTINGS_WIDGET_ID = "lcars-webui-settings"


class _ColumnContext:
    """Context manager returned by lcars.columns() that sets current column."""

    def __init__(self, builder: _ManifestBuilder, row: Row, col: Column) -> None:
        self._builder = builder
        self._row = row
        self._col = col
        self._prev_row: Row | None = None
        self._prev_col: Column | None = None

    def __enter__(self) -> _ColumnContext:
        self._prev_row = self._builder._current_row
        self._prev_col = self._builder._current_column
        self._builder._current_row = self._row
        self._builder._current_column = self._col
        return self

    def __exit__(self, *_: Any) -> None:
        self._builder._current_row = self._prev_row
        self._builder._current_column = self._prev_col


class _ManifestBuilder:
    """Accumulates Page/Row/Column/Widget declarations during a BUILD call.

    Strict-mode composition is compiled in a second pass
    (``normalize_manifest_for_strict``), so row/column assembly here preserves
    manifest compatibility while strict lowering becomes container-first.
    """

    def __init__(self) -> None:
        self._pages: dict[str, Page] = {}
        self._current_page: Page | None = None
        self._current_row: Row | None = None
        self._current_column: Column | None = None
        self._form_stack: list[BaseWidget] = []
        self._container_stack: list[tuple[BaseWidget | Hint, str]] = []
        self._sidebar_items: list[SidebarItem] = []
        self._raw_scope_depth = 0
        self._raw_widget_ids: set[str] = set()
        self._last_widget: BaseWidget | None = None

    def _ensure_default_page(self) -> None:
        if self._current_page is None:
            page = Page(id="main", title="")
            self._pages["main"] = page
            row = Row(id="auto-row")
            page.rows.append(row)
            col = Column(id="auto-col", width="1fr")
            row.columns.append(col)
            self._current_page = page
            self._current_row = row
            self._current_column = col

    def add_widget(self, widget: BaseWidget) -> None:
        if self._raw_scope_depth > 0:
            self._raw_widget_ids.add(widget.id)

        # Remember the most recent declaration so `with lcars.hint():` can attach
        # to it without the author having to name an id.
        self._last_widget = widget

        if self._form_stack:
            parent_form = self._form_stack[-1]
            if widget.type not in _FORM_CHILD_WIDGET_TYPES:
                raise ValueError("lcars.form() can only contain input widgets.")
            children = getattr(parent_form, "children", None)
            if isinstance(children, list):
                children.append(cast(InputWidget, widget))
            return

        if self._container_stack:
            container, target = self._container_stack[-1]
            items = getattr(container, target, None)
            if items is None:
                items = []
                setattr(container, target, items)
            if isinstance(items, list):
                items.append(widget)
            return

        self._ensure_default_page()
        if self._current_row is None:
            assert self._current_page is not None
            self._current_row = Row(
                id=f"{self._current_page.id}-auto-row-{len(self._current_page.rows)}"
            )
            self._current_page.rows.append(self._current_row)
        if self._current_column is None:
            assert self._current_page is not None
            assert self._current_row is not None
            self._current_column = Column(
                id=f"{self._current_page.id}-auto-col-{len(self._current_row.columns)}",
                width="1fr",
            )
            self._current_row.columns.append(self._current_column)
        assert self._current_column is not None
        self._current_column.widgets.append(cast(Widget, widget))

    @contextmanager
    def page_context(
        self,
        title: str,
        page_id: str,
        archetype: Literal["auto", "console", "telemetry", "grid", "menu"] = "auto",
        fillers: bool = True,
        sizing: LayoutSizing = "fill",
    ) -> Generator[Page, None, None]:
        page = Page(
            id=page_id,
            title=title,
            archetype=archetype,
            fillers=fillers,
            sizing=sizing,
        )
        self._pages[page_id] = page
        row = Row(id=f"{page_id}-auto-row")
        page.rows.append(row)
        col = Column(id=f"{page_id}-auto-col", width="1fr")
        row.columns.append(col)

        prev_page = self._current_page
        prev_row = self._current_row
        prev_col = self._current_column
        self._current_page = page
        self._current_row = row
        self._current_column = col
        try:
            yield page
        finally:
            self._current_page = prev_page
            self._current_row = prev_row
            self._current_column = prev_col

    def add_columns(self, widths: list[str]) -> list[_ColumnContext]:
        self._ensure_default_page()
        assert self._current_page is not None
        page = self._current_page
        row = Row(id=f"{page.id}-col-row-{len(page.rows)}")
        page.rows.append(row)

        contexts: list[_ColumnContext] = []
        for i, width in enumerate(widths):
            col = Column(id=f"{page.id}-col-{i}", width=width)
            row.columns.append(col)
            contexts.append(_ColumnContext(self, row, col))
        return contexts

    @contextmanager
    def row_context(
        self,
        *,
        row_id: str | None = None,
        height: str = "auto",
    ) -> Generator[Row, None, None]:
        self._ensure_default_page()
        assert self._current_page is not None
        row = Row(
            id=row_id or f"{self._current_page.id}-row-{len(self._current_page.rows)}",
            height=height,
        )
        self._current_page.rows.append(row)

        prev_row = self._current_row
        prev_col = self._current_column
        self._current_row = row
        self._current_column = None
        try:
            yield row
        finally:
            self._current_row = prev_row
            self._current_column = prev_col

    @contextmanager
    def col_context(
        self,
        width: str = "1fr",
        *,
        col_id: str | None = None,
    ) -> Generator[Column, None, None]:
        self._ensure_default_page()
        assert self._current_page is not None
        if self._current_row is None:
            auto_row = Row(id=f"{self._current_page.id}-row-{len(self._current_page.rows)}")
            self._current_page.rows.append(auto_row)
            self._current_row = auto_row

        column = Column(
            id=col_id or f"{self._current_page.id}-row-col-{len(self._current_row.columns)}",
            width=width,
        )
        self._current_row.columns.append(column)

        prev_col = self._current_column
        self._current_column = column
        try:
            yield column
        finally:
            self._current_column = prev_col

    @contextmanager
    def form_context(self, form_widget: BaseWidget) -> Generator[BaseWidget, None, None]:
        self._form_stack.append(form_widget)
        try:
            yield form_widget
        finally:
            self._form_stack.pop()

    def find_widget(self, widget_id: str) -> BaseWidget | None:
        """Locate an already-declared widget anywhere in the manifest under construction.

        Walks every page, plus any container children (box/sweep/bracket regions,
        form children and hint bodies), so a hint can attach to a nested widget.
        """

        def walk(widget: BaseWidget) -> BaseWidget | None:
            if widget.id == widget_id:
                return widget
            for name in type(widget).model_fields:
                value = getattr(widget, name, None)
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, BaseWidget) and (found := walk(item)) is not None:
                            return found
            hint = getattr(widget, "hint", None)
            if isinstance(hint, Hint):
                for item in hint.children:
                    if isinstance(item, BaseWidget) and (found := walk(item)) is not None:
                        return found
            return None

        # Containers currently open are not yet reachable from a page, so search
        # the open stack first — it is also the nearest scope.
        for container, _ in reversed(self._container_stack):
            if isinstance(container, BaseWidget) and (found := walk(container)) is not None:
                return found
        for form_widget in reversed(self._form_stack):
            if (found := walk(form_widget)) is not None:
                return found
        for page in self._pages.values():
            for row in page.rows:
                for column in row.columns:
                    for widget in column.widgets:
                        if (found := walk(widget)) is not None:
                            return found
        return None

    def in_raw_scope(self) -> bool:
        return self._raw_scope_depth > 0

    def is_page_level_grid_scope(self) -> bool:
        return not self._container_stack and not self.in_raw_scope()

    @contextmanager
    def container_context(
        self,
        container_widget: BaseWidget | Hint,
        *,
        target: str = "children",
    ) -> Generator[BaseWidget | Hint, None, None]:
        self._container_stack.append((container_widget, target))
        try:
            yield container_widget
        finally:
            self._container_stack.pop()

    @contextmanager
    def input_column_context(
        self,
        *,
        side: Literal["left", "right"] = "left",
    ) -> Generator[BaseWidget, None, None]:
        target = "left_inputs" if side == "left" else "right_inputs"
        for container, _ in reversed(self._container_stack):
            # A Hint can sit on the container stack and has no .type discriminator.
            if getattr(container, "type", None) == "lcars_box":
                box = cast(BaseWidget, container)
                with self.container_context(box, target=target):
                    yield box
                return
        raise ValueError("lcars.input_column() requires an enclosing lcars.box() context.")

    @contextmanager
    def raw_context(self) -> Generator[None, None, None]:
        self._raw_scope_depth += 1
        try:
            yield
        finally:
            self._raw_scope_depth -= 1

    def add_sidebar_item(
        self,
        *,
        item_id: str,
        label: str,
        target_page: str,
        color: str | None = None,
        segments: list[SidebarSegment] | None = None,
    ) -> None:
        self._sidebar_items.append(
            SidebarItem(
                id=item_id,
                label=label,
                target_page=target_page,
                color=color,
                segments=segments,
            )
        )

    def build(self, config: Any) -> Manifest:
        if not self._pages:
            self._ensure_default_page()

        if config.settings_page and SETTINGS_PAGE_ID not in self._pages:
            settings_widget = WebUISettings(
                id=SETTINGS_WIDGET_ID,
                label="Interface Options",
                color="anakiwa",
                zone="primary",
                sizing="content",
                span=(3, 3),
            )
            self._pages[SETTINGS_PAGE_ID] = Page(
                id=SETTINGS_PAGE_ID,
                title="Options",
                archetype="menu",
                fillers=True,
                sizing="fill",
                rows=[
                    Row(
                        id=f"{SETTINGS_PAGE_ID}-row",
                        columns=[
                            Column(
                                id=f"{SETTINGS_PAGE_ID}-column",
                                width="1fr",
                                widgets=[cast(Widget, settings_widget)],
                            )
                        ],
                    )
                ],
            )

        if config.settings_page and not any(
            item.target_page == SETTINGS_PAGE_ID for item in self._sidebar_items
        ):
            self._sidebar_items.append(
                SidebarItem(
                    id="nav-lcars-options",
                    label="Options",
                    target_page=SETTINGS_PAGE_ID,
                    color="anakiwa",
                )
            )

        meta = Meta(
            version="1.0",
            app_name=config.name,
            theme=config.theme,
            lang=config.lang,
            sound_enabled=config.sound_enabled,
            force_uppercase=config.force_uppercase,
            label_uppercase=config.label_uppercase,
            lcars_font_headers=config.lcars_font_headers,
            lcars_font_labels=config.lcars_font_labels,
            lcars_font_text=config.lcars_font_text,
            visual_language=config.visual_language,
            strict_renderer=config.strict_renderer,
        )
        header = Header(
            title=config.name,
            subtitle=config.subtitle,
            color=config.header_color,
        )
        sidebar = Sidebar(items=self._sidebar_items)
        layout = Layout(header=header, sidebar=sidebar)
        manifest = Manifest(meta=meta, layout=layout, pages=self._pages)
        if config.visual_language == "strict":
            return normalize_manifest_for_strict(
                manifest,
                raw_widget_ids=set(self._raw_widget_ids),
            )
        return manifest


__all__ = ["_ManifestBuilder", "_ColumnContext"]
