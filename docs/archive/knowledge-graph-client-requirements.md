# Knowledge-client interface requirements

> **Archived consumer-application specification.** This document belongs to the separate
> knowledge-graph client application, not to the LCARS UI library. It is retained only as context
> for why the library's knowledge-graph widget family exists and is not a normative LCARS UI
> implementation specification.

**Status:** design contract; no application implementation is implied by this document

**Basis:** versioned knowledge-graph contracts, their errata, the support hardening report, the current
`web.model` and `web.support` read surfaces, and the twelve encoding findings in
`chains/action_potential_chain.py`

**Primary acceptance case:** a person can propose a lossless 30-node explanatory
chain, inspect the resulting AND/OR structure, and see where it stops explaining.

## Scope and non-negotiable interaction model

The client has two jobs: make the stored graph and its computed support legible,
and let a person compose a proposed graph change for ingestion. It is not a graph
editor in the database sense.

The interface must always distinguish these states:

1. **Canonical graph** — read-only content returned by the canonical knowledge service.
2. **Reader state** — local selection, layout, filters, collapsed branches,
   commitment set, query mode and navigation history. It is never written as
   knowledge.
3. **Proposal overlay** — client-held additions, replacements and retirements that
   have not been accepted. A proposal may refer to canonical IDs, but its draft IDs
   and edges are not canonical knowledge.
4. **Ingestion result** — an accepted, rejected or partially accepted
   provenance-bearing change set returned by ingestion. Only a fresh read after
   acceptance may display accepted objects as canonical.

Every authoring entry point is labelled **Propose change** or **Add to proposal**,
never **Edit graph**, **Save node**, or language implying direct mutation. Canonical
objects do not expose editable controls until the user explicitly creates a proposal
based on them. Proposal objects have a persistent `DRAFT — NOT CANONICAL` banner,
a dashed boundary, and a proposal-local identifier. Submission goes to ingestion;
the client does not update its canonical plane optimistically.

This document uses the following requirement keys:

- **R1** Support is a set of environments, each a set of typed atoms.
- **R2** Empirical reach, formal dependencies and assumptions remain distinct.
- **R3** empty support and the singleton empty environment remain distinct.
- **R4** JUSTIFICATION, DOMAIN, PREREQUISITE and PROVENANCE remain distinct.
- **R5** conjunction and alternative remain distinct.
- **R6** answers are YES, NO or UNKNOWN and identify FAST or EXACT mode.
- **R7** reach is a weak provenance-embedding signal, never confidence.
- **R8** gaps are first-class and unauthored holes are not refutations.
- **R9** status is explicit and not inferred from support.
- **R10** structural identity is canonical; prose is display-only.

## Display grammar shared by all views

The following grammar is mandatory so that different views tell the same story.

### Identity and prose

Every identity-bearing object shows its stable ID and kind before or beside its
gloss. Assertions render their structural identity as predicate, ordered arguments,
exactly one framework, and canonical qualifier IDs. A gloss may be the largest text
on a card for readability, but is marked **Gloss** and can be hidden. Search results
that match only a gloss say so. Changing only a gloss is still a proposed change,
not a structural rename. Two assertions with similar prose are never merged by the
client.

### Support notation

Support is shown as an **alternative stack**. Each card in the stack is one complete
environment; cards are joined by a visible `OR`. Within a card, atoms are divided
into three labelled compartments:

```text
SUPPORT (3 minimal environments; FAST cache complete)

  Environment E1                                     one sufficient alternative
  Empirical observations   [e01]
  Formal derivations       [—]
  Assumptions              [space_clamp]
                         OR
  Environment E2
  Empirical observations   [e04]
  Formal derivations       [f07]
  Assumptions              [lumped_capacitance] [sign_convention]
                         OR
  Environment E3
  Empirical observations   [—]
  Formal derivations       [—]
  Assumptions              [—]
  Support-independent in the current formal context
```

The compartments are shown even when empty. Atom chips include kind, ID and a short
gloss; color may reinforce kind but icon, label and shape must carry the distinction
without color. Environment order is deterministic but explicitly non-ranked.
Cardinality is shown only as a literal atom count, never as strength.

Two empty cases use different components, wording and icons:

```text
support(X) = ∅
UNSUPPORTED — no support environment is currently available.
Status: NEVER_TESTED                         independently stored
```

```text
support(X) = {∅}
SUPPORT-INDEPENDENT — one empty environment is sufficient in the current
formal context. This does not mean “universally true.”
```

The mathematical notation is present in both components, so the distinction does
not depend on prose or color. The UI must never use `{}` for both the empty family
and the empty member; it uses `∅` and `{∅}` respectively.

When an environment contains an empirical observation, the summary sentence is
of the form **Empirically grounded in {e01} under {space_clamp}**, with formal
dependencies on the same line or immediately below. No component may emit bare
**grounded**. If no environment has empirical observations, it says **No empirical
grounding in the displayed support environments** rather than **ungrounded** when
the cache is truncated.

`reach()` appears only in a disclosure labelled **Distinct empirical anchors in
displayed minimal support (weak signal)**. It is an unranked set, not a meter,
percentage, badge, score, star rating, thickness or node size. An adjacent note says
that shared datasets, instruments and cohorts are not currently evidence-independent.

### Query results

YES, NO and UNKNOWN use equally sized neutral result panels. UNKNOWN uses a question
mark, not a warning triangle, error color or failure wording. Each result shows:

- the query name and target;
- the commitment set used;
- the mode that produced it, **FAST** or **EXACT**;
- whether the FAST cache was complete or truncated;
- the environment that witnesses YES, when the API can provide it;
- the registered conflict that witnesses NO, when the API can provide it; and
- the exact-relative-to-recorded-conflicts limitation.

UNKNOWN means the FAST cache was truncated and an omitted environment could change
the answer. It is not used for timeout, cancellation, server failure, malformed
query or unavailable computation. Those are operational outcomes in a separate
error component.

Requesting EXACT is deliberate: the control reads **Run EXACT (unbounded cost)**,
opens a confirmation showing the query scope, and supports progress, cancellation
and a client-specified resource warning. EXACT returns YES or NO if it completes.
Cancellation or resource exhaustion is shown as **Did not complete**, never UNKNOWN
and never an inferred answer.

### Edge-layer grammar

Layer identity must survive monochrome display, zooming and edge overlap. Each edge
has a persistent layer token in its accessible name and details panel. The canvas
uses these non-color encodings:

| Layer | Required geometry | Arrow semantics | Required label |
|---|---|---|---|
| JUSTIFICATION | premise arrows enter a boxed `∧` justification gate; one arrow leaves the gate for its conclusion | premise/support atom → justification → conclusion | justification ID and, when available, rule |
| DOMAIN | single solid curve that never passes through a justification gate | predicate argument/source → predicate-defined target; reciprocal or cyclic relations draw all stored directions | predicate ID |
| PREREQUISITE | dashed line with repeated open chevrons | prerequisite → concept that requires it | `REQUIRES` |
| PROVENANCE | dotted line ending in a document-tab glyph | source/record → object whose provenance it supplies | provenance relation |

Color is an optional redundant cue. A layer legend stays visible. An edge cannot
change geometry merely because it is selected. At overview zoom, labels may collapse
to layer tokens, but geometries and arrows remain distinct.

