/* Generated from fixtures/golden/workspace.v1.schema.json. SHA256: d9fd14d0d8f9708784f0257eded8bc7894194a08d656b4094012b7122e84f430. Do not edit. */

export type GeneratedWorkspaceWireMessage =
  GraphWorkspaceDocument | WorkspaceCommand | WorkspaceResponse;
export type Command = string;
export type Confirmation = string | null;
export type Id = string;
export type Label = string;
export type JsonValue = unknown;
export type Scope = "reader" | "proposal" | "submission";
export type Transport = "local" | "server";
export type Actions = WorkspaceAction[];
export type KnownRecords = number | null;
export type LoadedRecords = number;
export type Reason = string | null;
export type Stage = string | null;
export type State = "loading" | "complete" | "partial" | "failed" | "cancelled";
export type GraphId = string;
export type Revision = string;
export type ElementId = string;
export type ElementKind = "node" | "edge" | "group";
export type Plane = "canonical" | "proposal";
export type RecordId = string;
export type Bindings = WorkspaceProjectionBinding[];
export type Id1 = string;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Position = [unknown, unknown];
/**
 * @minItems 2
 * @maxItems 2
 */
export type Size = [unknown, unknown];
export type Text = string;
export type Comments = GraphComment[];
/**
 * Optional complete accessible name; a deterministic name is generated if absent.
 */
export type AccessibleLabel = string | null;
export type Id2 = string;
/**
 * Persistent edge label.
 */
export type Label1 = string | null;
/**
 * Id of the caller-defined edge layer.
 */
export type Layer = string | null;
/**
 * Machine-stable or human-readable relation identifier.
 */
export type Relation = string | null;
/**
 * Source node id.
 */
export type Source = string;
export type SourcePort = string;
/**
 * Target node id.
 */
export type Target = string;
export type TargetPort = string;
export type Edges = GraphEdge[];
export type Format = "lcars-node-graph";
export type Color =
  | (
      | "orange"
      | "red"
      | "blue"
      | "purple"
      | "white"
      | "yellow"
      | "pale-canary"
      | "tanoi"
      | "golden-tanoi"
      | "neon-carrot"
      | "eggplant"
      | "lilac"
      | "anakiwa"
      | "mariner"
      | "bahama-blue"
      | "blue-bell"
      | "melrose"
      | "hopbush"
      | "chestnut-rose"
      | "orange-peel"
      | "atomic-tangerine"
      | "danub"
      | "indigo"
      | "lavender-purple"
      | "cosmic"
      | "red-damask"
      | "medium-carmine"
      | "bourbon"
      | "sandy-brown"
      | "periwinkle"
      | "dodger-pale"
      | "dodger-soft"
      | "near-blue"
      | "navy-blue"
      | "husk"
      | "rust"
      | "tamarillo"
    )
  | string
  | null;
export type Id3 = string;
export type Label2 = string | null;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Position1 = [unknown, unknown];
/**
 * @minItems 2
 * @maxItems 2
 */
export type Size1 = [unknown, unknown];
export type Groups = GraphGroup[];
/**
 * Optional redundant color cue.
 */
export type Color1 =
  | (
      | "orange"
      | "red"
      | "blue"
      | "purple"
      | "white"
      | "yellow"
      | "pale-canary"
      | "tanoi"
      | "golden-tanoi"
      | "neon-carrot"
      | "eggplant"
      | "lilac"
      | "anakiwa"
      | "mariner"
      | "bahama-blue"
      | "blue-bell"
      | "melrose"
      | "hopbush"
      | "chestnut-rose"
      | "orange-peel"
      | "atomic-tangerine"
      | "danub"
      | "indigo"
      | "lavender-purple"
      | "cosmic"
      | "red-damask"
      | "medium-carmine"
      | "bourbon"
      | "sandy-brown"
      | "periwinkle"
      | "dodger-pale"
      | "dodger-soft"
      | "near-blue"
      | "navy-blue"
      | "husk"
      | "rust"
      | "tamarillo"
    )
  | string
  | null;
export type DefaultEmphasized = boolean;
export type DefaultVisible = boolean;
/**
 * Meaning announced in the legend and edge details.
 */
export type Description = string | null;
export type Id4 = string;
/**
 * Legend label; defaults to the id.
 */
export type Label3 = string | null;
export type LabelZoomThreshold = number;
/**
 * Terminal marker.
 */
export type Marker = "arrow_closed" | "arrow_open" | "none";
/**
 * Non-color line treatment for this layer.
 */
