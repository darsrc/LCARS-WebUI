import type { GraphWorkspaceDocument } from "../../types/workspace";
import {
  addTreeChild,
  addTreeChildValue,
  commitTreeValue,
  createTreeRoot,
  createTreeRootValue,
  removeTreeNode,
  treePreview,
  updateTreeNodeField,
  validateTreeShape,
} from "./tree";

const workspace = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace-1",
  record_schemas: [{
    kind: "generic",
    label: "Generic",
    appearance: { shape: "card", token: "REC" },
    fields: [{ id: "structure", label: "Structure", value_kind: "tree", tree_schema: "structure" }],
  }],
  tree_schemas: [{
    id: "structure",
    label: "Structure",
    root_parts: ["group"],
    parts: [
      { id: "group", label: "Group", token: "GROUP", slots: [{ id: "items", label: "Items", accepts: ["leaf"], cardinality: "many" }] },
      { id: "leaf", label: "Leaf", token: "LEAF", fields: [{ id: "value", label: "Value", value_kind: "text", required: true }] },
    ],
  }],
  canonical: { graph: { graph_id: "graph", revision: "r1" } },
  proposal: {
    proposal_id: "proposal-1",
    title: "Draft",
    base: { graph_id: "graph", revision: "r1" },
    changes: [{ id: "change:draft", operation: "addition", record_id: "draft", record: { id: "draft", kind: "generic" } }],
  },
});

test("composes a versioned typed tree instead of a scalar field", () => {
  const root = createTreeRoot(workspace(), "draft", "structure", "structure", "group");
  const child = addTreeChild(root, "draft", "structure", "group-1", "items", "leaf");
  const edited = updateTreeNodeField(child, "draft", "structure", "leaf-1", "value", "alpha");
  const tree = edited.proposal?.changes?.[0].record?.trees?.structure!;

  expect(tree.format).toBe("lcars-structured-value");
  expect(tree.root.slots?.items?.[0].fields?.value).toBe("alpha");
  expect(treePreview(tree, edited.tree_schemas![0])).toBe("GROUP LEAF alpha");
  expect(edited.proposal?.interaction_count).toBe(3);
});

test("commits a locally composed tree as one reviewed group edit", () => {
  const initial = workspace();
  const schema = initial.tree_schemas![0];
  const root = createTreeRootValue(schema, "group");
  const child = addTreeChildValue(root, schema, "group-1", "items", "leaf");
  child.root.slots!.items![0].fields!.value = "alpha";

  expect(initial.proposal?.interaction_count ?? 0).toBe(0);
  const committed = commitTreeValue(initial, "draft", "structure", child);

  expect(committed.proposal?.interaction_count).toBe(1);
  expect(committed.proposal?.revision).toBe(1);
  expect(committed.proposal?.changes?.[0].record?.trees?.structure).toEqual(child);
});

test("thirty-one reviewed structured fields cost thirty-one interactions", () => {
  const dense = workspace();
  dense.proposal!.changes = Array.from({ length: 31 }, (_, index) => ({
    id: `change:draft-${index}`,
    operation: "addition" as const,
    record_id: `draft-${index}`,
    record: { id: `draft-${index}`, kind: "generic" },
  }));
  const schema = dense.tree_schemas![0];
  const root = createTreeRootValue(schema, "group");
  const tree = addTreeChildValue(root, schema, "group-1", "items", "leaf");
  tree.root.slots!.items![0].fields!.value = "reviewed";

  const committed = Array.from({ length: 31 }, (_, index) => index).reduce(
    (current, index) => commitTreeValue(current, `draft-${index}`, "structure", tree),
    dense,
  );

  expect(committed.proposal?.interaction_count).toBe(31);
  expect(committed.proposal?.revision).toBe(31);
});

test("enforces caller slot shape before a child is added", () => {
  const root = createTreeRoot(workspace(), "draft", "structure", "structure", "group");
  expect(() => addTreeChild(root, "draft", "structure", "group-1", "items", "group")).toThrow(
    "does not accept",
  );
});

test("reports required part fields and removes nested parts", () => {
  const root = createTreeRoot(workspace(), "draft", "structure", "structure", "group");
  const child = addTreeChild(root, "draft", "structure", "group-1", "items", "leaf");
  const tree = child.proposal?.changes?.[0].record?.trees?.structure!;
  expect(validateTreeShape(tree, child.tree_schemas![0])).toEqual([
    { path: "root.slots.items.0.fields.value", message: "Value is required" },
  ]);

  const removed = removeTreeNode(child, "draft", "structure", "leaf-1");
  expect(removed.proposal?.changes?.[0].record?.trees?.structure.root.slots?.items).toEqual([]);
});
