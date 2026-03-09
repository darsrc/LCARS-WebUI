import { expect, type Locator, type Page } from "@playwright/test";

interface StrictInteriorThresholds {
  minBands: number;
  minLanes: number;
  minInteriorNodes: number;
  minTerminalNodes: number;
  minPageCoverage: number;
}

const DEFAULT_THRESHOLDS: StrictInteriorThresholds = {
  minBands: 1,
  minLanes: 1,
  minInteriorNodes: 8,
  minTerminalNodes: 0,
  minPageCoverage: 0.1,
};

interface StrictInteriorStats {
  bandCount: number;
  laneCount: number;
  interiorNodeCount: number;
  terminalNodeCount: number;
  unstructuredBandCount: number;
  unstructuredLaneCount: number;
  pageCoverage: number;
}

const collectStrictInteriorStats = async (contentFrame: Locator): Promise<StrictInteriorStats> => {
  return contentFrame.evaluate((frameRoot) => {
    const bands = Array.from(frameRoot.querySelectorAll<HTMLElement>(".lcars-strict-band"));
    const lanes = Array.from(frameRoot.querySelectorAll<HTMLElement>(".lcars-strict-lane"));

    const laneCoreNodes = frameRoot.querySelectorAll(
      ".lcars-strict-lane-core-item, .lcars-strict-lane-core-placeholder",
    ).length;
    const laneTerminalNodes = frameRoot.querySelectorAll(
      ".lcars-strict-lane-terminal-item, .lcars-strict-lane-terminal-placeholder, .lcars-strict-lane-strip-item",
    ).length;

    const boxZoneNodes = frameRoot.querySelectorAll(
      ".lcars-box-content-telemetry .lcars-box-child, .lcars-box-content-readout .lcars-box-child, .lcars-box-content-control .lcars-box-child",
    ).length;

    const sweepZoneNodes = frameRoot.querySelectorAll(
      [
        ".lcars-sweep-content-main .lcars-sweep-child",
        ".lcars-sweep-content-terminal .lcars-sweep-content-terminal-child",
        ".lcars-parity-left .lcars-parity-left-child",
        ".lcars-parity-right .lcars-parity-right-child",
        ".lcars-parity-stack .lcars-parity-stack-child",
      ].join(", "),
    ).length;

    const unstructuredBandCount = bands.filter((band) => {
      const hasGrid = band.querySelector(".lcars-strict-band-grid") !== null;
      const hasLane = band.querySelector(".lcars-strict-lane") !== null;
      return !hasGrid || !hasLane;
    }).length;

    const unstructuredLaneCount = lanes.filter((lane) => {
      const hasHeader = lane.querySelector(".lcars-strict-lane-header-bar") !== null;
      const hasBody = lane.querySelector(".lcars-strict-lane-body") !== null;
      const hasCore = lane.querySelector(".lcars-strict-lane-core-item") !== null;
      return !hasHeader || !hasBody || !hasCore;
    }).length;

    const frameRect = frameRoot.getBoundingClientRect();
    const strictPage = frameRoot.querySelector<HTMLElement>(".lcars-strict-page");
    const strictPageRect = strictPage?.getBoundingClientRect();
    const frameArea = Math.max(0, frameRect.width) * Math.max(0, frameRect.height);
    const strictPageArea = strictPageRect
      ? Math.max(0, strictPageRect.width) * Math.max(0, strictPageRect.height)
      : 0;

    return {
      bandCount: bands.length,
      laneCount: lanes.length,
      interiorNodeCount: laneCoreNodes + laneTerminalNodes + boxZoneNodes + sweepZoneNodes,
      terminalNodeCount: laneTerminalNodes,
      unstructuredBandCount,
      unstructuredLaneCount,
      pageCoverage: frameArea > 0 ? Math.min(1, strictPageArea / frameArea) : 0,
    };
  });
};

export const assertStrictInteriorComposition = async (
  page: Page,
  overrides: Partial<StrictInteriorThresholds> = {},
): Promise<void> => {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...overrides };
  const contentFrame = page.locator(".lcars-content-frame");

  await expect(contentFrame).toBeVisible();
  await expect(contentFrame.locator(".lcars-strict-band").first()).toBeVisible();

  const stats = await collectStrictInteriorStats(contentFrame);

  expect(stats.bandCount).toBeGreaterThanOrEqual(thresholds.minBands);
  expect(stats.laneCount).toBeGreaterThanOrEqual(thresholds.minLanes);
  expect(stats.interiorNodeCount).toBeGreaterThanOrEqual(thresholds.minInteriorNodes);
  expect(stats.terminalNodeCount).toBeGreaterThanOrEqual(thresholds.minTerminalNodes);
  expect(stats.pageCoverage).toBeGreaterThanOrEqual(thresholds.minPageCoverage);
  expect(stats.unstructuredBandCount).toBe(0);
  expect(stats.unstructuredLaneCount).toBe(0);
};
