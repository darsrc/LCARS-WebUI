/* Generated from fixtures/golden/schema.v1.json. SHA256: 11e4fd9513425bc83921449dbc8fbb01887ccfb032ff2ea905ce73cd5a1fdd55. Do not edit. */

/**
 * Header accent color.
 */
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
  | string;
/**
 * Optional header subtitle.
 */
export type Subtitle = string | null;
/**
 * Primary header title.
 */
export type Title = string;
/**
 * Optional item color override.
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
/**
 * Unique nav item identifier.
 */
export type Id = string;
/**
 * Visible nav label.
 */
export type Label = string;
/**
 * Optional stacked segment render instructions.
 */
export type Segments = SidebarSegment[] | null;
/**
 * Segment color.
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
  | string;
/**
 * Optional segment label.
 */
export type Label1 = string | null;
/**
 * Destination page id.
 */
export type TargetPage = string;
/**
 * Always-visible nav items.
 */
export type Items = SidebarItem[];
/**
 * Sidebar placement.
 */
export type Position = "left" | "right" | "hidden";
/**
 * Shipwide alert condition; tints the whole UI (normal/yellow/red).
 */
export type AlertCondition = "normal" | "yellow" | "red";
/**
 * Application display name.
 */
export type AppName = string;
/**
 * Force uppercase across shell/chrome text.
 */
export type ForceUppercase = boolean;
/**
 * Force uppercase for labels specifically.
 */
export type LabelUppercase = boolean;
/**
 * Language locale code (e.g. en-US).
 */
export type Lang = string;
/**
 * Use LCARS header typeface.
 */
export type LcarsFontHeaders = boolean;
/**
 * Use LCARS label typeface.
 */
export type LcarsFontLabels = boolean;
/**
 * Use LCARS font for body text.
 */
export type LcarsFontText = boolean;
/**
 * Frontend hint for sound effects.
 */
export type SoundEnabled = boolean;
/**
 * Strict visual renderer family selector.
 */
export type StrictRenderer = "legacy";
/**
 * Theme token.
 */
export type Theme = "galaxy" | "nemesis" | "tng";
/**
 * Schema semantic version.
 */
export type Version = string;
/**
 * Frontend LCARS visual mode: strict.
 */
export type VisualLanguage = "strict";
/**
 * Adaptive LCARS layout archetype. 'auto' lets the renderer choose by content; console/telemetry/grid/menu select an explicit layout family.
 */
export type Archetype = "auto" | "console" | "telemetry" | "grid" | "menu";
/**
 * Fill leftover adaptive-layout cells with decorative LCARS reference blocks. Set False on dense pages where the decoration competes with data.
 */
export type Fillers = boolean;
/**
 * Unique page identifier.
 */
export type Id1 = string;
/**
 * Unique column identifier.
 */
export type Id2 = string;
/**
 * Optional strict lane role annotation emitted by the compiler.
 */
export type StrictLaneRole = ("title" | "content" | "core" | "support") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color3 =
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
/**
 * Text content to render.
 */
export type Content = string;
/**
 * If true, interaction is disabled.
 */
export type Disabled = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id3 = string;
/**
 * Optional display or accessibility label.
 */
export type Label2 = string | null;
export type Copyable = boolean;
export type Description = string | null;
export type Message = string | null;
export type State = "ready" | "loading" | "empty" | "error";
export type Href = string;
export type Label3 = string | null;
export type Rel = string | null;
export type Target = "_self" | "_blank";
export type MaxLines = number | null;
export type Selectable = boolean;
export type Semantic = "div" | "p" | "span";
export type Wrap = "wrap" | "pre" | "nowrap";
/**
 * Typography style token.
 */
export type Size = "h1" | "h2" | "body" | "mono";
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle = string | null;
export type Type = "text";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect1 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color4 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled1 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group1 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id4 = string;
/**
 * Optional display or accessibility label.
 */
export type Label4 = string | null;
export type Description1 = string | null;
export type SecondaryValue = string | null;
export type Trend = ("up" | "down" | "flat") | null;
export type Compact = boolean;
export type Precision = number | null;
export type Prefix = string;
export type Suffix = string;
export type Thousands = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span1 = [unknown, unknown] | null;
/**
 * Current status severity.
 */
export type Status = "ok" | "warn" | "crit";
/**
 * Strict composition role.
 */
export type StrictRole1 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant1 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle1 = string | null;
export type Type1 = "status_tile";
/**
 * Large status value readout.
 */
export type Value = string;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible1 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight1 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone1 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect2 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * If true, alert pulses opacity.
 */
export type Blink = boolean;
/**
 * Optional LCARS palette color.
 */
export type Color5 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled2 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group2 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id5 = string;
/**
 * Optional display or accessibility label.
 */
export type Label5 = string | null;
/**
 * Alert message.
 */
export type Message1 = string;
export type ActionId = string;
export type Label6 = string;
export type Description2 = string | null;
export type Dismissible = boolean;
export type ActionId1 = string | null;
export type Mode = "local" | "server";
export type Live = "polite" | "assertive";
/**
 * Alert severity level.
 */
export type Severity = "red" | "yellow" | "info" | "success";
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span2 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole2 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant2 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle2 = string | null;
export type Type2 = "alert";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible2 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight2 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone2 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted when clicked.
 */
export type ActionId2 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect3 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color6 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled3 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group3 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id6 = string;
/**
 * Optional display or accessibility label.
 */
export type Label7 = string | null;
export type BusyLabel = string | null;
export type Confirm = string | null;
export type DebounceMs = number;
export type Description3 = string | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span3 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole3 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant3 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle3 = string | null;
export type Type3 = "button";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible3 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight3 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone3 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted on value change.
 */
export type ActionId3 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect4 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Initial checked state.
 */
export type Checked = boolean;
/**
 * Optional LCARS palette color.
 */
export type Color7 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled4 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group4 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id7 = string;
/**
 * Optional display or accessibility label.
 */
export type Label8 = string | null;
export type Description4 = string | null;
export type OffLabel = string | null;
export type OnLabel = string | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span4 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole4 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant4 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle4 = string | null;
export type Type4 = "toggle";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible4 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight4 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone4 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted on value change.
 */
export type ActionId4 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect5 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Initial checked state.
 */
export type Checked1 = boolean;
/**
 * Optional LCARS palette color.
 */
export type Color8 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled5 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group5 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id8 = string;
/**
 * Optional display or accessibility label.
 */
export type Label9 = string | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span5 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole5 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant5 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle5 = string | null;
export type Type5 = "lcars_checkbox";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible5 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight5 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone5 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted on selection change.
 */
export type ActionId5 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect6 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color9 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled6 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group6 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id9 = string;
/**
 * Optional display or accessibility label.
 */
export type Label10 = string | null;
/**
 * Optional option description.
 */
export type Description5 = string | null;
/**
 * Whether this option is unavailable.
 */
export type Disabled7 = boolean;
/**
 * Optional option group label.
 */
export type Group7 = string | null;
/**
 * Human-readable option label.
 */
export type Label11 = string;
/**
 * Machine option value.
 */
export type Value2 = string;
/**
 * Available options.
 */
export type Options = SelectOption[];
export type Description6 = string | null;
export type Multiple = boolean;
export type Placeholder = string | null;
export type Searchable = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span6 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole6 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant6 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle6 = string | null;
export type Type6 = "lcars_radio";
/**
 * Current selected value.
 */
export type Value3 = string;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible6 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight6 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone6 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted on selection change.
 */
export type ActionId6 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect7 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color10 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled8 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group8 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id10 = string;
/**
 * Optional display or accessibility label.
 */
export type Label12 = string | null;
/**
 * Available options.
 */
export type Options1 = SelectOption[];
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span7 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole7 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant7 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle7 = string | null;
export type Type7 = "lcars_radio_toggle";
/**
 * Current selected value.
 */
export type Value4 = string;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible7 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight7 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone7 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted on selection change.
 */
export type ActionId7 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect8 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color11 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled9 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group9 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id11 = string;
/**
 * Optional display or accessibility label.
 */
export type Label13 = string | null;
/**
 * Available options.
 */
export type Options2 = SelectOption[];
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span8 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole8 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant8 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle8 = string | null;
export type Type8 = "select";
/**
 * Current selected value or values.
 */
export type Value5 = string | string[];
/**
 * If false, widget is removed from layout flow.
 */
export type Visible8 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight8 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone8 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect9 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * If false, suppresses the browser's autocomplete/history dropdown
 */
export type Autocomplete = boolean;
/**
 * Optional LCARS palette color.
 */
export type Color12 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled10 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group10 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id12 = string;
/**
 * Optional display or accessibility label.
 */
export type Label14 = string | null;
export type Commit = "blur" | "enter" | "change";
export type DebounceMs1 = number;
export type Description7 = string | null;
export type InputType = "text" | "search" | "email" | "url" | "tel";
export type Multiline = boolean;
export type Rows1 = number;
export type MaxLength = number | null;
export type Message2 = string | null;
export type MinLength = number | null;
export type Pattern = string | null;
export type Required = boolean;
/**
 * If true, masks entered characters.
 */
export type Password = boolean;
/**
 * Placeholder hint text.
 */
export type Placeholder1 = string | null;
/**
 * Optional validation regex hint.
 */
export type Regex = string | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span9 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole9 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant9 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle9 = string | null;
export type Type9 = "text_input";
/**
 * Current text value.
 */
