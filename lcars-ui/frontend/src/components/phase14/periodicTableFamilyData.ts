import type {
  LcarsRectSegmentSpec,
  LcarsTextRowsBlock,
} from "../primitives/lcarsGeometryPrimitives";
import type { Phase14MatrixCellSpec } from "./phase14Primitives";

export interface PeriodicSeriesSpec {
  x: number;
  y: number;
  width: number;
  label: string;
}

export interface PeriodicTableSceneSpec {
  targetId: "periodic_table_matrix";
  familyId: "periodic_table_matrix";
  title: string;
  titleX: number;
  titleY: number;
  topSegments: LcarsRectSegmentSpec[];
  bottomSegments: LcarsRectSegmentSpec[];
  series: PeriodicSeriesSpec[];
  cells: Phase14MatrixCellSpec[];
  footerCopy: LcarsTextRowsBlock[];
}

const CELL = (
  x: number,
  y: number,
  fill: string,
  symbol: string,
  title: string,
  subtitle: string,
  badgeVariant?: Phase14MatrixCellSpec["badgeVariant"],
): Phase14MatrixCellSpec => ({
  x,
  y,
  width: 74,
  height: 34,
  fill,
  symbol,
  title,
  subtitle,
  badgeVariant,
});

const amber = "#f3a214";
const amberSoft = "#e4ab43";
const purple = "#b9a7f0";
const orange = "#ef9e5d";
const pale = "#f2ecaa";

