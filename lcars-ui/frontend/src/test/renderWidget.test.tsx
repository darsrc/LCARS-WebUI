import { cleanup, screen } from "@testing-library/react";

import {
  WIDGET_CAPABILITIES,
  WIDGET_FIXTURES,
  WIDGET_TYPES,
} from "../types/widgetCatalog.generated";
import { makeWidget, renderWidget } from "./renderWidget";

afterEach(cleanup);

describe("shared widget render harness", () => {
  test("keeps the catalogue and fixture factory keyed by every generated widget type", () => {
    expect(Object.keys(WIDGET_CAPABILITIES).sort()).toEqual([...WIDGET_TYPES].sort());
    expect(Object.keys(WIDGET_FIXTURES).sort()).toEqual([...WIDGET_TYPES].sort());
    for (const type of WIDGET_TYPES) {
      expect(makeWidget(type).type).toBe(type);
    }
  });

  test("renders a generated fixture with one shared handler factory", () => {
    const result = renderWidget(makeWidget("text", { content: "Harness online" }));
    expect(screen.getByText("Harness online")).toBeInTheDocument();
    expect(result.handlers.onAction).toEqual(expect.any(Function));
    expect(result.handlers.logsByStream).toEqual({});
  });
});
