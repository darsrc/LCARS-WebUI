import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { useViewportProfile } from "../compose/viewport";
import type { EffectNode, PathCommandSpec, Widget } from "../types/contract";
import { accentVar, WidgetHandlers, WidgetRenderer } from "./WidgetRenderer";
import { arcPath, connectorPath, elbowPath, pathFromCommands, polygonPath, ringPath, wedgePath, type PathCommand } from "./surfaceGeometry";
import { groupCopyTransforms, matrixToCss, transformPoint } from "./surfaceTransforms";

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
type SurfaceGroupWidget = Extract<Widget, { type: "surface_group" }>;

const GEOMETRY_NODE_TYPES = new Set<string>([
  "rect", "rounded_rect", "capsule", "circle", "ellipse",
  "arc", "ring", "wedge", "elbow", "polygon", "path", "connector", "text_path",
]);
function isGeometryNode(child: Widget): child is SurfaceGeometryNode {
  return GEOMETRY_NODE_TYPES.has(child.type);
}

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

function buildEffectStyle(effect: EffectNode): CSSProperties {
  switch (effect.kind) {
    case "sweep": {
      const bounded = effect.from_angle != null && effect.to_angle != null;
      return {
        transformBox: "view-box",
        transformOrigin: `${effect.pivot_x}px ${effect.pivot_y}px`,
        animationName: bounded ? "lcars-surface-sweep-bounded" : "lcars-surface-sweep",
        animationDuration: `${effect.period_ms}ms`,
        animationTimingFunction: bounded ? "ease-in-out" : "linear",
        animationIterationCount: "infinite",
        animationDirection: effect.direction === "ccw" ? "reverse" : "normal",
        ...(bounded
          ? ({
              "--lcars-effect-from": `${effect.from_angle}deg`,
              "--lcars-effect-to": `${effect.to_angle}deg`,
            } as CSSProperties)
          : null),
      };
    }
    case "pulse": {
      return {
        animationName: effect.colors ? "lcars-surface-pulse-color" : "lcars-surface-pulse",
        animationDuration: `${effect.period_ms}ms`,
        animationTimingFunction: "ease-in-out",
        animationIterationCount: "infinite",
        ...(effect.colors
          ? ({
              "--lcars-effect-color-a": accentVar(effect.colors[0]) ?? effect.colors[0],
              "--lcars-effect-color-b": accentVar(effect.colors[1]) ?? effect.colors[1],
            } as CSSProperties)
          : null),
      };
    }
    case "flow":
      return {
        strokeDasharray: "12 8",
        animationName: "lcars-surface-flow",
        animationDuration: `${effect.period_ms}ms`,
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
        animationDirection: effect.direction === "ccw" ? "reverse" : "normal",
      };
  }
}

