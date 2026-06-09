import type { Column, LogViewerWidget, Manifest, Widget } from "../types/contract";
import { isManifest } from "../types/contract";

const WIDGET_CHILD_KEYS = [
  "children",
  "header_children",
  "column_inputs",
  "left_children",
  "right_children",
  "rail_children",
  "content_children",
  "main_children",
  "side_children",
  "left_inputs",
  "right_inputs",
] as const;

const structuredCloneSafe = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const parsePath = (path: string): Array<string | number> => {
  const matches = path.match(/([^[.\]]+)|\[(\d+)\]/g);
  if (!matches) {
    return [];
  }
  return matches.map((token) => {
    if (token.startsWith("[")) {
      return Number(token.slice(1, -1));
    }
    return token;
  });
};

const setByPath = (target: Record<string, unknown>, path: string, value: unknown): boolean => {
  const segments = parsePath(path);
  if (segments.length === 0) {
    return false;
  }

  let node: unknown = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (typeof segment === "number") {
      if (!Array.isArray(node) || segment < 0 || segment >= node.length) {
        return false;
      }
      node = node[segment];
      continue;
    }
    if (typeof node !== "object" || node === null || !(segment in node)) {
      return false;
    }
    node = (node as Record<string, unknown>)[segment];
  }

  const last = segments[segments.length - 1];
  if (typeof last === "number") {
    if (!Array.isArray(node) || last < 0 || last >= node.length) {
      return false;
    }
    node[last] = value;
    return true;
  }
  if (typeof node !== "object" || node === null) {
    return false;
  }
  (node as Record<string, unknown>)[last] = value;
  return true;
};

const updateWidget = (widget: Widget, targetId: string, data: Record<string, unknown>): Widget => {
  if (widget.id === targetId) {
    return { ...widget, ...data } as Widget;
  }

  const next = { ...widget } as Record<string, unknown>;
  let changed = false;
  for (const key of WIDGET_CHILD_KEYS) {
    const children = next[key];
    if (!Array.isArray(children)) {
      continue;
    }
    const updatedChildren = (children as Widget[]).map((child) => updateWidget(child, targetId, data));
    if (updatedChildren.some((child, index) => child !== children[index])) {
      next[key] = updatedChildren;
      changed = true;
    }
  }

  return changed ? (next as unknown as Widget) : widget;
};

const updateWidgetsInColumn = (
  column: Column,
  targetId: string,
  data: Record<string, unknown>,
): Column => ({
  ...column,
  widgets: column.widgets.map((widget) => updateWidget(widget, targetId, data)),
});

export const applyManifestUpdate = (
  manifest: Manifest,
  path: string,
  value: unknown,
): { manifest: Manifest; applied: boolean } => {
  if (path === "") {
    if (!isManifest(value)) {
      return { manifest, applied: false };
    }
    return { manifest: value as Manifest, applied: true };
  }

  const next = structuredCloneSafe(manifest) as unknown as Record<string, unknown>;
  const applied = setByPath(next, path, value);
  return { manifest: next as unknown as Manifest, applied };
};

export const applyWidgetUpdate = (
  manifest: Manifest,
  id: string,
  data: Record<string, unknown>,
): Manifest => ({
  ...manifest,
  pages: Object.fromEntries(
    Object.entries(manifest.pages).map(([pageId, page]) => [
      pageId,
      {
        ...page,
        rows: page.rows.map((row) => ({
          ...row,
          columns: row.columns.map((column) => updateWidgetsInColumn(column, id, data)),
        })),
      },
    ]),
  ),
});

const flattenWidgets = (widgets: Widget[]): Widget[] =>
  widgets.flatMap((widget) => {
    const nested = WIDGET_CHILD_KEYS.flatMap((key) => {
      const children = (widget as unknown as Record<string, unknown>)[key];
      return Array.isArray(children) ? flattenWidgets(children as Widget[]) : [];
    });
    if (nested.length > 0) {
      return [widget, ...nested];
    }
    return [widget];
  });

const collectWidgets = (manifest: Manifest): Widget[] =>
  Object.values(manifest.pages)
    .flatMap((page) => page.rows)
    .flatMap((row) => row.columns)
    .flatMap((column) => flattenWidgets(column.widgets));

export const resolveDefaultPageId = (manifest: Manifest): string => {
  const sidebarTarget = manifest.layout.sidebar.items[0]?.target_page;
  if (sidebarTarget && manifest.pages[sidebarTarget]) {
    return sidebarTarget;
  }
  return Object.keys(manifest.pages)[0];
};

export const getLogViewerByStream = (
  manifest: Manifest,
  streamId: string,
): LogViewerWidget | undefined => {
  const widgets = collectWidgets(manifest);
  return widgets.find((widget): widget is LogViewerWidget => {
    return widget.type === "log_viewer" && widget.stream_id === streamId;
  });
};

export const getWidgetById = (manifest: Manifest, widgetId: string): Widget | undefined => {
  return collectWidgets(manifest).find((widget) => widget.id === widgetId);
};
