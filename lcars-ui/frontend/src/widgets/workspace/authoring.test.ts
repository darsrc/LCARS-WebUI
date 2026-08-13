import type { GraphWorkspaceDocument } from "../../types/workspace";
import {
  commitProposalProjection,
  createDraftRecord,
  deleteDraftRecord,
  proposalRecordCounts,
  updateDraftField,
} from "./authoring";

const workspace = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace-1",
  record_schemas: [
    {
      kind: "generic-card",
      label: "Generic card",
      appearance: { shape: "card", token: "CARD" },
      fields: [
        { id: "name", label: "Name", value_kind: "text", required: true },
        { id: "reviewed", label: "Reviewed", value_kind: "boolean" },
      ],
    },
  ],
  canonical: {
    graph: { graph_id: "graph", revision: "r1" },
    records: [{ id: "canonical-1", kind: "generic-card" }],
  },
  proposal: {
    proposal_id: "proposal-1",
    title: "Draft",
    base: { graph_id: "graph", revision: "r1" },
    revision: 0,
    interaction_count: 0,
  },
});

test("creates, edits, and deletes caller-defined draft records transactionally", () => {
  const created = createDraftRecord(workspace(), "generic-card", "draft-1");
  const edited = updateDraftField(created, "draft-1", "name", "Renamed");
  const deleted = deleteDraftRecord(edited, "draft-1");

  expect(created.proposal?.changes?.[0].record?.fields).toEqual({ name: null, reviewed: false });
  expect(edited.proposal?.changes?.[0].record?.fields?.name).toBe("Renamed");
  expect(deleted.proposal?.changes).toEqual([]);
  expect(deleted.proposal?.interaction_count).toBe(3);
  expect(deleted.proposal?.revision).toBe(3);
});

test("cannot create a draft over canonical identity or edit canonical content", () => {
  expect(() => createDraftRecord(workspace(), "generic-card", "canonical-1")).toThrow(
    "already exists",
  );
  expect(() => updateDraftField(workspace(), "canonical-1", "name", "Changed")).toThrow(
    "Unknown proposal record",
  );
});

test("counts proposed records by caller-defined kind", () => {
  const first = createDraftRecord(workspace(), "generic-card", "draft-1");
  const second = createDraftRecord(first, "generic-card", "draft-2");

  expect(proposalRecordCounts(second)).toEqual({ "generic-card": 2 });
});

test("proposal graph commits count while reader events do not", () => {
  const base = workspace();
  const projection = { format: "lcars-node-graph" as const, version: 2 as const };
  const selected = commitProposalProjection(base, projection, "selection");
  const connected = commitProposalProjection(selected, projection, "connect");

  expect(selected.proposal?.interaction_count).toBe(0);
  expect(selected.proposal?.revision).toBe(0);
  expect(connected.proposal?.interaction_count).toBe(1);
  expect(connected.proposal?.revision).toBe(1);
});
