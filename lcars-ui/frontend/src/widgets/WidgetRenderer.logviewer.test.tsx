import { fireEvent, render } from "@testing-library/react";

import type { LogViewerWidget } from "../types/contract";
import { WidgetRenderer, type WidgetHandlers } from "./WidgetRenderer";

const baseHandlers: WidgetHandlers = {
  onAction: vi.fn(),
  onInput: vi.fn(),
  onFormSubmit: vi.fn(),
  logsByStream: {},
};

function makeWidget(autoScroll: boolean): LogViewerWidget {
  return {
    id: "log",
    type: "log_viewer",
    stream_id: "ops",
    max_lines: 1000,
    auto_scroll: autoScroll,
  };
}

describe("LogViewerControl auto-scroll", () => {
  test("follows new lines when already scrolled to the bottom", () => {
    const { container, rerender } = render(
      <WidgetRenderer widget={makeWidget(true)} {...baseHandlers} logsByStream={{ ops: ["line1"] }} />
    );
    const el = container.querySelector(".lcars-log") as HTMLDivElement;
    Object.defineProperty(el, "scrollHeight", { value: 100, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
    el.scrollTop = 0;
    fireEvent.scroll(el);

    Object.defineProperty(el, "scrollHeight", { value: 200, configurable: true });
    rerender(<WidgetRenderer widget={makeWidget(true)} {...baseHandlers} logsByStream={{ ops: ["line1", "line2"] }} />);

    expect(el.scrollTop).toBe(200);
  });

  test("does not yank a reader back down who scrolled up to read history", () => {
    const { container, rerender } = render(
      <WidgetRenderer widget={makeWidget(true)} {...baseHandlers} logsByStream={{ ops: ["line1"] }} />
    );
    const el = container.querySelector(".lcars-log") as HTMLDivElement;
    Object.defineProperty(el, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
    el.scrollTop = 50;
    fireEvent.scroll(el);

    rerender(<WidgetRenderer widget={makeWidget(true)} {...baseHandlers} logsByStream={{ ops: ["line1", "line2"] }} />);

    expect(el.scrollTop).toBe(50);
  });

  test("never forces scroll when auto_scroll is false", () => {
    const { container, rerender } = render(
      <WidgetRenderer widget={makeWidget(false)} {...baseHandlers} logsByStream={{ ops: ["line1"] }} />
    );
    const el = container.querySelector(".lcars-log") as HTMLDivElement;
    Object.defineProperty(el, "scrollHeight", { value: 100, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
    el.scrollTop = 0;
    fireEvent.scroll(el);

    Object.defineProperty(el, "scrollHeight", { value: 300, configurable: true });
    rerender(<WidgetRenderer widget={makeWidget(false)} {...baseHandlers} logsByStream={{ ops: ["line1", "line2"] }} />);

    expect(el.scrollTop).toBe(0);
  });
});
