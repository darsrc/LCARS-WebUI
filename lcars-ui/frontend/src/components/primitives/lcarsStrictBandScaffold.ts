import type { Row, Widget } from "../../types/contract";
import { resolveStrictWidgetRole } from "../strict/strictWidgetRole";

export interface StrictLanePartition {
  terminalWidgets: Widget[];
  primaryWidgets: Widget[];
  secondaryWidgets: Widget[];
}

export interface StrictLaneScaffoldModel {
  id: string;
  role: "title" | "content" | "core" | "support";
  width: string;
  widgets: Widget[];
}

export interface StrictBandScaffoldModel {
  id: string;
  role: "page_title" | "content";
  height: string;
  lanes: StrictLaneScaffoldModel[];
  isTitleBand: boolean;
}

const isPageTitleSweep = (widget: Widget, pageTitle: string): boolean => {
  return widget.type === "lcars_sweep" && typeof widget.title === "string" && widget.title === pageTitle;
};

export const partitionStrictLaneWidgets = (widgets: Widget[]): StrictLanePartition => {
  const terminalWidgets: Widget[] = [];
  const primaryWidgets: Widget[] = [];
  const secondaryWidgets: Widget[] = [];

  for (const widget of widgets) {
    const strictRole = resolveStrictWidgetRole(widget);
    if (strictRole === "terminal") {
      terminalWidgets.push(widget);
      continue;
    }
    if (strictRole === "secondary") {
      secondaryWidgets.push(widget);
      continue;
    }
    primaryWidgets.push(widget);
  }

  if (primaryWidgets.length === 0 && secondaryWidgets.length > 0) {
    primaryWidgets.push(secondaryWidgets.shift() as Widget);
  }

  return {
    terminalWidgets,
    primaryWidgets,
    secondaryWidgets,
  };
};

const followColumnScaffold = (row: Row): StrictLaneScaffoldModel[] => {
  return row.columns.map((column) => ({
    id: column.id,
    role: column.strict_lane_role ?? "content",
    width: column.width,
    widgets: column.widgets,
  }));
};

const splitSingleColumnScaffold = (
  row: Row,
  options: {
    allowLegacyThreshold: boolean;
  },
): StrictLaneScaffoldModel[] => {
  if (row.columns.length !== 1) {
    return followColumnScaffold(row);
  }

  const [singleColumn] = row.columns;
  const partition = partitionStrictLaneWidgets(singleColumn.widgets);
  const coreWidgets = [...partition.primaryWidgets];
  const supportWidgets = [...partition.terminalWidgets, ...partition.secondaryWidgets];

  if (coreWidgets.length === 0 || supportWidgets.length === 0) {
    return followColumnScaffold(row);
  }

  if (options.allowLegacyThreshold && coreWidgets.length + supportWidgets.length < 4) {
    return followColumnScaffold(row);
  }

  return [
    {
      id: `${singleColumn.id}-core`,
      role: "core",
      width: "minmax(0, 1.58fr)",
      widgets: coreWidgets,
    },
    {
      id: `${singleColumn.id}-support`,
      role: "support",
      width: "minmax(0, 1fr)",
      widgets: supportWidgets,
    },
  ];
};

export const composeStrictBandScaffold = (
  row: Row,
  pageTitle: string,
): StrictBandScaffoldModel => {
  const explicitLaneMode = row.strict_lane_mode;
  const lanes =
    explicitLaneMode === "split_single_column"
      ? splitSingleColumnScaffold(row, { allowLegacyThreshold: false })
      : explicitLaneMode === "follow_columns"
        ? followColumnScaffold(row)
        : splitSingleColumnScaffold(row, { allowLegacyThreshold: true });

  const isTitleBand =
    row.strict_band_role === "page_title" ||
    (row.strict_band_role == null &&
      lanes.some((lane) => lane.widgets.some((widget) => isPageTitleSweep(widget, pageTitle))));

  return {
    id: row.id,
    role: row.strict_band_role ?? (isTitleBand ? "page_title" : "content"),
    height: row.height,
    lanes,
    isTitleBand,
  };
};