export type Pattern = "solid" | "dashed" | "dotted" | "double";
/**
 * Compact label used below the edge's zoom threshold.
 */
export type Token = string | null;
export type Layers = GraphLayer[];
/**
 * Id of the group this belongs to.
 */
export type Group = string | null;
export type Id5 = string;
/**
 * Per-instance title override.
 */
export type Label4 = string | null;
/**
 * Absolute x, y.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Position2 = [unknown, unknown];
/**
 * Id of the NodeTemplate this instantiates.
 */
export type Template = string;
export type Nodes = GraphNode[];
/**
 * Id of the edge this reroute sits on.
 */
export type Edge = string;
export type Id6 = string;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Position3 = [unknown, unknown];
export type Reroutes = GraphReroute[];
/**
 * Palette grouping.
 */
export type Category = string | null;
/**
 * LCARS accent for this type.
 */
export type Color2 =
  | (
      | "orange"
      | "red"
      | "blue"
      | "purple"
      | "white"
      | "yellow"
      | "pale-canary"
      | "tanoi"
      | "golden-tanoi"
      | "neon-carrot"
      | "eggplant"
      | "lilac"
      | "anakiwa"
      | "mariner"
      | "bahama-blue"
      | "blue-bell"
      | "melrose"
      | "hopbush"
      | "chestnut-rose"
      | "orange-peel"
      | "atomic-tangerine"
      | "danub"
      | "indigo"
      | "lavender-purple"
      | "cosmic"
      | "red-damask"
      | "medium-carmine"
      | "bourbon"
      | "sandy-brown"
      | "periwinkle"
      | "dodger-pale"
      | "dodger-soft"
      | "near-blue"
      | "navy-blue"
      | "husk"
      | "rust"
      | "tamarillo"
    )
  | string
  | null;
export type Default = string | number | boolean | null;
/**
 * Field identifier, unique within the template.
 */
export type Id7 = string;
export type Kind = "text" | "number" | "boolean" | "select";
export type Label5 = string | null;
export type Max = number | null;
export type Min = number | null;
export type Label6 = string | null;
export type Value = string;
/**
 * Choices for kind='select'.
 */
export type Options = GraphFieldOption[];
export type Placeholder = string | null;
export type Step = number | null;
export type Fields = GraphField[];
export type Id8 = string;
/**
 * Maximum simultaneous connections. Defaults by side when unset: one for an input, unlimited for an output.
 */
export type Capacity = number | null;
/**
 * Port identifier, unique within its side of the template.
 */
export type Id9 = string;
/**
 * Display label; defaults to the id.
 */
export type Label7 = string | null;
/**
 * Port data type; 'any' matches everything.
 */
export type Type = string;
export type Inputs = GraphPort[];
export type Label8 = string | null;
export type Outputs = GraphPort[];
export type Templates = NodeTemplate[];
export type Version = 1 | 2;
export type X = number;
export type Y = number;
export type Zoom = number;
export type Id10 = string;
export type Kind1 = string;
export type Label9 = string | null;
export type Format1 = "lcars-structured-value";
export type Id11 = string;
export type Part = string;
export type Schema = string;
export type Version1 = 1;
export type Records = WorkspaceRecord[];
export type Format2 = "lcars-graph-workspace";
/**
 * A semantic decision counts even when accepting a supplied suggestion.
 */
export type CommittedSemanticChoicesCount = true;
/**
 * A committed command counts once regardless of affected record count.
 */
export type CompoundCommandUnits = 1;
/**
 * Individual DOM, React, React Flow, and transport events do not count.
 */
export type ImplementationEventsCount = false;
export type IntermediateEditsCount = false;
export type KeystrokesCount = false;
export type PassivePreviewsCount = false;
export type PointerMovesCount = false;
export type ReaderCommandsCount = false;
/**
 * One intentional proposal command or one committed proposal field/group edit.
 */
