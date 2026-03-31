import { type ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "./LcarsElbow";
import { LcarsBar } from "../shapes/LcarsBar";
import { LcarsSegmentedBar, type LcarsSegment } from "../shapes/LcarsSegmentedBar";
import { accentStyle } from "../widgetStyles";
import type { LcarsColor, Manifest, SidebarItem } from "../../types/contract";
import type { TransportStatus } from "../../runtime/transport";

interface LcarsFrameProps {
  manifest: Manifest;
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  transportStatus: TransportStatus;
  actionStatus: Record<string, "pending" | "ok" | "fail">;
  children: ReactNode;
}

const transportText = (status: TransportStatus): string => {
  if (status.mode === "ws") {
    return "WS LIVE";
  }
  if (status.mode === "sse") {
    return "SSE FALLBACK";
  }
  if (status.mode === "reconnecting") {
    return `RECONNECTING ${status.attempt}`;
  }
  return "OFFLINE";
};

const transportClass = (status: TransportStatus): string => {
  if (status.mode === "ws") {
    return "lcars-transport lcars-transport-ws";
  }
  if (status.mode === "sse") {
    return "lcars-transport lcars-transport-sse";
  }
  if (status.mode === "reconnecting") {
    return "lcars-transport lcars-transport-reconnecting";
  }
  return "lcars-transport lcars-transport-offline";
};

const sidebarSegments = (item: SidebarItem, fallbackColor: LcarsColor): LcarsSegment[] => {
  if (item.segments && item.segments.length > 0) {
    if (item.segments.some((segment) => typeof segment.label === "string" && segment.label.length > 0)) {
      return item.segments;
    }
    return [{ ...item.segments[0], label: item.label }, ...item.segments.slice(1)];
  }
  return [{ color: item.color ?? fallbackColor, label: item.label }];
};

export const LcarsFrame = ({
  manifest,
  activePageId,
  onSelectPage,
  transportStatus,
  actionStatus,
  children,
}: LcarsFrameProps) => {
  const strictMode = true;
  const hasSidebarItems = manifest.layout.sidebar.items.length > 0;
  const sidebarPosition = hasSidebarItems ? manifest.layout.sidebar.position : "hidden";
  const isSidebarHidden = sidebarPosition === "hidden";
  const renderSidebarAfterContent = sidebarPosition === "right";
  const shellClass = clsx("lcars-shell-frame", `lcars-sidebar-${sidebarPosition}`);
  const headerColor: LcarsColor = manifest.layout.header.color ?? "orange";
  const headerTerminalSegments: LcarsSegment[] = [
    { color: headerColor, label: strictMode ? undefined : "OPS" },
    { color: "anakiwa", label: strictMode ? undefined : activePageId.toUpperCase() },
  ];

  const navList = (
    <aside aria-label="Page navigation" className="lcars-sidebar-rail" role="navigation">
      <div className="lcars-nav-stack">
        {manifest.layout.sidebar.items.map((item, index) => {
          const navSegments = sidebarSegments(item, headerColor);
          const navTerminalSegments: LcarsSegment[] = [
            { color: item.color ?? headerColor, label: strictMode ? undefined : String(index + 1).padStart(2, "0") },
            { color: "anakiwa", label: strictMode ? undefined : "NAV" },
          ];

          return (
            <button
              aria-label={item.label}
              aria-current={activePageId === item.target_page ? "page" : undefined}
              className={clsx("lcars-nav-item", { active: activePageId === item.target_page })}
              key={item.id}
              onClick={() => onSelectPage(item.target_page)}
              type="button"
            >
              <LcarsSegmentedBar
                className="lcars-nav-item-terminal"
                orientation="vertical"
                segments={navTerminalSegments}
              />
              <div className="lcars-nav-item-body">
                <LcarsSegmentedBar
                  className="lcars-nav-item-segments"
                  orientation="vertical"
                  segments={navSegments}
                />
                <span className="lcars-nav-item-label">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );

  const actionSegments: LcarsSegment[] = Object.entries(actionStatus).map(([actionId, status]) => ({
    color: status === "ok" ? "anakiwa" : status === "pending" ? "orange-peel" : "rust",
    label: strictMode ? undefined : `${actionId}:${status}`,
  }));
  const footerSegments = actionSegments.length > 0 ? actionSegments : [{ color: headerColor, label: strictMode ? undefined : "Awaiting actions" }];
  const footerTerminalSegments: LcarsSegment[] = [
    { color: headerColor, label: strictMode ? undefined : "ACTION BUS" },
    { color: "anakiwa", label: strictMode ? undefined : `${actionSegments.length} ACK` },
  ];

  return (
    <div className={shellClass} data-active-page={activePageId} data-sidebar-position={sidebarPosition}>
      <div className="lcars-shell-top">
        <LcarsElbow
          color={headerColor}
          corner={renderSidebarAfterContent ? "top-right" : "top-left"}
          variant="shell"
        />
        <header className="lcars-header-bar" style={accentStyle(headerColor)}>
          <div className="lcars-header-terminal lcars-header-terminal-left">
            <LcarsSegmentedBar
              className="lcars-header-terminal-stack"
              orientation="vertical"
              segments={headerTerminalSegments}
            />
          </div>
          <div className="lcars-header-meta">
            <span className={transportClass(transportStatus)}>{transportText(transportStatus)}</span>
            {!strictMode ? <span className="lcars-schema">Schema {manifest.meta.version}</span> : null}
          </div>
          <div className="lcars-header-title-wrap">
            <LcarsBar
              className="lcars-header-title-bar"
              color={headerColor}
              label={manifest.layout.header.title}
              roundedEnd
              roundedStart
            />
            <p className="lcars-header-subtitle">
              {manifest.layout.header.subtitle ?? manifest.meta.app_name}
            </p>
          </div>
          <div className="lcars-header-terminal lcars-header-terminal-right">
            <LcarsBar
              className="lcars-header-terminal-cap"
              color={headerColor}
              label={strictMode ? null : "LCARS CORE"}
              roundedEnd
              roundedStart
            />
          </div>
        </header>
        <LcarsElbow
          color={headerColor}
          corner={renderSidebarAfterContent ? "top-left" : "top-right"}
          variant="shell"
        />
      </div>

      <div className="lcars-shell-middle">
        {!isSidebarHidden && !renderSidebarAfterContent ? navList : null}
        <section className="lcars-content-frame">{children}</section>
        {!isSidebarHidden && renderSidebarAfterContent ? navList : null}
      </div>

      <div className="lcars-shell-bottom">
        <LcarsElbow
          color={headerColor}
          corner={renderSidebarAfterContent ? "bottom-right" : "bottom-left"}
          variant="shell"
        />
        <footer className="lcars-footer-bar" style={accentStyle(headerColor)}>
          <LcarsSegmentedBar className="lcars-footer-terminal" segments={footerTerminalSegments} />
          <LcarsSegmentedBar className="lcars-footer-segments" segments={footerSegments} />
          <LcarsBar
            className="lcars-footer-cap"
            color={headerColor}
            label={transportText(transportStatus)}
            roundedEnd
            roundedStart
          />
        </footer>
        <LcarsElbow
          color={headerColor}
          corner={renderSidebarAfterContent ? "bottom-left" : "bottom-right"}
          variant="shell"
        />
      </div>
    </div>
  );
};
