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

const RAIL_FILLER = [58, 26, 96, 22, 52, 74, 30, 120, 26, 64] as const;
// Reference codes in the okudagram NN-NNNNNN format the real consoles carry
// (seismographic rail: 41-678208, 01-4601). Curated + deterministic so they read
// as fixed addressing, not flicker. 47 and 1701 are the canonical Trek numbers.
const RAIL_CODES = ["47-4601", "", "41-6702", "", "02-885", "47-7050", "", "30-1701", "", "0-4077"] as const;
const FOOTER_PILLS = [0, 1, 2, 3, 4] as const;

const isLive = (mode: TransportStatus["mode"]) => mode === "ws" || mode === "sse";

export function Frame({ manifest, activePageId, onSelectPage, transportStatus, children }: FrameProps) {
  const header = manifest.layout.header;
  const items = manifest.layout.sidebar.position === "hidden" ? [] : manifest.layout.sidebar.items;
  const live = isLive(transportStatus.mode);
  const railFill = (
    <div className="lcars-rail-fill" aria-hidden="true">
      {RAIL_FILLER.map((height, index) => (
        <div
          className="lcars-rail-fill-block"
          data-k={index % 4}
          key={`${height}-${index}`}
          style={{ flexBasis: `${height}px` }}
        >
          {height >= 40 && RAIL_CODES[index] ? (
            <span className="lcars-rail-code">{RAIL_CODES[index]}</span>
          ) : null}
        </div>
      ))}
    </div>
  );

  return (
    <div className="lcars-frame">
      <div className="lcars-band lcars-band--top">
        <Elbow variant="top" />
        <div className="lcars-headwrap">
          <div className="lcars-headbar">
            {header.subtitle ? <span className="lcars-sub">{header.subtitle}</span> : null}
            <span className="lcars-title">{header.title}</span>
            <span className="lcars-headcap" aria-hidden="true" />
          </div>
          <div className="lcars-fill" />
        </div>
      </div>

      <div className="lcars-band lcars-band--mid">
        <nav className="lcars-rail" aria-label="Sections">
          {items.length > 0 ? (
            <>
              {items.map((item, index) => (
                <button
                  key={item.id}
                  className="lcars-rail-btn"
                  aria-current={item.target_page === activePageId ? "page" : undefined}
                  data-active={item.target_page === activePageId}
                  data-k={index % 6}
                  onClick={() => onSelectPage(item.target_page)}
                  type="button"
                >
                  <span className="lcars-rail-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="lcars-rail-label">{item.label}</span>
                </button>
              ))}
              {railFill}
            </>
          ) : (
            railFill
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
            {FOOTER_PILLS.map((pill) => (
              <span className="lcars-foot-pill" data-k={pill % 4} key={pill} aria-hidden="true" />
            ))}
            <span className="lcars-foot-status">
              <span>{manifest.meta.app_name}</span>
              <span className="lcars-foot-sp">LINK {live ? "ESTABLISHED" : "STANDBY"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