export type Value6 = string;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible9 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight9 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone9 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect10 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color13 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled11 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group11 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id13 = string;
/**
 * Optional display or accessibility label.
 */
export type Label15 = string | null;
/**
 * Optional maximum allowed value.
 */
export type Max = number | null;
/**
 * Optional minimum allowed value.
 */
export type Min = number | null;
export type Commit1 = "blur" | "enter" | "change";
export type DebounceMs2 = number;
export type Description8 = string | null;
export type Precision1 = number | null;
export type Prefix1 = string;
export type Required1 = boolean;
export type Suffix1 = string;
/**
 * Placeholder hint text.
 */
export type Placeholder2 = string | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span10 = [unknown, unknown] | null;
/**
 * Increment/decrement step.
 */
export type Step = number;
/**
 * Strict composition role.
 */
export type StrictRole10 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant10 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle10 = string | null;
export type Type10 = "number_input";
/**
 * Current numeric value.
 */
export type Value7 = number;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible10 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight10 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone10 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted on submit.
 */
export type ActionId8 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect11 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Nested input widgets aggregated into form submit payload.
 */
export type Children = (
  Button | Toggle | Checkbox | Select | Radio | RadioToggle | TextInput | NumberInput
)[];
/**
 * Optional LCARS palette color.
 */
export type Color14 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled12 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group12 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id14 = string;
/**
 * Optional display or accessibility label.
 */
export type Label16 = string | null;
export type CoerceValues = boolean;
export type Columns1 = number;
export type Description9 = string | null;
export type Layout1 = "stack" | "row" | "grid";
export type ResetLabel = string | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span11 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole11 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant11 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle11 = string | null;
/**
 * Submit button label.
 */
export type SubmitLabel = string;
export type Type11 = "form";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible11 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight11 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone11 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect12 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color15 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled13 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group13 = string | null;
/**
 * Column headers.
 */
export type Headers = string[];
/**
 * Unique widget identifier used for event targeting.
 */
export type Id15 = string;
/**
 * Optional display or accessibility label.
 */
export type Label17 = string | null;
export type Columns2 = TableColumn[] | null;
export type Align = "start" | "center" | "end";
export type Filter = "none" | "text" | "select" | "number";
export type FirstSortDirection = "asc" | "desc";
export type Key = string;
export type Label18 = string | null;
export type Sortable = boolean;
export type ValueType = "auto" | "text" | "number" | "date" | "boolean";
export type DataMode = "client" | "server";
export type Density = "compact" | "normal";
export type Description10 = string | null;
export type EmitStateChanges = boolean;
export type Expandable = boolean;
export type ExpandedIds = string[];
export type ExpansionMotion = "auto" | "none";
export type Key1 = string;
export type Operator = "contains" | "equals" | "gt" | "gte" | "lt" | "lte";
export type Value8 = string | number | boolean;
export type Filters = TableFilter[];
export type Page1 = number;
export type PageSize = number;
export type TotalRows = number | null;
export type RowClickSelect = boolean;
export type RowKey = string | null;
export type Mode1 = "none" | "single" | "multiple";
export type SelectedIds = string[];
export type Direction = "asc" | "desc";
export type Key2 = string;
export type Sort = TableSort[];
export type StickyHeader = boolean;
export type CopyOnClick = boolean;
export type CopyValue = string | null;
export type Copyable1 = boolean;
export type Display = string | null;
export type Status1 = ("ok" | "warn" | "crit" | "muted") | null;
export type Value9 = string | number | boolean | null;
/**
 * Ordered row cell values.
 */
export type Cells = (string | number | boolean | TableCell | null)[];
/**
 * Optional expandable child rows.
 */
export type Children1 = TableRow[];
/**
 * Inline error shown in the expanded area, with retry.
 */
export type Error = string | null;
export type Kind = "text";
export type Text1 = string;
export type Tone = "default" | "muted";
export type Kind1 = "status";
export type Label19 = string;
export type Status2 = "ok" | "warn" | "crit" | "muted";
export type Href1 = string;
export type Kind2 = "link";
export type Label20 = string | null;
export type Rel1 = string | null;
export type Target1 = "_self" | "_blank";
export type ActionId9 = string;
export type Kind3 = "action";
export type Label21 = string;
export type Headers1 = string[];
export type Kind4 = "table";
export type Rows3 = TableRow[];
/**
 * Optional full-width detail content shown when the row is expanded.
 */
export type ExpandedContent = (
  TableDetailText | TableDetailStatus | TableDetailLink | TableDetailAction | TableDetailTable
)[];
/**
 * Unique row identifier.
 */
export type Id16 = string;
/**
 * Show a loading affordance while children are fetched.
 */
export type Loading = boolean;
/**
 * Table row objects.
 */
export type Rows2 = TableRow[];
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span12 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole12 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant12 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle12 = string | null;
export type Type12 = "table";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible12 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight12 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone12 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect13 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color16 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled14 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group14 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id17 = string;
/**
 * Optional display or accessibility label.
 */
export type Label22 = string | null;
export type Curve = "linear" | "step";
export type Description11 = string | null;
export type Legend = boolean;
export type Color17 =
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
export type Label23 = string | null;
export type Value11 = number;
export type ReferenceLines = ReferenceLine[];
export type Tooltip = boolean;
export type Label24 = string | null;
export type Max1 = number | null;
export type Min1 = number | null;
export type Show = boolean;
export type Zoom = boolean;
/**
 * Optional series color override.
 */
export type Color18 =
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
/**
 * Numeric series values.
 */
export type Data = number[];
/**
 * Series display name.
 */
export type Name = string;
/**
 * Series datasets for plotting.
 */
export type Series = SeriesPointSet[];
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span13 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole13 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant13 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle13 = string | null;
export type Type13 = "line_chart";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible13 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight13 = number | null;
/**
 * X-axis labels aligned to series length.
 */
export type XLabels = string[];
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone13 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect14 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color19 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled15 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group15 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id18 = string;
/**
 * Optional display or accessibility label.
 */
export type Label25 = string | null;
export type Description12 = string | null;
export type Max2 = number | null;
export type Min2 = number | null;
export type ReferenceValue = number | null;
export type ShowLatest = boolean;
export type Tooltip1 = boolean;
/**
 * Series datasets for plotting.
 */
export type Series1 = SeriesPointSet[];
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span14 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole14 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant14 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle14 = string | null;
export type Type14 = "sparkline";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible14 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight14 = number | null;
/**
 * X-axis labels aligned to series length.
 */
export type XLabels1 = string[];
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone14 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect15 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color20 =
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
/**
 * Close price.
 */
export type Close = number;
/**
 * High price.
 */
export type High = number;
/**
 * Low price.
 */
export type Low = number;
/**
 * Open price.
 */
export type Open = number;
/**
 * Bar time: unix seconds (UTC) for intraday/live data, or a 'YYYY-MM-DD' string for daily data.
 */
export type Time = number | string;
/**
 * Optional volume.
 */
export type Volume = number | null;
/**
 * Ordered OHLC bars.
 */
export type Data1 = OhlcPoint[];
/**
 * If true, interaction is disabled.
 */
export type Disabled16 = boolean;
/**
 * Bearish bar color.
 */
export type DownColor =
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
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group16 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id19 = string;
/**
 * Optional display or accessibility label.
 */
export type Label26 = string | null;
/**
 * Optional marker color.
 */
export type Color21 =
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
/**
 * Marker placement relative to the bar.
 */
export type Position1 = "above" | "below" | "in";
/**
 * Marker glyph shape.
 */
export type Shape = "arrow_up" | "arrow_down" | "circle" | "square";
/**
 * Optional marker label text.
 */
export type Text2 = string | null;
/**
 * Marker time, matching a bar's `time`.
 */
export type Time1 = number | string;
/**
 * Optional annotation markers.
 */
export type Markers = ChartMarker[];
export type Description13 = string | null;
export type FitContent = boolean;
export type Legend1 = boolean;
export type PricePrecision = number | null;
export type ShowVolume = boolean;
export type Tooltip2 = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span15 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole15 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant15 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle15 = string | null;
export type Type15 = "candlestick";
/**
 * Bullish bar color.
 */
export type UpColor =
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
/**
 * If false, widget is removed from layout flow.
 */
export type Visible15 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight15 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone15 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect16 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color22 =
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
/**
 * Ordered Renko bricks.
 */
export type Data2 = OhlcPoint[];
/**
 * If true, interaction is disabled.
 */
export type Disabled17 = boolean;
/**
 * Down-brick color.
 */
export type DownColor1 =
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
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group17 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id20 = string;
/**
 * Optional display or accessibility label.
 */
export type Label27 = string | null;
/**
 * Optional annotation markers.
 */
export type Markers1 = ChartMarker[];
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span16 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole16 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant16 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle16 = string | null;
export type Type16 = "renko";
/**
 * Up-brick color.
 */
export type UpColor1 =
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
/**
 * If false, widget is removed from layout flow.
 */
export type Visible16 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight16 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone16 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect17 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional fixed width/height ratio; fills the panel otherwise.
 */
export type AspectRatio = number | null;
/**
 * Optional LCARS palette color.
 */
export type Color23 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled18 = boolean;
/**
 * GLSL ES 1.00 fragment shader source. Receives `uniform float u_time`, `uniform vec2 u_resolution`, `varying vec2 v_uv`, plus any custom uniforms declared in `uniforms`.
 */
export type FragmentShader = string;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group18 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id21 = string;
/**
 * Optional display or accessibility label.
 */
