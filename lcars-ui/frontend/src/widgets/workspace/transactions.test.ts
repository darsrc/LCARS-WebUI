import type { GraphWorkspaceDocument } from "../../types/workspace";
import {
  restoreProposalCheckpoint,
  saveProposalCheckpoint,
  WorkspaceProposalHistory,
} from "./transactions";

const workspace = (label = "one", interactions = 0): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace",
  canonical: { graph: { graph_id: "graph", revision: "r1" } },
  proposal: {
    proposal_id: "proposal",
    title: "Draft",
    base: { graph_id: "graph", revision: "r1" },
    revision: interactions,
    interaction_count: interactions,
    changes: [{ id: "change", operation: "addition", record_id: "draft", record: { id: "draft", kind: "generic", label } }],
  },
  reader: { revision: 9, search: "reader state" },
});

test("undo and redo restore proposal content without rewinding reader state or counts", () => {
  const history = new WorkspaceProposalHistory();
  const before = workspace("before", 3);
  history.record(before);
  const after = workspace("after", 4);
  after.reader!.search = "new reader state";

  const undone = history.undo(after)!;
  expect(undone.proposal?.changes?.[0].record?.label).toBe("before");
  expect(undone.reader?.search).toBe("new reader state");
  expect(undone.proposal?.interaction_count).toBe(5);

  const redone = history.redo(undone)!;
  expect(redone.proposal?.changes?.[0].record?.label).toBe("after");
  expect(redone.reader?.search).toBe("new reader state");
  expect(redone.proposal?.interaction_count).toBe(6);
});

test("new authoring after undo clears redo without reader operations entering history", () => {
  const history = new WorkspaceProposalHistory();
  history.record(workspace("one"));
  const two = workspace("two", 1);
  expect(history.undo(two)).not.toBeNull();
  history.record(two);
  expect(history.canRedo).toBe(false);
});

test("versioned autosave restores a complete 122-interaction proposal atomically", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const complete = workspace("complete transaction", 122);
  complete.proposal!.changes = Array.from({ length: 122 }, (_, index) => ({
    id: `change-${index}`,
    operation: "addition" as const,
    record_id: `draft-${index}`,
    record: { id: `draft-${index}`, kind: "generic", label: `Record ${index}` },
  }));

  const envelope = saveProposalCheckpoint(storage, "autosave", complete);
  const restored = restoreProposalCheckpoint(storage, "autosave", workspace("fresh"));

  expect(envelope.version).toBe(1);
  expect(restored?.proposal?.interaction_count).toBe(122);
  expect(restored?.proposal?.changes).toHaveLength(122);
  expect(restored?.reader?.search).toBe("reader state");
});

test("autosave rejects another workspace, stale base, malformed JSON, and partial envelopes", () => {
  let raw = "{";
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => { raw = value; },
    removeItem: () => undefined,
  };
  expect(restoreProposalCheckpoint(storage, "key", workspace())).toBeNull();
  raw = JSON.stringify({ format: "lcars-workspace-autosave", version: 1, workspace_id: "workspace" });
  expect(restoreProposalCheckpoint(storage, "key", workspace())).toBeNull();
  const stale = workspace();
  stale.canonical.graph.revision = "r2";
  stale.proposal!.base.revision = "r2";
  saveProposalCheckpoint(storage, "key", stale);
  expect(restoreProposalCheckpoint(storage, "key", workspace())).toBeNull();
});
