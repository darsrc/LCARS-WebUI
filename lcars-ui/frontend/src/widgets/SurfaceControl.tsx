import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { useViewportProfile } from "../compose/viewport";
import type { PathCommandSpec, Widget } from "../types/contract";
import { accentVar, WidgetHandlers, WidgetRenderer } from "./WidgetRenderer";
import { arcPath, connectorPath, elbowPath, pathFromCommands, polygonPath, ringPath, wedgePath, type PathCommand } from "./surfaceGeometry";

type SurfaceWidget = Extract<Widget, { type: "surface" }>;
type SurfaceGeometryNode = Extract<
  Widget,
  {
    type:
      | "rect" | "rounded_rect" | "capsule" | "circle" | "ellipse"
      | "arc" | "ring" | "wedge" | "elbow" | "polygon" | "path" | "connector" | "text_path";
  }
>;
type SurfaceRegionWidget = Extract<Widget, { type: "surface_region" }>;

// contract.ts's wire shape uses snake_case (large_arc) to match the Python model field names;
// surfaceGeometry.ts's PathCommand uses camelCase (largeArc) as ordinary TS convention. Kept as
// two distinct types rather than forcing one shape to serve both the wire format and the renderer.
function toRendererCommand(spec: PathCommandSpec): PathCommand {
  switch (spec.op) {
    case "move":
      return { op: "move", x: spec.x, y: spec.y };
    case "line":
      return { op: "line", x: spec.x, y: spec.y };
    case "arc":
      return {
        op: "arc",
        rx: spec.rx,
        ry: spec.ry,
        rotation: spec.rotation,
        largeArc: spec.large_arc,
        sweep: spec.sweep,
        x: spec.x,
        y: spec.y,
      };
    case "close":
      return { op: "close" };
    default: {
      const exhaustive: never = spec;
      throw new Error(`Unknown path command: ${JSON.stringify(exhaustive)}`);
    }
  }
}

const DEFAULT_GEOMETRY_FILL = "var(--okuda-orange)";
const ARC_STROKE_WIDTH = 4;

// When `fluid` is true (narrow="fluid" and the viewport dropped below min_width), rect/
// rounded_rect/capsule prefer their narrow_x/y/w/h - a second bounds pass resolved against
// the surface's narrow_design_size (see _surface_constraints.py). A node with no anchors
// resolves to the same values in both passes, so this is a safe no-op for absolute nodes.
function GeometryNode({ node, fluid }: { node: SurfaceGeometryNode; fluid: boolean }) {
  const fill = accentVar(node.color) ?? DEFAULT_GEOMETRY_FILL;
  switch (node.type) {
    case "rect": {
      const b = fluid ? { x: node.narrow_x ?? node.x, y: node.narrow_y ?? node.y, w: node.narrow_w ?? node.w, h: node.narrow_h ?? node.h } : node;
      return <rect fill={fill} height={b.h} width={b.w} x={b.x} y={b.y} />;
    }
    case "rounded_rect": {
      const b = fluid ? { x: node.narrow_x ?? node.x, y: node.narrow_y ?? node.y, w: node.narrow_w ?? node.w, h: node.narrow_h ?? node.h } : node;
      return (
        <rect
          fill={fill}
          height={b.h}
          rx={node.radius}
          ry={node.radius}
          width={b.w}
          x={b.x}
          y={b.y}
        />
      );
    }
    case "capsule": {
      const b = fluid ? { x: node.narrow_x ?? node.x, y: node.narrow_y ?? node.y, w: node.narrow_w ?? node.w, h: node.narrow_h ?? node.h } : node;
      return (
        <rect
          fill={fill}
          height={b.h}
          rx={b.h / 2}
          ry={b.h / 2}
          width={b.w}
          x={b.x}
          y={b.y}
        />
      );
    }
    case "circle":
      return <circle cx={node.cx} cy={node.cy} fill={fill} r={node.r} />;
    case "ellipse":
      return <ellipse cx={node.cx} cy={node.cy} fill={fill} rx={node.rx} ry={node.ry} />;
    case "arc":
      return (
        <path
          d={arcPath(node.center_x, node.center_y, node.radius, node.start_angle, node.end_angle)}
          fill="none"
          id={node.id}
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
          id={node.id}
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
          id={node.id}
        />
      );
    case "elbow":
      return (
        <path
          d={elbowPath(
            node.x,
            node.y,
            node.w,
            node.h,
            node.arm_thickness_x,
            node.arm_thickness_y,
            node.corner,
            node.outer_radius,
            node.inner_radius,
          )}
          fill={fill}
          id={node.id}
        />
      );
    case "polygon":
      return <path d={polygonPath(node.points)} fill={fill} id={node.id} />;
    case "path":
      return (
        <path
          d={pathFromCommands(node.commands.map(toRendererCommand))}
          fill={node.filled ? fill : "none"}
          id={node.id}
          stroke={node.filled ? undefined : fill}
          strokeWidth={node.filled ? undefined : ARC_STROKE_WIDTH}
        />
      );
    case "connector":
      return (
        <path
          d={connectorPath(node.from_x, node.from_y, node.to_x, node.to_y, node.style)}
          fill="none"
          id={node.id}
          stroke={fill}
          strokeWidth={ARC_STROKE_WIDTH}
        />
      );
    case "text_path":
      return (
        <text fill={fill}>
          <textPath href={`#${node.path_ref}`} startOffset={`${node.start_offset}%`}>
            {node.text}
          </textPath>
        </text>
      );
    default:
      return null;
  }
}

