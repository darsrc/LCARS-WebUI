import type {
  GraphWorkspaceDocument,
  WorkspaceTreeNode,
  WorkspaceTreeSchema,
  WorkspaceTreeValue,
} from "../../types/workspace";
import { commitProposal } from "./authoring";

const treeSchema = (workspace: GraphWorkspaceDocument, schemaId: string): WorkspaceTreeSchema => {
  const schema = (workspace.tree_schemas ?? []).find((candidate) => candidate.id === schemaId);
  if (!schema) throw new Error(`Unknown tree schema "${schemaId}".`);
  return schema;
};

const partSchema = (schema: WorkspaceTreeSchema, partId: string) => {
  const part = (schema.parts ?? []).find((candidate) => candidate.id === partId);
  if (!part) throw new Error(`Unknown tree part "${partId}".`);
  return part;
};

const makeNode = (schema: WorkspaceTreeSchema, partId: string, id: string): WorkspaceTreeNode => {
  const part = partSchema(schema, partId);
  return {
    id,
    part: partId,
    fields: Object.fromEntries((part.fields ?? []).map((field) => [field.id, null])),
    slots: Object.fromEntries((part.slots ?? []).map((slot) => [slot.id, []])),
  };
};

const updateNode = (
  node: WorkspaceTreeNode,
  nodeId: string,
  update: (node: WorkspaceTreeNode) => WorkspaceTreeNode,
): WorkspaceTreeNode => {
  if (node.id === nodeId) return update(node);
  return {
    ...node,
    slots: Object.fromEntries(
      Object.entries(node.slots ?? {}).map(([slot, children]) => [
        slot,
        children.map((child) => updateNode(child, nodeId, update)),
      ]),
    ),
  };
};

const containsNode = (node: WorkspaceTreeNode, nodeId: string): boolean =>
  node.id === nodeId ||
  Object.values(node.slots ?? {}).some((children) =>
    children.some((child) => containsNode(child, nodeId)),
  );

const nextNodeId = (root: WorkspaceTreeNode, part: string): string => {
  let index = 1;
  while (containsNode(root, `${part}-${index}`)) index += 1;
  return `${part}-${index}`;
};

const updateRecordTree = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
  fieldId: string,
  update: (tree: WorkspaceTreeValue | undefined) => WorkspaceTreeValue,
): GraphWorkspaceDocument =>
  commitProposal(workspace, (changes) =>
    changes.map((change) =>
      change.record_id === recordId && change.record
        ? {
            ...change,
            record: {
              ...change.record,
              trees: {
                ...(change.record.trees ?? {}),
                [fieldId]: update(change.record.trees?.[fieldId]),
              },
            },
          }
        : change,
    ),
  );

export const createTreeRoot = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
  fieldId: string,
  schemaId: string,
  rootPart: string,
): GraphWorkspaceDocument => {
  const schema = treeSchema(workspace, schemaId);
  if (!(schema.root_parts ?? []).includes(rootPart)) {
    throw new Error(`Part "${rootPart}" is not allowed at the root.`);
  }
  return updateRecordTree(workspace, recordId, fieldId, () => ({
    format: "lcars-structured-value",
    version: 1,
    schema: schemaId,
    root: makeNode(schema, rootPart, `${rootPart}-1`),
  }));
};

export const addTreeChild = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
  fieldId: string,
  parentId: string,
  slotId: string,
  childPart: string,
): GraphWorkspaceDocument =>
  updateRecordTree(workspace, recordId, fieldId, (tree) => {
    if (!tree) throw new Error("Create a root part first.");
    const schema = treeSchema(workspace, tree.schema);
    const child = makeNode(schema, childPart, nextNodeId(tree.root, childPart));
    const root = updateNode(tree.root, parentId, (parent) => {
      const parentPart = partSchema(schema, parent.part);
      const slot = (parentPart.slots ?? []).find((candidate) => candidate.id === slotId);
      if (!slot) throw new Error(`Unknown slot "${slotId}".`);
      if (!(slot.accepts ?? []).includes(childPart)) {
        throw new Error(`Slot "${slotId}" does not accept "${childPart}".`);
      }
      const current = parent.slots?.[slotId] ?? [];
      if (slot.cardinality !== "many" && current.length >= 1) {
        throw new Error(`Slot "${slotId}" is already occupied.`);
      }
      return { ...parent, slots: { ...(parent.slots ?? {}), [slotId]: [...current, child] } };
    });
    return { ...tree, root };
  });

