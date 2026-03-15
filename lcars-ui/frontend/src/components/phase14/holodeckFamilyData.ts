import type {
  LcarsCapsuleBarSpec,
  LcarsRectSegmentSpec,
  LcarsTextRowsBlock,
} from "../primitives/lcarsGeometryPrimitives";

export type HolodeckTargetId = "holodeck_programming_a" | "holodeck_programming_b";

interface HolodeckBadgeSpec {
  value: string;
  x: number;
  y: number;
  fill: string;
  accentFill: string;
}

interface HolodeckSidebarBar {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  label: string;
  labelX: number;
  accent?: LcarsRectSegmentSpec;
}

interface HolodeckListEntry {
  code: string;
  name: string;
  y: number;
}

interface HolodeckDensePayload {
  kind: "dense_console";
  telemetryBlocks: LcarsTextRowsBlock[];
  centerPills: LcarsCapsuleBarSpec[];
  rightPills: LcarsCapsuleBarSpec[];
  accentSquares: LcarsRectSegmentSpec[];
}

interface HolodeckRosterPayload {
  kind: "roster";
  entries: HolodeckListEntry[];
}

export interface HolodeckSceneSpec {
  targetId: HolodeckTargetId;
  familyId: "holodeck_programming";
  title: string;
  titleX: number;
  titleY: number;
  scaffoldSegments: LcarsRectSegmentSpec[];
  topPills: LcarsCapsuleBarSpec[];
  leftBars: HolodeckSidebarBar[];
  badges: HolodeckBadgeSpec[];
  footerPills: LcarsCapsuleBarSpec[];
  payload: HolodeckDensePayload | HolodeckRosterPayload;
}

const SHARED_TITLE = "HOLODECK PROGRAMMING";
const SHARED_SCAFFOLD: LcarsRectSegmentSpec[] = [
  { x: 34, y: 4, width: 396, height: 160, fill: "#e6906f" },
  { x: 927, y: 4, width: 56, height: 40, fill: "#e6906f", rx: 20, ry: 20 },
  { x: 258, y: 116, width: 271, height: 33, fill: "#e6906f" },
  { x: 566, y: 116, width: 230, height: 33, fill: "#e6906f" },
  { x: 1, y: 666, width: 341, height: 96, fill: "#e6906f" },
  { x: 323, y: 680, width: 469, height: 28, fill: "#e6906f", rx: 14, ry: 14 },
  { x: 769, y: 720, width: 214, height: 43, fill: "#e6906f", rx: 21, ry: 21 },
];

const SHARED_LEFT_BARS: HolodeckSidebarBar[] = [
  {
    x: 3,
    y: 260,
    width: 205,
    height: 35,
    fill: "#e5c86b",
    label: "SS WCT",
    labelX: 188,
    accent: { x: 212, y: 260, width: 27, height: 35, fill: "#e5c86b" },
  },
  {
    x: 3,
    y: 305,
    width: 205,
    height: 34,
    fill: "#e6906f",
    label: "RK RS",
    labelX: 188,
    accent: { x: 212, y: 305, width: 27, height: 34, fill: "#e6906f" },
  },
  {
    x: 3,
    y: 396,
    width: 205,
    height: 35,
    fill: "#aa8fe9",
    label: "RK BER",
    labelX: 188,
    accent: { x: 212, y: 396, width: 27, height: 35, fill: "#aa8fe9" },
  },
  {
    x: 3,
    y: 441,
    width: 205,
    height: 34,
    fill: "#e5c86b",
    label: "E AEI",
    labelX: 188,
    accent: { x: 212, y: 441, width: 27, height: 34, fill: "#e5c86b" },
  },
  {
    x: 3,
    y: 486,
    width: 205,
    height: 35,
    fill: "#aa8fe9",
    label: "B AMS",
    labelX: 188,
    accent: { x: 212, y: 486, width: 27, height: 35, fill: "#aa8fe9" },
  },
];

const SHARED_TOP_PILLS: LcarsCapsuleBarSpec[] = [
  {
    x: 703,
    y: 116,
    width: 93,
    height: 33,
    fill: "#e6906f",
    label: "LCARS",
    labelClassName: "phase14-holodeck-small-pill-label",
    textAnchor: "end",
    labelOffsetX: 15,
    labelOffsetY: 7,
  },
];

const SHARED_FOOTER_PILLS: LcarsCapsuleBarSpec[] = [
  { x: 350, y: 720, width: 89, height: 42, fill: "#dbab43", label: "JN FKS", labelClassName: "phase14-holodeck-pill-label" },
  { x: 453, y: 720, width: 80, height: 42, fill: "#dbab43", label: "JR SCP", labelClassName: "phase14-holodeck-pill-label" },
  { x: 568, y: 720, width: 192, height: 42, fill: "#dbab43", label: "SE FRE", labelClassName: "phase14-holodeck-pill-label" },
  { x: 773, y: 720, width: 163, height: 42, fill: "#e6906f", label: "RK VOL", labelClassName: "phase14-holodeck-pill-label" },
];

