import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "../shell/LcarsElbow";
import { LcarsBar } from "../shapes/LcarsBar";
import type { LcarsSweepWidget, Widget } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";

interface LcarsSweepControlProps {
  widget: LcarsSweepWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

interface OverviewParitySweepProps {
  widget: LcarsSweepWidget;
  title: string | null;
  subtitle: string | null;
  leftPanelChildren: Widget[];
  rightPanelChildren: Widget[];
  railChildren: Widget[];
  renderWidget: (widget: Widget) => ReactNode;
}

const TOP_STACK_SEGMENT_HEIGHTS = [84, 112];
const BOTTOM_STACK_SEGMENT_HEIGHTS = [84, 84, 42];

const TOP_SWEEP_PATHS = [
  "M618 18 H1621 V148 H496 A122 122 0 0 1 618 18 Z",
  "M323 360 H804 V486 H452 A124 124 0 0 1 323 360 Z",
];

const BOTTOM_SWEEP_PATHS = [
  "M272 37 H674 A122 122 0 0 1 796 159 V161 H272 Z",
  "M496 399 H1358 A124 124 0 0 1 1482 523 H496 Z",
];

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(14, (GEOMETRY_TOKENS.barHeight / widthPx) * 100));
};

const clampSweepRatio = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return 0.62;
  }
  return Math.min(0.8, Math.max(0.2, value as number));
};

const splitSweepContent = (content: Widget[], leftRatio: number): [Widget[], Widget[]] => {
  if (content.length <= 1) {
    return [content, []];
  }
  const splitAt = Math.max(1, Math.min(content.length - 1, Math.round(content.length * leftRatio)));
  return [content.slice(0, splitAt), content.slice(splitAt)];
};

