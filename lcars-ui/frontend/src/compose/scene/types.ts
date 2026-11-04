export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Field {
  w: number;
  h: number;
}

export interface SceneTokens {
  band: number;
  spine: number;
  arm: number;
  elbowOuter: number;
  gap: number;
  pad: number;
  target: number;
  terminalH: number;
  regionMinW: number;
  regionMinH: number;
}

export const DEFAULT_SCENE_TOKENS: SceneTokens = {
  band: 24,
  spine: 112,
  arm: 24,
  elbowOuter: 48,
  gap: 8,
  pad: 12,
  target: 44,
  terminalH: 44,
  regionMinW: 200,
  regionMinH: 96,
};

export interface Measurer {
  height(regionId: string, width: number): number;
}

export type Visibility = "full" | "summary" | "terminal" | "hidden";

export interface Placement {
  regionId: string;
  rect: Rect;
  visibility: Visibility;
  scroll: boolean;
}

export type PathKind = "band" | "elbow" | "junction" | "connector" | "bridge" | "step";

export interface ScenePath {
  id: string;
  kind: PathKind;
  d: string;
  tone: "frame" | "focal" | "commands" | "alert" | "relation";
  relationId?: string;
  bbox?: Rect;
  arms?: { x: number; y: number };
  armX?: number;
  armY?: number;
}

export interface Terminal {
  id: string;
  label: string;
  rect: Rect;
  kind: "context" | "folded-region" | "return" | "bridge-label";
  regionId?: string;
}

export type Family = "wrap" | "branch" | "fork" | "contour" | "focus";

export interface Candidate {
  family: Family;
  orientation: "landscape" | "portrait";
  placements: Placement[];
  paths: ScenePath[];
  terminals: Terminal[];
}

export type FamilyResult = { ok: true; candidate: Candidate } | { ok: false; reason: string };

export interface ResolvedScene extends Candidate {
  revision: number;
  modeId: string;
  field: Field;
  order: string[];
  explanation: string;
}

export interface FamilyInput {
  slots: import("./slots").Slots;
  regions: Map<string, import("../../types/contract").SceneRegion>;
  field: Field;
  measurer: Measurer;
  tokens: SceneTokens;
  modeLabel: string;
  hasReturn: boolean;
}
