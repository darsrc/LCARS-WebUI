import type { GraphWorkspaceDocument } from "../../types/workspace";
import { exportStructuralDiff, proposalPreflight, structuralProposalDiff } from "./diff";

const workspace = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace", version: 1, workspace_id: "workspace",
  record_schemas: [{
    kind: "generic", label: "Generic", appearance: { shape: "card", token: "REC" },
    fields: [{ id: "name", label: "Name", value_kind: "text", required: true }],
  }],
  canonical: {
    graph: { graph_id: "graph", revision: "r1" },
    completeness: { state: "complete", loaded_records: 2, known_records: 2 },
    records: [
      { id: "base", kind: "generic", fields: { name: "Before", nested: { one: 1 } } },
      { id: "reference", kind: "generic", fields: { name: "Reference" } },
    ],
  },
  proposal: {
    proposal_id: "proposal", title: "Draft", base: { graph_id: "graph", revision: "r1" },
    changes: [
      { id: "replacement", operation: "replacement", record_id: "draft-replacement", base_record_id: "base", dependencies: ["draft-addition"], record: { id: "draft-replacement", kind: "generic", fields: { name: "After", nested: { one: 2 } } } },
      { id: "addition", operation: "addition", record_id: "draft-addition", record: { id: "draft-addition", kind: "generic", fields: { name: "Added" } } },
      { id: "retirement", operation: "retirement", record_id: "retired", base_record_id: "base" },
      { id: "reference-change", operation: "reference", record_id: "ref", base_record_id: "reference" },
    ],
  },
});

test("produces dependency-ordered structural additions replacements retirements and references", () => {
  const diff = structuralProposalDiff(workspace());
  expect(diff.entries.map((entry) => entry.operation)).toEqual(["addition", "replacement", "retirement", "reference"]);
  expect(diff.entries[1].fields.map((field) => field.path)).toContain("record.fields.name");
  expect(diff.entries[3].fields).toEqual([]);
  expect(JSON.parse(exportStructuralDiff(diff)).entries).toHaveLength(4);
});

test("preflight counts generic kinds and blocks incomplete closure or required fields", () => {
  const incomplete = workspace();
  incomplete.canonical.completeness = { state: "partial", loaded_records: 1, known_records: 2, reason: "page failed" };
  incomplete.proposal!.changes![1].record!.fields!.name = "";
  const preflight = proposalPreflight(incomplete);

  expect(preflight.ready).toBe(false);
  expect(preflight.counts).toEqual({ generic: 2, reference: 2 });
  expect(preflight.findings.map((finding) => finding.id)).toContain("closure");
  expect(preflight.findings.some((finding) => finding.message === "Name is required")).toBe(true);
});

test("ready preflight accepts a complete generic proposal", () => {
  expect(proposalPreflight(workspace()).ready).toBe(true);
});