Several justifications concluding the same assertion are connected to a visible
`OR` collector adjacent to the conclusion. Each justification retains its own `∧`
gate even when it has zero or one premise, because its anchors and assumptions still
belong to that justification. The interface must not draw a direct anchor-to-assertion
support edge.

A DOMAIN cycle is shown as an ordinary loop with a **Domain dynamics** layer badge.
A cycle consisting solely of directional JUSTIFICATION edges is outlined and
labelled **Circular justification; unsupported unless independently based or
represented by a constraint system**. The UI must compute or receive the layer-
specific cycle classification; it must not flag a mixed or DOMAIN strongly connected
component as circular reasoning.

# A. View inventory

## A1. Graph overview canvas

**Purpose.** Provide the first truthful picture of the whole Web and an entry point
to every focused view.

**Shows.** Identity-bearing nodes; the four edge layers using the shared grammar;
framework and proposal-overlay boundaries; explicit Gap nodes; selected-node support
summary; counts by node kind and layer; and a minimap. Default layout groups by
framework without implying that screen distance is epistemic distance. Status is a
small explicit badge, never derived from node fill.

The default starts with all layers available but only one layer emphasized at a time.
Non-emphasized layers remain faint enough to preserve context and can be hidden. A
**support-flow mode** shows JUSTIFICATION only; a **domain-dynamics mode** shows
DOMAIN only. This is a reader-state filter, clearly labelled **hidden from view**,
not a change to the graph.

**User can.** Pan, zoom, search by structural field or gloss, select and multi-select,
focus a neighborhood, change emphasized layers, follow an edge, expand a collapsed
subgraph, pin positions locally, open an inspector, open the justification walker,
add a canonical item to the proposal as a reference, or begin a proposed change.
Reader layouts can be exported separately from knowledge proposals.

**Honours.** R4, R5, R8, R9, R10; the selected-node summary also honours R1–R3 and
R7.

## A2. Node inspector

**Purpose.** Answer “what exactly is this object?” without substituting its gloss
for its identity.

**Shows.** Kind, stable ID, structural fields, gloss, explicit status where the kind
has one, framework, canonical qualifiers and selected roles, incoming and outgoing
edges grouped by layer, provenance, and proposal history/ingestion receipt when
available. An assertion shows `predicate(arguments)`, exactly one framework and its
qualifier IDs before prose. A Predicate shows definition, parent, framework, examples,
counterexamples and provenance when the model supplies them. A Gap shows endpoints,
known dependency, what is missing, type, contenders and constraints.

Support appears as a compact state linking to the full Support explorer. Empty
support and `{∅}` use the distinct components defined above. Status has its own
label and explanatory text; `REFUTED` cannot be produced merely by observing empty
support.

**User can.** Copy an ID or structural expression, traverse any edge in its layer,
open its source, compare two nodes structurally, open support or justification views,
and create a proposal based on the item. The canonical inspector itself is read-only.

**Honours.** R1–R4 and R8–R10.

## A3. Support explorer

**Purpose.** Make a set of sets readable without flattening, ranking or hiding
assumptions.

**Shows.** The alternative-stack notation from the shared grammar; three projections
inside every environment; FAST cache completeness; minimal-sufficiency wording;
the distinction between empirical grounding, reach and robustness; known nogood or
negation conflicts when available; and a link from every atom to its inspector.

The initial display is the public cached support. If it is truncated, the header says
**Showing 64 cached environments; more exist; selection is arbitrary and has no
epistemic rank**. Sorting is permitted by stable ID, atom kind or membership for
finding an environment, but the control is labelled **Display order only**. A Venn
diagram, stacked percentage, confidence bar and “best environment” are prohibited.

The view may overlay the justification branches that generate a selected environment,
but it must call them **one derivation for this environment**, not the canonical
total robustness. A separate **Full justification structure** link opens A4.

**User can.** Expand/collapse environment cards; filter environments that contain an
atom without changing the stated total; compare two environments by set difference;
inspect atoms; copy exact set notation; add assumptions to the client-held commitment
set; run a commitment query; and request an exact label only if a public exact-label
read operation exists. Until then, EXACT is available for verdict queries but not as
a promise to enumerate exact support.

**Honours.** R1–R3, R6, R7, R9 and R10.

## A4. Justification walker

**Purpose.** Answer “why does this follow?” and expose unstated or unsupported steps.

**Shows.** A rooted AND/OR graph. The selected assertion is the root. Alternative
justifications form OR branches. Within each branch, all premise assertions feed a
single `∧` gate; attached assumptions and empirical/formal anchors enter that gate
through separately labelled ports. Rule, framework and provenance sit on the gate,
not on an arbitrary premise edge. Unsupported premises remain visible and terminate
in an **Unsupported assertion** card, an explicit Gap, or a **Draft unresolved
reference** in proposal mode. These three endings use different shapes and wording.

A layer switch can reveal DOMAIN, PREREQUISITE or PROVENANCE neighbors, but those
edges never join the support-flow gate. Layer-specific cycle analysis marks only
JUSTIFICATION circularity. Constraint systems, when modeled, render as a container
with members and solution semantics rather than a loop of directional arrows.
An Assumption attached to a gate inside an otherwise unbased cycle remains visibly
inside that cycle; it is not drawn as an independent base. A separate alternative
justification supported by an Assumption is a different topology and remains visible
as such.

**User can.** Walk backward to anchors or forward to dependents, choose one OR branch,
expand all premises of one `∧` gate, collapse a proven subgraph into a summary that
retains boundary ports, compare alternative justifications, reveal termination class,
and start a proposal to supply a missing justification or explicit Gap.

**Honours.** R1–R5 and R7–R10.

## A5. Gaps and termination ledger

**Purpose.** Make explanation boundaries navigable and prevent incomplete authoring
from masquerading as refutation.

**Shows.** A table and canvas of canonical Gap objects with type, endpoints, known
dependency, missing bridge, contenders and constraints. A separate **Draft holes**
section lists unresolved references and unclassified chain ends in the current
proposal. A third **Unsupported assertions** section lists assertions with empty
support alongside their explicit statuses. These sections never collapse into one.

The termination ledger classifies each leaf as empirical observation, formal
derivation, framework primitive, assumption, canonical Gap, unsupported assertion,
or draft-unresolved. Because “framework primitive” is not currently a SupportAtom
kind, it is displayed as a structural termination classification, not silently
converted to a formal anchor.

**User can.** Filter Gap type, inspect endpoints, overlay gaps on the graph, compare
contenders, walk to the last established justification, and in proposal mode choose
whether a hole should be resolved by authoring an object or proposed as a Gap. The
client never makes that scientific choice automatically.

**Honours.** R3, R4, R8–R10.

## A6. Commitment query workbench

**Purpose.** Ask which assertions remain supported under a reader-selected set of
commitments without treating that set as stored knowledge.

**Shows.** A client-held commitment tray of typed SupportAtom IDs accepted by the
query contract; the target assertion or graph scope; registered negations/nogoods
relevant to the tray; the chosen query
(`supported_under`, `in_conflict_set`, or `conflict_set`); FAST/EXACT mode; and the
three-valued result grammar. A persistent note states:

> Compatible means no conflict is registered in this Web. It does not prove logical
> consistency. Results are optimistic when conflicts have not been recorded.

For `supported_under`, a compatible cached environment witnesses YES. If none is
found and the cache is truncated, FAST returns UNKNOWN. For `in_conflict_set`, a
compatible environment witnesses definite NO; all cached environments conflicting
with truncation yields UNKNOWN. Unsupported assertions are not placed in every
conflict set. A FAST whole-graph conflict-set result is divided into **definite
members**, **definite nonmembers** and **unknown membership**; it must not display
only the definite-member set as though it were complete.

**User can.** Add/remove typed SupportAtoms locally, save named commitment trays as
reader state, select target/scope, run FAST immediately, explicitly request EXACT,
cancel an EXACT operation, inspect a witness or conflict if exposed, and open affected nodes.
The workbench rejects or visibly isolates atoms from another graph revision so the
current cross-graph conflict defect cannot be triggered through normal UI use.

**Honours.** R1–R3, R6, R8–R10.

## A7. Predicate and qualifier registry browser

**Purpose.** Let authors reuse canonical vocabulary and expose normalization choices
before a proposal is submitted.

**Shows.** Predicate hierarchy, definitions, framework, aliases if supplied,
examples, counterexamples and provenance; banned vague predicate names; qualifier
canonical forms, aliases, declared roles, framework, definition and provenance.
Search results distinguish exact ID, canonical phrase, alias and gloss matches.

**User can.** Select an existing predicate/qualifier for a draft, compare near
matches, or compose a proposed predicate/qualifier for ingestion. A proposed
predicate requires a parent unless explicitly proposed as a framework primitive.
A proposed qualifier records possible roles without making role assignment part of
assertion identity.

**Honours.** R4 and R10.

## A8. Proposal workspace and ingestion handoff

**Purpose.** Make human authoring direct and inspectable while preserving program
separation.

**Shows.** Canonical base revision, proposal-local nodes/edges, proposed replacements
and retirements, unresolved references, validation findings, computed preview where
the read API can evaluate a temporary graph, provenance required for the proposal,
and a structural diff. The canvas uses the same grammar as reading, but all draft
objects have a dashed proposal boundary and never acquire canonical styling merely
because local validation passes.

**User can.** Perform the flow in B; undo/redo local operations; invite no implied
write; validate; export a proposal package; submit it to ingestion; and inspect the
ingestion receipt. On acceptance, the workspace remains a historical proposal until
the client reloads canonical IDs from the knowledge service.

**Honours.** All requirements, especially R4, R8 and R10.

# B. Authoring flow

## B1. Proposal lifecycle

1. **Start a proposal.** The user names the proposal, selects a canonical base
   revision and supplies authorship/provenance for the curatorial act. The workspace
   displays `DRAFT — NOT CANONICAL` continuously.
2. **Set the explanation target.** The user selects or proposes the intended
   conclusion and optionally creates a 30-node acceptance checklist and termination
   ledger. This is organizational reader/proposal state, not a graph object.
3. **Create or reuse structural objects.** Entity, Framework, Quantity,
   StateVariable, Predicate and Qualifier choices precede the Assertion that refers
   to them. Registry search is always offered before coining.
4. **Compose assertions structurally.** The form is predicate plus typed ordered
   arguments, exactly one framework, canonical qualifier references and a gloss.
   Status is an explicit required choice where the model requires it; no default is
   inferred from support.
5. **Attach justification gates.** Each justification has one conclusion. Premises
   placed inside one gate are `∧`; **Add alternative justification** creates another
   gate joined by `∨`. Empirical/formal anchors and assumptions attach to the gate,
   not the conclusion.
6. **Classify every leaf.** The live termination ledger refuses to call an
   unresolved draft reference a Gap or REFUTED assertion. The author chooses to
   author the missing assertion, link an existing primitive/anchor/assumption, or
   propose an explicit Gap.
7. **Resolve vocabulary and qualifiers.** Unresolved registry phrases stay proposal
   objects queued for ingestion/curation; they never become canonical IDs locally.
8. **Preview and inspect.** The temporary graph displays its exact AND/OR topology
   and the support result the available computation can produce. A user-entered
   expected support expression is a validation expectation only, never a stored
   label. A mismatch blocks “ready” status and shows which branch contributes each
   atom.
9. **Validate.** Structural validation checks types, one framework per assertion,
   predicate rules, qualifier resolution, references, layer assignment, conjunction
   grouping, source/provenance completeness, termination coverage and proposal/base
   revision. Semantic review items that require judgment remain explicit decisions,
   not auto-fixes.
10. **Submit to ingestion.** The final confirmation says **Submit proposed change to
    ingestion**. It shows the structural diff and makes clear that ingestion may
    accept, reject, split, map or return it for curation.
11. **Reconcile the receipt.** Accepted items show returned canonical IDs only after
    re-reading canonical state. Rejections retain reasons and point to the relevant proposal
    object. Partial acceptance never silently drops a premise or atom; dependencies
    are shown before the user submits a revised proposal.

## B2. Detailed assertion composition

The assertion composer presents these decisions in order:

1. **Predicate.** Search by canonical ID, alias, definition and argument signature.
   If no predicate fits, choose **Propose predicate**. The person must provide a
   precise name, definition, framework, parent, gloss, examples, counterexamples and
   provenance. The client rejects the banned vague names and asks the person—not the
   system—to choose among meanings such as `STRUCTURAL_PART_OF`, `CONSTITUTED_BY`,
   `SUBCLASS_OF`, `INSTANCE_OF` or `ROLE_OF`. Declaring a framework primitive is an
   explicit exceptional path.
2. **Arguments.** Fill typed, ordered argument slots with canonical object IDs or
   proposal-local references. Literal quantities retain value, units, uncertainty,
   relation and time/context rather than being flattened into prose. The person must
   decide whether a sentence contains one proposition or several; assertion
   atomicity is unresolved by the design.
3. **Framework.** Choose exactly one. If reasoning crosses frameworks, keep each
   assertion in its own framework and propose an explicit mapping/Reduction as a
   premise of the cross-framework justification. The client does not add a second
   framework to the assertion.
4. **Qualifiers.** Enter scope and conditions as phrases, resolve each to a canonical
   qualifier, then select every applicable role from that qualifier's declared
   roles. A phrase may occupy several roles. If resolution fails, the draft holds a
   `PROPOSED_QUALIFIER` and cannot present it as canonical. The person must decide
   whether two phrases mean the same qualifier; confidence thresholds are not
   specified by the model.
5. **Gloss and status.** Supply readable prose but preview the structural identity
   above it. Choose status explicitly. Empty support neither suggests nor selects
   `NEVER_TESTED`, `UNTESTABLE`, `REFUTED` or `RETRACTED`.

## B3. Concrete walkthrough: the authored resting-potential fragment

The repository worksheet is not a completed 30-node chain: it authors only `n01`,
`n02`, `n03`, `e01` and `j01`; `n04`, `n05` and `e02` are references without blocks,
and steps 1–3 and 5–15 are blank. The walkthrough must preserve that incompleteness
rather than invent neuroscience.

### 1. Create `n01` as an Entity

