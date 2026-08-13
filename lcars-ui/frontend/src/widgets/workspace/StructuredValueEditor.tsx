import { useState } from "react";

import type {
  GraphWorkspaceDocument,
  WorkspaceTreeNode,
  WorkspaceTreeSchema,
  WorkspaceTreeValue,
} from "../../types/workspace";
import {
  addTreeChild,
  createTreeRoot,
  removeTreeNode,
  treePreview,
  updateTreeNodeField,
  validateTreeShape,
} from "./tree";

function TreePart({
  node,
  schema,
  root,
  onAdd,
  onField,
  onRemove,
}: {
  node: WorkspaceTreeNode;
  schema: WorkspaceTreeSchema;
  root: boolean;
  onAdd: (parentId: string, slotId: string, part: string) => void;
  onField: (nodeId: string, fieldId: string, value: unknown) => void;
  onRemove: (nodeId: string) => void;
}) {
  const part = (schema.parts ?? []).find((candidate) => candidate.id === node.part);
  if (!part) return <div data-invalid="true">UNKNOWN PART · {node.part}</div>;
  return (
    <li className="lcars-tree-part" data-part={node.part} data-shape={part.shape ?? "block"}>
      <div className="lcars-tree-token">
        <strong>{part.token}</strong><span>{part.label}</span>
        {!root ? <button onClick={() => onRemove(node.id)} type="button">REMOVE</button> : null}
      </div>
      {(part.fields ?? []).map((field) => (
        <label key={field.id}>
          {field.label}{field.required ? " · REQUIRED" : ""}
          <input
            defaultValue={String(node.fields?.[field.id] ?? "")}
            onBlur={(event) => onField(node.id, field.id, event.target.value)}
          />
        </label>
      ))}
      {(part.slots ?? []).map((slot) => {
        const children = node.slots?.[slot.id] ?? [];
        const full = slot.cardinality !== "many" && children.length >= 1;
        return (
          <section className="lcars-tree-slot" data-full={full || undefined} data-shape={slot.shape ?? "socket"} key={slot.id}>
            <header><span>{slot.label}</span><small>{(slot.cardinality ?? "one").toUpperCase()}</small></header>
            {!full ? (
              <div className="lcars-tree-add">
                {(schema.parts ?? []).map((acceptedPart) => {
                  const compatible = (slot.accepts ?? []).includes(acceptedPart.id);
                  return (
                    <button
                      data-compatible={compatible}
                      data-shape={acceptedPart.shape ?? "block"}
                      disabled={!compatible}
                      key={acceptedPart.id}
                      onClick={() => onAdd(node.id, slot.id, acceptedPart.id)}
                      title={compatible ? `${acceptedPart.label} fits ${slot.label}` : `${acceptedPart.label} does not fit ${slot.label}`}
                      type="button"
                    >
                      {compatible ? "+" : "×"} {acceptedPart.token}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <ol>
              {children.map((child) => (
                <TreePart
                  key={child.id}
                  node={child}
                  onAdd={onAdd}
                  onField={onField}
                  onRemove={onRemove}
                  root={false}
                  schema={schema}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </li>
  );
}

export function StructuredValueEditor({
  workspace,
  recordId,
  fieldId,
  schemaId,
  tree,
  onCommit,
}: {
  workspace: GraphWorkspaceDocument;
  recordId: string;
  fieldId: string;
  schemaId: string;
  tree?: WorkspaceTreeValue;
  onCommit: (workspace: GraphWorkspaceDocument, event: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const schema = (workspace.tree_schemas ?? []).find((candidate) => candidate.id === schemaId);
  if (!schema) return <div data-invalid="true">TREE SCHEMA UNAVAILABLE · {schemaId}</div>;
  const run = (event: string, operation: () => GraphWorkspaceDocument) => {
    try {
      setError(null);
      onCommit(operation(), event);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tree edit failed.");
    }
  };
  if (!tree) {
    return (
      <section aria-label={`${fieldId} structured value`} className="lcars-tree-editor">
        <header><strong>{schema.label}</strong><span>TYPED TREE · NO EVALUATION</span></header>
        <div className="lcars-tree-add">
          {(schema.parts ?? []).map((part) => {
            const compatible = (schema.root_parts ?? []).includes(part.id);
            return (
              <button
                data-compatible={compatible}
                data-shape={part.shape ?? "block"}
                disabled={!compatible}
                key={part.id}
                onClick={() => run("tree_root", () => createTreeRoot(workspace, recordId, fieldId, schemaId, part.id))}
                title={compatible ? `${part.label} fits the root` : `${part.label} cannot be a root`}
                type="button"
              >
                {compatible ? "START" : "×"} {part.token}
              </button>
            );
          })}
        </div>
      </section>
    );
  }
  const findings = validateTreeShape(tree, schema);
  return (
    <section aria-label={`${fieldId} structured value`} className="lcars-tree-editor">
      <header><strong>{schema.label}</strong><span>TYPED TREE · NO EVALUATION</span></header>
      <output aria-label="Generated structural preview">{treePreview(tree, schema)}</output>
      <ol className="lcars-tree-root">
        <TreePart
          node={tree.root}
          onAdd={(parent, slot, part) => run("tree_add", () => addTreeChild(workspace, recordId, fieldId, parent, slot, part))}
          onField={(node, field, value) => run("tree_field", () => updateTreeNodeField(workspace, recordId, fieldId, node, field, value))}
          onRemove={(node) => run("tree_remove", () => removeTreeNode(workspace, recordId, fieldId, node))}
          root
          schema={schema}
        />
      </ol>
      {findings.length > 0 ? (
        <ul className="lcars-tree-findings" aria-label="Tree findings">
          {findings.map((finding) => <li key={finding.path}>{finding.path} · {finding.message}</li>)}
        </ul>
      ) : <span className="lcars-tree-valid">STRUCTURE COMPLETE</span>}
      {error ? <p role="status">{error}</p> : null}
    </section>
  );
}
