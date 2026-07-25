import type { GraphDocument, NodeTemplate } from "../../types/contract";
import {
  addNode,
  canConnect,
  canonical,
  connect,
  connectionError,
  disconnect,
  documentSignature,
  emptyDocument,
  moveNodes,
  reconcile,
  removeNodes,
  setFieldValue,
  validateDocument,
} from "./graph";

const template = (overrides: Partial<NodeTemplate> & { id: string }): NodeTemplate => ({
  label: null,
  category: null,
  color: null,
  inputs: [],
  outputs: [],
  fields: [],
  ...overrides,
});

const port = (id: string, type = "any", capacity: number | null = null) => ({
  id,
  label: null,
  type,
  capacity,
});

/** source(out:num) -> sink(in:num), plus a sink taking two of anything. */
const doc = (overrides: Partial<GraphDocument> = {}): GraphDocument => ({
  ...emptyDocument(),
  templates: [
    template({ id: "source", outputs: [port("out", "num")] }),
    template({
      id: "sink",
      inputs: [port("in", "num")],
      fields: [
        { id: "gain", label: "Gain", kind: "number", default: 1, options: [] },
        { id: "name", label: "Name", kind: "text", default: "", options: [] },
      ],
    }),
    template({ id: "merge", inputs: [port("any_in", "any", 2)] }),
    template({ id: "text", outputs: [port("out", "str")] }),
  ],
  nodes: [
    { id: "n1", template: "source", position: [0, 0], values: {}, label: null, group: null },
    {
      id: "n2",
      template: "sink",
      position: [200, 0],
      values: { gain: 1, name: "" },
      label: null,
      group: null,
    },
  ],
  ...overrides,
});

describe("canonical", () => {
  test("is insensitive to key order", () => {
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
  });

  test("is sensitive to array order, which is meaningful", () => {
    expect(canonical([1, 2])).not.toBe(canonical([2, 1]));
  });

  test("sorts nested keys too", () => {
    expect(canonical({ x: { a: 1, b: 2 } })).toBe(canonical({ x: { b: 2, a: 1 } }));
  });
});

describe("reconcile", () => {
  test("takes the incoming document when there is nothing local yet", () => {
    const incoming = doc();
    const result = reconcile(incoming, null, null);

    expect(result.document).toBe(incoming);
    expect(result.replacedLocal).toBe(true);
  });

  test("keeps local edits when Python repeats the same document", () => {
    const incoming = doc();
    const signature = documentSignature(incoming);
    const local = moveNodes(incoming, { n1: [50, 50] });

    const result = reconcile(incoming, local, signature);

    expect(result.document).toBe(local);
    expect(result.replacedLocal).toBe(false);
  });

  test("keeps local edits when the same document arrives with reordered keys", () => {
    const incoming = doc();
    const signature = documentSignature(incoming);
    const local = moveNodes(incoming, { n1: [50, 50] });
    // What a rerender through JSON can plausibly produce.
    const reordered = JSON.parse(
      JSON.stringify({ version: 1, ...incoming }),
    ) as GraphDocument;

    const result = reconcile(reordered, local, signature);

    expect(result.document).toBe(local);
    expect(result.replacedLocal).toBe(false);
  });

  test("an intentional Python change wins over local edits", () => {
    const first = doc();
    const signature = documentSignature(first);
    const local = moveNodes(first, { n1: [50, 50] });
    const changed = addNode(first, "source", [400, 400]);

    const result = reconcile(changed, local, signature);

    expect(result.document).toBe(changed);
    expect(result.replacedLocal).toBe(true);
    expect(result.signature).toBe(documentSignature(changed));
  });

  test("the comparison never involves local state, so an edit cannot look like a change", () => {
    const incoming = doc();
    const signature = documentSignature(incoming);
    // A local edit that makes local differ wildly from incoming.
    const local = removeNodes(incoming, ["n1", "n2"]);

    const result = reconcile(incoming, local, signature);

    expect(result.document).toBe(local);
    expect(result.replacedLocal).toBe(false);
  });

  test("reports the new signature so the caller can remember it", () => {
    const changed = addNode(doc(), "source", [10, 10]);
    expect(reconcile(changed, doc(), documentSignature(doc())).signature).toBe(
      documentSignature(changed),
    );
  });
});