export type Unit = "committed_proposal_command_or_edit";
export type BaseRecordId = string | null;
export type Dependencies = string[];
export type Id12 = string;
export type Operation = "addition" | "replacement" | "retirement" | "reference" | "unresolved";
export type RecordId1 = string;
export type Changes = ProposalChange[];
export type Blocking = boolean;
export type Id13 = string;
export type Message = string;
export type RuleId = string | null;
export type Severity = "info" | "warning" | "error";
export type Source1 = "client" | "caller" | "server";
export type ElementId1 = string;
export type ElementKind1 = "record" | "node" | "edge" | "group" | "capsule";
export type Path = string | null;
export type Plane1 = "canonical" | "proposal";
export type Findings = ValidationFinding[];
export type InteractionCount = number;
export type ProposalId = string;
export type Revision1 = number;
export type Status = "draft" | "ready" | "submitted" | "historical";
export type Title = string;
export type Id14 = string;
export type Label10 = string;
export type ElementId2 = string;
export type ElementKind2 = "record" | "node" | "edge" | "group" | "capsule";
export type Plane2 = "canonical" | "proposal";
export type Step1 = string | null;
export type Breadcrumb = ReaderNavigationEntry[];
export type Collapsed = string[];
export type CurrentStep = string | null;
export type Facet = string;
/**
 * @minItems 1
 */
export type Values1 = [string, ...string[]];
export type Filters = ReaderFilter[];
export type Direction = "incoming" | "outgoing" | "both";
export type Radius = number;
export type RecordId2 = string;
export type History = ReaderNavigationEntry[];
export type HistoryIndex = number;
export type Emphasized = boolean;
export type Visible = boolean;
export type Revision2 = number;
export type Search = string;
export type Selection = WorkspaceSelection[];
export type FreshCanonicalReadRequired = true;
export type CanonicalId = string | null;
export type Dependencies1 = string[];
export type Outcome = "accepted" | "rejected" | "partial" | "pending";
export type ProposalRecordId = string;
export type Reason1 = string | null;
export type Objects = ReceiptObject[];
export type Outcome1 = "accepted" | "rejected" | "partial" | "pending";
export type ProposalId1 = string;
export type ReceiptId = string;
export type Color3 = string | null;
export type Shape = string;
export type Token1 = string;
export type Label11 = string;
export type Choices = WorkspaceChoice[];
export type Description1 = string | null;
export type Id15 = string;
export type Label12 = string;
export type ReferenceKinds = string[];
export type Required = boolean;
export type Structural = boolean;
export type TreeSchema = string | null;
export type ValueKind =
  | "text"
  | "number"
  | "boolean"
  | "choice"
  | "reference"
  | "reference_list"
  | "object"
  | "list"
  | "tree"
  | "unknown";
export type Fields3 = WorkspaceFieldSchema[];
export type Kind2 = string;
export type Label13 = string;
export type Id16 = string;
export type Label14 = string;
export type Match = "exact" | "text" | "token" | "structural";
export type Path1 = string;
export type SearchFields = WorkspaceSearchField[];
export type RecordSchemas = WorkspaceRecordSchema[];
export type Id17 = string;
export type Label15 = string;
export type Limitation = string | null;
/**
 * @minItems 1
 */
export type Parts = [WorkspaceTreePartSchema, ...WorkspaceTreePartSchema[]];
export type Fields4 = WorkspaceFieldSchema[];
export type Id18 = string;
export type Label16 = string;
/**
 * @minItems 1
 */
export type Accepts = [string, ...string[]];
export type Cardinality = "one" | "optional" | "many";
export type Id19 = string;
export type Label17 = string;
export type Ordered = boolean;
export type Slots1 = WorkspaceTreeSlotSchema[];
export type Token2 = string;
/**
 * @minItems 1
 */
export type RootParts = [string, ...string[]];
export type UnsupportedParts = string[];
export type TreeSchemas = WorkspaceTreeSchema[];
export type Blocking1 = boolean;
export type Evaluator =
  "required" | "allowed_values" | "reference_kind" | "tree_shape" | "server" | "custom";
export type Field = string | null;
export type Id20 = string;
export type Label18 = string;
export type Message1 = string;
export type Scope1 = "record" | "field" | "tree" | "connection" | "proposal" | "submission";
export type Severity1 = "info" | "warning" | "error";
export type TargetKinds = string[];
export type ValidationRules = WorkspaceValidationRule[];
export type Version2 = 1;
export type WorkspaceId = string;
export type ActionId = string;
export type CommandId = string;
export type Format3 = "lcars-graph-workspace-command";
export type ProposalId2 = string | null;
export type ProposalRevision = number | null;
export type ReaderRevision = number;
export type Scope2 = "reader" | "proposal" | "submission";
export type Version3 = 1;
export type WorkspaceId1 = string;
export type CommandId1 = string;
export type Findings1 = ValidationFinding[];
export type Format4 = "lcars-graph-workspace-response";
export type Message2 = string | null;
export type Status1 = "ok" | "rejected" | "conflict";
export type Version4 = 1;
export type WorkspaceId2 = string;

/**
 * Top-level workspace wire document inherited by all authoring phases.
 */