export type Label28 = string | null;
export type Description14 = string | null;
export type Fallback = string;
export type FpsLimit = number;
export type HonorReducedMotion = boolean;
export type Paused = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span17 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole17 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant17 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle17 = string | null;
export type Type17 = "shader";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible17 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight17 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone17 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect18 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color24 =
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
/**
 * Optional critical threshold for style changes.
 */
export type CritThreshold = number | null;
/**
 * If true, interaction is disabled.
 */
export type Disabled19 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group19 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id22 = string;
/**
 * Optional display or accessibility label.
 */
export type Label29 = string | null;
/**
 * Upper bound.
 */
export type Max3 = number;
/**
 * Lower bound.
 */
export type Min3 = number;
export type CritThreshold1 = number | null;
export type Description15 = string | null;
export type Indeterminate = boolean;
export type Max4 = number;
export type Min4 = number;
export type Segments1 = number;
export type Ticks = boolean;
export type Unit = string | null;
export type WarnThreshold = number | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span18 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole18 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant18 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle18 = string | null;
export type Type18 = "gauge";
/**
 * Unit suffix shown beside value.
 */
export type Unit1 = string | null;
/**
 * Current value.
 */
export type Value12 = number;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible18 = boolean;
/**
 * Optional warning threshold for style changes.
 */
export type WarnThreshold1 = number | null;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight18 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone18 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect19 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color25 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled20 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group20 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id23 = string;
/**
 * Optional display or accessibility label.
 */
export type Label30 = string | null;
/**
 * Show percentage text overlay.
 */
export type ShowLabel = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span19 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole19 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant19 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle19 = string | null;
export type Type19 = "progress_bar";
/**
 * Progress percentage in range 0.0-100.0.
 */
export type Value13 = number;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible19 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight19 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone19 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect20 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color26 =
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
/**
 * Markdown content.
 */
export type Content1 = string;
/**
 * If true, interaction is disabled.
 */
export type Disabled21 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group21 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id24 = string;
/**
 * Optional display or accessibility label.
 */
export type Label31 = string | null;
export type CopyCode = boolean;
export type Description16 = string | null;
export type LinkTarget = "_self" | "_blank";
export type MaxHeight = number | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span20 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole20 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant20 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle20 = string | null;
export type Type20 = "markdown";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible20 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight20 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone20 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect21 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Follow new lines when already scrolled to the bottom.
 */
export type AutoScroll = boolean;
/**
 * Optional LCARS palette color.
 */
export type Color27 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled22 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group22 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id25 = string;
/**
 * Optional display or accessibility label.
 */
export type Label32 = string | null;
/**
 * Maximum client-side buffered lines.
 */
export type MaxLines1 = number;
export type Description17 = string | null;
export type Levels = string[];
export type LineNumbers = boolean;
export type Paused1 = boolean;
export type Search = boolean;
export type Timestamps = boolean;
export type Toolbar = boolean;
export type Wrap1 = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span21 = [unknown, unknown] | null;
/**
 * Log stream identifier for SSE/WS chunks.
 */
export type StreamId = string;
/**
 * Strict composition role.
 */
export type StrictRole21 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant21 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle21 = string | null;
export type Type21 = "log_viewer";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible21 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight21 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone21 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect22 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Whether video should autoplay.
 */
export type Autoplay = boolean;
/**
 * Optional LCARS palette color.
 */
export type Color28 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled23 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group23 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id26 = string;
/**
 * Optional display or accessibility label.
 */
export type Label33 = string | null;
/**
 * Whether video should be muted.
 */
export type Muted = boolean;
export type Controls = boolean;
export type Description18 = string | null;
export type Loop = boolean;
export type PlaybackRates = number[];
export type Preload = "none" | "metadata" | "auto";
export type ShowSource = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span22 = [unknown, unknown] | null;
/**
 * URL to an HLS .m3u8 manifest.
 */
export type Src = string;
/**
 * Strict composition role.
 */
export type StrictRole22 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant22 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle22 = string | null;
export type Type22 = "video_hls";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible22 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight22 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone22 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect23 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional width/height ratio for the viewport.
 */
export type AspectRatio1 = number | null;
/**
 * Optional LCARS palette color.
 */
export type Color29 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled24 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group24 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id27 = string;
/**
 * Optional display or accessibility label.
 */
export type Label34 = string | null;
/**
 * Scene module path relative to the app's assets directory, e.g. 'scenes/warp_core.js'. Served from /lcars/assets/.
 */
export type Module = string;
export type Far = number;
export type Fov = number;
export type Near = number;
/**
 * @minItems 3
 * @maxItems 3
 */
export type Position2 = [unknown, unknown, unknown];
/**
 * @minItems 3
 * @maxItems 3
 */
export type Target2 = [unknown, unknown, unknown];
export type AutoRotate = boolean;
export type AutoRotateSpeed = number;
export type Damping = boolean;
export type Enabled = boolean;
export type MaxDistance = number;
export type MinDistance = number;
export type Orbit = boolean;
export type Pan = boolean;
export type Zoom1 = boolean;
export type Description19 = string | null;
export type Fallback1 = string;
export type FpsLimit1 = number;
export type HonorReducedMotion1 = boolean;
export type MaxPixelRatio = number;
export type Paused2 = boolean;
export type Transparent = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span23 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole23 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant23 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle23 = string | null;
export type Type23 = "three_scene";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible23 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight23 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone23 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect24 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color30 =
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
/**
 * If true, interaction is disabled.
 */
export type Disabled25 = boolean;
export type Id28 = string;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Position3 = [unknown, unknown];
/**
 * @minItems 2
 * @maxItems 2
 */
export type Size1 = [unknown, unknown];
export type Text3 = string;
export type Comments = GraphComment[];
export type Id29 = string;
/**
 * Source node id.
 */
export type Source = string;
export type SourcePort = string;
/**
 * Target node id.
 */
export type Target3 = string;
export type TargetPort = string;
export type Edges = GraphEdge[];
export type Format = "lcars-node-graph";
export type Color31 =
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
export type Id30 = string;
export type Label35 = string | null;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Position4 = [unknown, unknown];
/**
 * @minItems 2
 * @maxItems 2
 */
export type Size2 = [unknown, unknown];
export type Groups = GraphGroup[];
/**
 * Id of the group this belongs to.
 */
export type Group25 = string | null;
export type Id31 = string;
/**
 * Per-instance title override.
 */
export type Label36 = string | null;
/**
 * Absolute x, y.
 *
 * @minItems 2
 * @maxItems 2
 */
export type Position5 = [unknown, unknown];
/**
 * Id of the NodeTemplate this instantiates.
 */
export type Template = string;
export type Nodes = GraphNode[];
/**
 * Id of the edge this reroute sits on.
 */
export type Edge = string;
export type Id32 = string;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Position6 = [unknown, unknown];
export type Reroutes = GraphReroute[];
/**
 * Palette grouping.
 */
export type Category = string | null;
/**
 * LCARS accent for this type.
 */
export type Color32 =
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
export type Id33 = string;
export type Kind5 = "text" | "number" | "boolean" | "select";
export type Label37 = string | null;
export type Max5 = number | null;
export type Min5 = number | null;
export type Label38 = string | null;
export type Value14 = string;
/**
 * Choices for kind='select'.
 */
export type Options3 = GraphFieldOption[];
export type Placeholder3 = string | null;
export type Step1 = number | null;
export type Fields = GraphField[];
export type Id34 = string;
/**
 * Maximum simultaneous connections. Defaults by side when unset: one for an input, unlimited for an output.
 */
export type Capacity = number | null;
/**
 * Port identifier, unique within its side of the template.
 */
export type Id35 = string;
/**
 * Display label; defaults to the id.
 */
export type Label39 = string | null;
/**
 * Port data type; 'any' matches everything.
 */
export type Type24 = string;
export type Inputs = GraphPort[];
export type Label40 = string | null;
export type Outputs = GraphPort[];
export type Templates = NodeTemplate[];
export type Version1 = 1;
export type X = number;
export type Y = number;
export type Zoom2 = number;
export type Message3 = string | null;
export type Message4 = string | null;
export type Progress = number | null;
export type Status3 = "idle" | "queued" | "running" | "success" | "error" | "cancelled";
export type Status4 = "idle" | "queued" | "running" | "success" | "error" | "cancelled";
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group26 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id36 = string;
/**
 * Optional display or accessibility label.
 */
export type Label41 = string | null;
export type AllowImportExport = boolean;
export type Description20 = string | null;
export type Editable = boolean;
export type GridSize = number;
export type HistoryLimit = number;
export type MaxZoom = number;
export type MinZoom = number;
export type Minimap = boolean;
export type ShowCancel = boolean;
export type ShowPalette = boolean;
export type ShowQueue = boolean;
export type ShowRun = boolean;
export type SnapToGrid = boolean;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span24 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole24 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant24 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle24 = string | null;
export type Type25 = "node_canvas";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible24 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight24 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone24 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted after audio processing.
 */
export type ActionId10 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect25 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color33 =
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
/**
 * If true, the mic stays open after the first click and auto-detects speech start/stop via energy-based voice activity detection (VAD), uploading each utterance automatically with no per-utterance click. If false (default), behavior is unchanged push-to-talk.
 */
export type Continuous = boolean;
/**
 * If true, interaction is disabled.
 */
export type Disabled26 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group27 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id37 = string;
/**
 * Optional display or accessibility label.
 */
