import type {
  LcarsRectSegmentSpec,
  LcarsTextRowsBlock,
} from "../primitives/lcarsGeometryPrimitives";

export type SeismographicTargetId = "seismo_scan_a" | "seismo_scan_b";

export type SeismographicTelemetryBlock = LcarsTextRowsBlock;

export type SeismographicSweepSegment = LcarsRectSegmentSpec;

export interface SeismographicWaveformBurst {
  x: number;
  width: number;
  ampTop: number;
  ampBottom: number;
  opacity?: number;
}

export interface SeismographicMapLabel {
  id: string;
  label: string;
  line: string;
  x: number;
  y: number;
  elbowX: number;
  elbowY: number;
  targetX: number;
  targetY: number;
}

export interface SeismographicMapMarker {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface SeismographicBaseTerrain {
  path: string;
  opacity: number;
}

export interface SeismographicMapPayload {
  kind: "eruption_map";
  title: string;
  titleX: number;
  titleY: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  waterPath: string;
  terrainLayers: SeismographicBaseTerrain[];
  markers: SeismographicMapMarker[];
  labels: SeismographicMapLabel[];
}

export interface SeismographicWaveformPayload {
  kind: "waveform";
  title: string;
  titleX: number;
  titleY: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  horizontalGrid: number[];
  verticalGrid: number[];
  bursts: SeismographicWaveformBurst[];
  terminalMarker: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
  };
}

export interface SeismographicSceneSpec {
  targetId: SeismographicTargetId;
  familyId: "seismographic_scan";
  title: string;
  titleX: number;
  titleY: number;
  telemetry: SeismographicTelemetryBlock[];
  upperSweep: SeismographicSweepSegment[];
  lowerSweep: SeismographicSweepSegment[];
  payload: SeismographicWaveformPayload | SeismographicMapPayload;
}

const SHARED_TITLE = "PENTHARA IV SEISMIC ACTIVITY MONITOR";
const SHARED_LEFT_RAIL_LABELS = [
  { text: "LCARS 416176", x: 62, y: 41, fill: "#0c0c10" },
  { text: "01-4501765", x: 62, y: 118, fill: "#100d10" },
  { text: "02-4171065", x: 62, y: 321, fill: "#110d10" },
  { text: "03-7835365", x: 62, y: 501, fill: "#110d10" },
  { text: "04-4755260", x: 62, y: 540, fill: "#17130e" },
  { text: "05-4788265", x: 62, y: 579, fill: "#110d10" },
] as const;

