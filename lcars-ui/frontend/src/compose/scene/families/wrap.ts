import { elbow, hBand, scenePath, vBand } from "../geometry";
import type { FamilyInput, FamilyResult, Placement } from "../types";
import { fitRegion, regionKind, stackVertically, withFoldedOptionals } from "./common";
import { buildFrame, frameTerminals } from "./frame";

/** Wrap the focal with commands beside the spine and supporting regions below it. */
export function wrap(input: FamilyInput): FamilyResult {
  const { field, tokens, regions, measurer } = input;
  if (input.slots.focal.length !== 1)
    return { ok: false, reason: "Wrap requires one focal region" };
  return withFoldedOptionals(input.slots, (slots, foldedIds) => {
    const focal = slots.focal[0];
    if (!regions.has(focal)) return { ok: false, reason: "Missing focal region" };
    const portrait = field.w < field.h;
    const orientation = portrait ? "portrait" : "landscape";
    const frame = buildFrame({
      field,
      tokens,
      orientation,
      terminals: frameTerminals(input, foldedIds),
      armRun: { from: 0, to: (portrait ? field.h : field.w) - tokens.gap },
    });
    if (!frame.fits) return { ok: false, reason: "Frame terminals do not fit" };
    const area = frame.contentArea;
    const gap = tokens.gap;
    const roles = new Map([...regions].map(([id, region]) => [id, region.role]));
    const columnIds = [...slots.commands, ...slots.alerts];
    const rowIds = [...slots.details, ...slots.context];
    const placements: Placement[] = [];
    const paths = [...frame.paths];
    const commandWidth = portrait
      ? area.w - (rowIds.length ? tokens.regionMinW + 2 * tokens.arm + 2 * gap : 0)
      : tokens.regionMinW;
    const commandHeight = columnIds.reduce(
      (sum, id) =>
        sum +
        gap +
        (regionKind(roles.get(id)) === "growing"
          ? tokens.regionMinH
          : measurer.height(id, commandWidth)),
      0,
    );
    const commandRect = {
      x: area.x,
      y: area.y,
      w: commandWidth,
      h: portrait ? commandHeight : area.h,
    };
    const commands = stackVertically(columnIds, commandRect, measurer, tokens, roles);
    if (!commands.ok) return commands;
    placements.push(...commands.placements);
    const focalX = portrait || !columnIds.length ? area.x : area.x + commandWidth + gap;
    const focalY = portrait
      ? Math.max(
          area.y + commandHeight,
          rowIds.length ? Math.round(tokens.spine * 0.6) + tokens.arm + gap : area.y,
        )
      : area.y;
    const focalWidth = area.x + area.w - focalX;
    if (portrait) {
      const sideWidth = rowIds.length ? tokens.regionMinW : 0;
      const dividerX = area.x + area.w - sideWidth - gap - tokens.arm;
      const focalRect = {
        x: focalX,
        y: focalY,
        w: rowIds.length ? dividerX - gap - focalX : focalWidth,
        h: area.y + area.h - focalY,
      };
      const side = stackVertically(
        rowIds,
        { x: dividerX + tokens.arm + gap, y: focalY, w: sideWidth, h: focalRect.h },
        measurer,
        tokens,
        roles,
      );
      if (!side.ok) return side;
      const fit = fitRegion(focal, focalRect, measurer, tokens, roles.get(focal));
      if (!fit.ok) return fit;
      placements.push(...side.placements);
      placements.unshift({
        regionId: focal,
        rect: focalRect,
        visibility: "full",
        scroll: regionKind(roles.get(focal)) === "growing",
      });
      if (rowIds.length) {
        const spineHeight = Math.round(tokens.spine * 0.6);
        const corner = elbow(
          { x: dividerX - tokens.arm, y: 0, w: 2 * tokens.arm, h: spineHeight + tokens.arm },
          "top-right",
          tokens.arm,
          spineHeight,
          tokens.elbowOuter,
          tokens.arm,
        );
        paths.push({
          ...scenePath("wrap-elbow", "elbow", corner.d, "frame", corner.bbox),
          arms: { x: tokens.arm, y: spineHeight },
          armX: tokens.arm,
          armY: spineHeight,
        });
        const arm = vBand(
          dividerX,
          spineHeight + tokens.arm,
          field.h - gap - spineHeight - tokens.arm,
          tokens.arm,
          "end",
        );
        paths.push(scenePath("wrap-side-arm", "band", arm.d, "frame", arm.bbox));
      }
      return {
        ok: true,
        candidate: { family: "wrap", orientation, placements, paths, terminals: frame.terminals },
      };
    }
    const rowWidth =
      (focalWidth - Math.max(0, rowIds.length - 1) * gap) / Math.max(1, rowIds.length);
    const rowHeight = rowIds.length
      ? Math.max(
          ...rowIds.map((id) =>
            regionKind(roles.get(id)) === "growing"
              ? tokens.regionMinH
              : measurer.height(id, rowWidth),
          ),
        )
      : 0;
    const bottomY = area.y + area.h - rowHeight - (rowIds.length ? tokens.arm + gap : 0);
    const focalRect = {
      x: focalX,
      y: focalY,
      w: focalWidth,
      h: bottomY - focalY - (rowIds.length ? tokens.arm + gap : 0),
    };
    for (const [index, id] of rowIds.entries()) {
      const rect = {
        x: focalX + index * (rowWidth + gap),
        y: bottomY + tokens.arm + gap,
        w: rowWidth,
        h: rowHeight,
      };
      const fit = fitRegion(id, rect, measurer, tokens, roles.get(id));
      if (!fit.ok) return fit;
      placements.push({
        regionId: id,
        rect,
        visibility: "full",
        scroll: regionKind(roles.get(id)) === "growing",
      });
    }
    if (rowIds.length) {
      const corner = elbow(
        { x: 0, y: bottomY - tokens.arm, w: tokens.spine + tokens.arm, h: 2 * tokens.arm },
        "bottom-left",
        tokens.spine,
        tokens.arm,
        tokens.elbowOuter,
        tokens.arm,
      );
      paths.push({
        ...scenePath("wrap-elbow", "elbow", corner.d, "frame", corner.bbox),
        arms: { x: tokens.spine, y: tokens.arm },
        armX: tokens.spine,
        armY: tokens.arm,
      });
      const arm = hBand(
        tokens.spine + tokens.arm,
        bottomY,
        field.w - gap - tokens.spine - tokens.arm,
        tokens.arm,
        "end",
      );
      paths.push(scenePath("wrap-bottom-arm", "band", arm.d, "frame", arm.bbox));
      // Commands end above the bottom arm, which crosses their column.
      const trimmed = stackVertically(
        columnIds,
        { ...commandRect, h: bottomY - tokens.arm - gap - commandRect.y },
        measurer,
        tokens,
        roles,
      );
      if (!trimmed.ok) return trimmed;
      placements.splice(0, commands.placements.length, ...trimmed.placements);
    }

    const fit = fitRegion(focal, focalRect, measurer, tokens, roles.get(focal));
    if (!fit.ok) return fit;
    placements.unshift({
      regionId: focal,
      rect: focalRect,
      visibility: "full",
      scroll: regionKind(roles.get(focal)) === "growing",
    });
    return {
      ok: true,
      candidate: { family: "wrap", orientation, placements, paths, terminals: frame.terminals },
    };
  });
}
