import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { useViewportProfile } from "../compose/viewport";
import type { Widget } from "../types/contract";
import { accentVar, WidgetHandlers, WidgetRenderer } from "./WidgetRenderer";
import { arcPath, ringPath, wedgePath } from "./surfaceGeometry";

type SurfaceWidget = Extract<Widget, { type: "surface" }>;
type SurfaceGeometryNode = Extract<
  Widget,
  { type: "rect" | "rounded_rect" | "capsule" | "circle" | "ellipse" | "arc" | "ring" | "wedge" }
>;
type SurfaceRegionWidget = Extract<Widget, { type: "surface_region" }>;

const DEFAULT_GEOMETRY_FILL = "var(--okuda-orange)";
const ARC_STROKE_WIDTH = 4;

function GeometryNode({ node }: { node: SurfaceGeometryNode }) {
  const fill = accentVar(node.color) ?? DEFAULT_GEOMETRY_FILL;
  switch (node.type) {
    case "rect":
      return <rect fill={fill} height={node.h} width={node.w} x={node.x} y={node.y} />;
    case "rounded_rect":
      return (
        <rect
          fill={fill}
          height={node.h}
          rx={node.radius}
          ry={node.radius}
          width={node.w}
          x={node.x}
          y={node.y}
        />
      );
    case "capsule":
      return (
        <rect
          fill={fill}
          height={node.h}
          rx={node.h / 2}
          ry={node.h / 2}
          width={node.w}
          x={node.x}
          y={node.y}
        />
      );
    case "circle":
      return <circle cx={node.cx} cy={node.cy} fill={fill} r={node.r} />;
    case "ellipse":
      return <ellipse cx={node.cx} cy={node.cy} fill={fill} rx={node.rx} ry={node.ry} />;
    case "arc":
      return (
        <path
          d={arcPath(node.center_x, node.center_y, node.radius, node.start_angle, node.end_angle)}
          fill="none"
          stroke={fill}
          strokeWidth={ARC_STROKE_WIDTH}
        />
      );
    case "ring":
      return (
        <path
          d={ringPath(
            node.center_x,
            node.center_y,
            node.inner_radius,
            node.outer_radius,
            node.start_angle,
            node.end_angle,
          )}
          fill={fill}
          fillRule="evenodd"
        />
      );
    case "wedge":
      return (
        <path
          d={wedgePath(
            node.center_x,
            node.center_y,
            node.inner_radius,
            node.outer_radius,
            node.start_angle,
            node.end_angle,
          )}
          fill={fill}
          fillRule="evenodd"
        />
      );
    default:
      return null;
  }
}

function RegionOverlay({
  region,
  designWidth,
  designHeight,
  depth,
  handlers,
}: {
  region: SurfaceRegionWidget;
  designWidth: number;
  designHeight: number;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const accent = accentVar(region.color);
  const style: CSSProperties = {
    position: "absolute",
    left: `${(region.x / designWidth) * 100}%`,
    top: `${(region.y / designHeight) * 100}%`,
    width: `${(region.w / designWidth) * 100}%`,
    height: `${(region.h / designHeight) * 100}%`,
    ...(accent ? ({ "--accent": accent } as CSSProperties) : null),
  };
  return (
    <div className="lcars-surface-region" data-region={region.id} style={style}>
      {region.children.map((child) => (
        <WidgetRenderer depth={depth + 1} key={child.id} widget={child} {...handlers} />
      ))}
    </div>
  );
}

export function SurfaceControl({
  widget,
  depth,
  handlers,
}: {
  widget: SurfaceWidget;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  // Reserved for a future "adaptive" narrow policy (Milestone 4); surface only
  // supports scroll/scale today, so the profile itself isn't consumed yet.
  useViewportProfile(host);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const updateWidth = () => setAvailableWidth(element.clientWidth);
    updateWidth();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const narrow = availableWidth !== null && availableWidth < widget.min_width;
  const scale = narrow && widget.narrow === "scale" && availableWidth !== null
    ? availableWidth / widget.min_width
    : 1;
  const stageWidth = narrow ? widget.min_width : undefined;
  const stageStyle: CSSProperties = {
    position: "relative",
    aspectRatio: `${widget.design_width} / ${widget.design_height}`,
    width: stageWidth ? `${stageWidth}px` : undefined,
    minWidth: `${widget.min_width}px`,
    transformOrigin: "top left",
    transform: scale < 1 ? `scale(${scale})` : undefined,
  };
  const viewportStyle: CSSProperties | undefined = scale < 1
    ? { height: `${((widget.min_width * widget.design_height) / widget.design_width) * scale}px` }
    : undefined;

  const geometryNodes = widget.children.filter(
    (child): child is SurfaceGeometryNode =>
      child.type === "rect" ||
      child.type === "rounded_rect" ||
      child.type === "capsule" ||
      child.type === "circle" ||
      child.type === "ellipse" ||
      child.type === "arc" ||
      child.type === "ring" ||
      child.type === "wedge",
  );
  const regions = widget.children.filter(
    (child): child is SurfaceRegionWidget => child.type === "surface_region",
  );

  return (
    <div className="lcars-surface-viewport" data-narrow={widget.narrow} ref={host} style={viewportStyle}>
      <div className="lcars-surface-stage" style={stageStyle}>
        <svg
          className="lcars-surface-geometry"
          preserveAspectRatio="none"
          viewBox={`0 0 ${widget.design_width} ${widget.design_height}`}
        >
          {geometryNodes.map((node) => (
            <GeometryNode key={node.id} node={node} />
          ))}
        </svg>
        {regions.map((region) => (
          <RegionOverlay
            depth={depth}
            designHeight={widget.design_height}
            designWidth={widget.design_width}
            handlers={handlers}
            key={region.id}
            region={region}
          />
        ))}
      </div>
    </div>
  );
}