export type Label42 = string | null;
export type Description21 = string | null;
export type DeviceId = string | null;
export type MaxBytes = number | null;
export type MimeTypes = string[];
export type MinDurationMs = number;
export type VadThreshold = number | null;
/**
 * Continuous mode only: duration of continuous below-threshold silence required after speech to consider an utterance finished and trigger upload. Ignored when continuous=False.
 */
export type SilenceMs = number;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span25 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole25 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant25 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle25 = string | null;
/**
 * Push-to-talk auto-stop timeout. In continuous mode this instead acts as a maximum-utterance safety cap: recording is force-stopped and uploaded if speech continues this long without a silence gap, even if the speaker hasn't paused.
 */
export type TimeoutMs = number;
export type Type26 = "mic_button";
/**
 * Audio upload endpoint URL.
 */
export type UploadUrl = string;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible25 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight25 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone25 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect26 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect27 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect28 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect29 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Header accent color.
 */
export type Color34 =
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
  | string;
/**
 * If true, interaction is disabled.
 */
export type Disabled27 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group28 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id38 = string;
/**
 * Optional display or accessibility label.
 */
export type Label43 = string | null;
export type Actions = ActionSpec[];
export type Anchor = string | null;
export type Description22 = string | null;
export type Subtitle1 = string | null;
/**
 * Header size token.
 */
export type Size3 = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span26 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole26 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant26 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle26 = string | null;
/**
 * Header text content.
 */
export type Text4 = string;
export type Type27 = "lcars_header";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible26 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight26 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone26 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Bracket content children.
 */
export type Children4 = (
  | Text
  | StatusTile
  | Alert
  | Button
  | Toggle
  | Checkbox
  | Radio
  | RadioToggle
  | Select
  | TextInput
  | NumberInput
  | Form
  | Table
  | LineChart
  | Sparkline
  | Candlestick
  | Renko
  | Shader
  | Gauge
  | ProgressBar
  | Markdown
  | LogViewer
  | VideoHls
  | ThreeScene
  | NodeCanvas
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
)[];
/**
 * Bracket accent color.
 */
export type Color35 =
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
  | string;
/**
 * If true, interaction is disabled.
 */
export type Disabled28 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group29 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id39 = string;
/**
 * Optional display or accessibility label.
 */
export type Label44 = string | null;
export type Collapsible = boolean;
export type Density1 = "compact" | "normal";
export type Description23 = string | null;
export type InitialCollapsed = boolean;
export type Overflow = "visible" | "auto" | "hidden";
/**
 * Bracket side orientation.
 */
export type Orientation = "left" | "right" | "both";
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span27 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole27 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant27 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle27 = string | null;
export type Type28 = "lcars_bracket";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible27 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight27 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone27 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Legacy sweep children list (strict lowering compiles this into regions).
 */
export type Children3 = (
  | Text
  | StatusTile
  | Alert
  | Button
  | Toggle
  | Checkbox
  | Radio
  | RadioToggle
  | Select
  | TextInput
  | NumberInput
  | Form
  | Table
  | LineChart
  | Sparkline
  | Candlestick
  | Renko
  | Shader
  | Gauge
  | ProgressBar
  | Markdown
  | LogViewer
  | VideoHls
  | ThreeScene
  | NodeCanvas
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
)[];
/**
 * Sweep accent color.
 */
export type Color36 =
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
  | string;
/**
 * Input/control widgets attached to the sweep column.
 */
export type ColumnInputs =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Legacy flattened alias for sweep content regions.
 */
export type ContentChildren =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * If true, interaction is disabled.
 */
export type Disabled29 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group30 = string | null;
/**
 * Optional widgets rendered in the top sweep header band.
 */
export type HeaderChildren =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id40 = string;
/**
 * Optional display or accessibility label.
 */
export type Label45 = string | null;
/**
 * Primary left sweep content region widgets.
 */
export type LeftChildren =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Proportional width share for left sweep content region.
 */
export type LeftWidth = number;
/**
 * Legacy alias for sweep column input widgets.
 */
export type RailChildren =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * If true, render the sweep reversed vertically.
 */
export type Reverse = boolean;
/**
 * Secondary right sweep content region widgets.
 */
export type RightChildren =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span28 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole28 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant28 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle28 = string | null;
/**
 * Optional sweep subtitle.
 */
export type Subtitle2 = string | null;
/**
 * Optional sweep title.
 */
export type Title1 = string | null;
export type Type29 = "lcars_sweep";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible28 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight28 = number | null;
/**
 * Sweep column width in px (strict fidelity range).
 */
export type WidthSidebar = number;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone28 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Main content children rendered inside the box.
 */
export type Children2 = (
  | Text
  | StatusTile
  | Alert
  | Button
  | Toggle
  | Checkbox
  | Radio
  | RadioToggle
  | Select
  | TextInput
  | NumberInput
  | Form
  | Table
  | LineChart
  | Sparkline
  | Candlestick
  | Renko
  | Shader
  | Gauge
  | ProgressBar
  | Markdown
  | LogViewer
  | VideoHls
  | ThreeScene
  | NodeCanvas
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
)[];
/**
 * Base color inherited by corners and bars.
 */
export type Color37 =
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
  | string;
/**
 * Per-corner color override [TL,TR,BR,BL].
 */
export type CornerColors =
  | [
      (
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
      ),
      (
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
      ),
      (
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
      ),
      (
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
      ),
    ]
  | null;
/**
 * Corner elbows to render, using [1,2,3,4]=[TL,TR,BR,BL].
 */
export type Corners = number[];
/**
 * If true, interaction is disabled.
 */
export type Disabled30 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group31 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id41 = string;
/**
 * Optional display or accessibility label.
 */
export type Label46 = string | null;
/**
 * Widgets rendered in the left sidebar input column.
 */
export type LeftInputs =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Primary interior content region for strict box composition.
 */
export type MainChildren =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Widgets rendered in the right sidebar input column.
 */
export type RightInputs =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Secondary interior content region for strict box composition.
 */
export type SideChildren =
  | (
      | Text
      | StatusTile
      | Alert
      | Button
      | Toggle
      | Checkbox
      | Radio
      | RadioToggle
      | Select
      | TextInput
      | NumberInput
      | Form
      | Table
      | LineChart
      | Sparkline
      | Candlestick
      | Renko
      | Shader
      | Gauge
      | ProgressBar
      | Markdown
      | LogViewer
      | VideoHls
      | ThreeScene
      | NodeCanvas
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
    )[]
  | null;
/**
 * Per-side color override [top,right,bottom,left].
 */
export type SideColors =
  | [
      (
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
      ),
      (
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
      ),
      (
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
      ),
      (
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
      ),
    ]
  | null;
/**
 * Side bars to render, using [1,2,3,4]=[top,right,bottom,left].
 */
export type Sides = number[];
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span29 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole29 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant29 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle29 = string | null;
/**
 * Optional embedded subtitle for the bottom bar.
 */
export type Subtitle3 = string | null;
/**
 * Optional subtitle color override.
 */
export type SubtitleColor =
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
/**
 * Optional embedded title for the top bar.
 */
export type Title2 = string | null;
/**
 * Optional title color override.
 */
export type TitleColor =
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
export type Type30 = "lcars_box";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible29 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight29 = number | null;
/**
 * Left sidebar width in px (strict fidelity range).
 */
export type WidthLeft = number;
/**
 * Right sidebar width in px (strict fidelity range).
 */
export type WidthRight = number;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone29 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Widgets in this column.
 */
export type Widgets = (
  | Text
  | StatusTile
  | Alert
  | Button
  | Toggle
  | Checkbox
  | Radio
  | RadioToggle
  | Select
  | TextInput
  | NumberInput
  | Form
  | Table
  | LineChart
  | Sparkline
  | Candlestick
  | Renko
  | Shader
  | Gauge
  | ProgressBar
  | Markdown
  | LogViewer
  | VideoHls
  | ThreeScene
  | NodeCanvas
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
)[];
/**
 * Layout width hint (e.g. 1fr, 300px).
 */
export type Width = string;
/**
 * Columns in this row.
 */
export type Columns = Column[];
/**
 * Layout height hint (e.g. auto, 1fr, 200px).
 */
export type Height = string;
/**
 * Unique row identifier.
 */
export type Id42 = string;
/**
 * Optional strict band role annotation emitted by the compiler.
 */
export type StrictBandRole = ("page_title" | "content") | null;
/**
 * Optional strict lane scaffold mode emitted by the compiler.
 */
export type StrictLaneMode = ("follow_columns" | "split_single_column") | null;
/**
 * Page row layout.
 */
export type Rows = Row[];
/**
 * Page title.
 */
export type Title3 = string;

/**
 * Root LCARS manifest contract.
 */
export interface Manifest {
  layout: Layout;
  meta: Meta;
  pages: Pages;
}
/**
 * Application shell layout.
 */
export interface Layout {
  header: Header;
  sidebar: Sidebar;
}
/**
 * Shell header block.
 */
export interface Header {
  color?: Color;
  subtitle?: Subtitle;
  title: Title;
}
/**
 * Shell sidebar block.
 */
export interface Sidebar {
  items?: Items;
  position?: Position;
}
/**
 * Sidebar navigation item.
 */
export interface SidebarItem {
  color?: Color1;
  id: Id;
  label: Label;
  segments?: Segments;
  target_page: TargetPage;
}
/**
 * Sidebar segment configuration for authentic LCARS stacked bars.
 */
export interface SidebarSegment {
  color?: Color2;
  label?: Label1;
}
/**
 * Application metadata.
 */