export interface GraphWorkspaceDocument {
  actions?: Actions;
  canonical: CanonicalPlane;
  format: Format2;
  interaction_policy?: WorkspaceInteractionPolicy;
  proposal?: ProposalPlane | null;
  reader?: WorkspaceReaderState;
  receipt?: IngestionReceipt | null;
  record_schemas?: RecordSchemas;
  tree_schemas?: TreeSchemas;
  validation_rules?: ValidationRules;
  version: Version2;
  workspace_id: WorkspaceId;
}
/**
 * Caller-supplied action surfaced by later workspace render phases.
 */
export interface WorkspaceAction {
  command: Command;
  confirmation?: Confirmation;
  id: Id;
  label: Label;
  metadata?: Metadata;
  scope: Scope;
  transport?: Transport;
}
export interface Metadata {
  [k: string]: JsonValue;
}
/**
 * Immutable application-supplied records from one graph revision.
 */
export interface CanonicalPlane {
  completeness?: WorkspaceCompleteness;
  graph: GraphRevision;
  projection?: WorkspaceProjection;
  records?: Records;
}
/**
 * How much of a revision-bound result or plane is currently available.
 */
export interface WorkspaceCompleteness {
  known_records?: KnownRecords;
  loaded_records?: LoadedRecords;
  reason?: Reason;
  stage?: Stage;
  state?: State;
}
/**
 * Identity of one immutable canonical graph revision.
 */
export interface GraphRevision {
  graph_id: GraphId;
  revision: Revision;
}
/**
 * Renderer-neutral graph projection; viewport remains reader state.
 */
export interface WorkspaceProjection {
  bindings?: Bindings;
  document?: GraphDocument;
}
/**
 * Bind code-rendered graph geometry to a record in one plane.
 */
export interface WorkspaceProjectionBinding {
  element_id: ElementId;
  element_kind: ElementKind;
  plane: Plane;
  record_id: RecordId;
}
/**
 * A complete node graph.
 *
 * Version 1 remains the original unlayered workflow document. Version 2
 * requires every edge to identify a declared layer. Optional fields keep
 * existing version-1 callers source- and wire-compatible.
 */
export interface GraphDocument {
  comments?: Comments;
  edges?: Edges;
  format?: Format;
  groups?: Groups;
  layers?: Layers;
  nodes?: Nodes;
  reroutes?: Reroutes;
  templates?: Templates;
  version?: Version;
  viewport?: GraphViewport;
}
/**
 * Free text pinned to the canvas.
 */
export interface GraphComment {
  id: Id1;
  position?: Position;
  size?: Size;
  text?: Text;
}
/**
 * A wire from one node's output to another node's input.
 */
export interface GraphEdge {
  accessible_label?: AccessibleLabel;
  id: Id2;
  label?: Label1;
  layer?: Layer;
  relation?: Relation;
  source: Source;
  source_port: SourcePort;
  target: Target;
  target_port: TargetPort;
}
/**
 * A titled frame drawn behind a set of nodes.
 */
export interface GraphGroup {
  color?: Color;
  id: Id3;
  label?: Label2;
  position?: Position1;
  size?: Size1;
}
/**
 * Caller-defined visual grammar for one edge layer.
 *
 * Layer ids and meanings belong to the application. LCARS only knows how to
 * render the supplied visual treatment and expose it as reader state.
 */
export interface GraphLayer {
  color?: Color1;
  default_emphasized?: DefaultEmphasized;
  default_visible?: DefaultVisible;
  description?: Description;
  id: Id4;
  label?: Label3;
  label_zoom_threshold?: LabelZoomThreshold;
  marker?: Marker;
  pattern?: Pattern;
  token?: Token;
}
/**
 * A placed instance of a template.
 */
export interface GraphNode {
  group?: Group;
  id: Id5;
  label?: Label4;
  position?: Position2;
  template: Template;
  values?: Values;
}
/**
 * Field values, keyed by field id.
 */
export interface Values {
  [k: string]: string | number | boolean | null;
}
/**
 * A waypoint that bends an edge without changing what it connects.
 */
export interface GraphReroute {
  edge: Edge;
  id: Id6;
  position?: Position3;
}
/**
 * A node type: what it is called, what it carries, and how it wires up.
 */
export interface NodeTemplate {
  category?: Category;
  color?: Color2;
  fields?: Fields;
  id: Id8;
  inputs?: Inputs;
  label?: Label8;
  outputs?: Outputs;
}
/**
 * An editable value carried by a node.
 */
