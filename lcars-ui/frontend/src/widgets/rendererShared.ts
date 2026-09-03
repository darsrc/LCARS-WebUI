import {
  createElement,
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type CSSProperties,
} from "react";

import type { KeyBinding, LcarsColor, ScrollOptions, TableRow, ThemeDefinition, ValueFormat, Widget } from "../types/contract";
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
  themeCatalog?: ThemeDefinition[];
  keyBindings?: KeyBinding[];
  onWebUIPreferencesChange?: (patch: Partial<WebUIPreferences>) => void;
  onWebUIPreferencesReset?: () => void;
};

export type WidgetRendererProps = { widget: Widget; depth?: number } & WidgetHandlers;
export type WidgetRendererComponent = ComponentType<WidgetRendererProps>;

export const AUTO_SEGMENT_OPTION_LIMIT = 8;

export const formatValue = (value: number, format?: ValueFormat | null): string => {
  if (!format) return String(value);
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: format.precision ?? 12,
    minimumFractionDigits: format.precision ?? 0,
    useGrouping: format.thousands,
    notation: format.compact ? "compact" : "standard",
  }).format(value);
  return `${format.prefix}${formatted}${format.suffix}`;
};

export const tableCellValue = (cell: TableRow["cells"][number]): string | number | boolean | null => {
  if (typeof cell === "object" && cell !== null) {
    return cell.value ?? null;
  }
  return cell;
};

export const tableCellDisplay = (
  cell: TableRow["cells"][number],
  format?: ValueFormat | null,
): string => {
  if (typeof cell === "object" && cell !== null && cell.display != null) {
    return cell.display;
  }
  const value = tableCellValue(cell);
  if (typeof value === "number" && format) return formatValue(value, format);
  if (value === null) return "";
  return String(value);
};

export const safeHref = (href: string): string | null => {
  const trimmed = href.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?") ||
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
};

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

// ---------------------------------------------------------------------------
// Scroll: one container, one height policy, shared by every capability that
// bounds a data region — table, log viewer, and the chart family. The
// contract's `ScrollOptions` mixin (`widgets/options.py`) types `max_height`
// on every options class where scrolling is meaningful, so each renderer can
// pass its own typed `widget.options?.max_height` directly to this primitive.
// ---------------------------------------------------------------------------

/** Matches the log viewer's previous hard-coded CSS cap — the one widget whose
 * legacy behaviour was already an explicit height rather than "grow to fit". */
export const DEFAULT_SCROLL_MAX_HEIGHT = 520;

export type ScrollBoxProps = {
  /** null/undefined => uncapped: the element keeps whatever height its own
   * stylesheet rule already gives it (table's unbounded auto-scroll, a
   * chart's fixed SVG/canvas height). Only a real value imposes a JS-driven
   * max-height + overflow:auto, so widgets that never had a cap keep not
   * having one until a caller opts in. */
  maxHeight?: number | string | null;
  /** Unset preserves the primitive's existing `auto` behavior whenever a
   * height cap is present. */
  overflow?: ScrollOptions["overflow"];
} & Omit<ComponentPropsWithoutRef<"div">, "style">;

/** The one place that turns a height policy into `max-height` + `overflow:
 * auto`. Every scrollable widget renders its scrolling region through this so
 * the policy — and the inline style a screen reader / test / future DSL
 * option can rely on — lives in exactly one place instead of eight. */
// This module stays plain .ts (not .tsx) because a Python consistency check
// (tests/unit/test_phase11_colors.py) reads COLOR_VAR out of this exact file
// by path — so the handful of components below build elements with
// createElement instead of JSX.
export const ScrollBox = forwardRef<HTMLDivElement, ScrollBoxProps>(function ScrollBox(
  { maxHeight, overflow, children, ...rest },
  ref,
) {
  const style: CSSProperties | undefined =
    maxHeight != null ? { maxHeight, overflow: overflow ?? "auto" } : undefined;
  return createElement("div", { ...rest, ref, style }, children);
});

