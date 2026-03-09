export interface ParitySweepRectSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rx?: number;
  ry?: number;
}

export interface ParityLabelAnchorSpec {
  x: number;
  y: number;
  align: "left" | "right";
  color: string;
  size: number;
}

export interface ParityPanelBoundsSpec {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParityStackSpec {
  x: number;
  y: number;
  width: number;
  gap: number;
  segmentHeights: readonly number[];
  labelPaddingRight: number;
  labelFontSize: number;
}

export interface ParityChartSpec {
  borderColor: string;
  gridLineMajor: string;
  gridLineMinor: string;
  titleColor: string;
  titleTop: number;
  titleLeft: number;
}

export interface ParitySweepSpec {
  id: string;
  pageId: string;
  orientation: "top" | "bottom";
  viewWidth: number;
  viewHeight: number;
  sweepColor: string;
  paths: readonly string[];
  staticRects: readonly ParitySweepRectSpec[];
  titleAnchor: ParityLabelAnchorSpec;
  subtitleAnchor: ParityLabelAnchorSpec;
  leftBounds: ParityPanelBoundsSpec;
  rightBounds: ParityPanelBoundsSpec;
  stack: ParityStackSpec;
  chart: ParityChartSpec;
}

interface PageParityPalette {
  topSweep: string;
  bottomSweep: string;
  topStackFills: readonly string[];
  bottomStackFills: readonly string[];
  chartBorder: string;
  chartGridMajor: string;
  chartGridMinor: string;
  chartTitle: string;
}

interface PageParitySpecInput {
  pageId: string;
  topSweepId: string;
  bottomSweepId: string;
  palette: PageParityPalette;
}

const TOP_SWEEP_PATHS = [
  "M618 18 H1621 V148 H496 A122 122 0 0 1 618 18 Z",
  "M323 360 H804 V486 H449 A127 127 0 0 1 323 360 Z",
] as const;

const BOTTOM_SWEEP_PATHS = [
  "M272 37 H674 A122 122 0 0 1 796 159 V161 H272 Z",
  "M496 399 H1358 A127 127 0 0 1 1485 526 H496 Z",
] as const;

const TOP_LEFT_BOUNDS: ParityPanelBoundsSpec = {
  x: 30,
  y: 22,
  width: 425,
  height: 329,
};

const BOTTOM_LEFT_BOUNDS: ParityPanelBoundsSpec = {
  x: 30,
  y: 109,
  width: 425,
  height: 348,
};

const TOP_RIGHT_BOUNDS: ParityPanelBoundsSpec = {
  x: 958,
  y: 96,
  width: 884,
  height: 355,
};

const BOTTOM_RIGHT_BOUNDS: ParityPanelBoundsSpec = {
  x: 958,
  y: 72,
  width: 884,
  height: 355,
};

const TOP_STACK: ParityStackSpec = {
  x: 496,
  y: 151,
  width: 314,
  gap: 7,
  segmentHeights: [84, 112],
  labelPaddingRight: 14,
  labelFontSize: 33,
};

const BOTTOM_STACK: ParityStackSpec = {
  x: 496,
  y: 169,
  width: 314,
  gap: 7,
  segmentHeights: [84, 84, 42],
  labelPaddingRight: 14,
  labelFontSize: 33,
};

export const OVERVIEW_PARITY_SWEEP_IDS = ["overview_sweep_top", "overview_sweep_bottom"] as const;
export const SYSTEMS_PARITY_SWEEP_IDS = ["systems_sweep_top", "systems_sweep_bottom"] as const;
export const PARITY_SWEEP_IDS = [...OVERVIEW_PARITY_SWEEP_IDS, ...SYSTEMS_PARITY_SWEEP_IDS] as const;
export type ParitySweepId = (typeof PARITY_SWEEP_IDS)[number];
export const PARITY_SWEEP_RENDERER_VERSION = "stacked-sweep-parity-v1";

const makeParitySweepSpecs = ({
  pageId,
  topSweepId,
  bottomSweepId,
  palette,
}: PageParitySpecInput): readonly [ParitySweepSpec, ParitySweepSpec] => {
  const chartSpec: ParityChartSpec = {
    borderColor: palette.chartBorder,
    gridLineMajor: palette.chartGridMajor,
    gridLineMinor: palette.chartGridMinor,
    titleColor: palette.chartTitle,
    titleTop: 6,
    titleLeft: 6,
  };

  return [
    {
      id: topSweepId,
      pageId,
      orientation: "top",
      viewWidth: 1800,
      viewHeight: 486,
      sweepColor: palette.topSweep,
      paths: TOP_SWEEP_PATHS,
      staticRects: [
        { x: 0, y: 444, width: 90, height: 42, rx: 21, ry: 21, fill: palette.topSweep },
        { x: 1710, y: 18, width: 90, height: 42, rx: 21, ry: 21, fill: palette.topSweep },
        { x: 496, y: 151, width: 314, height: 84, rx: 10, ry: 10, fill: palette.topStackFills[0] ?? "#ff9900" },
        { x: 496, y: 242, width: 314, height: 112, fill: palette.topStackFills[1] ?? "#cc6699" },
      ],
      titleAnchor: { x: 1626, y: 21, align: "left", color: palette.topSweep, size: 30 },
      subtitleAnchor: { x: 109, y: 441, align: "left", color: palette.topSweep, size: 30 },
      leftBounds: TOP_LEFT_BOUNDS,
      rightBounds: TOP_RIGHT_BOUNDS,
      stack: TOP_STACK,
      chart: chartSpec,
    },
    {
      id: bottomSweepId,
      pageId,
      orientation: "bottom",
      viewWidth: 1800,
      viewHeight: 525,
      sweepColor: palette.bottomSweep,
      paths: BOTTOM_SWEEP_PATHS,
      staticRects: [
        { x: 0, y: 37, width: 90, height: 42, rx: 21, ry: 21, fill: palette.bottomSweep },
        { x: 1710, y: 483, width: 90, height: 42, rx: 21, ry: 21, fill: palette.bottomSweep },
        { x: 496, y: 169, width: 314, height: 84, rx: 10, ry: 10, fill: palette.bottomStackFills[0] ?? "#ff9900" },
        { x: 496, y: 260, width: 314, height: 84, rx: 10, ry: 10, fill: palette.bottomStackFills[1] ?? "#ff9900" },
        { x: 496, y: 351, width: 314, height: 42, fill: palette.bottomStackFills[2] ?? "#cc99cc" },
      ],
      titleAnchor: { x: 110, y: 39, align: "left", color: palette.bottomSweep, size: 30 },
      subtitleAnchor: { x: 84, y: 486, align: "right", color: palette.bottomSweep, size: 30 },
      leftBounds: BOTTOM_LEFT_BOUNDS,
      rightBounds: BOTTOM_RIGHT_BOUNDS,
      stack: BOTTOM_STACK,
      chart: chartSpec,
    },
  ];
};

const OVERVIEW_PARITY_PALETTE: PageParityPalette = {
  topSweep: "#ffff99",
  bottomSweep: "#99ccff",
  topStackFills: ["#ff9900", "#cc6699"],
  bottomStackFills: ["#ff9900", "#ff9900", "#cc99cc"],
  chartBorder: "#ffffcc",
  chartGridMajor: "#aaaaaa",
  chartGridMinor: "rgba(170, 170, 170, 0.62)",
  chartTitle: "#ffffcc",
};

const SYSTEMS_PARITY_PALETTE: PageParityPalette = {
  topSweep: "#ffcc99",
  bottomSweep: "#99ffcc",
  topStackFills: ["#ff9966", "#cc6699"],
  bottomStackFills: ["#ff9966", "#ffcc66", "#99ccff"],
  chartBorder: "#ccffdd",
  chartGridMajor: "#a8b8a8",
  chartGridMinor: "rgba(168, 184, 168, 0.62)",
  chartTitle: "#ccffdd",
};

export const PARITY_SWEEP_SPECS = [
  ...makeParitySweepSpecs({
    pageId: "overview",
    topSweepId: OVERVIEW_PARITY_SWEEP_IDS[0],
    bottomSweepId: OVERVIEW_PARITY_SWEEP_IDS[1],
    palette: OVERVIEW_PARITY_PALETTE,
  }),
  ...makeParitySweepSpecs({
    pageId: "systems",
    topSweepId: SYSTEMS_PARITY_SWEEP_IDS[0],
    bottomSweepId: SYSTEMS_PARITY_SWEEP_IDS[1],
    palette: SYSTEMS_PARITY_PALETTE,
  }),
] as const;

const PARITY_SWEEP_SPEC_BY_ID = new Map<string, ParitySweepSpec>(
  PARITY_SWEEP_SPECS.map((spec) => [spec.id, spec]),
);

export const isParitySweepId = (widgetId: string): widgetId is ParitySweepId => {
  return PARITY_SWEEP_SPEC_BY_ID.has(widgetId);
};

export const isOverviewParitySweepId = (widgetId: string): widgetId is (typeof OVERVIEW_PARITY_SWEEP_IDS)[number] => {
  return OVERVIEW_PARITY_SWEEP_IDS.includes(widgetId as (typeof OVERVIEW_PARITY_SWEEP_IDS)[number]);
};

export const isSystemsParitySweepId = (widgetId: string): widgetId is (typeof SYSTEMS_PARITY_SWEEP_IDS)[number] => {
  return SYSTEMS_PARITY_SWEEP_IDS.includes(widgetId as (typeof SYSTEMS_PARITY_SWEEP_IDS)[number]);
};

export const resolveParitySweepSpec = (widgetId: string): ParitySweepSpec | null => {
  return PARITY_SWEEP_SPEC_BY_ID.get(widgetId) ?? null;
};
