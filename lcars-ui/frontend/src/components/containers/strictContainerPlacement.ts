import type { LcarsBoxWidget, LcarsSweepWidget, StrictWidgetRole, Widget } from "../../types/contract";

const STRICT_TERMINAL_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "button",
  "toggle",
  "lcars_checkbox",
  "select",
  "lcars_radio",
  "lcars_radio_toggle",
  "text_input",
  "number_input",
  "form",
  "mic_button",
]);

const STRICT_SECONDARY_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "status_tile",
  "progress_bar",
  "gauge",
  "alert",
]);

const strictRoleForWidget = (widget: Widget): StrictWidgetRole => {
  if (widget.strict_role === "primary" || widget.strict_role === "secondary" || widget.strict_role === "terminal") {
    return widget.strict_role;
  }
  if (STRICT_TERMINAL_WIDGET_TYPES.has(widget.type)) {
    return "terminal";
  }
  if (STRICT_SECONDARY_WIDGET_TYPES.has(widget.type)) {
    return "secondary";
  }
  return "primary";
};

const partitionContentByRole = (widgets: Widget[]): { primaryChildren: Widget[]; secondaryChildren: Widget[] } => {
  const primaryChildren: Widget[] = [];
  const secondaryChildren: Widget[] = [];

  for (const widget of widgets) {
    if (strictRoleForWidget(widget) === "secondary") {
      secondaryChildren.push(widget);
      continue;
    }
    primaryChildren.push(widget);
  }

  if (primaryChildren.length === 0 && secondaryChildren.length > 0) {
    primaryChildren.push(secondaryChildren.shift() as Widget);
  }

  return { primaryChildren, secondaryChildren };
};

const clampSweepRatio = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return 0.62;
  }
  return Math.min(0.8, Math.max(0.2, value as number));
};

const splitSweepContent = (content: Widget[], leftRatio: number): [Widget[], Widget[]] => {
  if (content.length <= 1) {
    return [content, []];
  }
  const splitAt = Math.max(1, Math.min(content.length - 1, Math.round(content.length * leftRatio)));
  return [content.slice(0, splitAt), content.slice(splitAt)];
};

export const resolveBoxContentRegions = (
  widget: LcarsBoxWidget,
): {
  mainChildren: Widget[];
  sideChildren: Widget[];
} => {
  if (widget.main_children || widget.side_children) {
    return {
      mainChildren: widget.main_children ?? widget.children,
      sideChildren: widget.side_children ?? [],
    };
  }

  const partition = partitionContentByRole(widget.children);
  return {
    mainChildren: partition.primaryChildren,
    sideChildren: partition.secondaryChildren,
  };
};

export const resolveSweepRegions = (
  widget: LcarsSweepWidget,
): {
  headerChildren: Widget[];
  railChildren: Widget[];
  leftChildren: Widget[];
  rightChildren: Widget[];
} => {
  const headerChildren = widget.header_children ?? [];
  const railChildren = widget.column_inputs ?? widget.rail_children ?? [];

  if (widget.left_children || widget.right_children) {
    const leftChildren = widget.left_children ?? [];
    const rightChildren = widget.right_children ?? [];
    return {
      headerChildren,
      railChildren,
      leftChildren: leftChildren.length > 0 ? leftChildren : rightChildren.slice(0, 1),
      rightChildren: leftChildren.length > 0 ? rightChildren : rightChildren.slice(1),
    };
  }

  const content = widget.content_children ?? widget.children;
  const partition = partitionContentByRole(content);
  if (partition.secondaryChildren.length > 0) {
    return {
      headerChildren,
      railChildren,
      leftChildren: partition.primaryChildren,
      rightChildren: partition.secondaryChildren,
    };
  }

  let [leftChildren, rightChildren] = splitSweepContent(content, clampSweepRatio(widget.left_width));
  if (leftChildren.length === 0 && rightChildren.length > 0) {
    leftChildren = [rightChildren[0]];
    rightChildren = rightChildren.slice(1);
  }
  return {
    headerChildren,
    railChildren,
    leftChildren,
    rightChildren,
  };
};
