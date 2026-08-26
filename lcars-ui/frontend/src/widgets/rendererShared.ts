import type { ComponentType, CSSProperties } from "react";

import type { LcarsColor, Widget } from "../types/contract";
import type { WebUIPreferences } from "../runtime/preferences";
import type { FileUploadHandler } from "./FileUploadControl";

export type ActionStatus = "pending" | "ok" | "fail";

export type WidgetHandlers = {
  onAction: (actionId: string, value: unknown, widgetId?: string) => void;
  onInput: (id: string, value: string) => void;
  onFormSubmit: (id: string, data: Record<string, unknown>) => void;
  onAudioUpload?: (widget: Extract<Widget, { type: "mic_button" }>, audio: Blob) => Promise<void>;
  onFileUpload?: FileUploadHandler;
  logsByStream: Record<string, string[]>;
  actionStatus?: Record<string, ActionStatus>;
  uiStateByWidget?: Record<string, unknown>;
  onUiStateChange?: (widgetId: string, value: unknown) => void;
  webUIPreferences?: WebUIPreferences;
  onWebUIPreferencesChange?: (patch: Partial<WebUIPreferences>) => void;
  onWebUIPreferencesReset?: () => void;
};

export type WidgetRendererProps = { widget: Widget; depth?: number } & WidgetHandlers;
export type WidgetRendererComponent = ComponentType<WidgetRendererProps>;

const COLOR_VAR: Record<string, string> = {
  orange: "var(--okuda-orange)",
  "golden-tanoi": "var(--okuda-golden)",
  "pale-canary": "var(--okuda-canary)",
  "neon-carrot": "var(--okuda-sunflower)",
  "atomic-tangerine": "var(--okuda-orange)",
  blue: "var(--okuda-blue)",
  anakiwa: "var(--okuda-blue)",
  mariner: "var(--okuda-mariner)",
  "bahama-blue": "var(--okuda-mariner)",
  lilac: "var(--okuda-lilac)",
  hopbush: "var(--okuda-hopbush)",
  eggplant: "var(--okuda-lilac)",
  red: "var(--okuda-red)",
  yellow: "var(--okuda-sunflower)",
  white: "var(--okuda-white)",
};

export const seriesColor = (color: LcarsColor | null | undefined, index: number): string => {
  if (typeof color === "string" && color.startsWith("#")) return color;
  if (typeof color === "string" && COLOR_VAR[color]) return COLOR_VAR[color];
  return ["var(--okuda-canary)", "var(--okuda-blue)", "var(--okuda-lilac)", "var(--okuda-hopbush)"][index % 4];
};

// Resolve a widget's declared color to a CSS value (named token or raw hex). In
// LCARS colour is role, so the DSL's color= must actually paint the widget — the
// renderer exposes it as --accent and the stylesheet falls back to a sane default.
export const accentVar = (color: LcarsColor | string | null | undefined): string | undefined => {
  if (typeof color !== "string" || color === "") return undefined;
  if (color.startsWith("#")) return color;
  return COLOR_VAR[color];
};

export const accentStyle = (color: LcarsColor | string | null | undefined): CSSProperties | undefined => {
  const resolved = accentVar(color);
  return resolved ? ({ "--accent": resolved } as CSSProperties) : undefined;
};
