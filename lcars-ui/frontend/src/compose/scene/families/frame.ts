import { elbow, hBand, scenePath, vBand } from "../geometry";
import type { FamilyInput, Field, Rect, ScenePath, SceneTokens, Terminal } from "../types";

export type TerminalSpec = Omit<Terminal, "rect" | "kind"> & {
  kind: Exclude<Terminal["kind"], "bridge-label">;
};

interface FrameInput {
  field: Field;
  tokens: SceneTokens;
  orientation: "landscape" | "portrait";
  terminals: TerminalSpec[];
  armRun: { from: number; to: number };
}

/** Collect navigation blocks in return, context, page, then folded-region order. */
export function frameTerminals(input: FamilyInput, foldedIds: string[]): TerminalSpec[] {
  return [
    ...(input.hasReturn ? [{ id: "return", label: "RETURN", kind: "return" as const }] : []),
    { id: "context", label: input.modeLabel, kind: "context" },
    ...(input.pages && input.pages.length >= 2
      ? input.pages.map((page) => ({
          id: `page-${page.id}`,
          label: page.label,
          kind: "page" as const,
          pageId: page.id,
          current: page.current,
        }))
      : []),
    ...foldedIds.map((regionId) => ({
      id: `folded-${regionId}`,
      label: input.regions.get(regionId)?.label ?? regionId,
      kind: "folded-region" as const,
      regionId,
    })),
  ];
}

/** Build the asymmetric frame and transpose its terminal bank for portrait fields. */
export function buildFrame({ field, tokens, orientation, terminals: specs, armRun }: FrameInput): {
  fits: boolean;
  spineRect: Rect;
  contentArea: Rect;
  paths: ScenePath[];
  terminals: Terminal[];
} {
  const portrait = orientation === "portrait";
  const blockHeight = portrait ? Math.round(tokens.spine * 0.6) : tokens.spine;
  const bendLength = 2 * tokens.arm;
  const reservedLength = 2 * (tokens.target + tokens.gap);
  const packPortrait = (items: TerminalSpec[]) => {
    let row = 0;
    let cursor = bendLength + tokens.gap;
    const packed: Terminal[] = [];
    for (const spec of items) {
      const width = Math.max(tokens.target, spec.label.length * 9 + 24);
      if (cursor + width > field.w - reservedLength && row === 0) {
        row = 1;
        cursor = 0;
      }
      if (cursor + width > field.w - reservedLength) return null;
      packed.push({
        ...spec,
        rect: { x: cursor, y: row * (blockHeight + tokens.gap), w: width, h: blockHeight },
      });
      cursor += width + tokens.gap;
    }
    return packed;
  };
  let portraitSpecs = [...specs];
  let packed = portrait ? packPortrait(portraitSpecs) : null;
  let foldedCount = 0;
  while (portrait && !packed) {
    const foldedIndex = portraitSpecs
      .map((spec) => spec.kind === "folded-region" && Boolean(spec.regionId))
      .lastIndexOf(true);
    if (foldedIndex < 0) break;
    portraitSpecs.splice(foldedIndex, 1);
    foldedCount += 1;
    const summary: TerminalSpec = {
      id: "folded-more",
      label: `MORE (${foldedCount})`,
      kind: "folded-region",
    };
    packed = packPortrait([...portraitSpecs, summary]);
  }
  const spine =
    portrait && packed?.some((terminal) => terminal.rect.y > 0)
      ? 2 * blockHeight + tokens.gap
      : blockHeight;
  const spineLength = portrait ? field.w : field.h;
  const spineRect = portrait
    ? { x: 0, y: 0, w: field.w, h: spine }
    : { x: 0, y: 0, w: spine, h: field.h };
  const contentArea = portrait
    ? {
        x: bendLength + tokens.gap,
        y: spine + tokens.gap,
        w: field.w - bendLength - 2 * tokens.gap,
        h: field.h - spine - 2 * tokens.gap - tokens.terminalH - tokens.gap,
      }
    : {
        x: spine + tokens.gap,
        y: bendLength + tokens.gap,
        w: field.w - spine - 2 * tokens.gap,
        h: field.h - bendLength - 2 * tokens.gap,
      };
  const paths: ScenePath[] = [];
  const cornerRect = portrait
    ? { x: 0, y: 0, w: bendLength, h: spine + tokens.arm }
    : { x: 0, y: 0, w: spine + tokens.arm, h: bendLength };
  const arms = portrait ? { x: tokens.arm, y: spine } : { x: spine, y: tokens.arm };
  const corner = elbow(cornerRect, "top-left", arms.x, arms.y, tokens.elbowOuter, tokens.arm);
  paths.push({
    ...scenePath("frame-elbow", "elbow", corner.d, "frame", corner.bbox),
    arms,
    armX: arms.x,
    armY: arms.y,
  });
  const armStart = Math.max(armRun.from, portrait ? cornerRect.h : cornerRect.w);
  const armLength = Math.max(0, armRun.to - armStart);
  const arm = portrait
    ? vBand(0, armStart, armLength, tokens.arm, "end")
    : hBand(armStart, 0, armLength, tokens.arm, "end");
  paths.push(scenePath("frame-arm", "band", arm.d, "frame", arm.bbox));
  const terminalLength = Math.max(tokens.target, tokens.terminalH);
  let cursor = bendLength + tokens.gap;
  const terminals = portrait
    ? (packed ?? [])
    : specs.map((spec) => {
        const rect = { x: 0, y: cursor, w: spine, h: terminalLength };
        cursor += terminalLength + tokens.gap;
        return { ...spec, rect };
      });
  if (portrait) {
    cursor = Math.max(
      bendLength + tokens.gap,
      ...terminals
        .filter((terminal) => terminal.rect.y === 0)
        .map((terminal) => terminal.rect.x + terminal.rect.w + tokens.gap),
    );
  }
  const remaining = Math.max(0, spineLength - cursor);
  const segment = portrait
    ? hBand(cursor, 0, remaining, spine)
    : vBand(0, cursor, remaining, spine);
  if (Math.max(segment.bbox.w, segment.bbox.h) >= tokens.elbowOuter) {
    paths.push(scenePath("frame-spine", "band", segment.d, "frame", segment.bbox));
  }
  return {
    fits:
      cursor - tokens.gap <= spineLength - reservedLength &&
      (!portrait || packed !== null) &&
      blockHeight >= tokens.target &&
      contentArea.w > 0 &&
      contentArea.h > 0,
    spineRect,
    contentArea,
    paths,
    terminals,
  };
}
