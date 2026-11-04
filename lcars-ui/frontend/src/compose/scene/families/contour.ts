import { scenePath, stepPath } from "../geometry";
import type { FamilyInput, FamilyResult, Placement, Rect } from "../types";
import { fitRegion, regionKind, stackVertically, withFoldedOptionals } from "./common";
import { buildFrame, frameTerminals } from "./frame";

/** Arrange one focal region beside a progressively indented stack. */
export function contour(input: FamilyInput): FamilyResult {
  const { tokens, regions, measurer } = input;
  if (input.slots.focal.length !== 1) {
    return { ok: false, reason: "Contour requires one focal region" };
  }
  return withFoldedOptionals(input.slots, (slots, foldedIds) => {
    const focal = slots.focal[0];
    if (!focal || !regions.has(focal)) {
      return { ok: false, reason: "Missing focal region" };
    }
    const portrait = input.field.w < input.field.h;
    const orientation = portrait ? "portrait" : "landscape";
    const frame = buildFrame({
      field: input.field,
      tokens,
      orientation,
      terminals: frameTerminals(input, foldedIds),
      armRun: { from: 0, to: (portrait ? input.field.h : input.field.w) - tokens.gap },
    });
    if (!frame.fits) return { ok: false, reason: "Frame terminals do not fit" };
    const field = { w: frame.contentArea.w, h: frame.contentArea.h };
    const gap = tokens.gap;
    const band = tokens.band;
    const stride = band + gap;
    const roles = new Map([...regions].map(([id, region]) => [id, region.role]));
    const stackIds = [...slots.alerts, ...slots.commands, ...slots.details, ...slots.context];
    const terminalY = tokens.gap;
    const placements: Placement[] = [];
    const points: { x: number; y: number }[] = [];
    let focalRect: Rect;
    if (!portrait) {
      const focalWidth = Math.max(input.field.w * 0.55, tokens.regionMinW);
      focalRect = { x: gap, y: gap, w: focalWidth, h: field.h - 2 * gap };
      const boundaryX = focalRect.x + focalRect.w + gap + band / 2;
      const stackX = boundaryX + band / 2 + Math.max(0, stackIds.length - 1) * stride + gap;
      let y = terminalY;
      points.push({ x: boundaryX, y });
      for (const [index, id] of stackIds.entries()) {
        const x = stackX + index * stride;
        const width = field.w - gap - x;
        const height =
          regionKind(roles.get(id)) === "growing"
            ? Math.max(tokens.regionMinH, 160)
            : measurer.height(id, width);
        const stack = stackVertically([id], { x, y, w: width, h: height }, measurer, tokens, roles);
        if (!stack.ok) return stack;
        if (y + height > field.h - gap) return { ok: false, reason: `Region ${id} does not fit` };
        placements.push(...stack.placements);
        y += height + gap;
        points.push({ x: boundaryX + index * stride, y: y - gap / 2 });
        if (index < stackIds.length - 1) {
          points.push({ x: boundaryX + (index + 1) * stride, y: y - gap / 2 });
        }
      }
      if (!stackIds.length) points.push({ x: boundaryX, y: field.h - gap });
    } else {
      const availableWidth = field.w - 2 * gap;
      const stackHeights = stackIds.map((id, index) => {
        const width = availableWidth - index * stride;
        return regionKind(roles.get(id)) === "growing"
          ? Math.max(tokens.regionMinH, 160)
          : measurer.height(id, width);
      });
      const stackHeight =
        stackHeights.reduce((sum, height) => sum + height, 0) +
        Math.max(0, stackIds.length - 1) * gap;
      const stepDepth = band + Math.max(0, stackIds.length - 1) * stride;
      const boundaryY = field.h - gap - stackHeight - gap - stepDepth + band / 2;
      focalRect = {
        x: gap,
        y: terminalY,
        w: availableWidth,
        h: boundaryY - band / 2 - gap - terminalY,
      };
      let y = boundaryY + stepDepth - band / 2 + gap;
      const right = field.w - gap;
      const left = gap;
      const sectionWidth = availableWidth / Math.max(1, stackIds.length);
      points.push({ x: right, y: boundaryY });
      for (const [index, id] of stackIds.entries()) {
        const width = availableWidth - index * stride;
        const x = gap;
        const height = stackHeights[index];
        const stack = stackVertically([id], { x, y, w: width, h: height }, measurer, tokens, roles);
        if (!stack.ok) return stack;
        placements.push(...stack.placements);
        y += height + gap;
        const endX = right - (index + 1) * sectionWidth;
        points.push({ x: endX, y: boundaryY + index * stride });
        if (index < stackIds.length - 1) {
          points.push({ x: endX, y: boundaryY + (index + 1) * stride });
        }
      }
      if (!stackIds.length) points.push({ x: left, y: boundaryY });
    }
    const fit = fitRegion(focal, focalRect, measurer, tokens, roles.get(focal));
    if (!fit.ok) return fit;
    placements.unshift({
      regionId: focal,
      rect: focalRect,
      visibility: "full",
      scroll: regionKind(roles.get(focal)) === "growing",
    });
    for (const placement of placements) {
      placement.rect.x += frame.contentArea.x;
      placement.rect.y += frame.contentArea.y;
    }
    const translatedPoints = points.map((point) => ({
      x: point.x + frame.contentArea.x,
      y: point.y + frame.contentArea.y,
    }));
    if (portrait) {
      translatedPoints.reverse();
      translatedPoints.unshift({ x: tokens.arm / 2, y: translatedPoints[0].y });
    } else {
      translatedPoints[0].y = tokens.arm / 2;
    }
    // Merge collinear runs so extending to the frame preserves the band thickness.
    const stepPoints = translatedPoints.filter((point, index) => {
      const previous = translatedPoints[index - 1];
      const next = translatedPoints[index + 1];
      return (
        !previous ||
        !next ||
        !(
          (previous.x === point.x && point.x === next.x) ||
          (previous.y === point.y && point.y === next.y)
        )
      );
    });
    const shape = stepPath(stepPoints, band, tokens.elbowOuter - band);
    return {
      ok: true,
      candidate: {
        family: "contour",
        orientation: portrait ? "portrait" : "landscape",
        placements,
        paths: [scenePath("contour-step", "step", shape.d, "frame", shape.bbox), ...frame.paths],
        terminals: frame.terminals,
      },
    };
  });
}
