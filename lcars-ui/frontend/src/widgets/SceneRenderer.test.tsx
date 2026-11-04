import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import example from "../../../docs/v8/scene-example.json";
import type { SceneWidget } from "../types/contract";
import { SceneRenderer } from "./SceneRenderer";

const scene = example.widgets[0] as unknown as SceneWidget;
const handlers = { onAction: vi.fn(), logsByStream: {} };
class StubObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", StubObserver);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(80);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1920);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(1080);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("SceneRenderer", () => {
  it("mounts every region and renders the chosen geometry", () => {
    const { container } = render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    const root = container.querySelector(".lcars-scene")!;
    expect(root.getAttribute("data-scene-family")).toBe("wrap");
    expect(root.querySelectorAll(".lcars-scene-region")).toHaveLength(scene.regions.length);
    expect(root.querySelector('[data-region-id="sample-b"]')?.hasAttribute("hidden")).toBe(true);
    const svg = root.querySelector("svg.lcars-scene-geometry")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.classList.contains("lcars-scene-geometry")).toBe(true);
  });
  it("focuses folded terminals and returns to the prior mode", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(844);
    const { container } = render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    const root = container.querySelector(".lcars-scene")!;
    const terminal = root.querySelector<HTMLButtonElement>(
      "button.lcars-scene-terminal:not(:disabled)",
    )!;
    expect(terminal).not.toBeNull();
    fireEvent.click(terminal);
    expect(root.getAttribute("data-scene-family")).toBe("focus");
    fireEvent.click(screen.getByRole("button", { name: "BACK" }));
    expect(screen.queryByRole("button", { name: "BACK" })).toBeNull();
  });
  it("re-solves on mode changes without replacing input nodes and offers linear view", () => {
    const { container, rerender } = render(
      <SceneRenderer widget={scene} depth={0} handlers={handlers} />,
    );
    const root = container.querySelector(".lcars-scene")!;
    const input = container.querySelector('[data-region-id="notes-a"] input');
    expect(input).not.toBeNull();
    rerender(
      <SceneRenderer widget={{ ...scene, mode: "compare" }} depth={0} handlers={handlers} />,
    );
    expect(root.getAttribute("data-scene-family")).toBe("fork");
    expect(container.querySelector('[data-region-id="notes-a"] input')).toBe(input);
    fireEvent.click(screen.getByRole("button", { name: "LINEAR VIEW" }));
    expect(container.querySelector(".lcars-scene-access")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "SPATIAL VIEW" }));
    expect(container.querySelector(".lcars-scene-access")).toBeNull();
  });
});