export interface Meta {
  alert_condition?: AlertCondition;
  app_name: AppName;
  force_uppercase?: ForceUppercase;
  label_uppercase?: LabelUppercase;
  lang: Lang;
  lcars_font_headers?: LcarsFontHeaders;
  lcars_font_labels?: LcarsFontLabels;
  lcars_font_text?: LcarsFontText;
  sound_enabled?: SoundEnabled;
  strict_renderer?: StrictRenderer;
  theme: Theme;
  version: Version;
  visual_language?: VisualLanguage;
}
/**
 * Non-empty map of page id to page configuration.
 */
export interface Pages {
  [k: string]: Page;
}
/**
 * A logical application page.
 *
 * Strict mode still serializes rows/columns for manifest compatibility, but
 * rendering semantics are expected to follow normalized LCARS containers.
 */
export interface Page {
  archetype?: Archetype;
  fillers?: Fillers;
  id: Id1;
  rows?: Rows;
  title: Title3;
}
/**
 * A page row.
 *
 * In strict mode this remains a compatibility band boundary, while interior
 * composition is container-driven after normalization.
 */
export interface Row {
  columns?: Columns;
  height?: Height;
  id: Id42;
  strict_band_role?: StrictBandRole;
  strict_lane_mode?: StrictLaneMode;
}
/**
 * A page column.
 *
 * In strict mode this remains a transport envelope for compatibility; LCARS
 * composition truth is compiled into container widgets within ``widgets``.
 */
export interface Column {
  id: Id2;
  strict_lane_role?: StrictLaneRole;
  widgets?: Widgets;
  width?: Width;
}
/**
 * Simple text content widget.
 */
export interface Text {
  aspect?: Aspect;
  color?: Color3;
  content: Content;
  disabled?: Disabled;
  group?: Group;
  id: Id3;
  label?: Label2;
  /**
   * Enhanced text capabilities.
   */
  options?: TextOptions | null;
  size?: Size;
  span?: Span;
  strict_role?: StrictRole;
  strict_surface_variant?: StrictSurfaceVariant;
  strict_title?: StrictTitle;
  type?: Type;
  visible?: Visible;
  weight?: Weight;
  zone?: Zone;
}
export interface TextOptions {
  copyable?: Copyable;
  description?: Description;
  feedback?: WidgetFeedback | null;
  link?: LinkSpec | null;
  max_lines?: MaxLines;
  selectable?: Selectable;
  semantic?: Semantic;
  wrap?: Wrap;
}
/**
 * Optional loading, empty, or error presentation for a widget.
 */
export interface WidgetFeedback {
  message?: Message;
  state?: State;
}
/**
 * A safe, code-rendered hyperlink.
 */
export interface LinkSpec {
  href: Href;
  label?: Label3;
  rel?: Rel;
  target?: Target;
}
/**
 * Status and readout tile.
 */
export interface StatusTile {
  aspect?: Aspect1;
  color?: Color4;
  disabled?: Disabled1;
  group?: Group1;
  id: Id4;
  label?: Label4;
  /**
   * Enhanced metric capabilities.
   */
  options?: MetricOptions | null;
  span?: Span1;
  status: Status;
  strict_role?: StrictRole1;
  strict_surface_variant?: StrictSurfaceVariant1;
  strict_title?: StrictTitle1;
  type?: Type1;
  value: Value;
  visible?: Visible1;
  weight?: Weight1;
  zone?: Zone1;
}
export interface MetricOptions {
  description?: Description1;
  feedback?: WidgetFeedback | null;
  secondary_value?: SecondaryValue;
  trend?: Trend;
  value_format?: ValueFormat | null;
}
/**
 * Portable numeric display formatting.
 */
export interface ValueFormat {
  compact?: Compact;
  precision?: Precision;
  prefix?: Prefix;
  suffix?: Suffix;
  thousands?: Thousands;
}
/**
 * High-visibility alert banner.
 */
export interface Alert {
  aspect?: Aspect2;
  blink?: Blink;
  color?: Color5;
  disabled?: Disabled2;
  group?: Group2;
  id: Id5;
  label?: Label5;
  message: Message1;
  /**
   * Enhanced alert capabilities.
   */
  options?: AlertOptions | null;
  severity: Severity;
  span?: Span2;
  strict_role?: StrictRole2;
  strict_surface_variant?: StrictSurfaceVariant2;
  strict_title?: StrictTitle2;
  type?: Type2;
  visible?: Visible2;
  weight?: Weight2;
  zone?: Zone2;
}
export interface AlertOptions {
  action?: ActionSpec | null;
  description?: Description2;
  dismissible?: Dismissible;
  feedback?: WidgetFeedback | null;
  interaction?: InteractionOptions | null;
  live?: Live;
}
/**
 * A typed action rendered by a display widget.
 */
export interface ActionSpec {
  action_id: ActionId;
  label: Label6;
  value?: Value1;
}
export interface Value1 {
  [k: string]: unknown;
}
/**
 * Choose client-local or Python-controlled interaction state.
 */
export interface InteractionOptions {
  action_id?: ActionId1;
  mode?: Mode;
}
/**
 * Momentary action button.
 */
export interface Button {
  action_id: ActionId2;
  aspect?: Aspect3;
  color?: Color6;
  disabled?: Disabled3;
  group?: Group3;
  id: Id6;
  label?: Label7;
  /**
   * Enhanced button capabilities.
   */
  options?: ButtonOptions | null;
  span?: Span3;
  strict_role?: StrictRole3;
  strict_surface_variant?: StrictSurfaceVariant3;
  strict_title?: StrictTitle3;
  type?: Type3;
  visible?: Visible3;
  weight?: Weight3;
  zone?: Zone3;
}
export interface ButtonOptions {
  busy_label?: BusyLabel;
  confirm?: Confirm;
  debounce_ms?: DebounceMs;
  description?: Description3;
  feedback?: WidgetFeedback | null;
  payload?: Payload;
}
export interface Payload {
  [k: string]: unknown;
}
/**
 * Boolean ON/OFF control.
 */
export interface Toggle {
  action_id: ActionId3;
  aspect?: Aspect4;
  checked?: Checked;
  color?: Color7;
  disabled?: Disabled4;
  group?: Group4;
  id: Id7;
  label?: Label8;
  /**
   * Enhanced toggle capabilities.
   */
  options?: ToggleOptions | null;
  span?: Span4;
  strict_role?: StrictRole4;
  strict_surface_variant?: StrictSurfaceVariant4;
  strict_title?: StrictTitle4;
  type?: Type4;
  visible?: Visible4;
  weight?: Weight4;
  zone?: Zone4;
}
export interface ToggleOptions {
  description?: Description4;
  feedback?: WidgetFeedback | null;
  off_label?: OffLabel;
  on_label?: OnLabel;
}
/**
 * LCARS-styled checkbox control.
 */
export interface Checkbox {
  action_id: ActionId4;
  aspect?: Aspect5;
  checked?: Checked1;
  color?: Color8;
  disabled?: Disabled5;
  group?: Group5;
  id: Id8;
  label?: Label9;
  /**
   * Enhanced checkbox capabilities.
   */
  options?: ToggleOptions | null;
  span?: Span5;
  strict_role?: StrictRole5;
  strict_surface_variant?: StrictSurfaceVariant5;
  strict_title?: StrictTitle5;
  type?: Type5;
  visible?: Visible5;
  weight?: Weight5;
  zone?: Zone5;
}
/**
 * Single-select radio control with LCARS styling.
 */
export interface Radio {
  action_id: ActionId5;
  aspect?: Aspect6;
  color?: Color9;
  disabled?: Disabled6;
  group?: Group6;
  id: Id9;
  label?: Label10;
  options: Options;
  /**
   * Enhanced radio capabilities.
   */
  settings?: ChoiceOptions | null;
  span?: Span6;
  strict_role?: StrictRole6;
  strict_surface_variant?: StrictSurfaceVariant6;
  strict_title?: StrictTitle6;
  type?: Type6;
  value: Value3;
  visible?: Visible6;
  weight?: Weight6;
  zone?: Zone6;
}
/**
 * Selectable option entry.
 */
export interface SelectOption {
  description?: Description5;
  disabled?: Disabled7;
  group?: Group7;
  label: Label11;
  value: Value2;
}
export interface ChoiceOptions {
  description?: Description6;
  feedback?: WidgetFeedback | null;
  multiple?: Multiple;
  placeholder?: Placeholder;
  searchable?: Searchable;
}
/**
 * Segmented LCARS radio toggle control.
 */
export interface RadioToggle {
  action_id: ActionId6;
  aspect?: Aspect7;
  color?: Color10;
  disabled?: Disabled8;
  group?: Group8;
  id: Id10;
  label?: Label12;
  options: Options1;
  /**
   * Enhanced segmented choice capabilities.
   */
  settings?: ChoiceOptions | null;
  span?: Span7;
  strict_role?: StrictRole7;
  strict_surface_variant?: StrictSurfaceVariant7;
  strict_title?: StrictTitle7;
  type?: Type7;
  value: Value4;
  visible?: Visible7;
  weight?: Weight7;
  zone?: Zone7;
}
/**
 * Single-select control.
 */
export interface Select {
  action_id: ActionId7;
  aspect?: Aspect8;
  color?: Color11;
  disabled?: Disabled9;
  group?: Group9;
  id: Id11;
  label?: Label13;
  options: Options2;
  /**
   * Enhanced select capabilities.
   */
  settings?: ChoiceOptions | null;
  span?: Span8;
  strict_role?: StrictRole8;
  strict_surface_variant?: StrictSurfaceVariant8;
  strict_title?: StrictTitle8;
  type?: Type8;
  value: Value5;
  visible?: Visible8;
  weight?: Weight8;
  zone?: Zone8;
}
/**
 * Text entry control.
 */