The author selects **Entity**, proposal ID `n01`, and label/gloss “neuronal membrane” /
“lipid bilayer separating intra- and extracellular compartments.” The worksheet's
plural “frameworks cell_biology · electrostatics” cannot be copied into an Assertion
framework field because `n01` is not an Assertion. The person must decide whether
those are provenance/classification links, qualifier context, or assertions about
the entity. The interface records an unresolved author decision instead of flattening
the Entity into an Assertion.

### 2. Register or select vocabulary for `n02`

The author selects the `electrophysiology` Framework and searches for
`HAS_PROPERTY`. If it exists, they inspect its definition and parent. If it does not,
they must decide whether to propose it, select a more precise existing predicate, or
decompose the proposition. The system cannot make that domain judgment.

The author selects canonical arguments for neuronal membrane and resting potential,
and a Quantity for membrane potential with mV as an allowed unit. The approximate
`−70 mV`, reference direction “inside relative to outside,” population “squid giant
axon; generalizes to most vertebrate neurons,” physiological ionic concentrations
and `T ≈ 20 °C` must become structured arguments/qualifiers rather than disappear
into the gloss. The author must decide whether the generalization is the same
assertion or a second assertion; the UI flags this as the unresolved atomicity choice.

For each scope/condition phrase, the qualifier browser returns a canonical match or
a `PROPOSED_QUALIFIER`. The author selects all applicable roles. The system cannot
decide synonym identity or whether “physiological ionic concentrations” is adequately
precise.

The author supplies the worksheet sentence as **Gloss** and explicitly chooses the
appropriate status. The client does not infer status from the forthcoming support.

### 3. Author empirical observation `e01`

The author chooses **Empirical observation** and records the observation, Hodgkin &
Huxley source, inspectability statement and supporting polarity from the worksheet.
They must identify an actual source record rather than leave a citation-shaped string
if ingestion requires one. The current model can store only the anchor name, so this
draft is correctly marked **not losslessly representable by the current model**.

The author then creates a justification gate concluding `n02` and attaches `e01` to
that gate. This resolves the worksheet's invalid direct `grounding {{e01}}` notation
without inventing a hidden edge: the person explicitly proposes the missing
justification and must name its rule/framework/provenance or attest that the
justification is direct. The system cannot choose that justification for them.

The preview should compute:

```text
support(n02) = {{e01}}
Empirically grounded in {e01} under no tracked assumptions.
```

This is not `{∅}` and is not a confidence claim.

### 4. Compose `n03`

The author chooses exactly one framework, `electrodiffusion
(Goldman–Hodgkin–Katz)`, and searches for `IS_CONSEQUENCE_OF`. Its arguments are
resting potential and the structured combination of ion gradient with selective
permeability. Because v0.3 leaves assertion atomicity open, the UI makes the author
choose either:

- keep a conjunction inside the proposition as an explicitly annotated construct; or
- split it into assertions and express conjunction only in `j01`.

The interface recommends splitting for traceability but cannot claim that choice is
semantically mandated. Scope and conditions (“cells with Na⁺/K⁺ gradients and
K⁺-selective leak channels,” “steady state,” “no net current”) go through the same
qualifier-resolution flow. The author supplies the sentence as gloss and chooses
status separately.

### 5. Build `j01` as a visible conjunction

The author creates `j01`, conclusion `n03`, and one `∧` gate with premises `n02`,
`n04` and `n05`. They enter the GHK voltage equation rule, electrodiffusion framework
and textbook-derivation provenance. The gate visibly shows all three premises; no
single edge is allowed to visually carry the whole derivation.

`n04` and `n05` do not exist in the worksheet. The client creates **draft unresolved
references**, not bare canonical Assertions and not automatic Gaps. The person must
choose for each whether to author it, link an existing assertion, or propose a Gap.
Until then, validation states that `j01` cannot establish support. If placeholder
assertions are intentionally proposed, they are shown as unsupported with an explicit
status choice, never REFUTED by inference.

The worksheet also declares expected grounding `{{e01,e02}}`, but `e02` has no anchor
block and `j01` attaches no anchors. The UI stores this expression only as an
**expected support check**, highlights the mismatch, and asks the author to decide:

- What is `e02`, and is there an inspectable empirical or formal record?
- Does `e02` support `j01`, another justification, or one of `n04`/`n05`?
- Are `n04` and `n05` themselves supported, and under what assumptions?
- Is the expected expression wrong?

The client must not manufacture `e02`, attach it arbitrarily, or write a declared
label into canonical knowledge. With the fragment as written, the truthful preview is
`support(n03) = ∅` because conjunctive premises are unresolved/unsupported. The
display also shows `n03`'s independently selected status and the two draft holes, so
empty support cannot be mistaken for refutation.

### 6. Continue toward action potential

For every skeleton step the author repeats assertion and justification composition.
At the explicit hard cases, the UI forces rather than hides these decisions:

- **Step 6, conformational states:** decide the assertion framework and propose a
  typed cross-framework Reduction/mapping premise instead of adding another framework
  to an assertion. Reduction is not present in the current model, so this remains a
  model blocker.
- **Step 7, open probability:** encode the distribution/function and its conditioning
  quantities structurally; the person supplies its domain and units. “Tends to open”
  is rejected as a vague gloss without a precise proposition.
- **Step 11, feedback:** draw the feedback as DOMAIN edges. Justifications for each
  dynamical relation remain separate and may not obtain support by circulating around
  that DOMAIN loop.
- **Step 12, inactivation:** select or propose a predicate whose definition
  distinguishes inactivation from closing; the system cannot adjudicate the
  biological distinction.
- **Every leaf:** classify it in the live termination ledger. An assumption becomes a
  visible typed SupportAtom on a justification and will appear beside grounding.

### 7. Preflight and ingestion

Before submission the proposal view presents the 30-node graph, each `∧` gate,
each `∨` alternative, all four edge layers, the termination ledger, explicit
statuses and every unresolved proposal object. Lossless preflight fails if model/API
fields would be discarded. The person may still export an incomplete draft, but
**Submit as ready** requires resolving or explicitly waiving every finding in an
ingestion-visible review record.

The final action submits the entire proposed change set to ingestion with source and
curatorial provenance. Nothing on the canvas becomes canonical until ingestion
returns canonical IDs and the client re-reads them from the knowledge service.

## B4. Decisions only the person/curator can make

The UI must never silently decide any of the following:

- whether prose contains one assertion or several;
- which precise predicate represents the intended relation;
- whether a new predicate is needed, what it means, and where it sits in the hierarchy;
- whether a predicate is primitive in a framework;
- the ordered identity and type of proposition arguments;
- the assertion's one framework;
- whether cross-framework reasoning needs a Reduction and what type/regime/error it has;
- whether two qualifier phrases are synonyms;
- which qualifier roles apply to a use;
- whether a scope or condition is precise enough;
- which explicit epistemic status applies;
- whether a record is empirical, formal, an assumption, or merely an unsupported claim;
- whether an observation excludes or supports a justification;
- whether a citation identifies the correct inspectable source;
- the complete conjunctive premise set for a justification;
- whether two derivations are alternatives or parts of one conjunction;
- which rule, framework and provenance license a justification;
- where a referenced but unauthored object belongs;
- whether an explanation boundary is a real Gap and which Gap type it is;
- whether a feedback relation is DOMAIN dynamics or an attempted derivation;
- whether expected support is wrong or the proposed justification structure is incomplete;
- whether an assumption is acceptable to stipulate; and
- how to resolve an ingestion rejection or partial acceptance.