const cells: Phase14MatrixCellSpec[] = [
  CELL(79, 161, amber, "H", "HYDROGEN", "ATOM WT 1.0", "simple"),
  CELL(79, 203, purple, "Li", "LITHIUM", "ATOM WT 6.9", "simple"),
  CELL(168, 203, purple, "Be", "BERYLLIUM", "ATOM WT 9.0", "simple"),
  CELL(79, 245, amber, "Na", "SODIUM", "ATOM WT 12", "orbit"),
  CELL(168, 245, amberSoft, "Mg", "MAGNESIUM", "ATOM WT 24", "orbit"),
  CELL(79, 287, amber, "K", "POTASSIUM", "ATOM WT 38", "burst"),
  CELL(168, 287, amberSoft, "Ca", "CALCIUM", "ATOM WT 40", "burst"),
  CELL(257, 287, amberSoft, "Es", "EINSTEINIUM", "ATOM WT 99", "burst"),
  CELL(346, 287, purple, "La", "LANTHANUM", "ATOM WT 57", "burst"),
  CELL(435, 287, amberSoft, "Pa", "PROTACTINIUM", "ATOM WT 91", "burst"),
  CELL(524, 287, amberSoft, "Sn", "TIN", "ATOM WT 50", "burst"),
  CELL(613, 287, amberSoft, "Ra", "RADIUM", "ATOM WT 88", "burst"),
  CELL(702, 287, amberSoft, "Fn", "FERMIUM", "ATOM WT 99", "burst"),
  CELL(791, 287, amberSoft, "Ed", "EINSTEINIUM", "ATOM WT 99", "burst"),
  CELL(880, 287, purple, "Mi", "MIRIDIUM", "ATOM WT 145", "burst"),
  CELL(79, 329, purple, "Rb", "RUBIDIUM", "ATOM WT 85", "burst"),
  CELL(168, 329, amberSoft, "Cs", "CESIUM", "ATOM WT 55", "burst"),
  CELL(257, 329, purple, "Pb", "PLUMBUM", "ATOM WT 82", "burst"),
  CELL(346, 329, amberSoft, "Mo", "MOLYBDENUM", "ATOM WT 42", "burst"),
  CELL(435, 329, amberSoft, "Nu", "NEUTRONIUM", "ATOM WT 18", "burst"),
  CELL(524, 329, orange, "Ok", "OKONIUM", "ATOM WT 77", "burst"),
  CELL(613, 329, pale, "Mx", "MIXTURON", "ATOM WT 86", "burst"),
  CELL(702, 329, orange, "Ed", "EDENIUM", "ATOM WT 99", "burst"),
  CELL(791, 329, purple, "SW", "SILVERIUM", "ATOM WT 67", "burst"),
  CELL(880, 329, purple, "An", "ANTIMON", "ATOM WT 51", "burst"),
  CELL(79, 371, purple, "Cs", "CESIUM", "ATOM WT 55", "burst"),
  CELL(168, 371, amberSoft, "B2", "BORON 2", "ATOM WT 8", "burst"),
  CELL(257, 371, purple, "Kh", "KHANIUM", "ATOM WT 74", "burst"),
  CELL(346, 371, orange, "Cr", "CHROMIUM", "ATOM WT 24", "burst"),
  CELL(435, 371, amberSoft, "Ri", "RITHIUM", "ATOM WT 21", "burst"),
  CELL(524, 371, amber, "Ri", "RITHIUM 2", "ATOM WT 28", "burst"),
  CELL(613, 371, pale, "Mn", "MANGANESE", "ATOM WT 25", "burst"),
  CELL(702, 371, purple, "Ke", "KELVIUM", "ATOM WT 92", "burst"),
  CELL(791, 371, purple, "Cl", "CLORIUM", "ATOM WT 17", "burst"),
  CELL(880, 371, purple, "Fx", "FEROX", "ATOM WT 98", "burst"),
  CELL(79, 413, purple, "Fn", "FERMIUM", "ATOM WT 99", "burst"),
  CELL(168, 413, amber, "Mx", "MIXTURON", "ATOM WT 73", "burst"),
  CELL(257, 413, amber, "Dt", "DEUTERIUM", "ATOM WT 2.0", "burst"),
  CELL(346, 413, amber, "Di", "DILITHIUM", "ATOM WT 25", "burst"),
  CELL(435, 413, orange, "Hg", "HYDROGEN", "ATOM WT 80", "burst"),
  CELL(524, 413, amberSoft, "Wc", "WOLFRAM", "ATOM WT 74", "burst"),
  CELL(613, 413, amber, "Mx", "MIXTURON", "ATOM WT 98", "burst"),
  CELL(702, 413, pale, "Ga", "GALLIUM", "ATOM WT 31", "burst"),
  CELL(791, 413, purple, "Cl", "CLORIUM 2", "ATOM WT 17", "burst"),
  CELL(880, 413, purple, "Ma", "MALURIUM", "ATOM WT 96", "burst"),
  CELL(79, 455, amber, "Ac", "ACTINIUM", "ATOM WT 89", "burst"),
  CELL(168, 455, amberSoft, "Br", "BROMINE", "ATOM WT 35", "burst"),
  CELL(257, 455, orange, "Ti", "TITANIUM", "ATOM WT 22", "burst"),
  CELL(346, 455, orange, "St", "STRONTIUM", "ATOM WT 37", "burst"),
  CELL(435, 455, orange, "Wc", "WOLFRAM", "ATOM WT 74", "burst"),
  CELL(524, 455, amber, "Al", "ALUMINUM", "ATOM WT 13", "burst"),
  CELL(613, 455, orange, "Ar", "ARGON", "ATOM WT 18", "burst"),
  CELL(702, 455, amberSoft, "Br", "BROMINE", "ATOM WT 35", "burst"),
  CELL(791, 455, amber, "Zn", "ZINC", "ATOM WT 30", "burst"),
  CELL(79, 497, purple, "Ab", "ALBIUM", "ATOM WT 46", "burst"),
  CELL(791, 497, orange, "Sn", "STANNUM", "ATOM WT 50", "burst"),
  CELL(880, 497, orange, "Bi", "BISMUTH", "ATOM WT 83", "burst"),
  CELL(257, 539, amberSoft, "Cd", "CADMIUM", "ATOM WT 48", "burst"),
  CELL(346, 539, purple, "Dy", "DYSPROSIUM", "ATOM WT 66", "burst"),
  CELL(435, 539, purple, "Bu", "BURIUM", "ATOM WT 76", "burst"),
  CELL(524, 539, purple, "Da", "DARIUM", "ATOM WT 89", "burst"),
  CELL(613, 539, amber, "Wy", "WYTRIUM", "ATOM WT 39", "burst"),
  CELL(702, 539, purple, "Da", "DARIUM 2", "ATOM WT 89", "burst"),
  CELL(791, 539, orange, "Sy", "SYRIUM", "ATOM WT 60", "burst"),
  CELL(880, 539, amber, "Ef", "EFERIUM", "ATOM WT 99", "burst"),
  CELL(346, 581, amber, "Py", "PYRIDIUM", "ATOM WT 26", "burst"),
  CELL(435, 581, purple, "Mx", "MIXON", "ATOM WT 72", "burst"),
  CELL(524, 581, purple, "Md", "MORDIUM", "ATOM WT 81", "burst"),
  CELL(702, 161, amberSoft, "Ry", "RYDON", "ATOM WT 72", "simple"),
  CELL(791, 161, orange, "Es", "EINSTEIN", "ATOM WT 99", "orbit"),
  CELL(702, 203, amberSoft, "Ry", "RYDON 2", "ATOM WT 72", "simple"),
  CELL(791, 203, amberSoft, "Bn", "BENZIUM", "ATOM WT 29", "burst"),
  CELL(880, 203, amberSoft, "Po", "POLONIUM", "ATOM WT 84", "burst"),
  CELL(702, 245, amber, "Br", "BROMINE 2", "ATOM WT 35", "burst"),
  CELL(791, 245, amber, "Fn", "FERMIUM 2", "ATOM WT 99", "burst"),
];

