import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { GraphDocument, NodeCanvasWidget, NodeTemplate } from "../../types/contract";
import { NodeCanvas } from "./NodeCanvas";
import { emptyDocument } from "./graph";

// React Flow measures the viewport; jsdom reports zero for everything and has
// neither observer. None of that changes what is under test here, which is the
// LCARS node bodies and when the canvas talks to Python.
class StubObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
vi.stubGlobal("ResizeObserver", StubObserver);
vi.stubGlobal("IntersectionObserver", StubObserver);
vi.stubGlobal("DOMMatrixReadOnly", class {});

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
  templates: [
    template({ id: "source", label: "Source", outputs: [{ id: "out", label: "Out", type: "num", capacity: null }] }),
    template({
      id: "sink",
      label: "Sink",
      inputs: [{ id: "in", label: "In", type: "num", capacity: null }],
      fields: [
        { id: "gain", label: "Gain", kind: "number", default: 1, options: [] },
        {
          id: "mode",
          label: "Mode",
          kind: "select",
          default: "fast",
          options: [
            { value: "fast", label: "Fast" },
            { value: "slow", label: "Slow" },
          ],
        },
      ],
    }),
  ],
  nodes: [
    { id: "n1", template: "source", position: [0, 0], values: {}, label: null, group: null },
    {
      id: "n2",
      template: "sink",
      position: [240, 0],
      values: { gain: 1, mode: "fast" },
      label: null,
      group: null,
    },
  ],
});

const widget = (overrides: Partial<NodeCanvasWidget> = {}): NodeCanvasWidget => ({
  id: "graph",
  type: "node_canvas",
  document: document(),
  ...overrides,
});

const serverOptions = {
  interaction: { mode: "server", action_id: "graph-changed" },
} as NodeCanvasWidget["options"];

let handlers: { onAction: ReturnType<typeof vi.fn>; onUiStateChange: ReturnType<typeof vi.fn> };

beforeEach(() => {
  handlers = { onAction: vi.fn(), onUiStateChange: vi.fn() };
});