describe("connectionError", () => {
  test("allows a matching typed connection", () => {
    expect(
      connectionError(doc(), { source: "n1", source_port: "out", target: "n2", target_port: "in" }),
    ).toBeNull();
  });

  test("refuses mismatched types", () => {
    const document = doc({
      nodes: [
        ...doc().nodes,
        { id: "n3", template: "text", position: [0, 100], values: {}, label: null, group: null },
      ],
    });

    expect(
      connectionError(document, {
        source: "n3",
        source_port: "out",
        target: "n2",
        target_port: "in",
      }),
    ).toMatch(/Cannot connect str to num/);
  });

  test("'any' connects to anything, in either direction", () => {
    const document = doc({
      nodes: [
        ...doc().nodes,
        { id: "m", template: "merge", position: [0, 200], values: {}, label: null, group: null },
      ],
    });

    expect(
      canConnect(document, {
        source: "n1",
        source_port: "out",
        target: "m",
        target_port: "any_in",
      }),
    ).toBe(true);
  });

  test("refuses a self-connection", () => {
    expect(
      connectionError(doc(), {
        source: "n1",
        source_port: "out",
        target: "n1",
        target_port: "in",
      }),
    ).toMatch(/cannot connect to itself/);
  });

  test("refuses an unknown port", () => {
    expect(
      connectionError(doc(), {
        source: "n1",
        source_port: "nope",
        target: "n2",
        target_port: "in",
      }),
    ).toMatch(/Unknown output port/);
  });

  test("refuses a duplicate connection", () => {
    const wired = connect(doc(), {
      source: "n1",
      source_port: "out",
      target: "n2",
      target_port: "in",
    });

    expect(
      connectionError(wired, {
        source: "n1",
        source_port: "out",
        target: "n2",
        target_port: "in",
      }),
    ).toMatch(/already connected/);
  });

  test("an input defaults to a capacity of one", () => {
    const base = doc({
      nodes: [
        ...doc().nodes,
        { id: "n3", template: "source", position: [0, 300], values: {}, label: null, group: null },
      ],
    });
    const wired = connect(base, {
      source: "n1",
      source_port: "out",
      target: "n2",
      target_port: "in",
    });

    expect(
      connectionError(wired, {
        source: "n3",
        source_port: "out",
        target: "n2",
        target_port: "in",
      }),
    ).toMatch(/already has a connection/);
  });

  test("an input may declare a larger capacity", () => {
    let document = doc({
      nodes: [
        ...doc().nodes,
        { id: "m", template: "merge", position: [0, 200], values: {}, label: null, group: null },
        { id: "n3", template: "source", position: [0, 300], values: {}, label: null, group: null },
        { id: "n4", template: "source", position: [0, 400], values: {}, label: null, group: null },
      ],
    });
    document = connect(document, {
      source: "n1",
      source_port: "out",
      target: "m",
      target_port: "any_in",
    });
    document = connect(document, {
      source: "n3",
      source_port: "out",
      target: "m",
      target_port: "any_in",
    });

    expect(document.edges).toHaveLength(2);
    expect(
      connectionError(document, {
        source: "n4",
        source_port: "out",
        target: "m",
        target_port: "any_in",
      }),
    ).toMatch(/accepts 2 connections/);
  });

  test("an output fans out without limit by default", () => {
    const base = doc({
      nodes: [
        ...doc().nodes,
        { id: "n3", template: "sink", position: [0, 300], values: {}, label: null, group: null },
      ],
    });
    let document = connect(base, {
      source: "n1",
      source_port: "out",
      target: "n2",
      target_port: "in",
    });
    document = connect(document, {
      source: "n1",
      source_port: "out",
      target: "n3",
      target_port: "in",
    });

    expect(document.edges).toHaveLength(2);
  });
});

