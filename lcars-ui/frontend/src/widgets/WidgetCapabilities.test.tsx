import { cleanup } from "@testing-library/react";

import type { Widget } from "../types/contract";
import {
  WIDGET_CAPABILITIES,
  WIDGET_FIXTURES,
  WIDGET_TYPES,
  type WidgetCapability,
  type WidgetType,
} from "../types/widgetCatalog.generated";
import { makeWidget, renderWidget, withWidgetOptions } from "../test/renderWidget";

type GapLedger = Partial<Record<WidgetType, string>>;

const EXPECTED_FAILURES: Record<WidgetCapability, GapLedger> = {
  accent: {},
  scrollable: {},
  copyable: {},
  feedback: {},
  busy: {},
};

const capabilityTypes = (capability: WidgetCapability): WidgetType[] =>
  WIDGET_TYPES.filter((type) =>
    (WIDGET_CAPABILITIES[type] as readonly WidgetCapability[]).includes(capability),
  );

const observedGaps = (
  capability: WidgetCapability,
  conforms: (type: WidgetType) => boolean,
): WidgetType[] => {
  const gaps: WidgetType[] = [];
  for (const type of capabilityTypes(capability)) {
    try {
      if (!conforms(type)) gaps.push(type);
    } catch {
      gaps.push(type);
    } finally {
      cleanup();
    }
  }
  return gaps;
};

const expectedGapTypes = (capability: WidgetCapability): WidgetType[] =>
  capabilityTypes(capability).filter((type) => EXPECTED_FAILURES[capability][type]);

const registerCapabilityConformance = (
  capability: WidgetCapability,
  conforms: (type: WidgetType) => boolean,
) => {
  test(`${capability}: every catalogue member matches the documented gap ledger`, () => {
    expect(observedGaps(capability, conforms)).toEqual(expectedGapTypes(capability));
  });

  const gaps = expectedGapTypes(capability);
  if (gaps.length > 0) {
    const reason = gaps
      .map((type) => `${type}: ${EXPECTED_FAILURES[capability][type]}`)
      .join("; ");
    test.fails(`${capability} expected failures — ${reason}`, () => {
      expect(observedGaps(capability, conforms)).toEqual([]);
    });
  }
};

const accentWidget = (type: WidgetType): Widget => {
  const child = makeWidget("text", { content: "accent child" });
  if (type === "lcars_box" || type === "lcars_sweep" || type === "lcars_bracket") {
    return makeWidget(type, { children: [child], color: "#123456" });
  }
  return makeWidget(type, { color: "#123456" });
};

const conformsToAccent = (type: WidgetType): boolean => {
  const widget = accentWidget(type);
  const result = type === "surface_region"
    ? renderWidget(makeWidget("surface", { children: [widget] }))
    : renderWidget(widget);
  return [...result.baseElement.querySelectorAll<HTMLElement>("[style]")].some(
    (element) => element.style.getPropertyValue("--accent") === "#123456",
  );
};

const conformsToScroll = (type: WidgetType): boolean => {
  const widget = withWidgetOptions(makeWidget(type), { max_height: 240 });
  const result = renderWidget(widget);
  return [...result.baseElement.querySelectorAll<HTMLElement>("[style]")].some(
    (element) => element.style.maxHeight === "240px" && element.style.overflow === "auto",
  );
};

const copyWidget = (type: WidgetType): Widget => {
  switch (type) {
    case "text":
      return withWidgetOptions(makeWidget("text", { content: "copy me" }), { copyable: true });
    case "markdown":
      return withWidgetOptions(
        makeWidget("markdown", { content: "```text\ncopy me\n```" }),
        { copy_code: true },
      );
    case "table":
      return withWidgetOptions(makeWidget("table", {
        headers: ["Value"],
        rows: [{ id: "copy-row", cells: [{ value: "copy me", copyable: true }] }],
      }));
    case "log_viewer":
      return withWidgetOptions(makeWidget("log_viewer"), { toolbar: true });
    default:
      return makeWidget(type);
  }
};

const conformsToCopy = (type: WidgetType): boolean => {
  const widget = copyWidget(type);
  const logsByStream = widget.type === "log_viewer"
    ? { [widget.stream_id]: ["copy me"] }
    : {};
  const result = renderWidget(widget, { logsByStream });
  const hasCopyControl = [...result.baseElement.querySelectorAll("button")].some((button) =>
    `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`
      .toLowerCase()
      .includes("copy"),
  );
  const hasLiveStatus = Boolean(
    result.baseElement.querySelector('.lcars-visually-hidden[aria-live="polite"]'),
  );
  return hasCopyControl && hasLiveStatus;
};

const conformsToFeedback = (type: WidgetType): boolean => {
  const empty = withWidgetOptions(makeWidget(type), {
    feedback: { state: "empty", message: "Shared empty fixture" },
  });
  const emptyResult = renderWidget(empty);
  const emptyState = emptyResult.baseElement.querySelector(
    '.lcars-widget-feedback[data-state="empty"][role="status"]',
  );
  cleanup();

  const error = withWidgetOptions(makeWidget(type), {
    feedback: { state: "error", message: "Shared error fixture" },
  });
  const errorResult = renderWidget(error);
  const errorState = errorResult.baseElement.querySelector(
    '.lcars-widget-feedback[data-state="error"][role="alert"][aria-live="assertive"]',
  );
  return Boolean(emptyState && errorState);
};

const conformsToBusy = (type: WidgetType): boolean => {
  const widget = makeWidget(type);
  const actionId = (widget as Widget & { action_id?: string }).action_id ?? widget.id;
  const result = renderWidget(widget, { actionStatus: { [actionId]: "pending" } });
  return Boolean(result.baseElement.querySelector('[data-action-status="pending"]'));
};

describe("widget capability catalogue conformance", () => {
  test("ratchet: every generated union type has catalogue data and a fixture", () => {
    expect(Object.keys(WIDGET_CAPABILITIES).sort()).toEqual([...WIDGET_TYPES].sort());
    expect(Object.keys(WIDGET_FIXTURES).sort()).toEqual([...WIDGET_TYPES].sort());
  });

  registerCapabilityConformance("accent", conformsToAccent);
  registerCapabilityConformance("scrollable", conformsToScroll);
  registerCapabilityConformance("copyable", conformsToCopy);
  registerCapabilityConformance("feedback", conformsToFeedback);
  registerCapabilityConformance("busy", conformsToBusy);

  test("text max_lines keeps its hiding clamp when combined with a height cap", () => {
    const widget = withWidgetOptions(makeWidget("text", { content: "one\ntwo\nthree" }), {
      max_height: 240,
      max_lines: 2,
      overflow: "visible",
    });
    const result = renderWidget(widget);
    const text = result.baseElement.querySelector<HTMLElement>(".lcars-text--enhanced");

    expect(text).toHaveStyle({
      maxHeight: "240px",
      overflow: "hidden",
      WebkitLineClamp: "2",
    });
  });
});