export interface GraphField {
  default?: Default;
  id: Id7;
  kind?: Kind;
  label?: Label5;
  max?: Max;
  min?: Min;
  options?: Options;
  placeholder?: Placeholder;
  step?: Step;
}
/**
 * One choice in a select field.
 */
export interface GraphFieldOption {
  label?: Label6;
  value: Value;
}
/**
 * One connection point on a node template.
 */
export interface GraphPort {
  capacity?: Capacity;
  id: Id9;
  label?: Label7;
  type?: Type;
}
/**
 * Where the canvas was last looking.
 */
export interface GraphViewport {
  x?: X;
  y?: Y;
  zoom?: Zoom;
}
/**
 * A caller-owned record represented without domain-specific fields.
 */
export interface WorkspaceRecord {
  fields?: Fields1;
  id: Id10;
  kind: Kind1;
  label?: Label9;
  structural_key?: unknown;
  trees?: Trees;
}
export interface Fields1 {
  [k: string]: JsonValue;
}
export interface Trees {
  [k: string]: WorkspaceTreeValue;
}
/**
 * A losslessly versioned typed tree held by a record field.
 */
export interface WorkspaceTreeValue {
  format: Format1;
  root: WorkspaceTreeNode;
  schema: Schema;
  version: Version1;
}
/**
 * One caller-defined structured value node.
 *
 * Slot values are always ordered lists.  A schema may later constrain a slot
 * to zero, one, or many children without changing the stored tree shape.
 */
export interface WorkspaceTreeNode {
  fields?: Fields2;
  id: Id11;
  part: Part;
  slots?: Slots;
}
export interface Fields2 {
  [k: string]: JsonValue;
}
export interface Slots {
  [k: string]: WorkspaceTreeNode[];
}
/**
 * Fixed counting convention for reproducible authoring-density tests.
 *
 * One unit is one intentional proposal command or one committed proposal
 * field/group edit.  A command counts once even when it changes several
 * records.  Every committed semantic choice counts, including accepting a
 * suggestion.  Typing, pointer motion, implementation-level events,
 * intermediate edits, reader commands, and passive previews count zero.
 */
export interface WorkspaceInteractionPolicy {
  committed_semantic_choices_count?: CommittedSemanticChoicesCount;
  compound_command_units?: CompoundCommandUnits;
  implementation_events_count?: ImplementationEventsCount;
  intermediate_edits_count?: IntermediateEditsCount;
  keystrokes_count?: KeystrokesCount;
  passive_previews_count?: PassivePreviewsCount;
  pointer_moves_count?: PointerMovesCount;
  reader_commands_count?: ReaderCommandsCount;
  unit?: Unit;
}
/**
 * Mutable proposal state based on, but separate from, canonical content.
 */
export interface ProposalPlane {
  base: GraphRevision;
  changes?: Changes;
  findings?: Findings;
  interaction_count?: InteractionCount;
  projection?: WorkspaceProjection;
  proposal_id: ProposalId;
  revision?: Revision1;
  status?: Status;
  title: Title;
}
/**
 * One proposal-local operation; canonical data is referred to, never edited.
 */
export interface ProposalChange {
  base_record_id?: BaseRecordId;
  dependencies?: Dependencies;
  id: Id12;
  operation: Operation;
  record?: WorkspaceRecord | null;
  record_id: RecordId1;
}
/**
 * A caller, server, or generic client validator result.
 */
export interface ValidationFinding {
  blocking?: Blocking;
  id: Id13;
  message: Message;
  rule_id?: RuleId;
  severity: Severity;
  source?: Source1;
  target: ValidationTarget;
}
export interface ValidationTarget {
  element_id: ElementId1;
  element_kind: ElementKind1;
  path?: Path;
  plane: Plane1;
}
/**
 * Local navigation state that is neither canonical nor a proposal.
 */
export interface WorkspaceReaderState {
  breadcrumb?: Breadcrumb;
  collapsed?: Collapsed;
  current_step?: CurrentStep;
  filters?: Filters;
  focus?: ReaderFocus | null;
  history?: History;
  history_index?: HistoryIndex;
  layer_state?: LayerState;
  positions?: Positions;
  revision?: Revision2;
  search?: Search;
  selection?: Selection;
  step_selections?: StepSelections;
  viewport?: GraphViewport;
}
export interface ReaderNavigationEntry {
  id: Id14;
  label: Label10;
  selection?: WorkspaceSelection | null;
  step?: Step1;
}
export interface WorkspaceSelection {
  element_id: ElementId2;
  element_kind: ElementKind2;
  plane: Plane2;
}
export interface ReaderFilter {
  facet: Facet;
  values: Values1;
}
export interface ReaderFocus {
  direction?: Direction;
  radius: Radius;
  record_id: RecordId2;
}
export interface LayerState {
  [k: string]: GraphLayerState;
}
/**
 * Reader-only visibility state for one caller-defined layer.
 */