// When `fluid` is true (narrow="fluid" and the viewport dropped below min_width), rect/
// rounded_rect/capsule prefer their narrow_x/y/w/h - a second bounds pass resolved against
// the surface's narrow_design_size (see _surface_constraints.py). A node with no anchors
// resolves to the same values in both passes, so this is a safe no-op for absolute nodes.
function GeometryNode({ node, fluid, effectStyle }: { node: SurfaceGeometryNode; fluid: boolean; effectStyle?: CSSProperties }) {
  const fill = accentVar(node.color) ?? DEFAULT_GEOMETRY_FILL;
  switch (node.type) {
    case "rect": {
      const b = fluid ? { x: node.narrow_x ?? node.x, y: node.narrow_y ?? node.y, w: node.narrow_w ?? node.w, h: node.narrow_h ?? node.h } : node;
      return <rect fill={fill} height={b.h} id={node.id} style={effectStyle || undefined} width={b.w} x={b.x} y={b.y} />;
    }
    case "rounded_rect": {
      const b = fluid ? { x: node.narrow_x ?? node.x, y: node.narrow_y ?? node.y, w: node.narrow_w ?? node.w, h: node.narrow_h ?? node.h } : node;
      return (
        <rect
          fill={fill}
          height={b.h}
          id={node.id}
          rx={node.radius}
          ry={node.radius}
          style={effectStyle || undefined}
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
          id={node.id}
          rx={b.h / 2}
          ry={b.h / 2}
          style={effectStyle || undefined}
          width={b.w}
          x={b.x}
          y={b.y}
        />
      );
    }
    case "circle":
      return <circle cx={node.cx} cy={node.cy} fill={fill} id={node.id} r={node.r} style={effectStyle || undefined} />;
    case "ellipse":
      return <ellipse cx={node.cx} cy={node.cy} fill={fill} id={node.id} rx={node.rx} ry={node.ry} style={effectStyle || undefined} />;
    case "arc":
      return (
        <path
          d={arcPath(node.center_x, node.center_y, node.radius, node.start_angle, node.end_angle)}
          fill="none"
          id={node.id}
          stroke={fill}
          strokeWidth={ARC_STROKE_WIDTH}
          style={effectStyle || undefined}
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
          style={effectStyle || undefined}
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
          style={effectStyle || undefined}
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
          style={effectStyle || undefined}
        />
      );
    case "polygon":
      return <path d={polygonPath(node.points)} fill={fill} id={node.id} style={effectStyle || undefined} />;
    case "path":
      return (
        <path
          d={pathFromCommands(node.commands.map(toRendererCommand))}
          fill={node.filled ? fill : "none"}
          id={node.id}
          stroke={node.filled ? undefined : fill}
          strokeWidth={node.filled ? undefined : ARC_STROKE_WIDTH}
          style={effectStyle || undefined}
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
          style={effectStyle || undefined}
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

// Renders a surface_group's geometry children N times (one <g transform> per copy) - the
// manifest carries only the group's transform spec, never N literal copies of its children.
// Each copy's geometry nodes get an id suffixed with "-copy-{i}" so text_path/connector
// references and plain DOM ids stay unique; the group's declared id is the template's identity,
// not any one copy's.
function SurfaceGroupGeometry({
  group,
  designWidth,
  designHeight,
  fluid,
}: {
  group: SurfaceGroupWidget;
  designWidth: number;
  designHeight: number;
  fluid: boolean;
}) {
  const transforms = groupCopyTransforms(group, designWidth, designHeight);
  const geometryChildren = group.children.filter(isGeometryNode);
  return (
    <>
      {transforms.map((matrix, i) => (
        <g key={i} transform={matrixToCss(matrix)}>
          {geometryChildren.map((node) => (
            <GeometryNode fluid={fluid} key={node.id} node={{ ...node, id: `${node.id}-copy-${i}` }} />
          ))}
        </g>
      ))}
    </>
  );
}

// Region (HTML content) children of a group are repositioned per copy - their CENTER point is
// transformed and the box redrawn at the same w/h around the new center, but the content itself
// is never rotated or mirrored, so button/text labels always stay upright and readable. This is
// exact for mirror/repeat_linear (both preserve axis-aligned box shape); for repeat_radial/
// rotate it deliberately only repositions, since rotating arbitrary widget trees isn't practical.
function SurfaceGroupRegions({
  group,
  designWidth,
  designHeight,
  fluid,
  depth,
  handlers,
}: {
  group: SurfaceGroupWidget;
  designWidth: number;
  designHeight: number;
  fluid: boolean;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const transforms = groupCopyTransforms(group, designWidth, designHeight);
  const regionChildren = group.children.filter(
    (child): child is SurfaceRegionWidget => child.type === "surface_region",
  );
  return (
    <>
      {transforms.map((matrix, i) =>
        regionChildren.map((region) => {
          const baseX = fluid ? region.narrow_x ?? region.x : region.x;
          const baseY = fluid ? region.narrow_y ?? region.y : region.y;
          const w = fluid ? region.narrow_w ?? region.w : region.w;
          const h = fluid ? region.narrow_h ?? region.h : region.h;
          const center = transformPoint(matrix, baseX + w / 2, baseY + h / 2);
          const copy: SurfaceRegionWidget = {
            ...region,
            id: `${region.id}-copy-${i}`,
            x: center.x - w / 2,
            y: center.y - h / 2,
            w,
            h,
          };
          return (
            <RegionOverlay
              depth={depth}
              designHeight={designHeight}
              designWidth={designWidth}
              fluid={false}
              handlers={handlers}
              key={copy.id}
              region={copy}
            />
          );
        }),
      )}
    </>
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

  // Build effectsByTarget lookup from children of type "effect". Each effect node points to a
  // target id and carries animation parameters (kind/period_ms/direction/from_angle/to_angle/pivot/colors).
  // The renderer resolves these into inline CSS custom properties on the TARGET element via
  // buildEffectStyle. Effects are not rendered themselves - they only modify their targets.
  const effectsByTarget = new Map<string, EffectNode>();
  for (const child of widget.children) {
    if (child.type === "effect") {
      effectsByTarget.set(child.target, child);
    }
  }

  // Both passes walk widget.children in original declaration order (not three pre-filtered
  // arrays) so a surface_group's SVG content interleaves correctly with plain geometry siblings
  // instead of always drawing after them regardless of where it was actually declared.
  return (
    <div className="lcars-surface-viewport" data-narrow={widget.narrow} ref={host} style={viewportStyle}>
      <div className="lcars-surface-stage" style={stageStyle}>
        <svg
          className="lcars-surface-geometry"
          preserveAspectRatio="none"
          viewBox={`0 0 ${activeDesignWidth} ${activeDesignHeight}`}
        >
          {widget.children.map((child) => {
            if (child.type === "surface_group") {
              return (
                <SurfaceGroupGeometry
                  designHeight={activeDesignHeight}
                  designWidth={activeDesignWidth}
                  fluid={isFluidNarrow}
                  group={child}
                  key={child.id}
                />
              );
            }
            if (isGeometryNode(child)) {
              const effect = effectsByTarget.get(child.id);
              const effectStyle = effect ? buildEffectStyle(effect) : {};
              return <GeometryNode fluid={isFluidNarrow} effectStyle={effectStyle} key={child.id} node={child} />;
            }
            return null;
          })}
        </svg>
        {widget.children.map((child) => {
          if (child.type === "surface_region") {
            return (
              <RegionOverlay
                depth={depth}
                designHeight={activeDesignHeight}
                designWidth={activeDesignWidth}
                fluid={isFluidNarrow}
                handlers={handlers}
                key={child.id}
                region={child}
              />
            );
          }
          if (child.type === "surface_group") {
            return (
              <SurfaceGroupRegions
                depth={depth}
                designHeight={activeDesignHeight}
                designWidth={activeDesignWidth}
                fluid={isFluidNarrow}
                group={child}
                handlers={handlers}
                key={child.id}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