export interface TextInput {
  aspect?: Aspect9;
  autocomplete?: Autocomplete;
  color?: Color12;
  disabled?: Disabled10;
  group?: Group10;
  id: Id12;
  label?: Label14;
  /**
   * Enhanced text-input capabilities.
   */
  options?: TextInputOptions | null;
  password?: Password;
  placeholder?: Placeholder1;
  regex?: Regex;
  span?: Span9;
  strict_role?: StrictRole9;
  strict_surface_variant?: StrictSurfaceVariant9;
  strict_title?: StrictTitle9;
  type?: Type9;
  value?: Value6;
  visible?: Visible9;
  weight?: Weight9;
  zone?: Zone9;
}
export interface TextInputOptions {
  commit?: Commit;
  debounce_ms?: DebounceMs1;
  description?: Description7;
  feedback?: WidgetFeedback | null;
  input_type?: InputType;
  multiline?: Multiline;
  rows?: Rows1;
  validation?: ValidationOptions | null;
}
export interface ValidationOptions {
  max_length?: MaxLength;
  message?: Message2;
  min_length?: MinLength;
  pattern?: Pattern;
  required?: Required;
}
/**
 * Numeric entry control.
 */
export interface NumberInput {
  aspect?: Aspect10;
  color?: Color13;
  disabled?: Disabled11;
  group?: Group11;
  id: Id13;
  label?: Label15;
  max?: Max;
  min?: Min;
  /**
   * Enhanced number-input capabilities.
   */
  options?: NumberInputOptions | null;
  placeholder?: Placeholder2;
  span?: Span10;
  step?: Step;
  strict_role?: StrictRole10;
  strict_surface_variant?: StrictSurfaceVariant10;
  strict_title?: StrictTitle10;
  type?: Type10;
  value?: Value7;
  visible?: Visible10;
  weight?: Weight10;
  zone?: Zone10;
}
export interface NumberInputOptions {
  commit?: Commit1;
  debounce_ms?: DebounceMs2;
  description?: Description8;
  feedback?: WidgetFeedback | null;
  precision?: Precision1;
  prefix?: Prefix1;
  required?: Required1;
  suffix?: Suffix1;
}
/**
 * Logical container for grouped input widgets.
 */
export interface Form {
  action_id: ActionId8;
  aspect?: Aspect11;
  children?: Children;
  color?: Color14;
  disabled?: Disabled12;
  group?: Group12;
  id: Id14;
  label?: Label16;
  /**
   * Enhanced form capabilities.
   */
  options?: FormOptions | null;
  span?: Span11;
  strict_role?: StrictRole11;
  strict_surface_variant?: StrictSurfaceVariant11;
  strict_title?: StrictTitle11;
  submit_label: SubmitLabel;
  type?: Type11;
  visible?: Visible11;
  weight?: Weight11;
  zone?: Zone11;
}
export interface FormOptions {
  cancel_action?: ActionSpec | null;
  coerce_values?: CoerceValues;
  columns?: Columns1;
  description?: Description9;
  feedback?: WidgetFeedback | null;
  layout?: Layout1;
  reset_label?: ResetLabel;
}
/**
 * Strict row/column data table.
 */
export interface Table {
  aspect?: Aspect12;
  color?: Color15;
  disabled?: Disabled13;
  group?: Group13;
  headers: Headers;
  id: Id15;
  label?: Label17;
  /**
   * Enhanced table capabilities.
   */
  options?: TableOptions | null;
  rows: Rows2;
  span?: Span12;
  strict_role?: StrictRole12;
  strict_surface_variant?: StrictSurfaceVariant12;
  strict_title?: StrictTitle12;
  type?: Type12;
  visible?: Visible12;
  weight?: Weight12;
  zone?: Zone12;
}
export interface TableOptions {
  columns?: Columns2;
  data_mode?: DataMode;
  density?: Density;
  description?: Description10;
  emit_state_changes?: EmitStateChanges;
  expandable?: Expandable;
  expanded_ids?: ExpandedIds;
  expansion_motion?: ExpansionMotion;
  feedback?: WidgetFeedback | null;
  filters?: Filters;
  interaction?: InteractionOptions | null;
  pagination?: TablePagination | null;
  row_click_select?: RowClickSelect;
  row_key?: RowKey;
  selection?: TableSelection;
  sort?: Sort;
  sticky_header?: StickyHeader;
}
/**
 * Enhanced table column definition.
 */
export interface TableColumn {
  align?: Align;
  filter?: Filter;
  first_sort_direction?: FirstSortDirection;
  key: Key;
  label?: Label18;
  sortable?: Sortable;
  value_format?: ValueFormat | null;
  value_type?: ValueType;
}
export interface TableFilter {
  key: Key1;
  operator?: Operator;
  value: Value8;
}
export interface TablePagination {
  page?: Page1;
  page_size?: PageSize;
  total_rows?: TotalRows;
}
export interface TableSelection {
  mode?: Mode1;
  selected_ids?: SelectedIds;
}
export interface TableSort {
  direction?: Direction;
  key: Key2;
}
/**
 * A single table row.
 */
export interface TableRow {
  cells: Cells;
  children?: Children1;
  error?: Error;
  expanded_content?: ExpandedContent;
  id: Id16;
  loading?: Loading;
}
/**
 * A typed table cell retaining a sortable raw value and safe presentation.
 */
export interface TableCell {
  action?: ActionSpec | null;
  copy_on_click?: CopyOnClick;
  copy_value?: CopyValue;
  copyable?: Copyable1;
  display?: Display;
  link?: LinkSpec | null;
  status?: Status1;
  value?: Value9;
}
/**
 * A line of text inside a full-width expanded detail row.
 */
export interface TableDetailText {
  kind?: Kind;
  text: Text1;
  tone?: Tone;
}
/**
 * A labelled status chip inside expanded detail content.
 */
export interface TableDetailStatus {
  kind?: Kind1;
  label: Label19;
  status: Status2;
}
/**
 * A safe hyperlink inside expanded detail content.
 */
export interface TableDetailLink {
  href: Href1;
  kind?: Kind2;
  label?: Label20;
  rel?: Rel1;
  target?: Target1;
}
/**
 * A typed action button inside expanded detail content.
 */
export interface TableDetailAction {
  action_id: ActionId9;
  kind?: Kind3;
  label: Label21;
  value?: Value10;
}
export interface Value10 {
  [k: string]: unknown;
}
/**
 * A nested compact table inside expanded detail content.
 */
export interface TableDetailTable {
  headers: Headers1;
  kind?: Kind4;
  rows: Rows3;
}
/**
 * Time-series line chart.
 */
export interface LineChart {
  aspect?: Aspect13;
  color?: Color16;
  disabled?: Disabled14;
  group?: Group14;
  id: Id17;
  label?: Label22;
  /**
   * Enhanced chart capabilities.
   */
  options?: ChartOptions | null;
  series: Series;
  span?: Span13;
  strict_role?: StrictRole13;
  strict_surface_variant?: StrictSurfaceVariant13;
  strict_title?: StrictTitle13;
  type?: Type13;
  visible?: Visible13;
  weight?: Weight13;
  x_labels: XLabels;
  zone?: Zone13;
}
export interface ChartOptions {
  curve?: Curve;
  description?: Description11;
  feedback?: WidgetFeedback | null;
  interaction?: InteractionOptions | null;
  legend?: Legend;
  reference_lines?: ReferenceLines;
  tooltip?: Tooltip;
  x_axis?: AxisOptions;
  y_axis?: AxisOptions;
  zoom?: Zoom;
}
export interface ReferenceLine {
  color?: Color17;
  label?: Label23;
  value: Value11;
}
export interface AxisOptions {
  label?: Label24;
  max?: Max1;
  min?: Min1;
  show?: Show;
}
/**
 * A named timeseries dataset.
 */
export interface SeriesPointSet {
  color?: Color18;
  data: Data;
  name: Name;
}
/**
 * Compact line chart without full axes/grid.
 */
export interface Sparkline {
  aspect?: Aspect14;
  color?: Color19;
  disabled?: Disabled15;
  group?: Group15;
  id: Id18;
  label?: Label25;
  /**
   * Enhanced sparkline capabilities.
   */
  options?: SparklineOptions | null;
  series: Series1;
  span?: Span14;
  strict_role?: StrictRole14;
  strict_surface_variant?: StrictSurfaceVariant14;
  strict_title?: StrictTitle14;
  type?: Type14;
  visible?: Visible14;
  weight?: Weight14;
  x_labels: XLabels1;
  zone?: Zone14;
}
export interface SparklineOptions {
  description?: Description12;
  feedback?: WidgetFeedback | null;
  max?: Max2;
  min?: Min2;
  reference_value?: ReferenceValue;
  show_latest?: ShowLatest;
  tooltip?: Tooltip1;
}
/**
 * Live OHLC candlestick chart with pan/zoom and trade markers.
 */
export interface Candlestick {
  aspect?: Aspect15;
  color?: Color20;
  data: Data1;
  disabled?: Disabled16;
  down_color?: DownColor;
  group?: Group16;
  id: Id19;
  label?: Label26;
  markers?: Markers;
  /**
   * Enhanced financial-chart capabilities.
   */
  options?: FinancialChartOptions | null;
  span?: Span15;
  strict_role?: StrictRole15;
  strict_surface_variant?: StrictSurfaceVariant15;
  strict_title?: StrictTitle15;
  type?: Type15;
  up_color?: UpColor;
  visible?: Visible15;
  weight?: Weight15;
  zone?: Zone15;
}
/**
 * A single open/high/low/close bar (or Renko brick).
 */