export interface GraphLayerState {
  emphasized?: Emphasized;
  visible?: Visible;
}
export interface Positions {
  /**
   * @minItems 2
   * @maxItems 2
   */
  [k: string]: [unknown, unknown];
}
export interface StepSelections {
  [k: string]: WorkspaceSelection;
}
/**
 * Ingestion outcome; canonical styling still requires a fresh read.
 */
export interface IngestionReceipt {
  fresh_canonical_read_required?: FreshCanonicalReadRequired;
  objects?: Objects;
  outcome: Outcome1;
  proposal_id: ProposalId1;
  receipt_id: ReceiptId;
}
export interface ReceiptObject {
  canonical_id?: CanonicalId;
  dependencies?: Dependencies1;
  outcome: Outcome;
  proposal_record_id: ProposalRecordId;
  reason?: Reason1;
}
/**
 * One caller-owned record kind; LCARS assigns no meaning to its id.
 */
export interface WorkspaceRecordSchema {
  appearance: WorkspaceRecordAppearance;
  fields?: Fields3;
  kind: Kind2;
  label: Label13;
  search_fields?: SearchFields;
}
/**
 * Caller-selected key into library-supported code-rendered geometry.
 */
export interface WorkspaceRecordAppearance {
  color?: Color3;
  shape: Shape;
  token: Token1;
}
/**
 * How the library may present one caller-owned record or tree-part field.
 */
export interface WorkspaceFieldSchema {
  choices?: Choices;
  description?: Description1;
  id: Id15;
  label: Label12;
  reference_kinds?: ReferenceKinds;
  required?: Required;
  structural?: Structural;
  tree_schema?: TreeSchema;
  value_kind: ValueKind;
}
/**
 * One caller-supplied choice for a declarative field.
 */
export interface WorkspaceChoice {
  label: Label11;
  value: JsonValue;
}
/**
 * A caller-declared searchable path and its diagnostic match label.
 */
export interface WorkspaceSearchField {
  id: Id16;
  label: Label14;
  match?: Match;
  path: Path1;
}
/**
 * Caller-supplied structural vocabulary for one typed value editor.
 */
export interface WorkspaceTreeSchema {
  id: Id17;
  label: Label15;
  limitation?: Limitation;
  parts: Parts;
  root_parts: RootParts;
  unsupported_parts?: UnsupportedParts;
}
export interface WorkspaceTreePartSchema {
  fields?: Fields4;
  id: Id18;
  label: Label16;
  slots?: Slots1;
  token: Token2;
}
export interface WorkspaceTreeSlotSchema {
  accepts: Accepts;
  cardinality?: Cardinality;
  id: Id19;
  label: Label17;
  ordered?: Ordered;
}
/**
 * Caller-owned declarative rule or server-validation declaration.
 */
export interface WorkspaceValidationRule {
  blocking?: Blocking1;
  evaluator: Evaluator;
  field?: Field;
  id: Id20;
  label: Label18;
  message: Message1;
  parameters?: Parameters;
  scope: Scope1;
  severity?: Severity1;
  target_kinds?: TargetKinds;
}
export interface Parameters {
  [k: string]: JsonValue;
}
/**
 * Versioned upstream command emitted for one caller-supplied action.
 */
export interface WorkspaceCommand {
  action_id: ActionId;
  base: GraphRevision;
  command_id: CommandId;
  format: Format3;
  payload?: Payload;
  proposal_id?: ProposalId2;
  proposal_revision?: ProposalRevision;
  reader_revision: ReaderRevision;
  scope: Scope2;
  version: Version3;
  workspace_id: WorkspaceId1;
}
export interface Payload {
  [k: string]: JsonValue;
}
/**
 * Versioned mocked-or-real server response to a workspace command.
 */
export interface WorkspaceResponse {
  command_id: CommandId1;
  findings?: Findings1;
  format: Format4;
  message?: Message2;
  receipt?: IngestionReceipt | null;
  status: Status1;
  version: Version4;
  workspace?: GraphWorkspaceDocument | null;
  workspace_id: WorkspaceId2;
}