# C. Canvas requirements

## C1. Scene model and objects

The canvas must render at least these first-class scene objects: node cards by kind,
assertion cards, Gap cards, Source cards, justification gates, OR collectors,
ConstraintSystem containers, Reduction nodes, collapsed-subgraph capsules, unresolved
proposal references, edge labels, layer legend, selection/focus halo and proposal
overlay boundary. A justification is a selectable object with ports and metadata,
not an invisible edge.

Ports are typed. Assertion premise output can connect only to a justification premise
port; empirical/formal anchors connect to the gate's supporting-anchor port;
Assumptions connect to its assumption port; the conclusion port connects to exactly
one Assertion. Invalid drag targets explain the type mismatch without modifying the
proposal.

## C2. Direction and routing

Arrowheads remain visible at all interactive zoom levels. Edges route around nodes and
gate labels, support parallel edges, self-loops and reciprocal DOMAIN edges, and
retain distinguishable paths when layers share endpoints. Hover/focus traces an edge
from both endpoints and speaks the full relation in accessible text.

Justification routing is hypergraph-like: many premise/atom edges enter one gate and
one conclusion edge leaves it. It must never be simplified to pairwise premise-to-
conclusion lines. Multiple gates for one conclusion terminate at an OR collector;
the collector does not imply that selecting more branches increases confidence.

## C3. Layer controls

Each layer can be hidden, shown or emphasized independently. The legend reports the
number of visible/total edges in every layer. Hiding a layer cannot alter layout
semantics or query results and is recorded only as reader state. “Show support flow”
means JUSTIFICATION only and says so. Layer filters are keyboard reachable and do not
rely on color.

Cycle analysis operates per layer. DOMAIN strongly connected components may be
collapsed as dynamical modules without warnings. A JUSTIFICATION-only directional
cycle is marked as circular reasoning unless the model identifies independent base
semantics or a ConstraintSystem; the canvas itself must not invent that exemption.

## C4. Scale, navigation and collapse

The canvas must remain operable for at least a 30-node authored chain and must use
virtualized rendering for graphs substantially larger than the viewport. It provides
pan, wheel/pinch and keyboard zoom, zoom-to-fit, minimap, structural/gloss search,
breadcrumb history, back/forward navigation, focus neighborhood by hop count and
framework/layer filters.

Collapse is semantic-preserving. A collapsed capsule lists contained node count,
kind counts, frameworks, internal edge-layer counts and boundary ports. Incoming and
outgoing boundary edges retain layer and direction. A capsule containing a Gap,
unsupported leaf, explicit status or justification-cycle warning displays a neutral
summary marker; it may not hide the condition entirely. Expanding restores the same
selection and local positions.

Auto-layout supports at least: justification flow (premises left/top to conclusion
right/bottom), framework clusters, DOMAIN cycle-preserving layout and stable
incremental placement after proposal changes. Layout position is reader state and has
no epistemic meaning. Users can pin nodes locally and reset layout without generating
a knowledge proposal.

## C5. Inline proposal composition

Canonical cards have no directly editable fields. **Propose change** creates a draft
card adjacent to the canonical card and shows a structural diff. New draft cards can
be composed inline, including kind, ID suggestion, structural fields, gloss and
explicit status. Complex values (predicate registry, qualifier resolution,
provenance, quantities, Reduction mappings) open focused editors while retaining the
canvas selection.

Drag-to-connect operates only in the proposal overlay, requires choosing an edge
layer before completion, previews direction and relation, and enforces typed ports.
Dropping several premises on one gate makes conjunction; **Add alternative** creates
a new gate. The user can reorder proposition arguments but cannot reorder an
environment to imply priority.

Undo/redo covers proposal operations only. Autosave stores a local proposal draft,
not canonical knowledge. Concurrent base-revision changes trigger a visible rebase
review before ingestion submission.

## C6. Accessibility and export

All canvas information has a non-canvas equivalent: tree/table navigation, ordered
edge lists grouped by layer, support alternative list, and proposal form. Keyboard
users can create gates and edges without dragging. Shapes, text and line patterns
carry meanings redundantly with color; focus order follows the selected layout or an
explicit logical traversal chosen by the user.

Exported diagrams include stable IDs, layer legend, current filters, FAST/EXACT/cache
state for displayed computed results, and a watermark when proposal content is
included. Copy/export of support preserves braces and typed projections rather than
flattening to prose.

# D. Underlying UI capability checklist

Each line is an independently testable contract item. **[Advanced]** flags a likely
high-cost widget capability; it remains required.