export interface OhlcPoint {
  close: Close;
  high: High;
  low: Low;
  open: Open;
  time: Time;
  volume?: Volume;
}
/**
 * An annotation/marker plotted on a candlestick or Renko chart.
 */
export interface ChartMarker {
  color?: Color21;
  position?: Position1;
  shape?: Shape;
  text?: Text2;
  time: Time1;
}
export interface FinancialChartOptions {
  description?: Description13;
  feedback?: WidgetFeedback | null;
  fit_content?: FitContent;
  interaction?: InteractionOptions | null;
  legend?: Legend1;
  price_precision?: PricePrecision;
  show_volume?: ShowVolume;
  tooltip?: Tooltip2;
}
/**
 * Live Renko brick chart with pan/zoom and trade markers.
 */
export interface Renko {
  aspect?: Aspect16;
  color?: Color22;
  data: Data2;
  disabled?: Disabled17;
  down_color?: DownColor1;
  group?: Group17;
  id: Id20;
  label?: Label27;
  markers?: Markers1;
  /**
   * Enhanced financial-chart capabilities.
   */
  options?: FinancialChartOptions | null;
  span?: Span16;
  strict_role?: StrictRole16;
  strict_surface_variant?: StrictSurfaceVariant16;
  strict_title?: StrictTitle16;
  type?: Type16;
  up_color?: UpColor1;
  visible?: Visible16;
  weight?: Weight16;
  zone?: Zone16;
}
/**
 * Animated WebGL fragment-shader viewport.
 */
export interface Shader {
  aspect?: Aspect17;
  aspect_ratio?: AspectRatio;
  color?: Color23;
  disabled?: Disabled18;
  fragment_shader: FragmentShader;
  group?: Group18;
  id: Id21;
  label?: Label28;
  /**
   * Enhanced shader capabilities.
   */
  options?: ShaderOptions | null;
  span?: Span17;
  strict_role?: StrictRole17;
  strict_surface_variant?: StrictSurfaceVariant17;
  strict_title?: StrictTitle17;
  type?: Type17;
  uniforms?: Uniforms;
  visible?: Visible17;
  weight?: Weight17;
  zone?: Zone17;
}
export interface ShaderOptions {
  description?: Description14;
  fallback?: Fallback;
  feedback?: WidgetFeedback | null;
  fps_limit?: FpsLimit;
  honor_reduced_motion?: HonorReducedMotion;
  paused?: Paused;
}
/**
 * Custom uniform values (float, or vec2/vec3/vec4 as a list).
 */
export interface Uniforms {
  [k: string]: number | number[];
}
/**
 * Circular gauge for single-value telemetry.
 */
export interface Gauge {
  aspect?: Aspect18;
  color?: Color24;
  crit_threshold?: CritThreshold;
  disabled?: Disabled19;
  group?: Group19;
  id: Id22;
  label?: Label29;
  max?: Max3;
  min?: Min3;
  /**
   * Enhanced gauge capabilities.
   */
  options?: MeterOptions | null;
  span?: Span18;
  strict_role?: StrictRole18;
  strict_surface_variant?: StrictSurfaceVariant18;
  strict_title?: StrictTitle18;
  type?: Type18;
  unit?: Unit1;
  value: Value12;
  visible?: Visible18;
  warn_threshold?: WarnThreshold1;
  weight?: Weight18;
  zone?: Zone18;
}
export interface MeterOptions {
  crit_threshold?: CritThreshold1;
  description?: Description15;
  feedback?: WidgetFeedback | null;
  indeterminate?: Indeterminate;
  max?: Max4;
  min?: Min4;
  segments?: Segments1;
  ticks?: Ticks;
  unit?: Unit;
  value_format?: ValueFormat | null;
  warn_threshold?: WarnThreshold;
}
/**
 * Horizontal progress meter.
 */
export interface ProgressBar {
  aspect?: Aspect19;
  color?: Color25;
  disabled?: Disabled20;
  group?: Group20;
  id: Id23;
  label?: Label30;
  /**
   * Enhanced meter capabilities.
   */
  options?: MeterOptions | null;
  show_label?: ShowLabel;
  span?: Span19;
  strict_role?: StrictRole19;
  strict_surface_variant?: StrictSurfaceVariant19;
  strict_title?: StrictTitle19;
  type?: Type19;
  value: Value13;
  visible?: Visible19;
  weight?: Weight19;
  zone?: Zone19;
}
/**
 * Rich markdown content block.
 */
export interface Markdown {
  aspect?: Aspect20;
  color?: Color26;
  content: Content1;
  disabled?: Disabled21;
  group?: Group21;
  id: Id24;
  label?: Label31;
  /**
   * Enhanced markdown capabilities.
   */
  options?: MarkdownOptions | null;
  span?: Span20;
  strict_role?: StrictRole20;
  strict_surface_variant?: StrictSurfaceVariant20;
  strict_title?: StrictTitle20;
  type?: Type20;
  visible?: Visible20;
  weight?: Weight20;
  zone?: Zone20;
}
export interface MarkdownOptions {
  copy_code?: CopyCode;
  description?: Description16;
  feedback?: WidgetFeedback | null;
  link_target?: LinkTarget;
  max_height?: MaxHeight;
}
/**
 * Scrolling terminal-style log viewer.
 */
export interface LogViewer {
  aspect?: Aspect21;
  auto_scroll?: AutoScroll;
  color?: Color27;
  disabled?: Disabled22;
  group?: Group22;
  id: Id25;
  label?: Label32;
  max_lines?: MaxLines1;
  /**
   * Enhanced log capabilities.
   */
  options?: LogOptions | null;
  span?: Span21;
  stream_id: StreamId;
  strict_role?: StrictRole21;
  strict_surface_variant?: StrictSurfaceVariant21;
  strict_title?: StrictTitle21;
  type?: Type21;
  visible?: Visible21;
  weight?: Weight21;
  zone?: Zone21;
}
export interface LogOptions {
  description?: Description17;
  feedback?: WidgetFeedback | null;
  interaction?: InteractionOptions | null;
  levels?: Levels;
  line_numbers?: LineNumbers;
  paused?: Paused1;
  search?: Search;
  timestamps?: Timestamps;
  toolbar?: Toolbar;
  wrap?: Wrap1;
}
/**
 * HLS video playback widget.
 */
export interface VideoHls {
  aspect?: Aspect22;
  autoplay?: Autoplay;
  color?: Color28;
  disabled?: Disabled23;
  group?: Group23;
  id: Id26;
  label?: Label33;
  muted?: Muted;
  /**
   * Enhanced video capabilities.
   */
  options?: VideoOptions | null;
  span?: Span22;
  src: Src;
  strict_role?: StrictRole22;
  strict_surface_variant?: StrictSurfaceVariant22;
  strict_title?: StrictTitle22;
  type?: Type22;
  visible?: Visible22;
  weight?: Weight22;
  zone?: Zone22;
}
export interface VideoOptions {
  controls?: Controls;
  description?: Description18;
  feedback?: WidgetFeedback | null;
  interaction?: InteractionOptions | null;
  loop?: Loop;
  playback_rates?: PlaybackRates;
  preload?: Preload;
  show_source?: ShowSource;
}
/**
 * A library-managed Three.js viewport configured by a project scene module.
 *
 * This is the one widget whose behaviour is written in JavaScript rather than
 * Python: real 3D needs geometry construction, loaders and imports, which do
 * not survive being passed through the manifest as a source string the way
 * ``Shader``'s GLSL does. The module is ordinary same-origin project code —
 * trusted, not sandboxed — and the renderer owns everything around it: canvas,
 * camera, controls, resizing, the frame loop and disposal.
 */
export interface ThreeScene {
  aspect?: Aspect23;
  aspect_ratio?: AspectRatio1;
  color?: Color29;
  disabled?: Disabled24;
  group?: Group24;
  id: Id27;
  label?: Label34;
  module: Module;
  /**
   * Scene capabilities.
   */
  options?: ThreeSceneOptions | null;
  props?: Props;
  span?: Span23;
  strict_role?: StrictRole23;
  strict_surface_variant?: StrictSurfaceVariant23;
  strict_title?: StrictTitle23;
  type?: Type23;
  visible?: Visible23;
  weight?: Weight23;
  zone?: Zone23;
}
/**
 * Renderer-owned scene settings. Mirrors ShaderOptions where the concerns overlap.
 */
export interface ThreeSceneOptions {
  camera?: ThreeSceneCamera;
  controls?: ThreeSceneControls;
  description?: Description19;
  fallback?: Fallback1;
  feedback?: WidgetFeedback | null;
  fps_limit?: FpsLimit1;
  honor_reduced_motion?: HonorReducedMotion1;
  interaction?: InteractionOptions | null;
  max_pixel_ratio?: MaxPixelRatio;
  paused?: Paused2;
  transparent?: Transparent;
}
/**
 * Initial perspective-camera placement for a managed Three.js scene.
 */
export interface ThreeSceneCamera {
  far?: Far;
  fov?: Fov;
  near?: Near;
  position?: Position2;
  target?: Target2;
}
/**
 * Orbit/pan/zoom behaviour. The renderer owns the controls; this configures them.
 */