function RegionOverlay({
  region,
  designWidth,
  designHeight,
  fluid,
  depth,
  handlers,
}: {
  region: SurfaceRegionWidget;
  designWidth: number;
  designHeight: number;
  fluid: boolean;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const accent = accentVar(region.color);
  const bounds = fluid
    ? {
        x: region.narrow_x ?? region.x,
        y: region.narrow_y ?? region.y,
        w: region.narrow_w ?? region.w,
        h: region.narrow_h ?? region.h,
      }
    : region;
  const style: CSSProperties = {
    position: "absolute",
    left: `${(bounds.x / designWidth) * 100}%`,
    top: `${(bounds.y / designHeight) * 100}%`,
    width: `${(bounds.w / designWidth) * 100}%`,
    height: `${(bounds.h / designHeight) * 100}%`,
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
  // Reserved for a future viewport-shape-driven narrow policy; scroll/scale/fluid all
  // key off measured width alone today, so the full profile isn't consumed yet.
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
  // "fluid" resolves a second bounds pass server-side (narrow_x/y/w/h) against
  // narrow_design_size instead of scaling the whole stage down - see _surface_constraints.py.
  const isFluidNarrow =
    narrow && widget.narrow === "fluid" &&
    widget.narrow_design_width != null && widget.narrow_design_height != null;
  const activeDesignWidth = isFluidNarrow ? widget.narrow_design_width! : widget.design_width;
  const activeDesignHeight = isFluidNarrow ? widget.narrow_design_height! : widget.design_height;
  const scale = narrow && widget.narrow === "scale" && availableWidth !== null
    ? availableWidth / widget.min_width
    : 1;
  const stageWidth = narrow && widget.narrow !== "fluid" ? widget.min_width : undefined;
  const stageStyle: CSSProperties = {
    position: "relative",
    aspectRatio: `${activeDesignWidth} / ${activeDesignHeight}`,
    width: stageWidth ? `${stageWidth}px` : undefined,
    minWidth: isFluidNarrow ? undefined : `${widget.min_width}px`,
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
      child.type === "wedge" ||
      child.type === "elbow" ||
      child.type === "polygon" ||
      child.type === "path" ||
      child.type === "connector" ||
      child.type === "text_path",
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
          viewBox={`0 0 ${activeDesignWidth} ${activeDesignHeight}`}
        >
          {geometryNodes.map((node) => (
            <GeometryNode fluid={isFluidNarrow} key={node.id} node={node} />
          ))}
        </svg>
        {regions.map((region) => (
          <RegionOverlay
            depth={depth}
            designHeight={activeDesignHeight}
            designWidth={activeDesignWidth}
            fluid={isFluidNarrow}
            handlers={handlers}
            key={region.id}
            region={region}
          />
        ))}
      </div>
    </div>
  );
}