const SEISMOGRAPHIC_SCENES: Record<SeismographicTargetId, SeismographicSceneSpec> = {
  seismo_scan_a: {
    targetId: "seismo_scan_a",
    familyId: "seismographic_scan",
    title: SHARED_TITLE,
    titleX: 332,
    titleY: 37,
    telemetry: [
      {
        rows: [
          "3055      25054890    2    1541    4031    2118    1261    5039    0064    1345    244    4001    15    53    584185335767622485317390780680            367    299    808",
        ],
        x: 190,
        y: 70,
        lineHeight: 20,
        letterSpacing: "0.08em",
      },
    ],
    upperSweep: [
      { x: 0, y: 210, width: 420, height: 22, fill: "#d7b39a" },
      { x: 413, y: 210, width: 32, height: 22, fill: "#c7b2c0" },
      { x: 448, y: 210, width: 116, height: 22, fill: "#dbd7e1" },
      { x: 569, y: 210, width: 372, height: 22, fill: "#ded9e3" },
      { x: 945, y: 210, width: 31, height: 22, fill: "#ccb6c5" },
    ],
    lowerSweep: [
      { x: 0, y: 250, width: 417, height: 18, fill: "#d0c4d0" },
      { x: 421, y: 250, width: 25, height: 18, fill: "#d0c0cb" },
      { x: 448, y: 250, width: 533, height: 18, fill: "#edeaf1" },
    ],
    payload: {
      kind: "waveform",
      title: "PLANETARY SENSOR ARRAY ON LINE",
      titleX: 482,
      titleY: 291,
      frameX: 128,
      frameY: 349,
      frameWidth: 848,
      frameHeight: 395,
      horizontalGrid: [0, 102, 201, 275, 393],
      verticalGrid: [0, 70, 129, 194, 258, 321, 377, 434, 499, 566, 629, 688, 735, 781, 818, 847],
      bursts: [
        { x: 188, width: 6, ampTop: 69, ampBottom: 82 },
        { x: 292, width: 5, ampTop: 18, ampBottom: 24 },
        { x: 400, width: 5, ampTop: 49, ampBottom: 54 },
        { x: 503, width: 4, ampTop: 19, ampBottom: 22 },
        { x: 607, width: 4, ampTop: 29, ampBottom: 31 },
        { x: 733, width: 6, ampTop: 57, ampBottom: 61 },
        { x: 787, width: 4, ampTop: 16, ampBottom: 15 },
        { x: 808, width: 4, ampTop: 76, ampBottom: 92 },
        { x: 826, width: 7, ampTop: 152, ampBottom: 108 },
        { x: 838, width: 7, ampTop: 109, ampBottom: 68 },
        { x: 852, width: 6, ampTop: 179, ampBottom: 122 },
        { x: 865, width: 6, ampTop: 208, ampBottom: 143 },
        { x: 878, width: 7, ampTop: 174, ampBottom: 124 },
        { x: 891, width: 6, ampTop: 136, ampBottom: 96 },
      ],
      terminalMarker: {
        cx: 926,
        cy: 563,
        rx: 17,
        ry: 6,
      },
    },
  },
  seismo_scan_b: {
    targetId: "seismo_scan_b",
    familyId: "seismographic_scan",
    title: SHARED_TITLE,
    titleX: 331,
    titleY: 37,
    telemetry: [
      {
        rows: [
          "2367     50177868   0   2784   1374   0832   3514   5405   1842   7561   9759   3511   01   68   1302074085324153144150558351779            8   800   708",
          "7112     32286268   5   8935   8784   9032   2590   1870   618   8471   9404   1473   53   02   1720278005862012072210347774           363   293    85",
          "8193     32151492   7   606   4652   2183   5496   8487   2702   3492   3220   6115   76   58   1919173013527195230598007246             7   243   498",
          "2734      33847520   0   0117   930   2879   8704   7298   8260   1836   1314   2937   44   34   7741898217812841478215386535           654   702   957",
          "1946      42589739   3   3709   5828   8475   9162   9151   7385   1956   1748   8410   61   79   4828230248671378175206794540           557   720   749",
          "923      95112216   7   3682   5850   4265   4600   4929   8640   8335   2109   8682   68   79   29016442018215434518464519456          508   707   594",
        ],
        x: 188,
        y: 76,
        lineHeight: 22,
        letterSpacing: "0.07em",
      },
      {
        rows: ["8207     5623568   5   1157   1405   4539   3113   2899   2322   7630   6183   2181   98   07   8510840137853456707802079150122          387   764   000"],
        x: 188,
        y: 223,
        lineHeight: 20,
        letterSpacing: "0.07em",
      },
    ],
    upperSweep: [
      { x: 0, y: 139, width: 558, height: 20, fill: "#d7b39a" },
      { x: 562, y: 139, width: 29, height: 20, fill: "#d7ca96" },
      { x: 593, y: 139, width: 390, height: 20, fill: "#ded9e3" },
    ],
    lowerSweep: [
      { x: 0, y: 176, width: 557, height: 17, fill: "#edeaf1" },
      { x: 560, y: 176, width: 27, height: 17, fill: "#d3c8c7" },
      { x: 591, y: 176, width: 391, height: 17, fill: "#f1da78" },
    ],
    payload: {
      kind: "eruption_map",
      title: "ERUPTION SITES",
      titleX: 175,
      titleY: 285,
      frameX: 176,
      frameY: 301,
      frameWidth: 384,
      frameHeight: 442,
      waterPath: "M 176 301 H 560 V 743 H 176 Z",
      terrainLayers: [
        {
          opacity: 0.86,
          path: "M 176 343 C 215 328 254 335 271 363 C 286 386 289 438 307 451 C 331 468 355 452 374 415 C 392 382 420 359 457 350 C 497 341 531 350 560 374 V 743 H 176 Z",
        },
        {
          opacity: 0.72,
          path: "M 176 301 H 560 V 743 H 176 Z M 190 343 C 216 319 260 320 287 350 C 303 367 304 399 323 420 C 351 451 389 450 412 421 C 430 398 435 363 455 345 C 483 321 523 326 560 347 V 301 Z",
        },
        {
          opacity: 0.62,
          path: "M 176 492 C 206 469 228 440 236 404 C 245 363 275 339 318 336 C 361 333 398 355 416 394 C 435 435 445 473 474 503 C 500 530 532 548 560 552 V 743 H 176 Z",
        },
      ],
      markers: [
        { x: 258, y: 442, radius: 13, color: "#f2c894" },
        { x: 285, y: 475, radius: 12, color: "#f2c894" },
        { x: 311, y: 512, radius: 14, color: "#f2c894" },
        { x: 346, y: 566, radius: 9, color: "#f2c894" },
        { x: 449, y: 606, radius: 12, color: "#f2c894" },
        { x: 477, y: 645, radius: 11, color: "#f2c894" },
      ],
      labels: [
        {
          id: "northwest_ridge",
          label: "ISCHORF",
          line: "0.84/18",
          x: 208,
          y: 348,
          elbowX: 256,
          elbowY: 360,
          targetX: 258,
          targetY: 436,
        },
        {
          id: "north_basin",
          label: "BEMMOR",
          line: "0.86/02",
          x: 208,
          y: 366,
          elbowX: 288,
          elbowY: 378,
          targetX: 285,
          targetY: 470,
        },
        {
          id: "west_plateau",
          label: "XANTHE",
          line: "0.48/59",
          x: 208,
          y: 385,
          elbowX: 321,
          elbowY: 397,
          targetX: 311,
          targetY: 507,
        },
        {
          id: "central_drift",
          label: "GRANUS",
          line: "0.77/43",
          x: 208,
          y: 404,
          elbowX: 346,
          elbowY: 416,
          targetX: 346,
          targetY: 560,
        },
        {
          id: "eastern_belt",
          label: "DELMAX",
          line: "0.73/12",
          x: 503,
          y: 348,
          elbowX: 474,
          elbowY: 360,
          targetX: 449,
          targetY: 600,
        },
        {
          id: "southeast_arc",
          label: "VORAN",
          line: "0.69/87",
          x: 503,
          y: 366,
          elbowX: 478,
          elbowY: 378,
          targetX: 477,
          targetY: 639,
        },
      ],
    },
  },
};

export const isSeismographicTargetId = (targetId: string): targetId is SeismographicTargetId => {
  return targetId === "seismo_scan_a" || targetId === "seismo_scan_b";
};

export const getSeismographicSceneSpec = (targetId: string): SeismographicSceneSpec | null => {
  if (!isSeismographicTargetId(targetId)) {
    return null;
  }
  return SEISMOGRAPHIC_SCENES[targetId];
};

export const getSeismographicSharedRailLabels = () => {
  return SHARED_LEFT_RAIL_LABELS;
};
