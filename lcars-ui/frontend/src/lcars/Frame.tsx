/*
 * The frame — the L-bracket shell every screen lives inside.
 *
 * Top band: elbow sweeping into the header bar. Middle band: the narrow command
 * rail (nav drawn from the manifest sidebar) and the black content field. Bottom
 * band: elbow into a thin status footer. The black around the bars is intentional
 * negative space, not filler.
 */
import type { ReactNode } from "react";

import type { TransportStatus } from "../runtime/transport";
import type { Manifest } from "../types/contract";
import { Elbow } from "./Elbow";

type FrameProps = {
  manifest: Manifest;
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  transportStatus: TransportStatus;
  children: ReactNode;
};

const isLive = (mode: TransportStatus["mode"]) => mode === "ws" || mode === "sse";

export function Frame({ manifest, activePageId, onSelectPage, transportStatus, children }: FrameProps) {
  const header = manifest.layout.header;
  const items = manifest.layout.sidebar.position === "hidden" ? [] : manifest.layout.sidebar.items;
  const live = isLive(transportStatus.mode);

  return (
    <div className="lcars-frame">
      <div className="lcars-band lcars-band--top">
        <Elbow variant="top" />
        <div className="lcars-headwrap">
          <div className="lcars-headbar">
            {header.subtitle ? <span className="lcars-sub">{header.subtitle}</span> : null}
            <span className="lcars-title">{header.title}</span>
          </div>
          <div className="lcars-fill" />
        </div>
      </div>

      <div className="lcars-band lcars-band--mid">
        <nav className="lcars-rail" aria-label="Sections">
          {items.length > 0 ? (
            <>
              {items.map((item) => (
                <button
                  key={item.id}
                  className="lcars-rail-btn"
                  data-active={item.target_page === activePageId}
                  onClick={() => onSelectPage(item.target_page)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
              <div className="lcars-rail-spacer" />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => <div className="lcars-rail-block" data-k={i % 3} key={i} aria-hidden="true" />)
          )}
          <div className="lcars-rail-num">{transportStatus.mode.toUpperCase()}</div>
        </nav>
        <div className="lcars-content">{children}</div>
      </div>

      <div className="lcars-band lcars-band--bot">
        <Elbow variant="bot" />
        <div className="lcars-footwrap">
          <div className="lcars-fill" />
          <div className="lcars-footbar">
            <span>{manifest.meta.app_name}</span>
            <span className="lcars-foot-sp">LINK {live ? "ESTABLISHED" : "STANDBY"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
