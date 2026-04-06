import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "../shell/LcarsElbow";
import { LcarsBarRunPrimitive, barRunFromBarSpec } from "../primitives/lcarsSharedScaffoldPrimitives";
import type { LcarsSweepWidget, Widget } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";
import {
  isOverviewParitySweepId,
  OVERVIEW_PARITY_SWEEP_IDS,
  PARITY_SWEEP_RENDERER_VERSION,
  resolveParitySweepSpec,
  type ParityLabelAnchorSpec,
  type ParityPanelBoundsSpec,
  type ParitySweepSpec,
} from "./paritySweepSpec";
import { resolveSweepRegions } from "./strictContainerPlacement";

interface LcarsSweepControlProps {
  widget: LcarsSweepWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

interface ParitySweepRendererProps {
  widget: LcarsSweepWidget;
  spec: ParitySweepSpec;
  title: string | null;
  subtitle: string | null;
  leftPanelChildren: Widget[];
  rightPanelChildren: Widget[];
  railChildren: Widget[];
  renderWidget: (widget: Widget) => ReactNode;
}

export { isOverviewParitySweepId, OVERVIEW_PARITY_SWEEP_IDS, PARITY_SWEEP_RENDERER_VERSION };
export const OVERVIEW_PARITY_RENDERER_VERSION = PARITY_SWEEP_RENDERER_VERSION;

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(32, (GEOMETRY_TOKENS.barHeightThick / widthPx) * 100));
};

const parityRootStyle = (spec: ParitySweepSpec): CSSProperties => {
  return {
    width: `${spec.viewWidth}px`,
    minHeight: `${spec.viewHeight}px`,
    height: `${spec.viewHeight}px`,
    "--lcars-parity-sweep-color": spec.sweepColor,
    "--lcars-parity-stack-label-size": `${spec.stack.labelFontSize}px`,
    "--lcars-parity-stack-label-padding-right": `${spec.stack.labelPaddingRight}px`,
    "--lcars-parity-chart-border-color": spec.chart.borderColor,
    "--lcars-parity-grid-line-major": spec.chart.gridLineMajor,
    "--lcars-parity-grid-line-minor": spec.chart.gridLineMinor,
    "--lcars-parity-chart-title-color": spec.chart.titleColor,
    "--lcars-parity-chart-title-top": `${spec.chart.titleTop}px`,
    "--lcars-parity-chart-title-left": `${spec.chart.titleLeft}px`,
  } as CSSProperties;
};