- **D001** Render a pannable and zoomable node-and-edge canvas without rasterizing node text.
- **D002** Render at least twelve distinguishable first-class node/gate/container shapes in one scene.
- **D003** Render node content with stable ID, kind, primary structural expression, gloss label and status slots.
- **D004** Render four simultaneous edge styles using geometry or dash pattern in addition to color.
- **D005** Keep arrowheads visible and correctly oriented at every supported interactive zoom level.
- **D006** Render persistent edge labels that can collapse to a layer token below a configurable zoom threshold.
- **D007** Expose each edge's layer, direction, relation and endpoints to assistive technology.
- **D008 [Advanced]** Render a many-input/one-output justification gate as a selectable first-class object.
- **D009 [Advanced]** Route premise, assumption and anchor connections to separate typed ports on a justification gate.
- **D010 [Advanced]** Render an OR collector joining two or more alternative justification gates to one conclusion.
- **D011** Preserve separate parallel edges between the same endpoint pair.
- **D012** Render self-loops and reciprocal directed edges without overlapping their arrowheads.
- **D013 [Advanced]** Route overlapping edges so a selected edge can be traced continuously between endpoints.
- **D014** Show, hide and emphasize each of four edge layers independently.
- **D015** Display visible-edge and total-edge counts for every layer.
- **D016** Apply layer visibility as client state without deleting or mutating graph data.
- **D017 [Advanced]** Compute or render supplied strongly connected components separately for each edge layer.
- **D018** Display a normal DOMAIN-cycle treatment distinct from a JUSTIFICATION-cycle warning.
- **D019** Render a ConstraintSystem as a labelled container with member nodes and solution-semantics text.
- **D020** Render a Reduction as a node with source/target frameworks, type, regime, mapping and error-bound slots.
- **D021 [Advanced]** Collapse a selected subgraph into one capsule while preserving typed and directed boundary ports.
- **D022** Report contained node-kind, framework and edge-layer counts on a collapsed capsule.
- **D023** Surface contained Gap, unsupported, status and justification-cycle markers on a collapsed capsule.
- **D024** Restore node selection and local positions when a capsule is expanded.
- **D025 [Advanced]** Virtualize off-screen graph elements without breaking selection, search or edge continuity.
- **D026** Provide zoom-to-fit, minimap, pan, wheel/pinch zoom and keyboard zoom controls.
- **D027** Provide breadcrumb plus back/forward navigation across node and edge selections.
- **D028** Focus a configurable N-hop neighborhood without changing graph data.
- **D029** Filter nodes by kind, framework, explicit status and proposal/canonical state.
- **D030** Search stable IDs, structural fields, canonical terms, aliases and glosses and identify which field matched.
- **D031 [Advanced]** Provide stable incremental auto-layout after nodes or edges are added to a proposal.
- **D032** Provide justification-flow layout with premises before their conclusion.
- **D033** Provide framework-cluster layout without encoding epistemic strength in distance or size.
- **D034** Provide a DOMAIN layout that preserves visible feedback cycles.
- **D035** Allow local node pinning and layout reset as reader-state operations.
- **D036** Render canonical and proposal planes simultaneously with a non-color proposal distinction.
- **D037** Prevent canonical fields and edges from entering editable state until a proposal is created.
- **D038** Create a draft adjacent to its canonical base and show field-by-field structural differences.
- **D039** Display `DRAFT — NOT CANONICAL` on every proposal editing surface.
- **D040** Support inline entry of kind, proposal ID, structural fields, gloss and explicit status on draft cards.
- **D041** Open focused editors for predicates, qualifiers, quantities, provenance, reductions and complex arguments without losing canvas selection.
- **D042** Support typed drag-to-connect ports only inside the proposal plane.
- **D043** Require an edge layer and direction before a proposed connection can be completed.
- **D044** Reject an incompatible connection with a visible type explanation and no proposal mutation.
- **D045** Turn multiple premises connected to one gate into a displayed conjunction.
- **D046** Create a separate justification gate when the user invokes `Add alternative justification`.
- **D047** Support proposal-only undo and redo without affecting reader history or canonical data.
- **D048** Autosave proposal state separately from canonical graph and reader state.
- **D049** Detect a changed canonical base revision and require a visible rebase review before submission.
- **D050** Render support as an ordered-for-display list of environment cards separated by explicit `OR` labels.
- **D051** Render empirical observations, formal derivations and assumptions in three labelled compartments in every environment card.
- **D052** Render empty compartments explicitly rather than omitting a projection.
- **D053** Render `support(X) = ∅` with an unsupported component.
- **D054** Render `support(X) = {∅}` with a distinct support-independent component.
- **D055** Preserve nested braces and typed atom IDs when support is copied or exported.
- **D056** Allow environment cards to expand, collapse, filter and compare without changing the stated total environment count.
- **D057** Label every environment sort control `Display order only` or equivalent non-ranking language.
- **D058** Display FAST cache count, completeness and truncation state with every cached support result.
- **D059** Display a truncation notice stating that cached selection is arbitrary and non-epistemic.
- **D060** Display empirical grounding together with all assumptions in the same environment.
- **D061** Prohibit the generic bare label `grounded` in support-summary components.
- **D062** Render reach only as an unranked set behind a weak-signal disclosure.
- **D063** Prevent reach from being bound to score, percentage, progress, rank, node size or edge thickness components.
- **D064** Render explicit Assertion status independently of the support component.
- **D065** Require an explicit status value in every Assertion proposal.
- **D066** Never derive a status selection from empty or nonempty support.
- **D067** Render canonical Gap, unsupported Assertion and draft unresolved reference as three distinct object types.
- **D068** Provide a termination-ledger row for every visible justification leaf in a proposal.
- **D069** Detect and list proposal leaves that lack a termination classification.
- **D070** Let a user resolve a draft hole by linking/creating an object or proposing a Gap without choosing automatically.
- **D071** Render YES, NO and UNKNOWN in equally sized result components.
- **D072** Render UNKNOWN with neutral question-state semantics rather than error or warning semantics.
- **D073** Display query name, target, commitment set, FAST/EXACT mode and cache state with every query verdict.
- **D074** Display a witness environment or registered conflict when supplied by the query API.
- **D075** Provide a client-held commitment tray whose contents do not write to canonical knowledge.
- **D076** Restrict one query tray to atoms from one graph and canonical revision.
- **D077** Run FAST without an unbounded-cost confirmation.
- **D078** Require explicit confirmation labelled `Run EXACT (unbounded cost)` before starting EXACT.
- **D079 [Advanced]** Display progress and permit cancellation for a running EXACT operation.
- **D080** Render cancellation, resource exhaustion and server failure as `Did not complete`, never UNKNOWN.
- **D081** Prevent a completed EXACT operation from rendering UNKNOWN.
- **D082** Display that compatibility means absence of registered conflict, not proved logical consistency.
- **D083** Keep named commitment sets as reader state or exported reader settings, not knowledge proposals.
- **D084** Render predicate hierarchy with definition, parent, framework, examples, counterexamples and provenance slots.
- **D085** Reject banned predicate names in proposal validation with the precise rule violated.
- **D086** Require a parent for a proposed non-primitive predicate.
- **D087** Provide an explicit framework-primitive predicate proposal path distinct from ordinary predicate creation.
- **D088** Render qualifier canonical phrase, aliases, declared roles, framework, definition and provenance slots.
- **D089** Permit multiple selected roles for one qualifier use.
- **D090** Preserve qualifier ID, not selected roles or prose, in the displayed assertion canonical key.
- **D091** Keep an unresolved qualifier as a proposal object and never style it as a canonical qualifier.
- **D092** Compose propositions from predicate reference plus typed ordered arguments.
- **D093** Support structured literal arguments carrying value, relation, units, uncertainty and time/context fields.
- **D094** Require exactly one framework in an Assertion proposal.
- **D095** Route cross-framework composition to a proposed justification premise/mapping instead of a second Assertion framework.
- **D096** Attach empirical/formal anchors and assumptions to a justification gate, never directly to an Assertion.
- **D097** Render rule, framework and provenance fields on the justification gate.
- **D098** Record expected support as validation-only proposal data and never serialize it as a canonical label.
- **D099** Compare expected and computed support as sets of sets without flattening or ranking.
- **D100** List every unresolved reference and omitted required provenance field before submission.
- **D101** Produce a structural proposal diff containing additions, replacements, retirements and canonical references.
- **D102** Validate node types, references, predicate rules, one-framework rule, qualifier resolution, edge layers and typed gate ports.
- **D103** Validate that every conjunctive premise remains in one gate and every alternative remains in a separate gate.
- **D104** Validate proposal termination-ledger completeness without inferring scientific Gap status.
- **D105** Block lossless-ready status when fields would be discarded by the current ingestion/model contract.
- **D106** Export an incomplete proposal with its validation findings while distinguishing it from ready submission.
- **D107** Submit a proposal package to ingestion through an explicitly labelled handoff action.
- **D108** Display accepted, rejected and partially accepted ingestion outcomes per proposal object.
- **D109** Preserve rejected proposal content and reasons for revision.
- **D110** Avoid displaying an accepted proposal object as canonical until a fresh canonical read returns its ID.
- **D111** Provide a complete non-canvas tree/table alternative for graph reading and proposal composition.
- **D112** Allow every canvas selection, traversal, gate creation and connection operation from a keyboard.
- **D113** Encode node kind, support atom kind, layer, canonical/draft state and result state with text/shape as well as color.
- **D114** Export diagrams with stable IDs, layer legend, active filters and proposal watermark when applicable.
- **D115** Export computed results with query mode and cache/truncation state.
- **D116 [Advanced]** Render a test fixture containing 30 nodes, 30 justification gates and 120 mixed-layer edges with no omitted node, gate, port, label or edge.
- **D117** Render an Assumption on a cyclic justification gate differently from an Assumption supplying a separate alternative justification.

