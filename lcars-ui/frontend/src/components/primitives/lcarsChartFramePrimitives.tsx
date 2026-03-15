import type { CSSProperties, ReactNode } from "react";

export type LcarsFrameTitleAnchor = "frame-start" | "frame-center" | "frame-end";

export interface LcarsFrameRectSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  inset?: number;
  strokeWidth?: number;
  outlineClassName?: string;
}

export interface LcarsFrameTitleSpec {
  label: string;
  anchor?: LcarsFrameTitleAnchor;
  offsetX?: number;
  offsetY?: number;
  className?: string;
  textAnchor?: "start" | "middle" | "end";
}

export interface LcarsSharedFrameSpec {
  frame: LcarsFrameRectSpec;
  title?: LcarsFrameTitleSpec | null;
}

export interface LcarsHtmlFrameSpec {
  title?: LcarsFrameTitleSpec | null;
  strokeWidth?: number;
  titleReserve?: string;
  bodyPadding?: string;
}

interface ResolvedFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResolvedFrameTitleAnchor {
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
}

const joinClassNames = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(" ");
};

export const resolveFrameRect = (frame: LcarsFrameRectSpec): ResolvedFrameRect => {
  const inset = frame.inset ?? 0;
  return {
    x: frame.x + inset,
    y: frame.y + inset,
    width: Math.max(frame.width - inset * 2, 0),
    height: Math.max(frame.height - inset * 2, 0),
  };
};

export const resolveFrameTitleAnchor = (
  spec: LcarsSharedFrameSpec,
): ResolvedFrameTitleAnchor | null => {
  if (!spec.title) {
    return null;
  }

  const frameRect = resolveFrameRect(spec.frame);
  const anchor = spec.title.anchor ?? "frame-start";
  const offsetX = spec.title.offsetX ?? 0;
  const offsetY = spec.title.offsetY ?? -10;
  const defaultTextAnchor =
    anchor === "frame-center" ? "middle" : anchor === "frame-end" ? "end" : "start";

  return {
    x:
      anchor === "frame-center"
        ? frameRect.x + frameRect.width / 2 + offsetX
        : anchor === "frame-end"
          ? frameRect.x + frameRect.width + offsetX
          : frameRect.x + offsetX,
    y: frameRect.y + offsetY,
    textAnchor: spec.title.textAnchor ?? defaultTextAnchor,
  };
};

export const framedSurfaceStyleFromSpec = (
  spec: LcarsHtmlFrameSpec,
): CSSProperties & Record<string, string> => {
  return {
    "--lcars-framed-surface-body-padding": spec.bodyPadding ?? "0",
    "--lcars-framed-surface-stroke-width": `${spec.strokeWidth ?? 1}px`,
    "--lcars-framed-surface-title-reserve": spec.title ? spec.titleReserve ?? "1.4rem" : "0px",
  };
};

const resolveHtmlTitleStyle = (title: LcarsFrameTitleSpec): CSSProperties => {
  const anchor = title.anchor ?? "frame-start";
  const offsetX = title.offsetX ?? 0;
  const offsetY = title.offsetY ?? 0;

  if (anchor === "frame-center") {
    return {
      left: `calc(50% + ${offsetX}px)`,
      top: `${offsetY}px`,
      transform: "translateX(-50%)",
      textAlign: "center",
    };
  }

  if (anchor === "frame-end") {
    return {
      right: `${-offsetX}px`,
      top: `${offsetY}px`,
      textAlign: "right",
    };
  }

  return {
    left: `${offsetX}px`,
    top: `${offsetY}px`,
    textAlign: "left",
  };
};

export const LcarsSvgFrame = ({
  spec,
  children,
  primitive = "chart-frame",
}: {
  spec: LcarsSharedFrameSpec;
  children?: ReactNode;
  primitive?: "chart-frame" | "readout-frame";
}) => {
  const frameRect = resolveFrameRect(spec.frame);
  const titleAnchor = resolveFrameTitleAnchor(spec);

  return (
    <g data-lcars-shared-primitive={primitive}>
      {children}
      {titleAnchor ? (
        <text
          className={spec.title?.className}
          textAnchor={titleAnchor.textAnchor}
          x={titleAnchor.x}
          y={titleAnchor.y}
        >
          {spec.title?.label}
        </text>
      ) : null}
      <rect
        className={spec.frame.outlineClassName}
        fill="none"
        height={frameRect.height}
        strokeWidth={spec.frame.strokeWidth ?? 2}
        width={frameRect.width}
        x={frameRect.x}
        y={frameRect.y}
      />
    </g>
  );
};

export const LcarsFramedSurface = ({
  spec,
  className,
  bodyClassName,
  children,
  primitive = "chart-frame",
  dataTestId,
}: {
  spec: LcarsHtmlFrameSpec;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  primitive?: "chart-frame" | "readout-frame";
  dataTestId?: string;
}) => {
  const rootStyle = framedSurfaceStyleFromSpec(spec);
  const titleStyle = spec.title ? resolveHtmlTitleStyle(spec.title) : undefined;

  return (
    <section
      className={joinClassNames("lcars-framed-surface", className)}
      data-lcars-shared-primitive={primitive}
      data-testid={dataTestId}
      style={rootStyle}
    >
      {spec.title ? (
        <div
          className={joinClassNames("lcars-framed-surface-title", spec.title.className)}
          data-lcars-frame-title-anchor={spec.title.anchor ?? "frame-start"}
          style={titleStyle}
        >
          {spec.title.label}
        </div>
      ) : null}
      <div className={joinClassNames("lcars-framed-surface-body", bodyClassName)}>{children}</div>
    </section>
  );
};
