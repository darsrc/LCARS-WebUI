import type { GraphWorkspaceDocument } from "./workspace";
import { proposalInteractionCount, WorkspaceInteractionHarness } from "./workspaceHarness";

const workspace = (count: number, readerRevision = 0): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace-1",
  canonical: {
    graph: { graph_id: "graph", revision: "r1" },
  },
  proposal: {
    proposal_id: "proposal-1",
    title: "Draft",
    base: { graph_id: "graph", revision: "r1" },
    interaction_count: count,
  },
  reader: { revision: readerRevision },
});

test("reports committed proposal interactions against a caller-supplied budget", () => {
  const harness = new WorkspaceInteractionHarness(workspace(20))
    .checkpoint("records composed", workspace(94))
    .checkpoint("proposal ready", workspace(126));

  expect(harness.assertWithin(106)).toEqual({
    workspace_id: "workspace-1",
    proposal_id: "proposal-1",
    starting_total: 20,
    ending_total: 126,
    committed_interactions: 106,
    maximum_interactions: 106,
    within_budget: true,
    checkpoints: [
      { label: "start", total: 20, committed: 0 },
      { label: "records composed", total: 94, committed: 74 },
      { label: "proposal ready", total: 126, committed: 106 },
    ],
  });
});

test("reader-only changes do not count as proposal interactions", () => {
  const harness = new WorkspaceInteractionHarness(workspace(4));

  harness.checkpoint("reader navigation", workspace(4, 12));

  expect(harness.report(0).committed_interactions).toBe(0);
  expect(proposalInteractionCount(workspace(4, 12))).toBe(4);
});

test("fails a walkthrough that exceeds its interaction budget", () => {
  const harness = new WorkspaceInteractionHarness(workspace(0)).checkpoint(
    "walkthrough complete",
    workspace(151),
  );

  expect(harness.report(150).within_budget).toBe(false);
  expect(() => harness.assertWithin(150)).toThrow("committed 151 interactions; budget is 150");
});

test("rejects counter regression or switching the measured proposal", () => {
  const harness = new WorkspaceInteractionHarness(workspace(10)).checkpoint("first", workspace(11));

  expect(() => harness.checkpoint("regressed", workspace(9))).toThrow("cannot decrease");

  const other = workspace(12);
  other.proposal!.proposal_id = "proposal-2";
  expect(() => harness.checkpoint("other", other)).toThrow("measured workspace proposal");
});

test("requires a proposal and a valid non-negative budget", () => {
  const withoutProposal = workspace(0);
  delete withoutProposal.proposal;

  expect(() => new WorkspaceInteractionHarness(withoutProposal)).toThrow("requires a proposal");
  expect(() => new WorkspaceInteractionHarness(workspace(0)).report(-1)).toThrow(
    "non-negative safe integer",
  );
});