const panelBoundsStyle = (bounds: ParityPanelBoundsSpec): CSSProperties => {
  return {
    left: `${bounds.x}px`,
    top: `${bounds.y}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
  };
};

const labelAnchorStyle = (anchor: ParityLabelAnchorSpec): CSSProperties => {
  const style: CSSProperties = {
    top: `${anchor.y}px`,
    color: anchor.color,
    fontSize: `${anchor.size}px`,
  };
  if (anchor.align === "right") {
    style.right = `${anchor.x}px`;
    style.left = "auto";
  } else {
    style.left = `${anchor.x}px`;
    style.right = "auto";
  }
  return style;
};

/*
 * Parity sweep renderer family: intentionally code-rendered geometry (SVG/CSS)
 * with explicit spec inputs and no raster-backed rendering path.
 */
const ParitySweepRenderer = ({
  widget,
  spec,
  title,
  subtitle,
  leftPanelChildren,
  rightPanelChildren,
  railChildren,
  renderWidget,
}: ParitySweepRendererProps) => {
  const fallbackHeight = spec.stack.segmentHeights[spec.stack.segmentHeights.length - 1] ?? 84;

  return (
    <article
      className={clsx("lcars-parity-sweep", `lcars-parity-sweep-${spec.orientation}`)}
      data-lcars-code-rendered="true"
      data-lcars-parity-family="stacked-sweep"
      data-lcars-parity-scope={spec.pageId}
      data-lcars-renderer={PARITY_SWEEP_RENDERER_VERSION}
      data-widget-id={widget.id}
      style={parityRootStyle(spec)}
    >
      <svg
        aria-hidden="true"
        className="lcars-parity-mass-svg"
        preserveAspectRatio="none"
        viewBox={`0 0 ${spec.viewWidth} ${spec.viewHeight}`}
      >
        {spec.paths.map((pathData) => (
          <path className="lcars-parity-sweep-shape" d={pathData} key={pathData} />
        ))}
        {spec.staticRects.map((shape, index) => (
          <rect
            fill={shape.fill}
            height={shape.height}
            key={`${shape.x}-${shape.y}-${shape.width}-${shape.height}-${index}`}
            rx={shape.rx}
            ry={shape.ry}
            width={shape.width}
            x={shape.x}
            y={shape.y}
          />
        ))}
      </svg>

      <div className="lcars-parity-label lcars-parity-title" style={labelAnchorStyle(spec.titleAnchor)}>
        {title}
      </div>
      <div className="lcars-parity-label lcars-parity-subtitle" style={labelAnchorStyle(spec.subtitleAnchor)}>
        {subtitle}
      </div>

      <section
        className={clsx("lcars-parity-left", {
          "lcars-parity-empty": leftPanelChildren.length === 0,
        })}
        style={panelBoundsStyle(spec.leftBounds)}
      >
        {leftPanelChildren.map((child) => (
          <div className="lcars-parity-left-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </section>

      <section
        className="lcars-parity-stack"
        style={{
          left: `${spec.stack.x}px`,
          top: `${spec.stack.y}px`,
          width: `${spec.stack.width}px`,
          gap: `${spec.stack.gap}px`,
        }}
      >
        {railChildren.map((child, index) => (
          <div
            className="lcars-parity-stack-child"
            key={child.id}
            style={{ height: `${spec.stack.segmentHeights[index] ?? fallbackHeight}px` }}
          >
            {renderWidget(child)}
          </div>
        ))}
      </section>

      <aside
        className={clsx("lcars-parity-right", {
          "lcars-parity-empty": rightPanelChildren.length === 0,
        })}
        style={panelBoundsStyle(spec.rightBounds)}
      >
        {rightPanelChildren.map((child) => (
          <div className="lcars-parity-right-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </aside>
    </article>
  );
};

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  const verticalArm = armPercentForWidth(widget.width_sidebar);
  const leftRatio = Math.min(0.8, Math.max(0.2, Number.isFinite(widget.left_width) ? widget.left_width : 0.62));
  const rightRatio = Math.min(0.8, Math.max(0.2, 1 - leftRatio));
  const title = widget.title ?? widget.label ?? null;
  const subtitle = widget.subtitle ?? null;
  const paritySpec = resolveParitySweepSpec(widget.id);

  const { headerChildren, railChildren, leftChildren, rightChildren } = resolveSweepRegions(widget);

  const leftTopLabel = widget.reverse ? title : null;
  const leftBottomLabel = widget.reverse ? null : subtitle;
  const rightTopLabel = widget.reverse ? null : title;
  const rightBottomLabel = widget.reverse ? subtitle : null;

  const leftHeaderChildren = widget.reverse ? headerChildren : [];
  const rightHeaderChildren = widget.reverse ? [] : headerChildren;
  const leftPanelChildren = [...leftHeaderChildren, ...leftChildren];
  const rightPanelChildren = [...rightHeaderChildren, ...rightChildren];

  if (paritySpec) {
    return (
      <ParitySweepRenderer
        leftPanelChildren={leftPanelChildren}
        railChildren={railChildren}
        renderWidget={renderWidget}
        rightPanelChildren={rightPanelChildren}
        spec={paritySpec}
        subtitle={subtitle}
        title={title}
        widget={widget}
      />
    );
  }

  return (
    <article
      className={clsx("lcars-sweep-control", {
        "lcars-sweep-reverse": widget.reverse,
      })}
      data-widget-id={widget.id}
      style={
        {
          "--lcars-sweep-sidebar-width": `${widget.width_sidebar}px`,
          "--lcars-sweep-left-fr": `${leftRatio}fr`,
          "--lcars-sweep-right-fr": `${rightRatio}fr`,
        } as CSSProperties
      }
    >
      <section className="lcars-sweep-panel lcars-sweep-panel-left">
        {leftTopLabel ? (
          <LcarsBarRunPrimitive
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-top"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: widget.color,
              label: leftTopLabel,
              align: "left",
              roundedStart: true,
            })}
          />
        ) : null}
        <div
          className={clsx("lcars-sweep-content-main lcars-sweep-content-left", {
            "lcars-sweep-content-empty": leftPanelChildren.length === 0,
          })}
        >
          {leftPanelChildren.map((child) => (
            <div className="lcars-sweep-child" key={child.id}>
              {renderWidget(child)}
            </div>
          ))}
        </div>
        {leftBottomLabel ? (
          <LcarsBarRunPrimitive
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-bottom"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: widget.color,
              label: leftBottomLabel,
              align: "left",
              roundedStart: true,
            })}
          />
        ) : null}
      </section>

      <section className="lcars-sweep-sidebar">
        <div className="lcars-sweep-top-corner">
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.sweepElbowArmH}
            armVertical={verticalArm}
            color={widget.color}
            corner={widget.reverse ? "bottom-left" : "top-left"}
            innerRadius={GEOMETRY_TOKENS.sweepElbowInnerRadius}
            variant="sweep"
          />
        </div>
        <div className="lcars-sweep-center-column">
          <LcarsBarRunPrimitive
            className="lcars-sweep-sidebar-rail"
            orientation="vertical"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: widget.color,
              roundedEnd: true,
            })}
          />
          <div className="lcars-sweep-rail-controls">
            {railChildren.map((child) => (
              <div className="lcars-sweep-rail-child lcars-sweep-column-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        </div>
        <div className="lcars-sweep-bottom-corner">
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.sweepElbowArmH}
            armVertical={verticalArm}
            color={widget.color}
            corner={widget.reverse ? "top-left" : "bottom-left"}
            innerRadius={GEOMETRY_TOKENS.sweepElbowInnerRadius}
            variant="sweep"
          />
        </div>
      </section>

      <section className="lcars-sweep-panel lcars-sweep-panel-right">
        {rightTopLabel ? (
          <LcarsBarRunPrimitive
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-top"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: widget.color,
              label: rightTopLabel,
              align: "right",
              roundedEnd: true,
            })}
          />
        ) : null}
        <aside
          className={clsx("lcars-sweep-content-terminal lcars-sweep-content-right", {
            "lcars-sweep-content-empty": rightPanelChildren.length === 0,
          })}
        >
          {rightPanelChildren.map((child) => (
            <div className="lcars-sweep-content-terminal-child" key={child.id}>
              {renderWidget(child)}
            </div>
          ))}
        </aside>
        {rightBottomLabel ? (
          <LcarsBarRunPrimitive
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-bottom"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: widget.color,
              label: rightBottomLabel,
              align: "right",
              roundedEnd: true,
            })}
          />
        ) : null}
      </section>
    </article>
  );
};