# E. Open questions and recommendations

These questions are not silently resolved by the UI. Where they affect meaning, the
interface exposes the uncertainty rather than choosing an answer.

## E1. Public exact support enumeration

**Question.** The public read API returns only the bounded cached label; EXACT exists
for verdict queries but not for enumerating the canonical label. Should the client be
able to request/display an exact set of environments?

**Tradeoff.** Without it, the Support explorer cannot show omitted environments or
verify an expected complete grounding expression. With it, response size and
construction cost are unbounded and measured exponential growth can exhaust memory.

**Recommendation.** Add a cancellable/streaming exact-label read contract with
explicit resource failure, or explicitly declare exact enumeration unavailable. Do
not simulate it from the cache and do not call a bounded construction EXACT.

## E2. EXACT resource exhaustion

**Question.** Errata E3 says EXACT never returns UNKNOWN, while hardening S2 shows
construction can run out of memory and has no bound.

**Tradeoff.** Silent truncation is unsound; unbounded work can kill a server.

**Recommendation.** Define an operational non-answer distinct from the logical
three-valued result: completed EXACT is YES/NO, while cancelled/exhausted/failed is
`DID_NOT_COMPLETE` outside `QueryResult`. The UI contract already reserves this
display.

## E3. Assertion atomicity

**Question.** May one proposition contain `A ∧ B`, as `n03` suggests?

**Tradeoff.** Allowing it preserves source phrasing but can hide separately reusable
claims; forbidding it expands the graph and may force unnatural decompositions.

**Recommendation.** Prefer split assertions and make the conjunction visible in a
justification, but treat this as authoring guidance until the semantic rule is frozen.

## E4. Unauthored reference versus scientific Gap

**Question.** When does a missing draft premise warrant a canonical Gap?

**Tradeoff.** Auto-promoting draft incompleteness pollutes knowledge with workflow
state; refusing Gap creation hides genuine explanation boundaries.

**Recommendation.** Keep **draft unresolved reference** in proposal state and require
a human to propose a Gap with endpoints, known dependency, missing content and type.

## E5. Frameworks on non-Assertion nodes

**Question.** The worksheet gives the Entity `n01` two frameworks, while the current
Entity model has no framework relation and the one-framework invariant applies to
Assertions.

**Tradeoff.** Copying the array repeats the ambiguity v0.3 removed; dropping it loses
content.

**Recommendation.** Return it as an unresolved modeling decision. Likely encode
separate assertions/classifications or provenance-bearing DOMAIN relations, not an
untyped metadata array.

## E6. Qualifier synonym confidence

**Question.** What threshold or review flow maps a phrase to a canonical qualifier?

**Tradeoff.** Aggressive matching merges distinct contexts; conservative matching
creates proposal load and duplicates.

**Recommendation.** Show ranked candidates as noncanonical suggestions, require
explicit author selection, and send unmatched phrases as `PROPOSED_QUALIFIER` to
ingestion/curation. Never auto-mint.

## E7. Evidence exclusion authoring

**Question.** How does an anchor that counts against a conclusion attach, given that
the current P0 model has supporting anchors but no exclusion-polarity object and P1
constraints are absent?

**Tradeoff.** Treating exclusion as negated support misstates the design; omitting it
loses a central evidence polarity.

**Recommendation.** Keep the authoring control in the contract but block lossless
submission until the Constraint/exclusion model and ingestion shape are defined.

## E8. Witness/explanation reads for query verdicts

**Question.** Current query methods return a verdict, not the compatible environment
or registered conflict that witnessed it.

**Tradeoff.** A verdict-only UI is semantically valid but difficult to audit; deriving
a witness client-side can disagree with server computation or expose only cached data.

**Recommendation.** Add provenance-bearing query explanations to the read API,
including mode and cache revision. Until then, label witness sections as unavailable,
not inferred.

## E9. Gap contender and constraint maturity

**Question.** The model stores passive Gap fields but contender/constraint machinery
is deferred.

**Tradeoff.** A rich Gaps view would promise operations the model cannot yet answer;
a bare record underserves the stated first-class role.

**Recommendation.** Implement read-only passive fields first, visibly mark unavailable
contender/constraint computation, and retain the full view contract for P2.

## E10. Cross-graph commitments

**Question.** Should a commitment query ever combine graph instances or revisions?

**Tradeoff.** It could support comparison, but the current engine has a known wrong-
graph conflict defect and identity/revision semantics are not specified.

**Recommendation.** Restrict a workbench query to one graph and revision. Design a
separate comparison operation later rather than relaxing this guard.

# Implementation handoff report

## Design decisions made where the specification was silent

This is the consolidated decision log. Semantically forced choices are included when
the specification left their visual treatment open; their reason is fidelity rather
than preference.

1. **Canvas plus synchronized detail and table/tree fallback.** The canvas is primary
   because topology is the subject, while the fallback makes the same structure
   inspectable without spatial navigation and supports accessibility.
2. **Canonical, reader-state and proposal planes remain separate.** Simultaneous but
   distinct planes let authors work in context while keeping the ingestion boundary
   continuously visible.
3. **Stable ID/kind and structural expression precede the gloss.** The gloss may be
   typographically prominent for reading, but an explicit label prevents prose from
   being mistaken for identity.
4. **Support uses OR-separated environment cards with three fixed compartments.**
   Cards are more scannable than braces alone; fixed empirical/formal/assumption rows
   keep the exact projections visible, and exact braces remain in copy/export.
5. **Environment order is deterministic but explicitly non-ranked.** Stable ordering
   helps comparison and screenshots without suggesting that the first or smallest
   environment is stronger.
6. **`∅` and `{∅}` use different components, icons, notation and prose.** Redundancy
   makes the errata E1 distinction survive color loss, translation and quick reading.
7. **A Justification is a selectable `∧` gate; alternatives meet at an OR collector.**
   A hyperedge-like object is the smallest visual form that preserves conjunction,
   alternative and gate-owned assumptions/anchors.
8. **The four layers use fixed non-color geometries and persistent direction.** Line
   pattern, gate shape, document glyph and chevrons keep layers identifiable under
   monochrome display and edge selection.
9. **The overview emphasizes one layer while retaining or optionally hiding the
   others.** This reduces initial overload without presenting a filtered view as the
   complete graph.
10. **Framework clustering is the default spatial grouping.** Framework is an actual
    structural field and therefore a safer navigation aid than support cardinality,
    status or an invented similarity metric.
11. **DOMAIN cycles render normally; JUSTIFICATION cycles receive the circularity
    treatment; ConstraintSystems are containers.** These forms prevent dynamics and
    simultaneous solution from looking like circular reasoning.
12. **Node distance, node size, edge thickness and environment order carry no
    epistemic strength.** The model defines none, so assigning one would invent a
    score.
13. **Reach sits behind a weak-signal disclosure as an unranked set.** De-emphasis
    prevents a distinct-anchor count from reading as confidence or independence.