export const PERIODIC_TABLE_SCENE: PeriodicTableSceneSpec = {
  targetId: "periodic_table_matrix",
  familyId: "periodic_table_matrix",
  title: "TABLE OF ELEMENTS 99823",
  titleX: 62,
  titleY: 56,
  topSegments: [
    { x: 4, y: 7, width: 70, height: 54, fill: amber, rx: 28, ry: 28 },
    { x: 740, y: 7, width: 649, height: 54, fill: amber },
    { x: 1408, y: 7, width: 64, height: 54, fill: amber, rx: 28, ry: 28 },
  ],
  bottomSegments: [
    { x: 5, y: 1021, width: 71, height: 56, fill: amber, rx: 28, ry: 28 },
    { x: 93, y: 1021, width: 1298, height: 56, fill: amber },
    { x: 1407, y: 1021, width: 64, height: 56, fill: amber, rx: 28, ry: 28 },
  ],
  series: [
    { x: 76, y: 156, width: 73, label: "" },
    { x: 346, y: 278, width: 252, label: "HYPERSONIC SERIES" },
    { x: 712, y: 156, width: 145, label: "TRANSONIC SERIES" },
    { x: 435, y: 278, width: 73, label: "GAMMA SERIES" },
    { x: 524, y: 278, width: 89, label: "OMEGA SERIES" },
    { x: 613, y: 278, width: 71, label: "MUON SERIES" },
    { x: 346, y: 520, width: 378, label: "META SERIES" },
  ],
  cells,
  footerCopy: [
    {
      className: "phase14-periodic-footer-copy",
      rows: [
        "THIS TABLE LISTS THOSE ELEMENTS UTILISED BY THE",
        "STANDARDIZED IOTS OF THE STARFLEET EDUCATIONAL",
        "TEXTS. OTHER CHARTS ARE AVAILABLE BY ACCESSING",
        "MATERIAL UNDER THE HEADING 'NEAT STUFF'.",
      ],
      x: 80,
      y: 595,
      lineHeight: 12,
      letterSpacing: "0.04em",
    },
  ],
};

export const getPeriodicTableSceneSpec = (targetId: string): PeriodicTableSceneSpec | null => {
  return targetId === "periodic_table_matrix" ? PERIODIC_TABLE_SCENE : null;
};
