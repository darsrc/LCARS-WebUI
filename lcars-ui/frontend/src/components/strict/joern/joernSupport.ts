import type { LcarsBoxWidget, LcarsSweepWidget, Page, Widget } from "../../../types/contract";

const JOERN_SUPPORTED_WIDGET_TYPES = new Set<Widget["type"]>([
  "text",
  "markdown",
  "button",
  "line_chart",
  "lcars_header",
  "lcars_bracket",
  "lcars_box",
  "lcars_sweep",
  "status_tile",
  "table",
]);

const joernWidgetChildren = (widget: Widget): Widget[] => {
  switch (widget.type) {
    case "lcars_bracket":
      return widget.children;
    case "lcars_box": {
      const box = widget as LcarsBoxWidget;
      return [
        ...(box.left_inputs ?? []),
        ...(box.right_inputs ?? []),
        ...(box.main_children ?? box.children),
        ...(box.side_children ?? []),
      ];
    }
    case "lcars_sweep": {
      const sweep = widget as LcarsSweepWidget;
      const contentChildren = sweep.content_children ?? sweep.children;
      return [
        ...(sweep.header_children ?? []),
        ...(sweep.column_inputs ?? sweep.rail_children ?? []),
        ...(sweep.left_children ?? []),
        ...(sweep.right_children ?? []),
        ...(!sweep.left_children && !sweep.right_children ? contentChildren : []),
      ];
    }
    default:
      return [];
  }
};

export const joernSupportsWidget = (widget: Widget): boolean => {
  if (widget.visible === false) {
    return true;
  }
  if (!JOERN_SUPPORTED_WIDGET_TYPES.has(widget.type)) {
    return false;
  }
  return joernWidgetChildren(widget).every((child) => joernSupportsWidget(child));
};

export const joernSupportsPage = (page: Page): boolean => {
  return page.rows.every((row) =>
    row.columns.every((column) => column.widgets.every((widget) => joernSupportsWidget(widget))),
  );
};

export const joernUnsupportedWidgetsForPage = (page: Page): Widget[] => {
  const unsupported: Widget[] = [];

  const visit = (widget: Widget): void => {
    if (widget.visible === false) {
      return;
    }
    if (!JOERN_SUPPORTED_WIDGET_TYPES.has(widget.type)) {
      unsupported.push(widget);
      return;
    }
    for (const child of joernWidgetChildren(widget)) {
      visit(child);
    }
  };

  for (const row of page.rows) {
    for (const column of row.columns) {
      for (const widget of column.widgets) {
        visit(widget);
      }
    }
  }

  return unsupported;
};