export const updateTreeNodeField = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
  fieldId: string,
  nodeId: string,
  partFieldId: string,
  value: unknown,
): GraphWorkspaceDocument =>
  updateRecordTree(workspace, recordId, fieldId, (tree) => {
    if (!tree) throw new Error("Create a root part first.");
    return {
      ...tree,
      root: updateNode(tree.root, nodeId, (node) => ({
        ...node,
        fields: { ...(node.fields ?? {}), [partFieldId]: value as never },
      })),
    };
  });

export const removeTreeNode = (
  workspace: GraphWorkspaceDocument,
  recordId: string,
  fieldId: string,
  nodeId: string,
): GraphWorkspaceDocument =>
  updateRecordTree(workspace, recordId, fieldId, (tree) => {
    if (!tree) throw new Error("Tree does not exist.");
    if (tree.root.id === nodeId) throw new Error("Replace the root instead of deleting it.");
    const remove = (node: WorkspaceTreeNode): WorkspaceTreeNode => ({
      ...node,
      slots: Object.fromEntries(
        Object.entries(node.slots ?? {}).map(([slot, children]) => [
          slot,
          children.filter((child) => child.id !== nodeId).map(remove),
        ]),
      ),
    });
    return { ...tree, root: remove(tree.root) };
  });

export type TreeShapeFinding = { path: string; message: string };

export const validateTreeShape = (
  tree: WorkspaceTreeValue,
  schema: WorkspaceTreeSchema,
): TreeShapeFinding[] => {
  const findings: TreeShapeFinding[] = [];
  const visit = (node: WorkspaceTreeNode, path: string) => {
    const part = (schema.parts ?? []).find((candidate) => candidate.id === node.part);
    if (!part) {
      findings.push({ path, message: `Unknown part ${node.part}` });
      return;
    }
    for (const field of part.fields ?? []) {
      if (field.required && node.fields?.[field.id] == null) {
        findings.push({ path: `${path}.fields.${field.id}`, message: `${field.label} is required` });
      }
    }
    for (const slot of part.slots ?? []) {
      const children = node.slots?.[slot.id] ?? [];
      if (slot.cardinality === "one" && children.length !== 1) {
        findings.push({ path: `${path}.slots.${slot.id}`, message: `${slot.label} requires one part` });
      }
      if (slot.cardinality === "optional" && children.length > 1) {
        findings.push({ path: `${path}.slots.${slot.id}`, message: `${slot.label} accepts at most one part` });
      }
      children.forEach((child, index) => {
        if (!(slot.accepts ?? []).includes(child.part)) {
          findings.push({
            path: `${path}.slots.${slot.id}.${index}`,
            message: `${slot.label} does not accept ${child.part}`,
          });
        }
        visit(child, `${path}.slots.${slot.id}.${index}`);
      });
    }
  };
  visit(tree.root, "root");
  return findings;
};

export const treePreview = (tree: WorkspaceTreeValue, schema: WorkspaceTreeSchema): string => {
  const render = (node: WorkspaceTreeNode): string => {
    const part = (schema.parts ?? []).find((candidate) => candidate.id === node.part);
    const values = Object.values(node.fields ?? {}).filter((value) => value != null).map(String);
    const children = Object.values(node.slots ?? {}).flat().map(render);
    return [part?.token ?? node.part, ...values, ...children].join(" ");
  };
  return render(tree.root);
};
