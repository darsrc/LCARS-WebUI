import { type ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "./LcarsElbow";
import { LcarsBar } from "../shapes/LcarsBar";
import { LcarsSegmentedBar, type LcarsSegment } from "../shapes/LcarsSegmentedBar";
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
    return item.segments;
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
  const sidebarPosition = manifest.layout.sidebar.position;
  const isSidebarHidden = sidebarPosition === "hidden";
  const renderSidebarAfterContent = sidebarPosition === "right";
  const shellClass = clsx("lcars-shell-frame", `lcars-sidebar-${sidebarPosition}`);
  const headerColor: LcarsColor = manifest.layout.header.color ?? "orange";

  const navList = (
    <aside aria-label="Page navigation" className="lcars-sidebar-rail" role="navigation">
      <div className="lcars-nav-stack">
        {manifest.layout.sidebar.items.map((item) => (
          <button
            aria-current={activePageId === item.target_page ? "page" : undefined}
            className={clsx("lcars-nav-item", { active: activePageId === item.target_page })}
            key={item.id}
            onClick={() => onSelectPage(item.target_page)}
            type="button"
          >
            <LcarsSegmentedBar
              className="lcars-nav-item-segments"
              orientation="vertical"
              segments={sidebarSegments(item, headerColor)}
            />
            <span className="lcars-nav-item-label">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );

  const actionSegments: LcarsSegment[] = Object.entries(actionStatus).map(([actionId, status]) => ({
    color: status === "ok" ? "anakiwa" : status === "pending" ? "orange-peel" : "rust",
    label: `${actionId}:${status}`,
  }));
  const footerSegments = actionSegments.length > 0 ? actionSegments : [{ color: headerColor, label: "Awaiting actions" }];

  return (
    <div className={shellClass} data-sidebar-position={sidebarPosition}>
      <div className="lcars-shell-top">
        <LcarsElbow
          color={headerColor}
          corner={renderSidebarAfterContent ? "top-right" : "top-left"}
        />
        <header className="lcars-header-bar">
          <div className="lcars-header-meta">
            <span className={transportClass(transportStatus)}>{transportText(transportStatus)}</span>
            <span className="lcars-schema">Schema {manifest.meta.version}</span>
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
        </header>
        <LcarsElbow
          color={headerColor}
          corner={renderSidebarAfterContent ? "top-left" : "top-right"}
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
        />
        <footer className="lcars-footer-bar">
          <LcarsSegmentedBar className="lcars-footer-segments" segments={footerSegments} />
        </footer>
        <LcarsElbow
          color={headerColor}
          corner={renderSidebarAfterContent ? "bottom-left" : "bottom-right"}
        />
      </div>
    </div>
  );
};
