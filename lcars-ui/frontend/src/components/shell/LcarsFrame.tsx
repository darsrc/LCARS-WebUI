import { type ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "./LcarsElbow";
import type { Manifest } from "../../types/contract";
import type { TransportStatus } from "../../runtime/transport";
import { accentClass } from "../widgetStyles";

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

/**
 * WHY: App owns data/runtime state, while this component owns LCARS shell geometry.
 */
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

  const navList = (
    <aside aria-label="Page navigation" className="lcars-sidebar-rail" role="navigation">
      <div className="lcars-nav-stack">
        {manifest.layout.sidebar.items.map((item) => (
          <button
            aria-current={activePageId === item.target_page ? "page" : undefined}
            className={clsx("lcars-nav-item", accentClass(item.color), {
              active: activePageId === item.target_page,
            })}
            key={item.id}
            onClick={() => onSelectPage(item.target_page)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );

  return (
    <div className={shellClass} data-sidebar-position={sidebarPosition}>
      <div className="lcars-shell-top">
        <LcarsElbow
          color={manifest.layout.header.color}
          corner={renderSidebarAfterContent ? "top-right" : "top-left"}
        />
        <header className={clsx("lcars-header-bar", accentClass(manifest.layout.header.color))}>
          <div className="lcars-header-meta">
            <span className={transportClass(transportStatus)}>{transportText(transportStatus)}</span>
            <span className="lcars-schema">Schema {manifest.meta.version}</span>
          </div>
          <div className="lcars-header-title-wrap">
            <h1 className="lcars-header-title">{manifest.layout.header.title}</h1>
            <p className="lcars-header-subtitle">
              {manifest.layout.header.subtitle ?? manifest.meta.app_name}
            </p>
          </div>
        </header>
        <LcarsElbow
          color={manifest.layout.header.color}
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
          color={manifest.layout.header.color}
          corner={renderSidebarAfterContent ? "bottom-right" : "bottom-left"}
        />
        <footer className={clsx("lcars-footer-bar", accentClass(manifest.layout.header.color))}>
          <div className="lcars-footer-statuses">
            {Object.entries(actionStatus).length === 0 ? (
              <span className="lcars-footer-idle">Awaiting actions</span>
            ) : (
              Object.entries(actionStatus).map(([actionId, status]) => (
                <span className={`action-status ${status}`} key={actionId}>
                  {actionId}: {status}
                </span>
              ))
            )}
          </div>
        </footer>
        <LcarsElbow
          color={manifest.layout.header.color}
          corner={renderSidebarAfterContent ? "bottom-left" : "bottom-right"}
        />
      </div>
    </div>
  );
};