14. **YES, NO and UNKNOWN use equal neutral panels.** Equal visual weight prevents
    UNKNOWN from reading as an exception; operational failures use a separate `Did
    not complete` component.
15. **EXACT requires an explicit unbounded-cost confirmation with progress and
    cancellation.** This makes the errata's deliberate-cost boundary actionable
    without weakening the completed-result semantics.
16. **Draft unresolved references, canonical Gaps and unsupported Assertions use
    distinct objects.** Workflow incompleteness, a known explanatory boundary and an
    empty label are different facts and must remain independently actionable.
17. **Expected grounding is proposal validation data only.** Comparing an author's
    expectation can find a missing edge, while storing it as a label would compete
    with the computed canonical result.
18. **Registry search precedes coining and suggestions stay noncanonical.** Reuse
    limits vocabulary fragmentation without allowing approximate synonym matching to
    mint identity.
19. **Inline editing means proposal composition; canonical cards never become
    editable.** This satisfies direct human authoring without implying that the
    client writes knowledge.
20. **Collapsed subgraphs preserve boundary layer/direction and surface contained
    problems.** Collapse is necessary for scale, but hiding a Gap, status or circular
    justification would make navigation alter the apparent semantics.
21. **Reader layouts, commitment trays and filters are separately saveable client
    state.** They are useful to a reader but are neither claims nor ingestion
    proposals.
22. **Partial ingestion receipts are reconciled per object and never optimistically
    restyled as canonical.** A fresh canonical read is the only reliable source of
    accepted IDs and prevents silently dropped dependencies.
23. **Commitment queries are restricted to one graph revision.** Cross-revision
    meaning is unspecified and the hardening report identifies a wrong-graph conflict
    defect, so comparison needs a future dedicated operation.
24. **The action-potential walkthrough stops where the worksheet stops.** Showing
    unresolved `n04`, `n05` and `e02` exposes the precise human decisions the
    interface must support without fabricating content.

## What is hard or impossible to represent, and what the model lacks

The set-of-sets label is visually dense but representable with environment cards. Its
worst-case size is not representable all at once: the measured exact family can be
exponential, so the UI needs virtualization/streaming and the API needs a resource
contract. The current public API cannot enumerate the exact untruncated label at all.

AND/OR support is representable only with hyperedge-like justification gates. A
generic pairwise node-edge canvas will lie by making three conjunctive premises look
like three alternatives. Four simultaneous layers, reciprocal DOMAIN dynamics and
layer-specific cycle analysis make routing and collapse unusually demanding; these
are flagged as advanced checklist items but not weakened.

The current model/read surface is missing or incomplete for these required displays:

- general edge objects carrying JUSTIFICATION, DOMAIN, PREREQUISITE or PROVENANCE
  layer; only justification membership exists;
- Source nodes and provenance relations;
- observation text, source, inspectability and evidence polarity on anchors;
- rule, framework and provenance on Justification;
- Assumption definition/gloss/provenance;
- Predicate examples, counterexamples and provenance;
- Entity framework/classification relations used by the worksheet;
- a richer canonical proposition AST beyond predicate plus unconstrained arguments;
- structured literal value/uncertainty/time constraints;
- Reduction nodes and cross-framework mappings;
- Constraint and ConstraintSystem nodes;
- exclusion-bearing evidence and collision/falsifiability reads;
- PREREQUISITE/`REQUIRES` relations;
- Gap contender and constraint behavior beyond passive fields;
- public exact-label enumeration;
- query witness/conflict explanations;
- a public support robustness operation distinct from the canonical justification
  graph; and
- an operational contract for EXACT cancellation/resource exhaustion.

Status is present and explicit in the Assertion model, and Gap is a real passive node,
so both can be represented honestly today. Support, its three projections,
FAST/EXACT verdicts and truncation state are readable today. `reach()` is readable but
must remain deliberately de-emphasized. The open wrong-graph conflict defect is not a
visual limitation; the client guard reduces exposure but does not fix the engine.

## Coverage of the twelve chain encoding findings

“Fixed” here means the designed interface plus its required ingestion/model contract
removes the human authoring friction without loss. A document cannot itself repair a
model gap.

| Chain item | Interface outcome | Fixed by interface? |
|---|---|---|
| 1. Entity nodes unrepresentable | Entity is a first-class card and proposal kind. Current `web.model` now has Entity, unlike the older construction surface audited by the chain. | **Yes**, subject to ingestion support. |
| 2. Predicate, Quantity, Framework and Gap unrepresentable | All are first-class registry/canvas/proposal objects; Gap has its own view. Current model includes these P0 kinds. | **Yes** for core records; contender/constraint behavior remains deferred. |
| 3. Nodes carry no attributes | Structural inspectors and typed proposal forms require every worksheet field to have a visible destination or a lossless-preflight blocker. | **Partly.** Assertion/predicate/quantity/qualifier fields improved in the current model; anchor/source and several rich fields are still missing. |
| 4. Predicates absent/rules unenforceable | Registry-first authoring, parent/definition requirements, banned-name validation and precise relation labels make predicate choice inspectable. | **Mostly yes.** Examples/counterexamples/provenance and richer signatures still need model/API fields. |
| 5. Justification metadata dropped | First-class gate requires rule, framework and provenance and makes the full conjunction visible. | **No at model level.** The UI contract fixes the workflow, but current Justification cannot store those fields. |
| 6. Anchor provenance dropped; EXCLUDES impossible | Anchor authoring requires observation/source/inspectability/polarity and provenance view. | **No at model level.** Current anchors are name-only and exclusion awaits constraints/polarity semantics. |
| 7. Framework transitions absent | One framework per assertion plus explicit Reduction/mapping premise and cross-framework validation. | **No at model level.** Reduction and general typed edges are not implemented. |
| 8. Grounding requires an invented justification | UI never accepts direct assertion grounding; it asks the person to create and describe the missing justification gate. | **Yes as workflow**, while faithfully requiring a human decision rather than inventing it. |
| 9. Declared grounding cannot be checked | Expected support can be entered as validation-only set-of-sets and compared with computed support, with mismatch tracing. | **Partly.** Cached comparison works; complete comparison needs a public exact-label read and `e02` still needs human authorship. |
| 10. Unauthored premises silently empty support | Draft unresolved references are visible, block ready validation, appear in the termination ledger and remain distinct from empty support, Gap and REFUTED. | **Yes as workflow/display.** No scientific status is inferred. |
| 11. Assumptions have no worksheet counterpart | Assumption is a first-class authoring choice, typed gate port, support projection and termination class. | **Yes for identity/support.** Current Assumption lacks descriptive/provenance fields. |
| 12. Framework/scope/condition overlap has nowhere to land | Canonical qualifiers allow multiple roles and the UI exposes role selection and proposal resolution. | **Yes for role overlap.** Synonym resolution confidence remains open and requires curation. |

Overall, the interface design directly resolves items **1, 2, 4, 8, 10, 11 and
12** at the interaction level; resolves **3 and 9 partially**; and deliberately does
not claim to resolve model blockers **5, 6 and 7**. Items 3, 4 and 11 also retain
smaller provenance/content gaps noted above. The capability checklist includes all of
them anyway, including the expensive canvas, exact-computation and lossless-authoring
requirements, because feasibility belongs to the implementation session.