describe("NodeCanvas", () => {
  test("renders a node per graph node, titled from its template", () => {
    render(<NodeCanvas handlers={handlers} label="Pipeline" widget={widget()} />);

    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Sink")).toBeInTheDocument();
  });

  test("renders declared ports and typed fields", () => {
    render(<NodeCanvas handlers={handlers} label="Pipeline" widget={widget()} />);

    expect(screen.getByText("Out")).toBeInTheDocument();
    expect(screen.getByText("In")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fast")).toBeInTheDocument();
  });

  test("a per-instance label overrides the template's", () => {
    const custom = document();
    custom.nodes[0].label = "Sensor Feed";

    render(<NodeCanvas handlers={handlers} label="Pipeline" widget={widget({ document: custom })} />);

    expect(screen.getByText("Sensor Feed")).toBeInTheDocument();
    expect(screen.queryByText("Source")).not.toBeInTheDocument();
  });

  test("typing in a field does not emit until it commits", async () => {
    const user = userEvent.setup();
    render(
      <NodeCanvas
        handlers={handlers}
        label="Pipeline"
        widget={widget({ options: serverOptions })}
      />,
    );

    const field = screen.getByDisplayValue("1");
    await user.clear(field);
    await user.type(field, "42");

    expect(handlers.onAction).not.toHaveBeenCalled();

    await user.tab();

    expect(handlers.onAction).toHaveBeenCalledOnce();
    const [actionId, payload] = handlers.onAction.mock.calls[0];
    expect(actionId).toBe("graph-changed");
    expect(payload.kind).toBe("field");
    expect(payload.state.document.nodes[1].values.gain).toBe(42);
  });

  test("a select commits immediately, since it has no intermediate state", async () => {
    const user = userEvent.setup();
    render(
      <NodeCanvas
        handlers={handlers}
        label="Pipeline"
        widget={widget({ options: serverOptions })}
      />,
    );

    await user.selectOptions(screen.getByDisplayValue("Fast"), "slow");

    expect(handlers.onAction).toHaveBeenCalledOnce();
    expect(handlers.onAction.mock.calls[0][1].state.document.nodes[1].values.mode).toBe("slow");
  });

  test("a local-only canvas tracks ui state but never calls Python", async () => {
    const user = userEvent.setup();
    render(<NodeCanvas handlers={handlers} label="Pipeline" widget={widget()} />);

    await user.selectOptions(screen.getByDisplayValue("Fast"), "slow");

    expect(handlers.onAction).not.toHaveBeenCalled();
    expect(handlers.onUiStateChange).toHaveBeenCalled();
  });

  test("a read-only canvas disables its fields", () => {
    render(
      <NodeCanvas
        handlers={handlers}
        label="Pipeline"
        widget={widget({ options: { editable: false } as NodeCanvasWidget["options"] })}
      />,
    );

    expect(screen.getByDisplayValue("1")).toBeDisabled();
  });

  test("shows per-node execution status without touching the document", () => {
    render(
      <NodeCanvas
        handlers={handlers}
        label="Pipeline"
        widget={widget({
          execution: {
            status: "running",
            nodes: { n2: { status: "error", progress: null, message: "divide by zero" } },
          },
        })}
      />,
    );

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(screen.getByText("divide by zero")).toBeInTheDocument();
    expect(handlers.onAction).not.toHaveBeenCalled();
  });

  test("run/queue/cancel appear only when asked for, and carry the graph", async () => {
    const user = userEvent.setup();
    render(
      <NodeCanvas
        handlers={handlers}
        label="Pipeline"
        widget={widget({
          options: { ...serverOptions, show_run: true } as NodeCanvasWidget["options"],
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: "CANCEL" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "RUN" }));

    const [, payload] = handlers.onAction.mock.calls[0];
    expect(payload.kind).toBe("run");
    expect(payload.state.document.nodes).toHaveLength(2);
  });

  test("an execution-only update leaves local edits standing", async () => {
    const user = userEvent.setup();
    const base = widget({ options: serverOptions });
    const { rerender } = render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={base} />,
    );

    await user.selectOptions(screen.getByDisplayValue("Fast"), "slow");
    expect(screen.getByDisplayValue("Slow")).toBeInTheDocument();

    // Status streams in while the user is working; the document is unchanged.
    rerender(
      <NodeCanvas
        handlers={handlers}
        label="Pipeline"
        widget={{
          ...base,
          document: document(),
          execution: { status: "running", nodes: {} },
        }}
      />,
    );

    expect(screen.getByDisplayValue("Slow")).toBeInTheDocument();
  });

  test("an intentional Python change replaces the local graph", async () => {
    const user = userEvent.setup();
    const base = widget({ options: serverOptions });
    const { rerender } = render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={base} />,
    );

    await user.selectOptions(screen.getByDisplayValue("Fast"), "slow");

    const changed = document();
    changed.nodes[0].label = "Rebuilt Source";
    rerender(<NodeCanvas handlers={handlers} label="Pipeline" widget={{ ...base, document: changed }} />);

    expect(screen.getByText("Rebuilt Source")).toBeInTheDocument();
    // Python's document did not carry the local edit, so it is gone.
    expect(screen.getByDisplayValue("Fast")).toBeInTheDocument();
  });

  test("the palette opens inside the canvas and filters as you type", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={widget()} />,
    );

    await user.click(screen.getByRole("button", { name: "ADD" }));

    const palette = container.querySelector(".lcars-gpalette");
    expect(palette).toBeInTheDocument();
    // Contained by the surface, not portalled to document.body.
    expect(container.querySelector(".lcars-gcanvas")).toContainElement(
      palette as HTMLElement,
    );

    expect(screen.getByRole("button", { name: "Source" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search node types"), "sin");
    expect(screen.queryByRole("button", { name: "Source" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sink" })).toBeInTheDocument();
  });

  test("picking from the palette adds a node and commits", async () => {
    const user = userEvent.setup();
    render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={widget({ options: serverOptions })} />,
    );

    await user.click(screen.getByRole("button", { name: "ADD" }));
    await user.click(screen.getByRole("button", { name: "Sink" }));

    const [, payload] = handlers.onAction.mock.calls[0];
    expect(payload.kind).toBe("add");
    expect(payload.state.document.nodes).toHaveLength(3);
    // Seeded with the template's field defaults.
    expect(payload.state.document.nodes[2].values).toEqual({ gain: 1, mode: "fast" });
  });

  test("a read-only canvas offers no editing controls", () => {
    render(
      <NodeCanvas
        handlers={handlers}
        label="Pipeline"
        widget={widget({ options: { editable: false } as NodeCanvasWidget["options"] })}
      />,
    );

    expect(screen.queryByRole("button", { name: "ADD" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "IMPORT" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "NOTE" })).not.toBeInTheDocument();
    // Exporting is still allowed: it changes nothing.
    expect(screen.getByRole("button", { name: "EXPORT" })).toBeInTheDocument();
  });

  test("adding a note commits a comment", async () => {
    const user = userEvent.setup();
    render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={widget({ options: serverOptions })} />,
    );

    await user.click(screen.getByRole("button", { name: "NOTE" }));

    const [, payload] = handlers.onAction.mock.calls[0];
    expect(payload.kind).toBe("comment");
    expect(payload.state.document.comments).toHaveLength(1);
  });

  test("an invalid import leaves the graph untouched and says why", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={widget({ options: serverOptions })} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      new File([JSON.stringify({ format: "comfy-workflow" })], "g.json", {
        type: "application/json",
      }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(/Not an LCARS node graph/);
    expect(handlers.onAction).not.toHaveBeenCalled();
    expect(screen.getByText("Source")).toBeInTheDocument();
  });

  test("a valid import replaces the graph", async () => {
    const user = userEvent.setup();
    const incoming = document();
    incoming.nodes[0].label = "Imported Source";

    const { container } = render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={widget({ options: serverOptions })} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      new File([JSON.stringify(incoming)], "g.json", { type: "application/json" }),
    );

    expect(await screen.findByText("Imported Source")).toBeInTheDocument();
    expect(handlers.onAction.mock.calls[0][1].kind).toBe("import");
  });

  test("malformed JSON is reported rather than thrown", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={widget()} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["{nope"], "g.json", { type: "application/json" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/not valid JSON/);
  });

  test("groups and comments in the document render on the canvas", () => {
    const withFurniture = document();
    withFurniture.groups = [
      { id: "g1", label: "STAGE ONE", position: [0, 0], size: [400, 300], color: null },
    ];
    withFurniture.comments = [
      { id: "c1", text: "check this", position: [10, 10], size: [200, 100] },
    ];

    render(
      <NodeCanvas handlers={handlers} label="Pipeline" widget={widget({ document: withFurniture })} />,
    );

    expect(screen.getByText("STAGE ONE")).toBeInTheDocument();
    expect(screen.getByDisplayValue("check this")).toBeInTheDocument();
  });
});
