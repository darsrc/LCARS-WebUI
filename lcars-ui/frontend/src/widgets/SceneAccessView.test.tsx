import { fireEvent, render, screen, within } from "@testing-library/react";
import type { SceneWidget } from "../types/contract";
import { WidgetRenderer } from "./WidgetRenderer";

const scene: SceneWidget = {
  id: "scene",
  type: "scene",
  initial_mode: "inspect",
  modes: [
    {
      id: "inspect",
      label: "INSPECT",
      focal: ["sample"],
      required: ["commands", "sample"],
      optional: ["notes"],
    },
    { id: "edit", label: "EDIT", focal: ["notes"], required: ["notes"] },
  ],
  regions: [
    { id: "commands", type: "scene_region", label: "SAMPLE COMMANDS", role: "commands" },
    { id: "notes", type: "scene_region", label: "NOTES" },
    {
      id: "sample",
      type: "scene_region",
      label: "SAMPLE A",
      children: [{ id: "child", type: "text", content: "Sample content", size: "body" }],
    },
    { id: "hidden", type: "scene_region", label: "HIDDEN" },
  ],
  relations: [{ id: "controls", kind: "controls", source: "commands", target: "sample" }],
};
const handlers = { logsByStream: {}, onAction: vi.fn(), onFormSubmit: vi.fn(), onInput: vi.fn() };

test("renders ordered current mode regions, relationships and accessible headings", () => {
  const { rerender } = render(<WidgetRenderer widget={scene} {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: "LINEAR VIEW" }));
  const root = screen.getByRole("region", { name: "INSPECT" });
  expect(root).toHaveAttribute("data-scene-id", "scene");
  expect(root).toHaveAttribute("data-scene-mode", "inspect");
  expect(within(root).getByRole("heading", { level: 2 })).toHaveTextContent("INSPECT");
  const regions = within(root).getAllByRole("region");
  expect(regions.map((region) => region.getAttribute("data-region-id"))).toEqual([
    "sample",
    "commands",
    "notes",
  ]);
  for (const region of regions) {
    const heading = within(region).getByRole("heading", { level: 3 });
    expect(region).toHaveAttribute("aria-labelledby", heading.id);
  }
  expect(regions[1]).toHaveAttribute("data-region-role", "commands");
  expect(within(regions[0]).getByText("Sample content")).toBeInTheDocument();
  expect(within(regions[1]).getByText("SAMPLE COMMANDS controls SAMPLE A")).toBeInTheDocument();
  expect(within(root).queryByText("HIDDEN")).not.toBeInTheDocument();
  rerender(<WidgetRenderer widget={{ ...scene, mode: "edit" }} {...handlers} />);
  expect(screen.getByRole("region", { name: "EDIT" })).toHaveAttribute("data-scene-mode", "edit");
  expect(screen.queryByRole("heading", { name: "SAMPLE A" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "NOTES" })).toBeInTheDocument();
});
