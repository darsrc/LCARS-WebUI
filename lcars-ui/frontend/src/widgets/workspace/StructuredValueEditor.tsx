import { useEffect, useState } from "react";

import type {
  GraphWorkspaceDocument,
  WorkspaceTreeNode,
  WorkspaceTreeSchema,
  WorkspaceTreeValue,
} from "../../types/workspace";
import {
  addTreeChild,
  addTreeChildValue,
  commitTreeValue,
  createTreeRoot,
  createTreeRootValue,
  removeTreeNode,
  removeTreeNodeValue,
  treePreview,
  updateTreeNodeField,
  updateTreeNodeFieldValue,
  validateTreeShape,
} from "./tree";

export type TreeCommitMode = "group" | "incremental";

const cloneTree = (tree?: WorkspaceTreeValue): WorkspaceTreeValue | undefined =>
  tree ? structuredClone(tree) : undefined;

function TreePart({
  node,
  schema,
  root,
  readOnly,
  buffered,
  onAdd,
  onField,
  onRemove,
}: {
  node: WorkspaceTreeNode;
  schema: WorkspaceTreeSchema;
  root: boolean;
  readOnly: boolean;
  buffered: boolean;
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
        {!root && !readOnly ? (
          <button onClick={() => onRemove(node.id)} type="button">REMOVE</button>
        ) : null}
      </div>
      {(part.fields ?? []).map((field) => {
        const value = String(node.fields?.[field.id] ?? "");
        return (
          <label key={field.id}>
            {field.label}{field.required ? " · REQUIRED" : ""}
            {buffered ? (
              <input
                disabled={readOnly}
                onChange={(event) => onField(node.id, field.id, event.target.value)}
                value={value}
              />
            ) : (
              <input
                defaultValue={value}
                disabled={readOnly}
                onBlur={(event) => onField(node.id, field.id, event.target.value)}
              />
            )}
          </label>
        );
      })}
      {(part.slots ?? []).map((slot) => {
        const children = node.slots?.[slot.id] ?? [];
        const full = slot.cardinality !== "many" && children.length >= 1;
        return (
          <section className="lcars-tree-slot" data-full={full || undefined} data-shape={slot.shape ?? "socket"} key={slot.id}>
            <header><span>{slot.label}</span><small>{(slot.cardinality ?? "one").toUpperCase()}</small></header>
            {!full && !readOnly ? (
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
                  buffered={buffered}
                  key={child.id}
                  node={child}
                  onAdd={onAdd}
                  onField={onField}
                  onRemove={onRemove}
                  readOnly={readOnly}
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
  commitMode = "incremental",
  onCommit,
}: {
  workspace: GraphWorkspaceDocument;
  recordId: string;
  fieldId: string;
  schemaId: string;
  tree?: WorkspaceTreeValue;
  commitMode?: TreeCommitMode;
  onCommit: (workspace: GraphWorkspaceDocument, event: string) => void;
}) {
  const grouped = commitMode === "group";
  const [error, setError] = useState<string | null>(null);
  const [workingTree, setWorkingTree] = useState<WorkspaceTreeValue | undefined>(() =>
    cloneTree(tree));
  const [dirty, setDirty] = useState(false);
  const [phase, setPhase] = useState<"compose" | "review">("compose");
  const schema = (workspace.tree_schemas ?? []).find((candidate) => candidate.id === schemaId);

  useEffect(() => {
    if (!grouped || dirty) return;
    setWorkingTree(cloneTree(tree));
  }, [dirty, grouped, tree]);

  if (!schema) return <div data-invalid="true">TREE SCHEMA UNAVAILABLE · {schemaId}</div>;

  const run = (event: string, operation: () => GraphWorkspaceDocument): boolean => {
    try {
      setError(null);
      onCommit(operation(), event);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tree edit failed.");
      return false;
    }
  };
  const stage = (operation: () => WorkspaceTreeValue) => {
    try {
      setError(null);
      setWorkingTree(operation());
      setDirty(true);
      setPhase("compose");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tree edit failed.");
    }
  };
  const activeTree = grouped ? workingTree : tree;
  const findings = activeTree ? validateTreeShape(activeTree, schema) : [];
  const startRoot = (part: string) => {
    if (grouped) stage(() => createTreeRootValue(schema, part));
    else run("tree_root", () => createTreeRoot(workspace, recordId, fieldId, schemaId, part));
  };
  const add = (parent: string, slot: string, part: string) => {
    if (grouped) {
      stage(() => {
        if (!activeTree) throw new Error("Create a root part first.");
        return addTreeChildValue(activeTree, schema, parent, slot, part);
      });
    } else {
      run("tree_add", () => addTreeChild(workspace, recordId, fieldId, parent, slot, part));
    }
  };
  const updateField = (node: string, field: string, value: unknown) => {
    if (grouped) {
      stage(() => {
        if (!activeTree) throw new Error("Create a root part first.");
        return updateTreeNodeFieldValue(activeTree, node, field, value);
      });
    } else {
      run("tree_field", () => updateTreeNodeField(workspace, recordId, fieldId, node, field, value));
    }
  };
  const remove = (node: string) => {
    if (grouped) {
      stage(() => {
        if (!activeTree) throw new Error("Tree does not exist.");
        return removeTreeNodeValue(activeTree, node);
      });
    } else {
      run("tree_remove", () => removeTreeNode(workspace, recordId, fieldId, node));
    }
  };
  const discard = () => {
    setWorkingTree(cloneTree(tree));
    setDirty(false);
    setPhase("compose");
    setError(null);
  };
  const commit = () => {
    if (!activeTree) return;
    if (run("commit_tree", () => commitTreeValue(workspace, recordId, fieldId, activeTree))) {
      setWorkingTree(cloneTree(activeTree));
      setDirty(false);
      setPhase("compose");
    }
  };

  return (
    <section aria-label={`${fieldId} structured value`} className="lcars-tree-editor" data-phase={grouped ? phase : "incremental"}>
      <header>
        <strong>{schema.label}</strong>
        <span>
          TYPED TREE · {grouped
            ? (phase === "review" ? "REVIEW" : `COMPOSE · ${dirty ? "UNCOMMITTED" : "CURRENT"}`)
            : "IMMEDIATE COMMIT"}
        </span>
      </header>
      {!activeTree ? (
        <div className="lcars-tree-add">
          {(schema.parts ?? []).map((part) => {
            const compatible = (schema.root_parts ?? []).includes(part.id);
            return (
              <button
                data-compatible={compatible}
                data-shape={part.shape ?? "block"}
                disabled={!compatible || phase === "review"}
                key={part.id}
                onClick={() => startRoot(part.id)}
                title={compatible ? `${part.label} fits the root` : `${part.label} cannot be a root`}
                type="button"
              >
                {compatible ? "START" : "×"} {part.token}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <output aria-label="Generated structural preview">{treePreview(activeTree, schema)}</output>
          <ol className="lcars-tree-root">
            <TreePart
              buffered={grouped}
              node={activeTree.root}
              onAdd={add}
              onField={updateField}
              onRemove={remove}
              readOnly={grouped && phase === "review"}
              root
              schema={schema}
            />
          </ol>
          {findings.length > 0 ? (
            <ul className="lcars-tree-findings" aria-label="Tree findings">
              {findings.map((finding) => <li key={finding.path}>{finding.path} · {finding.message}</li>)}
            </ul>
          ) : <span className="lcars-tree-valid">STRUCTURE COMPLETE</span>}
        </>
      )}
      {grouped ? (
        <div className="lcars-tree-actions">
          {phase === "compose" ? (
            <button disabled={!activeTree || !dirty} onClick={() => setPhase("review")} type="button">REVIEW TREE</button>
          ) : (
            <>
              <button onClick={() => setPhase("compose")} type="button">BACK TO COMPOSE</button>
              <button disabled={!dirty || findings.length > 0} onClick={commit} type="button">COMMIT TREE</button>
            </>
          )}
          <button disabled={!dirty} onClick={discard} type="button">DISCARD CHANGES</button>
        </div>
      ) : null}
      {error ? <p role="status">{error}</p> : null}
    </section>
  );
}