describe("editing commands", () => {
  test("addNode seeds field defaults and a unique id", () => {
    const next = addNode(doc(), "sink", [10, 20]);
    const added = next.nodes[next.nodes.length - 1];

    expect(added.id).not.toBe("n2");
    expect(added.position).toEqual([10, 20]);
    expect(added.values).toEqual({ gain: 1, name: "" });
  });

  test("addNode ignores an unknown template", () => {
    const base = doc();
    expect(addNode(base, "nope", [0, 0])).toBe(base);
  });

  test("removeNodes takes the edges that touched them", () => {
    const wired = connect(doc(), {
      source: "n1",
      source_port: "out",
      target: "n2",
      target_port: "in",
    });

    const next = removeNodes(wired, ["n1"]);

    expect(next.nodes.map((node) => node.id)).toEqual(["n2"]);
    expect(next.edges).toHaveLength(0);
  });

  test("disconnect drops the edge and its reroutes", () => {
    const wired = connect(doc(), {
      source: "n1",
      source_port: "out",
      target: "n2",
      target_port: "in",
    });
    const edgeId = wired.edges[0].id;
    const withReroute = {
      ...wired,
      reroutes: [{ id: "r1", edge: edgeId, position: [10, 10] as [number, number] }],
    };

    const next = disconnect(withReroute, [edgeId]);

    expect(next.edges).toHaveLength(0);
    expect(next.reroutes).toHaveLength(0);
  });

  test("commands do not mutate the document they are given", () => {
    const base = doc();
    const snapshot = canonical(base);

    addNode(base, "sink", [1, 1]);
    moveNodes(base, { n1: [9, 9] });
    setFieldValue(base, "n2", "gain", 5);
    removeNodes(base, ["n1"]);

    expect(canonical(base)).toBe(snapshot);
  });

  test("setFieldValue changes only the named field on the named node", () => {
    const next = setFieldValue(doc(), "n2", "gain", 7);

    expect(next.nodes.find((node) => node.id === "n2")?.values).toEqual({ gain: 7, name: "" });
    expect(next.nodes.find((node) => node.id === "n1")?.values).toEqual({});
  });

  test("connect refuses an invalid connection rather than producing a bad edge", () => {
    const base = doc();
    expect(connect(base, {
      source: "n1",
      source_port: "out",
      target: "n1",
      target_port: "in",
    })).toBe(base);
  });
});

describe("validateDocument", () => {
  const exported = () =>
    JSON.parse(
      JSON.stringify(
        connect(doc(), { source: "n1", source_port: "out", target: "n2", target_port: "in" }),
      ),
    ) as unknown;

  test("accepts a document this editor produced", () => {
    const result = validateDocument(exported());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.edges).toHaveLength(1);
  });

  test("round-trips without losing anything", () => {
    const original = connect(doc(), {
      source: "n1",
      source_port: "out",
      target: "n2",
      target_port: "in",
    });
    const result = validateDocument(JSON.parse(JSON.stringify(original)));

    expect(result.ok).toBe(true);
    if (result.ok) expect(canonical(result.document)).toBe(canonical(original));
  });

  test("rejects a non-object", () => {
    expect(validateDocument("nope")).toEqual({ ok: false, error: "File is not a JSON object." });
  });

  test("rejects a foreign format", () => {
    expect(validateDocument({ format: "comfy-workflow", version: 1 })).toEqual({
      ok: false,
      error: "Not an LCARS node graph (wrong 'format').",
    });
  });

  test("rejects a future version rather than guessing", () => {
    const result = validateDocument({ format: "lcars-node-graph", version: 2 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unsupported graph version 2/);
  });

  test("rejects a node whose template is missing", () => {
    const broken = { ...emptyDocument(), nodes: [{ id: "x", template: "ghost", position: [0, 0] }] };
    const result = validateDocument(broken);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unknown template "ghost"/);
  });

  test("rejects a non-finite position", () => {
    const broken = {
      ...emptyDocument(),
      templates: [template({ id: "source" })],
      nodes: [{ id: "x", template: "source", position: [0, null] }],
    };
    const result = validateDocument(broken);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/invalid position/);
  });

  test("rejects an edge that breaks the typing rules", () => {
    const broken = {
      ...emptyDocument(),
      templates: [
        template({ id: "a", outputs: [port("out", "str")] }),
        template({ id: "b", inputs: [port("in", "num")] }),
      ],
      nodes: [
        { id: "n1", template: "a", position: [0, 0], values: {} },
        { id: "n2", template: "b", position: [1, 1], values: {} },
      ],
      edges: [{ id: "e1", source: "n1", source_port: "out", target: "n2", target_port: "in" }],
    };
    const result = validateDocument(broken);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Cannot connect str to num/);
  });

  test("rejects duplicate ids", () => {
    const broken = {
      ...emptyDocument(),
      templates: [template({ id: "a" }), template({ id: "a" })],
    };
    const result = validateDocument(broken);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Duplicate template id "a"/);
  });

  test("rejects a second edge into a single-capacity input", () => {
    const broken = {
      ...emptyDocument(),
      templates: [
        template({ id: "a", outputs: [port("out")] }),
        template({ id: "b", inputs: [port("in")] }),
      ],
      nodes: [
        { id: "n1", template: "a", position: [0, 0], values: {} },
        { id: "n2", template: "a", position: [0, 1], values: {} },
        { id: "n3", template: "b", position: [1, 1], values: {} },
      ],
      edges: [
        { id: "e1", source: "n1", source_port: "out", target: "n3", target_port: "in" },
        { id: "e2", source: "n2", source_port: "out", target: "n3", target_port: "in" },
      ],
    };
    const result = validateDocument(broken);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already has a connection/);
  });
});
