import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import example from "../../../docs/v8/scene-example.json";
import * as chooseModule from "../compose/scene/choose";
import * as pinsModule from "../compose/scene/pins";
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
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("SceneRenderer", () => {
  it("mounts every region and renders the chosen geometry", () => {
    const { container } = render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    const root = container.querySelector(".lcars-scene")!;
    expect(root.getAttribute("data-scene-family")).toBe("wrap");
    expect(root.getAttribute("data-scene-orientation")).toBeTruthy();
    expect(root.getAttribute("data-scene-explanation")).toBeTruthy();
    expect(root.querySelectorAll(".lcars-scene-region")).toHaveLength(scene.regions.length);
    expect(root.querySelector('[data-region-id="sample-b"]')?.hasAttribute("hidden")).toBe(true);
    const svg = root.querySelector("svg.lcars-scene-geometry")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.classList.contains("lcars-scene-geometry")).toBe(true);
    expect(
      root.querySelector('[data-region-id="sample-a"] .lcars-scene-content--fill .lcars-chart'),
    ).not.toBeNull();
    const terminals = root.querySelectorAll(".lcars-scene-terminal");
    expect(terminals.length).toBeGreaterThan(0);
    for (const terminal of terminals) {
      expect(terminal.className).toMatch(/--tone-(frame|relation|commands)/);
      expect(terminal.className).not.toMatch(/grey|gray/);
    }
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
    fireEvent.click(screen.getByRole("button", { name: /^Back to / }));
    expect(screen.queryByRole("button", { name: /^Back to / })).toBeNull();
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
    expect(root.getAttribute("data-scene-view")).toBe("linear");
    fireEvent.click(screen.getByRole("button", { name: "SPATIAL VIEW" }));
    expect(root.getAttribute("data-scene-view")).toBe("spatial");
  });
  it("returns through nested subjects and focuses their opening terminals", () => {
    const chooseLayout = chooseModule.chooseLayout;
    vi.spyOn(chooseModule, "chooseLayout").mockImplementation((widget, modeId, ...args) => {
      const result = chooseLayout(widget, modeId, ...args);
      if (!result) return result;
      const subject = widget.modes.find((mode) => mode.id === modeId)?.focal[0];
      const nextRegion = subject === "sample-a" ? "notes-a" : "sample-a";
      return {
        ...result,
        terminals: [
          {
            id: `open-${nextRegion}`,
            label: `Open ${nextRegion}`,
            kind: "folded-region",
            regionId: nextRegion,
            rect: { x: 0, y: 0, w: 44, h: 44 },
          },
        ],
      };
    });
    const { container } = render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    const root = container.querySelector(".lcars-scene")!;
    fireEvent.click(screen.getByRole("button", { name: "Open notes-a" }));
    expect(root).toHaveAttribute("data-scene-subject", "notes-a");
    fireEvent.click(screen.getByRole("button", { name: "Open sample-a" }));
    expect(root).toHaveAttribute("data-scene-subject", "sample-a");
    fireEvent.click(screen.getByRole("button", { name: "Back to FIELD NOTES" }));
    expect(root).toHaveAttribute("data-scene-subject", "notes-a");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open sample-a" }));
  });
  it("keeps input nodes and exposes every region and relation in linear view", () => {
    const { container } = render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    const input = container.querySelector<HTMLInputElement>('[data-region-id="notes-a"] input')!;
    input.id = "draft-test-input";
    fireEvent.change(input, { target: { value: "draft" } });
    fireEvent.click(screen.getByRole("button", { name: "LINEAR VIEW" }));
    expect(container.querySelector('[data-region-id="notes-a"] input')).toBe(input);
    expect(input.value).toBe("draft");
    expect(document.querySelectorAll("#draft-test-input")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "OTHER REGIONS" })).toBeInTheDocument();
    expect(container.querySelector('[data-region-id="sample-b"]')).not.toHaveAttribute("hidden");
    const relation = container.querySelector<HTMLElement>(".lcars-scene-relations")!;
    expect(relation.textContent).toBeTruthy();
    expect(relation.closest("section")).toHaveAttribute("aria-describedby", relation.id);
  });
  it("starts in linear view from the hash", () => {
    history.replaceState(null, "", "#scene-view=linear");
    const { container } = render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    expect(container.querySelector(".lcars-scene")).toHaveAttribute("data-scene-view", "linear");
    expect(screen.getByRole("button", { name: "SPATIAL VIEW" })).toBeInTheDocument();
  });
  it("defers a server mode change while a region is focused and commits a user change", () => {
    const { container, rerender } = render(
      <SceneRenderer widget={scene} depth={0} handlers={handlers} />,
    );
    const root = container.querySelector(".lcars-scene")!;
    const input = container.querySelector<HTMLInputElement>('[data-region-id="notes-a"] input')!;
    input.focus();
    rerender(
      <SceneRenderer
        widget={{ ...scene, mode: "compare", mode_reason: "server" }}
        depth={0}
        handlers={handlers}
      />,
    );
    expect(document.activeElement).toBe(input);
    expect(input.closest("section")?.hidden).toBe(false);
    expect(root.getAttribute("data-scene-pending")).toBe("true");
    rerender(
      <SceneRenderer
        widget={{ ...scene, mode: scene.initial_mode, mode_reason: "user" }}
        depth={0}
        handlers={handlers}
      />,
    );
    expect(root.getAttribute("data-scene-pending")).toBeNull();
  });
  it("opens layout controls and returns focus on Escape", () => {
    render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    const toggle = screen.getByRole("button", { name: "LAYOUT" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const stable = screen.getByRole("button", { name: "STABLE LAYOUT" });
    stable.focus();
    fireEvent.keyDown(stable, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Layout controls" })).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
  it("persists controls and resets them", () => {
    const applyPins = vi.spyOn(pinsModule, "applyPins");
    render(<SceneRenderer widget={scene} depth={0} handlers={handlers} />);
    fireEvent.click(screen.getByRole("button", { name: "LAYOUT" }));
    fireEvent.click(screen.getByRole("button", { name: "STABLE LAYOUT" }));
    expect(localStorage.getItem(`lcars.scene.${scene.id}.stable`)).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "FIELD NOTES" }));
    expect(localStorage.getItem(`lcars.scene.${scene.id}.pins`)).toBe('["notes-a"]');
    expect(applyPins).toHaveBeenCalledWith(scene, new Set(["notes-a"]));
    expect(screen.getByRole("button", { name: "FIELD NOTES" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "RESET" }));
    expect(localStorage.getItem(`lcars.scene.${scene.id}.pins`)).toBeNull();
    expect(localStorage.getItem(`lcars.scene.${scene.id}.stable`)).toBeNull();
  });
});