/** Pixels of slack still counted as "at the bottom" — a reader glued to the
 * live edge of a stream shouldn't be knocked out of follow mode by a
 * sub-pixel rounding difference. */
export const STICK_TO_BOTTOM_THRESHOLD_PX = 24;

export const isStuckToBottom = (el: HTMLElement): boolean =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_TO_BOTTOM_THRESHOLD_PX;

// Generic "stick to bottom" behavior for any scrollable element whose content
// grows live (currently just the log viewer, but written so any future
// scrollable, server-updated text region can opt in the same way): follow new
// content only while the reader is already at the bottom; scrolling up to
// read history suspends following until they scroll back down themselves.
export function useStickToBottom<T extends HTMLElement>(enabled: boolean, dependency: unknown) {
  const ref = useRef<T>(null);
  const stuckRef = useRef(true);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    stuckRef.current = isStuckToBottom(el);
  };

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || !stuckRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [dependency, enabled]);

  return { ref, handleScroll };
}

// ---------------------------------------------------------------------------
// Copy: one clipboard state machine, one aria-live announcer, shared by every
// widget that offers a copy control — table cells, plain text, markdown code
// fences, and the log viewer toolbar. A copy button that gives no
// confirmation is the actual accessibility defect this replaces.
// ---------------------------------------------------------------------------

export type CopyStatus = "idle" | "ok" | "err";

/** Clipboard write with transient success/error feedback; graceful on
 * failure. Resolves to whether the write succeeded, so a caller that needs
 * its own local feedback (markdown's per-<pre> buttons) can react to the
 * same write this hook already performed, instead of writing twice. */
export function useClipboard(): { status: CopyStatus; copy: (text: string) => Promise<boolean> } {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copy = useCallback(async (text: string) => {
    let ok = true;
    try {
      await navigator.clipboard?.writeText(text);
      setStatus("ok");
    } catch {
      ok = false;
      setStatus("err");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 1600);
    return ok;
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { status, copy };
}

/** Screen-reader-only announcement of a copy's outcome. Visual feedback (a
 * button's own label swap, a ring color) is welcome on top of this, but this
 * is the part that makes the control accessible rather than merely legible. */
export function CopyLiveRegion({ status }: { status: CopyStatus }) {
  return createElement(
    "span",
    { "aria-live": "polite", className: "lcars-visually-hidden" },
    status === "ok" ? "Copied to clipboard" : status === "err" ? "Copy failed" : "",
  );
}

/** A standalone COPY button that can sit beside a link, value, or block of
 * text. `label` is the human-readable subject named in the accessible name
 * ("Copy acme/widget", "Copy text"); it defaults to `value` itself so table's
 * per-cell usage keeps naming the exact value being copied. */
export function CopyButton({
  value,
  label,
  className = "lcars-table-copy",
  disabled,
}: {
  value: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { status, copy } = useClipboard();
  const subject = label ?? value;
  const accessibleName = status === "ok" ? `Copied ${subject}` : `Copy ${subject}`;
  return createElement(
    Fragment,
    null,
    createElement(
      "button",
      {
        "aria-label": accessibleName,
        className,
        "data-state": status,
        disabled,
        onClick: () => void copy(value),
        title: status === "ok" ? "Copied" : `Copy ${subject}`,
        type: "button",
      },
      status === "ok" ? "COPIED" : status === "err" ? "ERROR" : "COPY",
    ),
    createElement(CopyLiveRegion, { status }),
  );
}

/** The cell body itself acts as the copy target (copy_on_click). */
export function CopyText({
  value,
  display,
  disabled,
}: {
  value: string;
  display: string;
  disabled?: boolean;
}) {
  const { status, copy } = useClipboard();
  return createElement(
    "button",
    {
      "aria-label": status === "ok" ? `Copied ${value}` : `Copy ${value}`,
      className: "lcars-table-copytext",
      "data-state": status,
      disabled,
      onClick: () => void copy(value),
      title: `Copy ${value}`,
      type: "button",
    },
    display,
    createElement(CopyLiveRegion, { status }),
  );
}
