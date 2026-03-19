import type { LcarsColor } from "../../types/contract";
import type { LcarsFrameTitleSpec, LcarsHtmlFrameSpec } from "./lcarsChartFramePrimitives";
import { barRunFromCapsuleSpec } from "./lcarsSharedScaffoldPrimitives";

interface StrictTitleSpecOptions {
  label?: string | null;
  className?: string;
  offsetX?: number;
  offsetY?: number;
}

interface StrictFrameSpecOptions extends StrictTitleSpecOptions {
  titleReserve?: string;
  bodyPadding?: string;
}

interface StrictTitleSource {
  id: string;
  label?: string | null;
  strict_title?: string | null;
}

const normalizeTitleLabel = (label: string | null | undefined): string | null => {
  if (typeof label !== "string") {
    return null;
  }
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveStrictSurfaceTitle = (
  source: StrictTitleSource,
  fallbackLabel?: string | null,
): string | null => {
  if (typeof source.strict_title === "string") {
    return normalizeTitleLabel(source.strict_title);
  }

  return normalizeTitleLabel(fallbackLabel ?? source.label ?? source.id);
};

export const buildFrameStartTitleSpec = ({
  label,
  className,
  offsetX = 0,
  offsetY = 0,
}: StrictTitleSpecOptions): LcarsFrameTitleSpec | null => {
  const normalizedLabel = normalizeTitleLabel(label);
  if (!normalizedLabel) {
    return null;
  }

  return {
    label: normalizedLabel,
    anchor: "frame-start",
    className,
    offsetX,
    offsetY,
  };
};

export const buildReadoutFrameSpec = ({
  label,
  titleReserve = "1.35rem",
  bodyPadding = "0.55rem 0.75rem 0.45rem",
}: StrictFrameSpecOptions): LcarsHtmlFrameSpec => {
  const title = buildFrameStartTitleSpec({
    label,
    className: "lcars-readout-frame-title",
  });

  return {
    bodyPadding,
    title,
    titleReserve: title ? titleReserve : "0px",
  };
};

export const buildChartFrameSpec = ({
  label,
  className = "lcars-chart-frame-title",
  titleReserve = "1.45rem",
  bodyPadding = "0",
  offsetX = 0,
  offsetY = 0,
}: StrictFrameSpecOptions): LcarsHtmlFrameSpec => {
  const title = buildFrameStartTitleSpec({
    label,
    className,
    offsetX,
    offsetY,
  });

  return {
    bodyPadding,
    title,
    titleReserve: title ? titleReserve : "0px",
  };
};

export const buildHeaderCapsuleSegments = ({
  text,
  color,
}: {
  text: string;
  color: LcarsColor;
}) => {
  return barRunFromCapsuleSpec({
    x: 0,
    y: 0,
    width: 1,
    height: 32,
    fill: color,
    label: text,
    textAnchor: "end",
  });
};
