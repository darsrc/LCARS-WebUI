"""Manifest builder for DSL mode."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

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
)
from lcars_ui.core.widget_base import BaseWidget

_FORM_CHILD_WIDGET_TYPES = {"button", "toggle", "select", "text_input", "number_input"}


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
    """Accumulates Page/Row/Column/Widget declarations during a BUILD call."""

    def __init__(self) -> None:
        self._pages: dict[str, Page] = {}
        self._current_page: Page | None = None
        self._current_row: Row | None = None
        self._current_column: Column | None = None
        self._form_stack: list[BaseWidget] = []
        self._sidebar_items: list[SidebarItem] = []

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
        if self._form_stack:
            parent_form = self._form_stack[-1]
            if widget.type not in _FORM_CHILD_WIDGET_TYPES:
                raise ValueError("lcars.form() can only contain input widgets.")
            children = getattr(parent_form, "children", None)
            if isinstance(children, list):
                children.append(widget)
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
        self._current_column.widgets.append(widget)  # type: ignore[arg-type]

    @contextmanager
    def page_context(self, title: str, page_id: str) -> Generator[Page, None, None]:
        page = Page(id=page_id, title=title)
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

    def add_sidebar_item(
        self,
        *,
        item_id: str,
        label: str,
        target_page: str,
        color: str | None = None,
    ) -> None:
        self._sidebar_items.append(
            SidebarItem(id=item_id, label=label, target_page=target_page, color=color)  # type: ignore[arg-type]
        )

    def build(self, config: Any) -> Manifest:
        if not self._pages:
            self._ensure_default_page()

        meta = Meta(
            version="1.0",
            app_name=config.name,
            theme=config.theme,
            lang=config.lang,
            sound_enabled=config.sound_enabled,
        )
        header = Header(
            title=config.name,
            subtitle=config.subtitle,
            color=config.header_color,
        )
        sidebar = Sidebar(items=self._sidebar_items)
        layout = Layout(header=header, sidebar=sidebar)
        return Manifest(meta=meta, layout=layout, pages=self._pages)


__all__ = ["_ManifestBuilder", "_ColumnContext"]