const OverviewParitySweep = ({
  widget,
  title,
  subtitle,
  leftPanelChildren,
  rightPanelChildren,
  railChildren,
  renderWidget,
}: OverviewParitySweepProps) => {
  const isTopSweep = widget.id === "overview_sweep_top";
  const stackSegmentHeights = isTopSweep ? TOP_STACK_SEGMENT_HEIGHTS : BOTTOM_STACK_SEGMENT_HEIGHTS;
  const sweepPaths = isTopSweep ? TOP_SWEEP_PATHS : BOTTOM_SWEEP_PATHS;

  return (
    <article
      className={clsx("lcars-overview-parity-sweep", {
        "lcars-overview-parity-sweep-top": isTopSweep,
        "lcars-overview-parity-sweep-bottom": !isTopSweep,
      })}
      data-widget-id={widget.id}
    >
      <svg
        aria-hidden="true"
        className="lcars-overview-parity-mass-svg"
        preserveAspectRatio="none"
        viewBox={`0 0 1800 ${isTopSweep ? 486 : 525}`}
      >
        {sweepPaths.map((pathData) => (
          <path className="lcars-overview-sweep-shape" d={pathData} key={pathData} />
        ))}
        {isTopSweep ? (
          <>
            <rect className="lcars-overview-sweep-shape" height="42" rx="21" ry="21" width="90" x="0" y="444" />
            <rect className="lcars-overview-sweep-shape" height="42" rx="21" ry="21" width="90" x="1710" y="18" />
            <rect className="lcars-overview-stack-fill-orange" height="84" rx="10" ry="10" width="314" x="496" y="151" />
            <rect className="lcars-overview-stack-fill-hopbush" height="112" width="314" x="496" y="242" />
          </>
        ) : (
          <>
            <rect className="lcars-overview-sweep-shape" height="42" rx="21" ry="21" width="90" x="0" y="37" />
            <rect className="lcars-overview-sweep-shape" height="42" rx="21" ry="21" width="90" x="1710" y="483" />
            <rect className="lcars-overview-stack-fill-orange" height="84" rx="10" ry="10" width="314" x="496" y="169" />
            <rect className="lcars-overview-stack-fill-orange" height="84" rx="10" ry="10" width="314" x="496" y="260" />
            <rect className="lcars-overview-stack-fill-lilac" height="42" width="314" x="496" y="351" />
          </>
        )}
      </svg>

      {isTopSweep ? (
        <>
          <div className="lcars-overview-parity-label lcars-overview-parity-title">{title}</div>
          <div className="lcars-overview-parity-label lcars-overview-parity-subtitle">{subtitle}</div>
        </>
      ) : (
        <>
          <div className="lcars-overview-parity-label lcars-overview-parity-title2">{title}</div>
          <div className="lcars-overview-parity-label lcars-overview-parity-subtitle2">{subtitle}</div>
        </>
      )}

      <section
        className={clsx("lcars-overview-parity-left", {
          "lcars-overview-parity-empty": leftPanelChildren.length === 0,
        })}
      >
        {leftPanelChildren.map((child) => (
          <div className="lcars-overview-parity-left-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </section>

      <section className="lcars-overview-parity-stack">
        {railChildren.map((child, index) => (
          <div
            className="lcars-overview-parity-stack-child"
            key={child.id}
            style={{ height: `${stackSegmentHeights[index] ?? 84}px` }}
          >
            {renderWidget(child)}
          </div>
        ))}
      </section>

      <aside
        className={clsx("lcars-overview-parity-right", {
          "lcars-overview-parity-empty": rightPanelChildren.length === 0,
        })}
      >
        {rightPanelChildren.map((child) => (
          <div className="lcars-overview-parity-right-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </aside>
    </article>
  );
};

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  const verticalArm = armPercentForWidth(widget.width_sidebar);
  const leftRatio = clampSweepRatio(widget.left_width);
  const rightRatio = clampSweepRatio(1 - leftRatio);
  const title = widget.title ?? widget.label ?? null;
  const subtitle = widget.subtitle ?? null;
  const isOverviewParitySweep = widget.id === "overview_sweep_top" || widget.id === "overview_sweep_bottom";

  const headerChildren = widget.header_children ?? [];
  const railChildren = widget.column_inputs ?? widget.rail_children ?? [];

  let leftChildren = widget.left_children ?? [];
  let rightChildren = widget.right_children ?? [];
  if (!widget.left_children && !widget.right_children) {
    const content = widget.content_children ?? widget.children;
    [leftChildren, rightChildren] = splitSweepContent(content, leftRatio);
  }
  if (leftChildren.length === 0 && rightChildren.length > 0) {
    leftChildren = [rightChildren[0], ...leftChildren];
    rightChildren = rightChildren.slice(1);
  }

  const leftTopLabel = widget.reverse ? title : null;
  const leftBottomLabel = widget.reverse ? null : subtitle;
  const rightTopLabel = widget.reverse ? null : title;
  const rightBottomLabel = widget.reverse ? subtitle : null;

  const leftHeaderChildren = widget.reverse ? headerChildren : [];
  const rightHeaderChildren = widget.reverse ? [] : headerChildren;
  const leftPanelChildren = [...leftHeaderChildren, ...leftChildren];
  const rightPanelChildren = [...rightHeaderChildren, ...rightChildren];

  if (isOverviewParitySweep) {
    return (
      <OverviewParitySweep
        leftPanelChildren={leftPanelChildren}
        railChildren={railChildren}
        renderWidget={renderWidget}
        rightPanelChildren={rightPanelChildren}
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
        "lcars-sweep-overview-parity": isOverviewParitySweep,
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
          <LcarsBar className="lcars-sweep-panel-bar lcars-sweep-panel-bar-top" color={widget.color} label={leftTopLabel} roundedStart />
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
          <LcarsBar className="lcars-sweep-panel-bar lcars-sweep-panel-bar-bottom" color={widget.color} label={leftBottomLabel} roundedStart />
        ) : null}
      </section>

      <section className="lcars-sweep-sidebar">
        <div className="lcars-sweep-top-corner">
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={verticalArm}
            color={widget.color}
            corner={widget.reverse ? "bottom-left" : "top-left"}
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        </div>
        <div className="lcars-sweep-center-column">
          <LcarsBar className="lcars-sweep-sidebar-rail" color={widget.color} orientation="vertical" roundedEnd />
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
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={verticalArm}
            color={widget.color}
            corner={widget.reverse ? "top-left" : "bottom-left"}
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        </div>
      </section>

      <section className="lcars-sweep-panel lcars-sweep-panel-right">
        {rightTopLabel ? (
          <LcarsBar
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-top"
            color={widget.color}
            label={rightTopLabel}
            roundedEnd
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
          <LcarsBar
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-bottom"
            color={widget.color}
            label={rightBottomLabel}
            roundedEnd
          />
        ) : null}
      </section>
    </article>
  );
};
