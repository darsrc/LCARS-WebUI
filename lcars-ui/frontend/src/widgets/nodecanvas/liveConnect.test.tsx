import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { GraphDocument, NodeCanvasWidget, NodeTemplate } from "../../types/contract";
import { NodeCanvas } from "./NodeCanvas";
import { emptyDocument } from "./graph";

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    Background: () => null,
    Handle: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => <span aria-label={ariaLabel} />,
    MiniMap: () => <div data-testid="minimap" />,
    ReactFlow: ({ children, onConnect }: {
      children: React.ReactNode;
      onConnect: (connection: {
        source: string;
        sourceHandle: string;
        target: string;
        targetHandle: string;
      }) => void;
    }) => (
      <div>
        <button
          onClick={() => onConnect({
            source: "source",
            sourceHandle: "out",
            target: "target",
            targetHandle: "in",
          })}
          type="button"
        >
          SIMULATE CONNECT
        </button>
        {children}
      </div>
    ),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReactFlow: () => ({ fitView: vi.fn() }),
  };
});

const template = (overrides: Partial<NodeTemplate> & { id: string }): NodeTemplate => ({
  label: null,
  category: null,
  color: null,
  inputs: [],
  outputs: [],
  fields: [],
  ...overrides,
});

const document = (): GraphDocument => ({
  ...emptyDocument(),
  version: 2,
  layers: [
    {
      id: "primary",
      label: "Primary",
      token: "P",
      color: null,
      pattern: "solid",
      marker: "arrow_closed",
      default_visible: true,
      default_emphasized: false,
      label_zoom_threshold: 0.65,
      description: null,
    },
    {
      id: "secondary",
      label: "Secondary",
      token: "S",
      color: null,
      pattern: "dashed",
      marker: "arrow_open",
      default_visible: true,
      default_emphasized: false,
      label_zoom_threshold: 0.65,
      description: null,
    },
  ],
  templates: [
    template({ id: "source", outputs: [{ id: "out", label: "Out", type: "link", capacity: null }] }),
    template({ id: "target", inputs: [{ id: "in", label: "In", type: "link", capacity: null }] }),
  ],
  nodes: [
    { id: "source", template: "source", position: [0, 0], values: {}, label: null, group: null },
    { id: "target", template: "target", position: [200, 0], values: {}, label: null, group: null },
  ],
});

test("a v2 live connection remains pending until the user chooses its layer", async () => {
  const user = userEvent.setup();
  const onUiStateChange = vi.fn();
  const widget: NodeCanvasWidget = { id: "graph", type: "node_canvas", document: document() };

  render(
    <NodeCanvas
      handlers={{ onAction: vi.fn(), onUiStateChange }}
      label="Layered graph"
      widget={widget}
    />,
  );

  await user.click(screen.getByRole("button", { name: "SIMULATE CONNECT" }));

  expect(screen.getByRole("region", { name: "Choose edge layer" })).toBeInTheDocument();
  expect(onUiStateChange).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Secondary" }));

  const state = onUiStateChange.mock.calls.at(-1)?.[1];
  expect(state.last_event).toBe("connect");
  expect(state.document.edges).toHaveLength(1);
  expect(state.document.edges[0].layer).toBe("secondary");
});