const HOLODECK_SCENES: Record<HolodeckTargetId, HolodeckSceneSpec> = {
  holodeck_programming_a: {
    targetId: "holodeck_programming_a",
    familyId: "holodeck_programming",
    title: SHARED_TITLE,
    titleX: 443,
    titleY: 40,
    scaffoldSegments: [
      ...SHARED_SCAFFOLD,
      { x: 692, y: 215, width: 68, height: 396, fill: "#e6906f" },
      { x: 4, y: 214, width: 205, height: 34, fill: "#aa8fe9" },
      { x: 212, y: 214, width: 27, height: 34, fill: "#aa8fe9" },
      { x: 214, y: 349, width: 25, height: 36, fill: "#aa8fe9" },
      { x: 270, y: 214, width: 47, height: 34, fill: "#aa8fe9" },
      { x: 300, y: 440, width: 16, height: 35, fill: "#aa8fe9" },
      { x: 300, y: 531, width: 16, height: 35, fill: "#aa8fe9" },
      { x: 300, y: 577, width: 16, height: 34, fill: "#aa8fe9" },
      { x: 663, y: 214, width: 16, height: 35, fill: "#e6906f" },
      { x: 663, y: 305, width: 16, height: 35, fill: "#e6906f" },
      { x: 663, y: 396, width: 16, height: 35, fill: "#e6906f" },
      { x: 663, y: 441, width: 16, height: 34, fill: "#dbab43" },
      { x: 663, y: 577, width: 16, height: 34, fill: "#aa8fe9" },
      { x: 774, y: 214, width: 16, height: 35, fill: "#e6906f" },
      { x: 774, y: 260, width: 16, height: 35, fill: "#dbab43" },
      { x: 774, y: 396, width: 16, height: 35, fill: "#ef6a7b" },
      { x: 774, y: 441, width: 16, height: 35, fill: "#e6906f" },
      { x: 774, y: 486, width: 16, height: 35, fill: "#aa8fe9" },
      { x: 774, y: 577, width: 16, height: 34, fill: "#e6906f" },
    ],
    topPills: SHARED_TOP_PILLS,
    leftBars: [
      {
        x: 3,
        y: 214,
        width: 205,
        height: 34,
        fill: "#aa8fe9",
        label: "R ON",
        labelX: 188,
        accent: { x: 212, y: 214, width: 27, height: 34, fill: "#aa8fe9" },
      },
      ...SHARED_LEFT_BARS,
    ],
    badges: [
      { value: "20", x: 272, y: 248, fill: "#aa8fe9", accentFill: "#aa8fe9" },
      { value: "451", x: 264, y: 430, fill: "#e6906f", accentFill: "#aa8fe9" },
      { value: "947", x: 263, y: 521, fill: "#e6906f", accentFill: "#aa8fe9" },
      { value: "88", x: 272, y: 567, fill: "#e5c86b", accentFill: "#aa8fe9" },
      { value: "83", x: 272, y: 612, fill: "#e6906f", accentFill: "#aa8fe9" },
    ],
    footerPills: SHARED_FOOTER_PILLS,
    payload: {
      kind: "dense_console",
      telemetryBlocks: [
        {
          className: "phase14-holodeck-telemetry phase14-holodeck-telemetry-purple",
          rows: [
            "2300    07    09456790    06584942    867655",
            "8570    31    46567736    35476580    802847",
            "8600    42    6797745     7368568     270648",
            "8975    32    3667773     36476580    888745",
            "75         345            9583         82",
            "2770    06    6757685     0986577     868237",
          ],
          x: 352,
          y: 229,
          lineHeight: 22,
          letterSpacing: "0.06em",
        },
        {
          className: "phase14-holodeck-telemetry phase14-holodeck-telemetry-orange",
          rows: [
            "09    08867409",
            "06    40167436",
            "03    308747",
            "09    3074438",
            "01    831",
            "03    34670789",
          ],
          x: 571,
          y: 229,
          lineHeight: 22,
          letterSpacing: "0.06em",
        },
        {
          className: "phase14-holodeck-telemetry phase14-holodeck-telemetry-orange",
          rows: [
            "2700    08    68948750    89676579    697567",
            "8500    00    09438750        76579    697687",
          ],
          x: 352,
          y: 411,
          lineHeight: 22,
          letterSpacing: "0.06em",
        },
        {
          className: "phase14-holodeck-telemetry phase14-holodeck-telemetry-orange",
          rows: [
            "38    62767436",
            "01    24467407",
          ],
          x: 573,
          y: 411,
          lineHeight: 22,
          letterSpacing: "0.06em",
        },
      ],
      centerPills: [
        { x: 353, y: 441, width: 85, height: 34, fill: "#e6906f", label: "MR SRT", labelClassName: "phase14-holodeck-pill-label" },
        { x: 449, y: 441, width: 83, height: 34, fill: "#aa8fe9", label: "JL NC", labelClassName: "phase14-holodeck-pill-label" },
        { x: 567, y: 441, width: 82, height: 34, fill: "#e5c86b", label: "BN SPN", labelClassName: "phase14-holodeck-pill-label" },
        { x: 450, y: 486, width: 83, height: 34, fill: "#ef6a7b", label: "GZ KR", labelClassName: "phase14-holodeck-pill-label" },
        { x: 566, y: 486, width: 84, height: 34, fill: "#e6906f", label: "GN RBY", labelClassName: "phase14-holodeck-pill-label" },
        { x: 353, y: 531, width: 85, height: 34, fill: "#aa8fe9", label: "DG DXR", labelClassName: "phase14-holodeck-pill-label" },
        { x: 449, y: 531, width: 83, height: 34, fill: "#f2b18d", label: "M OKA", labelClassName: "phase14-holodeck-pill-label" },
        { x: 567, y: 531, width: 82, height: 34, fill: "#e5c86b", label: "MK DRN", labelClassName: "phase14-holodeck-pill-label" },
        { x: 353, y: 576, width: 85, height: 35, fill: "#f0a37d", label: "NL TRE", labelClassName: "phase14-holodeck-pill-label" },
      ],
      rightPills: [
        { x: 801, y: 214, width: 84, height: 34, fill: "#e6906f", label: "W GBG", labelClassName: "phase14-holodeck-pill-label" },
        { x: 801, y: 260, width: 84, height: 34, fill: "#e5c86b", label: "LV BRT", labelClassName: "phase14-holodeck-pill-label" },
        { x: 801, y: 396, width: 84, height: 35, fill: "#aa8fe9", label: "W WTN", labelClassName: "phase14-holodeck-pill-label" },
        { x: 801, y: 531, width: 83, height: 34, fill: "#e5c86b", label: "M BRT", labelClassName: "phase14-holodeck-pill-label" },
        { x: 801, y: 577, width: 82, height: 34, fill: "#e6906f", label: "JE DC", labelClassName: "phase14-holodeck-pill-label" },
      ],
      accentSquares: [
        { x: 546, y: 255, width: 11, height: 11, fill: "#e39a4b" },
        { x: 562, y: 255, width: 11, height: 11, fill: "#e39a4b" },
        { x: 546, y: 300, width: 11, height: 11, fill: "#e39a4b" },
        { x: 562, y: 300, width: 11, height: 11, fill: "#e39a4b" },
        { x: 546, y: 345, width: 11, height: 11, fill: "#e39a4b" },
        { x: 562, y: 345, width: 11, height: 11, fill: "#e39a4b" },
        { x: 546, y: 412, width: 11, height: 11, fill: "#e39a4b" },
        { x: 562, y: 412, width: 11, height: 11, fill: "#e39a4b" },
        { x: 546, y: 434, width: 11, height: 11, fill: "#e39a4b" },
      ],
    },
  },
  holodeck_programming_b: {
    targetId: "holodeck_programming_b",
    familyId: "holodeck_programming",
    title: SHARED_TITLE,
    titleX: 443,
    titleY: 40,
    scaffoldSegments: [
      ...SHARED_SCAFFOLD,
      { x: 214, y: 214, width: 25, height: 35, fill: "#aa8fe9" },
      { x: 214, y: 349, width: 25, height: 36, fill: "#aa8fe9" },
    ],
    topPills: SHARED_TOP_PILLS,
    leftBars: [
      ...SHARED_LEFT_BARS,
      {
        x: 3,
        y: 531,
        width: 205,
        height: 34,
        fill: "#e5c86b",
        label: "M ET",
        labelX: 188,
      },
    ],
    badges: [],
    footerPills: SHARED_FOOTER_PILLS,
    payload: {
      kind: "roster",
      entries: [
        { code: "EY - 45823", name: "DAVID LIVINGSTON", y: 247 },
        { code: "EX - 85432", name: "BURT ARMUS", y: 321 },
        { code: "TC - 34572", name: "MIKE GRAY", y: 394 },
        { code: "ZB - 45224", name: "JOHN MASON", y: 468 },
        { code: "TT - 45299", name: "TRACY TORME", y: 542 },
        { code: "ST - 45723", name: "SCOTT RUBENSTEIN", y: 615 },
      ],
    },
  },
};

export const isHolodeckTargetId = (targetId: string): targetId is HolodeckTargetId => {
  return targetId === "holodeck_programming_a" || targetId === "holodeck_programming_b";
};

export const getHolodeckSceneSpec = (targetId: string): HolodeckSceneSpec | null => {
  if (!isHolodeckTargetId(targetId)) {
    return null;
  }
  return HOLODECK_SCENES[targetId];
};
