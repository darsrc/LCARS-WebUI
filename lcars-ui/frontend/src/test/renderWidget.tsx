import { render, type RenderResult } from "@testing-library/react";
import { vi } from "vitest";

import type { Widget } from "../types/contract";
import {
  WIDGET_FIXTURES,
  WIDGET_OPTION_DEFAULTS,
  WIDGET_OPTION_FIELDS,
  type WidgetType,
} from "../types/widgetCatalog.generated";
import { WidgetRenderer, type WidgetHandlers } from "../widgets/WidgetRenderer";

type JsonObject = Record<string, unknown>;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const merge = (base: JsonObject, overrides: JsonObject): JsonObject => {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key];
    result[key] =
      current && value && typeof current === "object" && typeof value === "object"
      && !Array.isArray(current) && !Array.isArray(value)
        ? merge(current as JsonObject, value as JsonObject)
        : value;
  }
  return result;
};

export const makeWidget = <Type extends WidgetType>(
  type: Type,
  overrides: JsonObject = {},
): Extract<Widget, { type: Type }> =>
  merge(clone(WIDGET_FIXTURES[type]) as unknown as JsonObject, overrides) as unknown as Extract<
    Widget,
    { type: Type }
  >;

export const withWidgetOptions = (
  widget: Widget,
  overrides: JsonObject = {},
): Widget => {
  const type = widget.type as WidgetType;
  const field = WIDGET_OPTION_FIELDS[type as keyof typeof WIDGET_OPTION_FIELDS];
  const defaults = WIDGET_OPTION_DEFAULTS[type as keyof typeof WIDGET_OPTION_DEFAULTS];
  if (!field || !defaults) {
    throw new Error(`${widget.type} has no generated capability-options model`);
  }
  return merge(clone(widget) as unknown as JsonObject, {
    [field]: merge(clone(defaults) as JsonObject, overrides),
  }) as unknown as Widget;
};

export const makeWidgetHandlers = (
  overrides: Partial<WidgetHandlers> = {},
): WidgetHandlers => ({
  logsByStream: {},
  onAction: vi.fn(),
  onAudioUpload: vi.fn().mockResolvedValue(undefined),
  onFileUpload: vi.fn().mockResolvedValue(undefined),
  onFormSubmit: vi.fn(),
  onInput: vi.fn(),
  onUiStateChange: vi.fn(),
  onWebUIPreferencesChange: vi.fn(),
  onWebUIPreferencesReset: vi.fn(),
  ...overrides,
});

export const renderWidget = (
  widget: Widget,
  overrides: Partial<WidgetHandlers> = {},
): RenderResult & { handlers: WidgetHandlers } => {
  const handlers = makeWidgetHandlers(overrides);
  return {
    ...render(<WidgetRenderer widget={widget} {...handlers} />),
    handlers,
  };
};