export interface ThreeSceneControls {
  auto_rotate?: AutoRotate;
  auto_rotate_speed?: AutoRotateSpeed;
  damping?: Damping;
  enabled?: Enabled;
  max_distance?: MaxDistance;
  min_distance?: MinDistance;
  orbit?: Orbit;
  pan?: Pan;
  zoom?: Zoom1;
}
/**
 * JSON-serializable data handed to the scene module's setup().
 */
export interface Props {
  [k: string]: unknown;
}
/**
 * A full LCARS-styled node-graph editor.
 */
export interface NodeCanvas {
  aspect?: Aspect24;
  color?: Color30;
  disabled?: Disabled25;
  document?: GraphDocument;
  /**
   * Application-owned run status; never set by the library.
   */
  execution?: GraphExecutionState | null;
  group?: Group26;
  id: Id36;
  label?: Label41;
  options?: NodeCanvasOptions | null;
  span?: Span24;
  strict_role?: StrictRole24;
  strict_surface_variant?: StrictSurfaceVariant24;
  strict_title?: StrictTitle24;
  type?: Type25;
  visible?: Visible24;
  weight?: Weight24;
  zone?: Zone24;
}
/**
 * A complete node graph. This is the interchange format, version 1.
 */
export interface GraphDocument {
  comments?: Comments;
  edges?: Edges;
  format?: Format;
  groups?: Groups;
  nodes?: Nodes;
  reroutes?: Reroutes;
  templates?: Templates;
  version?: Version1;
  viewport?: GraphViewport;
}
/**
 * Free text pinned to the canvas.
 */
export interface GraphComment {
  id: Id28;
  position?: Position3;
  size?: Size1;
  text?: Text3;
}
/**
 * A wire from one node's output to another node's input.
 */
export interface GraphEdge {
  id: Id29;
  source: Source;
  source_port: SourcePort;
  target: Target3;
  target_port: TargetPort;
}
/**
 * A titled frame drawn behind a set of nodes.
 */
export interface GraphGroup {
  color?: Color31;
  id: Id30;
  label?: Label35;
  position?: Position4;
  size?: Size2;
}
/**
 * A placed instance of a template.
 */
export interface GraphNode {
  group?: Group25;
  id: Id31;
  label?: Label36;
  position?: Position5;
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
  id: Id32;
  position?: Position6;
}
/**
 * A node type: what it is called, what it carries, and how it wires up.
 */
export interface NodeTemplate {
  category?: Category;
  color?: Color32;
  fields?: Fields;
  id: Id34;
  inputs?: Inputs;
  label?: Label40;
  outputs?: Outputs;
}
/**
 * An editable value carried by a node.
 */
export interface GraphField {
  default?: Default;
  id: Id33;
  kind?: Kind5;
  label?: Label37;
  max?: Max5;
  min?: Min5;
  options?: Options3;
  placeholder?: Placeholder3;
  step?: Step1;
}
/**
 * One choice in a select field.
 */
export interface GraphFieldOption {
  label?: Label38;
  value: Value14;
}
/**
 * One connection point on a node template.
 */
export interface GraphPort {
  capacity?: Capacity;
  id: Id35;
  label?: Label39;
  type?: Type24;
}
/**
 * Where the canvas was last looking.
 */
export interface GraphViewport {
  x?: X;
  y?: Y;
  zoom?: Zoom2;
}
/**
 * Run status for the graph. Owned by the application, never by the library.
 */
export interface GraphExecutionState {
  message?: Message3;
  nodes?: Nodes1;
  status?: Status4;
}
export interface Nodes1 {
  [k: string]: GraphNodeExecution;
}
/**
 * How one node is faring in the current run.
 */
export interface GraphNodeExecution {
  message?: Message4;
  progress?: Progress;
  status?: Status3;
}
/**
 * Editor capabilities.
 */
export interface NodeCanvasOptions {
  allow_import_export?: AllowImportExport;
  description?: Description20;
  editable?: Editable;
  feedback?: WidgetFeedback | null;
  grid_size?: GridSize;
  history_limit?: HistoryLimit;
  interaction?: InteractionOptions | null;
  max_zoom?: MaxZoom;
  min_zoom?: MinZoom;
  minimap?: Minimap;
  show_cancel?: ShowCancel;
  show_palette?: ShowPalette;
  show_queue?: ShowQueue;
  show_run?: ShowRun;
  snap_to_grid?: SnapToGrid;
}
/**
 * Push-to-talk or continuous (VAD-driven) microphone control.
 */
export interface MicButton {
  action_id: ActionId10;
  aspect?: Aspect25;
  color?: Color33;
  continuous?: Continuous;
  disabled?: Disabled26;
  group?: Group27;
  id: Id37;
  label?: Label42;
  /**
   * Enhanced microphone capabilities.
   */
  options?: MicOptions | null;
  silence_ms?: SilenceMs;
  span?: Span25;
  strict_role?: StrictRole25;
  strict_surface_variant?: StrictSurfaceVariant25;
  strict_title?: StrictTitle25;
  timeout_ms?: TimeoutMs;
  type?: Type26;
  upload_url: UploadUrl;
  visible?: Visible25;
  weight?: Weight25;
  zone?: Zone25;
}
export interface MicOptions {
  description?: Description21;
  device_id?: DeviceId;
  feedback?: WidgetFeedback | null;
  max_bytes?: MaxBytes;
  mime_types?: MimeTypes;
  min_duration_ms?: MinDurationMs;
  vad_threshold?: VadThreshold;
}
/**
 * Composable LCARS container with configurable corners and side bars.
 */
export interface LcarsBox {
  aspect?: Aspect26;
  children?: Children2;
  color?: Color37;
  corner_colors?: CornerColors;
  corners?: Corners;
  disabled?: Disabled30;
  group?: Group31;
  id: Id41;
  label?: Label46;
  left_inputs?: LeftInputs;
  main_children?: MainChildren;
  /**
   * Enhanced container capabilities.
   */
  options?: ContainerOptions | null;
  right_inputs?: RightInputs;
  side_children?: SideChildren;
  side_colors?: SideColors;
  sides?: Sides;
  span?: Span29;
  strict_role?: StrictRole29;
  strict_surface_variant?: StrictSurfaceVariant29;
  strict_title?: StrictTitle29;
  subtitle?: Subtitle3;
  subtitle_color?: SubtitleColor;
  title?: Title2;
  title_color?: TitleColor;
  type?: Type30;
  visible?: Visible29;
  weight?: Weight29;
  width_left?: WidthLeft;
  width_right?: WidthRight;
  zone?: Zone29;
}
/**
 * LCARS sweep container with explicit strict-mode composition regions.
 *
 * Region semantics:
 * - ``header_children``: optional widgets mounted in the sweep header band.
 * - ``rail_children``: optional widgets mounted in the sweep vertical rail region.
 * - ``content_children``: primary interior widgets for the sweep body.
 *
 * ``children`` remains for backward compatibility. Strict normalizer lowering
 * treats it as the source list for regioning when explicit region lists are
 * not already populated.
 */
export interface LcarsSweep {
  aspect?: Aspect27;
  children?: Children3;
  color?: Color36;
  column_inputs?: ColumnInputs;
  content_children?: ContentChildren;
  disabled?: Disabled29;
  group?: Group30;
  header_children?: HeaderChildren;
  id: Id40;
  label?: Label45;
  left_children?: LeftChildren;
  left_width?: LeftWidth;
  /**
   * Enhanced container capabilities.
   */
  options?: ContainerOptions | null;
  rail_children?: RailChildren;
  reverse?: Reverse;
  right_children?: RightChildren;
  span?: Span28;
  strict_role?: StrictRole28;
  strict_surface_variant?: StrictSurfaceVariant28;
  strict_title?: StrictTitle28;
  subtitle?: Subtitle2;
  title?: Title1;
  type?: Type29;
  visible?: Visible28;
  weight?: Weight28;
  width_sidebar?: WidthSidebar;
  zone?: Zone28;
}
/**
 * LCARS bracket container for grouping related content.
 */
export interface LcarsBracket {
  aspect?: Aspect28;
  children?: Children4;
  color?: Color35;
  disabled?: Disabled28;
  group?: Group29;
  id: Id39;
  label?: Label44;
  /**
   * Enhanced container capabilities.
   */
  options?: ContainerOptions | null;
  orientation?: Orientation;
  span?: Span27;
  strict_role?: StrictRole27;
  strict_surface_variant?: StrictSurfaceVariant27;
  strict_title?: StrictTitle27;
  type?: Type28;
  visible?: Visible27;
  weight?: Weight27;
  zone?: Zone27;
}
/**
 * LCARS section header with bar-and-pill presentation.
 */
export interface LcarsHeader {
  aspect?: Aspect29;
  color?: Color34;
  disabled?: Disabled27;
  group?: Group28;
  id: Id38;
  label?: Label43;
  /**
   * Enhanced header capabilities.
   */
  options?: HeaderOptions | null;
  size?: Size3;
  span?: Span26;
  strict_role?: StrictRole26;
  strict_surface_variant?: StrictSurfaceVariant26;
  strict_title?: StrictTitle26;
  text: Text4;
  type?: Type27;
  visible?: Visible26;
  weight?: Weight26;
  zone?: Zone26;
}
export interface HeaderOptions {
  actions?: Actions;
  anchor?: Anchor;
  description?: Description22;
  feedback?: WidgetFeedback | null;
  subtitle?: Subtitle1;
}
export interface ContainerOptions {
  collapsible?: Collapsible;
  density?: Density1;
  description?: Description23;
  feedback?: WidgetFeedback | null;
  initial_collapsed?: InitialCollapsed;
  interaction?: InteractionOptions | null;
  overflow?: Overflow;
}
