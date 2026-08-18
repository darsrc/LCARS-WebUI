/* Generated from fixtures/golden/schema.v1.json. SHA256: 20fc99d7d5b9be6351e50c15bc0ea415bb67949cab0e8ef80e753840422eb4bf. Do not edit. */

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
export type Theme =
  | "galaxy"
  | "nemesis"
  | "tng"
  | "outpost"
  | "cardassian"
  | "klingon"
  | "romulan"
  | "ferengi"
  | "gruvbox";
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
export type Archetype = "auto" | "console" | "telemetry" | "grid" | "menu" | "authored";
/**
 * Application chrome treatment. Authored pages may suppress the console shell.
 */
export type Chrome = "console" | "none";
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
 * Text alignment within its authored region.
 */
export type Align = "start" | "center" | "end";
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
export type Id3 = string;
/**
 * Optional display or accessibility label.
 */
export type Label2 = string | null;
export type Description = string | null;
export type Message = string | null;
export type State = "ready" | "loading" | "empty" | "error";
export type SecondaryValue = string | null;
export type Trend = ("up" | "down" | "flat") | null;
export type Compact = boolean;
export type Precision = number | null;
export type Prefix = string;
export type Suffix = string;
export type Thousands = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span = [unknown, unknown] | null;
/**
 * Current status severity.
 */
export type Status = "ok" | "warn" | "crit";
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
export type Type = "status_tile";
/**
 * Large status value readout.
 */
export type Value = string;
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
export type Id4 = string;
/**
 * Optional display or accessibility label.
 */
export type Label3 = string | null;
/**
 * Alert message.
 */
export type Message1 = string;
export type ActionId = string;
export type Label4 = string;
export type Description1 = string | null;
export type Dismissible = boolean;
export type ActionId1 = string | null;
export type Mode = "local" | "server";
export type Live = "polite" | "assertive";
/**
 * Alert severity level.
 */
export type Severity = "red" | "yellow" | "info" | "success";
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing1 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span1 = [unknown, unknown] | null;
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
export type Type1 = "alert";
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
 * Data-tile typography density.
 */
export type Density = "normal" | "compact" | "micro";
/**
 * Small data-tile detail line.
 */
export type Detail = string | null;
/**
 * If true, interaction is disabled.
 */
export type Disabled3 = boolean;
export type Electrons = number;
export type Rings = number;
export type Rotation = number;
export type Spokes = number;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group3 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id5 = string;
/**
 * Optional display or accessibility label.
 */
export type Label5 = string | null;
export type BusyLabel = string | null;
export type Confirm = string | null;
export type DebounceMs = number;
export type Description2 = string | null;
/**
 * Visual treatment for the control.
 */
export type Presentation = "button" | "data_tile";
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing2 = ("fill" | "content") | null;
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
/**
 * Large data-tile symbol.
 */
export type Symbol = string | null;
/**
 * Rounded data-tile terminals.
 */
export type Terminal = "none" | "start" | "end" | "both";
export type Type2 = "button";
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
export type Id6 = string;
/**
 * Optional display or accessibility label.
 */
export type Label6 = string | null;
export type Description3 = string | null;
export type OffLabel = string | null;
export type OnLabel = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing3 = ("fill" | "content") | null;
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
export type Type3 = "toggle";
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
export type Id7 = string;
/**
 * Optional display or accessibility label.
 */
export type Label7 = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing4 = ("fill" | "content") | null;
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
export type Type4 = "lcars_checkbox";
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
export type Id8 = string;
/**
 * Optional display or accessibility label.
 */
export type Label8 = string | null;
/**
 * Optional option description.
 */
export type Description4 = string | null;
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
export type Label9 = string;
/**
 * Machine option value.
 */
export type Value2 = string;
/**
 * Available options.
 */
export type Options = SelectOption[];
export type Description5 = string | null;
export type Multiple = boolean;
export type Placeholder = string | null;
export type Searchable = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing5 = ("fill" | "content") | null;
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
export type Type5 = "lcars_radio";
/**
 * Current selected value.
 */
export type Value3 = string;
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
export type Id9 = string;
/**
 * Optional display or accessibility label.
 */
export type Label10 = string | null;
/**
 * Available options.
 */
export type Options1 = SelectOption[];
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing6 = ("fill" | "content") | null;
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
export type Type6 = "lcars_radio_toggle";
/**
 * Current selected value.
 */
export type Value4 = string;
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
export type Id10 = string;
/**
 * Optional display or accessibility label.
 */
export type Label11 = string | null;
/**
 * Available options.
 */
export type Options2 = SelectOption[];
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing7 = ("fill" | "content") | null;
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
export type Type7 = "select";
/**
 * Current selected value or values.
 */
export type Value5 = string | string[];
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
export type Id11 = string;
/**
 * Optional display or accessibility label.
 */
export type Label12 = string | null;
export type Commit = "blur" | "enter" | "change";
export type DebounceMs1 = number;
export type Description6 = string | null;
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
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing8 = ("fill" | "content") | null;
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
export type Type8 = "text_input";
/**
 * Current text value.
 */
export type Value6 = string;
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
export type Id12 = string;
/**
 * Optional display or accessibility label.
 */
export type Label13 = string | null;
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
export type Description7 = string | null;
export type Precision1 = number | null;
export type Prefix1 = string;
export type Required1 = boolean;
export type Suffix1 = string;
/**
 * Placeholder hint text.
 */
export type Placeholder2 = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing9 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span9 = [unknown, unknown] | null;
/**
 * Increment/decrement step.
 */
export type Step = number;
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
export type Type9 = "number_input";
/**
 * Current numeric value.
 */
export type Value7 = number;
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
 * Accepted MIME types or filename extensions, e.g. ['application/json', '.yaml'].
 */
export type Accept = string[];
/**
 * Action id dispatched after a successful upload.
 */
export type ActionId8 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect11 = ("wide" | "tall" | "square" | "flex") | null;
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
export type Id13 = string;
/**
 * Optional display or accessibility label.
 */
export type Label14 = string | null;
/**
 * Maximum size of each selected file in bytes (client-side guard).
 */
export type MaxBytes = number;
/**
 * Maximum files per upload.
 */
export type MaxFiles = number;
/**
 * Allow more than one file per upload.
 */
export type Multiple1 = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing10 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span10 = [unknown, unknown] | null;
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
export type Type10 = "file_upload";
/**
 * Multipart upload endpoint. The built-in endpoint dispatches action_id with the uploaded bytes available during the HANDLE rerun.
 */
export type UploadUrl = string;
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
export type ActionId9 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect12 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Nested input widgets aggregated into form submit payload.
 */
export type Children1 = (
  Button | Toggle | Checkbox | Select | Radio | RadioToggle | TextInput | NumberInput
)[];
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
 * Unique widget identifier used for event targeting.
 */
export type Id14 = string;
/**
 * Optional display or accessibility label.
 */
export type Label15 = string | null;
export type CoerceValues = boolean;
export type Columns1 = number;
export type Description8 = string | null;
export type Layout1 = "stack" | "row" | "grid";
export type ResetLabel = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing11 = ("fill" | "content") | null;
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
export type Label16 = string | null;
export type Columns2 = TableColumn[] | null;
export type Align1 = "start" | "center" | "end";
export type Filter = "none" | "text" | "select" | "number";
export type FirstSortDirection = "asc" | "desc";
export type Key = string;
export type Label17 = string | null;
export type SortAs =
  | "auto"
  | "text"
  | "natural"
  | "number"
  | "bytes"
  | "percent"
  | "duration"
  | "currency"
  | "datetime"
  | "version"
  | "boolean";
export type SortNulls = "last" | "first";
export type SortOrder = string[] | null;
export type Sortable = boolean;
export type ValueType = "auto" | "text" | "number" | "date" | "boolean";
export type DataMode = "client" | "server";
export type Density1 = "compact" | "normal";
export type Description9 = string | null;
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
export type SortCycle = "auto" | "two-state" | "three-state";
export type StickyHeader = boolean;
export type CopyOnClick = boolean;
export type CopyValue = string | null;
export type Copyable = boolean;
export type Display = string | null;
export type Href = string;
export type Label18 = string | null;
export type Rel = string | null;
export type Target = "_self" | "_blank";
export type Status1 = ("ok" | "warn" | "crit" | "muted") | null;
export type Value9 = string | number | boolean | null;
/**
 * Ordered row cell values.
 */
export type Cells = (string | number | boolean | TableCell | null)[];
/**
 * Optional expandable child rows.
 */
export type Children2 = TableRow[];
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
export type ActionId10 = string;
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
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing12 = ("fill" | "content") | null;
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
export type Aspect14 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
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
export type Id17 = string;
/**
 * Optional display or accessibility label.
 */
export type Label22 = string | null;
export type Curve = "linear" | "step";
export type Description10 = string | null;
export type Legend = boolean;
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
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing13 = ("fill" | "content") | null;
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
 * If true, interaction is disabled.
 */
export type Disabled16 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group16 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id18 = string;
/**
 * Optional display or accessibility label.
 */
export type Label25 = string | null;
export type Description11 = string | null;
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
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing14 = ("fill" | "content") | null;
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
export type Aspect16 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
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
export type Disabled17 = boolean;
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
export type Group17 = string | null;
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
export type Description12 = string | null;
export type FitContent = boolean;
export type Legend1 = boolean;
export type PricePrecision = number | null;
export type ShowVolume = boolean;
export type Tooltip2 = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing15 = ("fill" | "content") | null;
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
export type Aspect17 = ("wide" | "tall" | "square" | "flex") | null;
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
 * Ordered Renko bricks.
 */
export type Data2 = OhlcPoint[];
/**
 * If true, interaction is disabled.
 */
export type Disabled18 = boolean;
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
export type Group18 = string | null;
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
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing16 = ("fill" | "content") | null;
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
export type Aspect18 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional fixed width/height ratio; fills the panel otherwise.
 */
export type AspectRatio = number | null;
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
 * If true, interaction is disabled.
 */
export type Disabled19 = boolean;
/**
 * GLSL ES 1.00 fragment shader source. Receives `uniform float u_time`, `uniform vec2 u_resolution`, `varying vec2 v_uv`, plus any custom uniforms declared in `uniforms`.
 */
export type FragmentShader = string;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group19 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id21 = string;
/**
 * Optional display or accessibility label.
 */
export type Label28 = string | null;
export type Description13 = string | null;
export type Fallback = string;
export type FpsLimit = number;
export type HonorReducedMotion = boolean;
export type Paused = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing17 = ("fill" | "content") | null;
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
 * Optional critical threshold for style changes.
 */
export type CritThreshold = number | null;
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
export type Description14 = string | null;
export type Indeterminate = boolean;
export type Max4 = number;
export type Min4 = number;
export type Segments1 = number;
export type Ticks = boolean;
export type Unit = string | null;
export type WarnThreshold = number | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing18 = ("fill" | "content") | null;
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
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing19 = ("fill" | "content") | null;
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
export type Aspect21 = ("wide" | "tall" | "square" | "flex") | null;
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
 * Markdown content.
 */
export type Content1 = string;
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
export type Id24 = string;
/**
 * Optional display or accessibility label.
 */
export type Label31 = string | null;
export type CopyCode = boolean;
export type Description15 = string | null;
export type LinkTarget = "_self" | "_blank";
export type MaxHeight = number | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing20 = ("fill" | "content") | null;
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
export type Aspect22 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Follow new lines when already scrolled to the bottom.
 */
export type AutoScroll = boolean;
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
export type Id25 = string;
/**
 * Optional display or accessibility label.
 */
export type Label32 = string | null;
/**
 * Maximum client-side buffered lines.
 */
export type MaxLines = number;
export type Description16 = string | null;
export type Levels = string[];
export type LineNumbers = boolean;
export type Paused1 = boolean;
export type Search = boolean;
export type Timestamps = boolean;
export type Toolbar = boolean;
export type Wrap = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing21 = ("fill" | "content") | null;
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
export type Aspect23 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Whether video should autoplay.
 */
export type Autoplay = boolean;
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
export type Description17 = string | null;
export type Loop = boolean;
export type PlaybackRates = number[];
export type Preload = "none" | "metadata" | "auto";
export type ShowSource = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing22 = ("fill" | "content") | null;
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
export type Aspect24 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional width/height ratio for the viewport.
 */
export type AspectRatio1 = number | null;
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
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group25 = string | null;
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
export type Description18 = string | null;
export type Fallback1 = string;
export type FpsLimit1 = number;
export type HonorReducedMotion1 = boolean;
export type MaxPixelRatio = number;
export type Paused2 = boolean;
export type Transparent = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing23 = ("fill" | "content") | null;
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
export type Aspect25 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
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
/**
 * If true, interaction is disabled.
 */
export type Disabled26 = boolean;
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
export type Size = [unknown, unknown];
export type Text3 = string;
export type Comments = GraphComment[];
/**
 * Optional complete accessible name; a deterministic name is generated if absent.
 */
export type AccessibleLabel = string | null;
export type Id29 = string;
/**
 * Persistent edge label.
 */
export type Label35 = string | null;
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
export type Target3 = string;
export type TargetPort = string;
export type Edges = GraphEdge[];
export type Format = "lcars-node-graph";
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
export type Id30 = string;
export type Label36 = string | null;
/**
 * @minItems 2
 * @maxItems 2
 */
export type Position4 = [unknown, unknown];
/**
 * @minItems 2
 * @maxItems 2
 */
export type Size1 = [unknown, unknown];
export type Groups = GraphGroup[];
/**
 * Optional redundant color cue.
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
export type DefaultEmphasized = boolean;
export type DefaultVisible = boolean;
/**
 * Meaning announced in the legend and edge details.
 */
export type Description19 = string | null;
export type Id31 = string;
/**
 * Legend label; defaults to the id.
 */
export type Label37 = string | null;
export type LabelZoomThreshold = number;
/**
 * Terminal marker.
 */
export type Marker = "arrow_closed" | "arrow_open" | "none";
/**
 * Non-color line treatment for this layer.
 */
export type Pattern1 = "solid" | "dashed" | "dotted" | "double";
/**
 * Compact label used below the edge's zoom threshold.
 */
export type Token = string | null;
export type Layers = GraphLayer[];
/**
 * Id of the group this belongs to.
 */
export type Group26 = string | null;
export type Id32 = string;
/**
 * Per-instance title override.
 */
export type Label38 = string | null;
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
export type Id33 = string;
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
  | string
  | null;
export type Default = string | number | boolean | null;
/**
 * Field identifier, unique within the template.
 */
export type Id34 = string;
export type Kind5 = "text" | "number" | "boolean" | "select";
export type Label39 = string | null;
export type Max5 = number | null;
export type Min5 = number | null;
export type Label40 = string | null;
export type Value14 = string;
/**
 * Choices for kind='select'.
 */
export type Options3 = GraphFieldOption[];
export type Placeholder3 = string | null;
export type Step1 = number | null;
export type Fields = GraphField[];
export type Id35 = string;
/**
 * Maximum simultaneous connections. Defaults by side when unset: one for an input, unlimited for an output.
 */
export type Capacity = number | null;
/**
 * Port identifier, unique within its side of the template.
 */
export type Id36 = string;
/**
 * Display label; defaults to the id.
 */
export type Label41 = string | null;
/**
 * Caller-selected code-rendered geometry hint for port compatibility.
 */
export type Shape1 = "circle" | "square" | "diamond" | "tab" | "notch";
/**
 * Port data type; 'any' matches everything.
 */
export type Type24 = string;
export type Inputs = GraphPort[];
export type Label42 = string | null;
export type Outputs = GraphPort[];
export type Templates = NodeTemplate[];
export type Version1 = 1 | 2;
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
export type Group27 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id37 = string;
/**
 * Optional display or accessibility label.
 */
export type Label43 = string | null;
export type AllowImportExport = boolean;
export type Description20 = string | null;
export type Editable = boolean;
export type GridSize = number;
export type HistoryLimit = number;
export type MaxZoom = number;
export type MinZoom = number;
export type Minimap = boolean;
/**
 * Node/group/comment position dragging. Independent of `editable`: position is reader-local view state, not a data mutation, so it stays available in read-only canvases unless explicitly disabled.
 */
export type Movable = boolean;
export type ShowCancel = boolean;
export type ShowPalette = boolean;
export type ShowQueue = boolean;
export type ShowRun = boolean;
export type SnapToGrid = boolean;
/**
 * Optional reader-only edge visibility window. Routing still uses the complete document.
 */
export type VisibleEdgeIds = string[] | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing24 = ("fill" | "content") | null;
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
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect26 = ("wide" | "tall" | "square" | "flex") | null;
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
  | string
  | null;
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
export type Label44 = string | null;
export type AutosaveDelayMs = number;
export type AutosaveKey = string | null;
export type CanonicalCollapsed = boolean;
export type CanonicalTitle = string;
export type Description21 = string | null;
export type FanPageSize = number;
export type ProposalTitle = string;
/**
 * Group composes a structured value locally and commits the reviewed tree as one proposal edit. Incremental preserves the original per-operation behavior.
 */
export type TreeCommitMode = "group" | "incremental";
export type VirtualRowHeight = number;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing25 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span25 = [unknown, unknown] | null;
export type StrictRole25 = ("primary" | "secondary" | "terminal") | null;
export type StrictSurfaceVariant25 = ("readout_frame" | "chart_frame") | null;
export type StrictTitle25 = string | null;
export type Type26 = "graph_workspace";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible25 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight25 = number | null;
export type Command = string;
export type Confirmation = string | null;
export type Id39 = string;
export type Label45 = string;
export type JsonValue = unknown;
export type Scope = "reader" | "proposal" | "submission";
export type Transport = "local" | "server";
export type Actions = WorkspaceAction[];
export type KnownRecords = number | null;
export type LoadedRecords = number;
export type Reason = string | null;
export type Stage = string | null;
export type State1 = "loading" | "complete" | "partial" | "failed" | "cancelled";
export type GraphId = string;
export type Revision = string;
export type ElementId = string;
export type ElementKind = "node" | "edge" | "group";
export type Plane = "canonical" | "proposal";
export type RecordId = string;
export type Bindings = WorkspaceProjectionBinding[];
export type Id40 = string;
export type Kind6 = string;
export type Label46 = string | null;
export type Format1 = "lcars-structured-value";
export type Id41 = string;
export type Part = string;
export type Schema = string;
export type Version2 = 1;
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
export type Unit2 = "committed_proposal_command_or_edit";
export type BaseRecordId = string | null;
export type Dependencies = string[];
export type Id42 = string;
export type Operation = "addition" | "replacement" | "retirement" | "reference" | "unresolved";
export type RecordId1 = string;
export type Changes = ProposalChange[];
export type Blocking = boolean;
export type Id43 = string;
export type Message5 = string;
export type RuleId = string | null;
export type Severity1 = "info" | "warning" | "error";
export type Source1 = "client" | "caller" | "server";
export type ElementId1 = string;
export type ElementKind1 = "record" | "node" | "edge" | "group" | "capsule";
export type Path = string | null;
export type Plane1 = "canonical" | "proposal";
export type Findings = ValidationFinding[];
export type InteractionCount = number;
export type ProposalId = string;
export type Revision1 = number;
export type Status5 = "draft" | "ready" | "submitted" | "historical";
export type Title1 = string;
export type Id44 = string;
export type Label47 = string;
export type ElementId2 = string;
export type ElementKind2 = "record" | "node" | "edge" | "group" | "capsule";
export type Plane2 = "canonical" | "proposal";
export type Step2 = string | null;
export type Breadcrumb = ReaderNavigationEntry[];
export type Collapsed = string[];
export type CurrentStep = string | null;
export type Facet = string;
/**
 * @minItems 1
 */
export type Values1 = [string, ...string[]];
export type Filters1 = ReaderFilter[];
export type Direction1 = "incoming" | "outgoing" | "both";
export type Radius = number;
export type RecordId2 = string;
export type History = ReaderNavigationEntry[];
export type HistoryIndex = number;
export type Emphasized = boolean;
export type Visible26 = boolean;
export type Revision2 = number;
export type Search1 = string;
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
export type Color36 = string | null;
export type Shape2 = string;
export type Token1 = string;
export type Label48 = string;
export type Choices = WorkspaceChoice[];
export type Description22 = string | null;
export type Id45 = string;
export type Label49 = string;
export type ReferenceKinds = string[];
export type Required2 = boolean;
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
export type Kind7 = string;
export type Label50 = string;
export type Id46 = string;
export type Label51 = string;
export type Match = "exact" | "text" | "token" | "structural";
export type Path1 = string;
export type SearchFields = WorkspaceSearchField[];
export type RecordSchemas = WorkspaceRecordSchema[];
export type Id47 = string;
export type Label52 = string;
export type Limitation = string | null;
/**
 * @minItems 1
 */
export type Parts = [WorkspaceTreePartSchema, ...WorkspaceTreePartSchema[]];
export type Fields4 = WorkspaceFieldSchema[];
export type Id48 = string;
export type Label53 = string;
export type Shape3 = "block" | "pill" | "gate" | "value" | "reference";
/**
 * @minItems 1
 */
export type Accepts = [string, ...string[]];
export type Cardinality = "one" | "optional" | "many";
export type Id49 = string;
export type Label54 = string;
export type Ordered = boolean;
export type Shape4 = "socket" | "rail" | "well" | "branch" | "inline";
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
export type Id50 = string;
export type Label55 = string;
export type Message6 = string;
export type Scope1 = "record" | "field" | "tree" | "connection" | "proposal" | "submission";
export type Severity2 = "info" | "warning" | "error";
export type TargetKinds = string[];
export type ValidationRules = WorkspaceValidationRule[];
export type Version3 = 1;
export type WorkspaceId = string;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone25 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Action id emitted after audio processing.
 */
export type ActionId11 = string;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect27 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
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
  | string
  | null;
/**
 * If true, the mic stays open after the first click and auto-detects speech start/stop via energy-based voice activity detection (VAD), uploading each utterance automatically with no per-utterance click. If false (default), behavior is unchanged push-to-talk.
 */
export type Continuous = boolean;
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
export type Id51 = string;
/**
 * Optional display or accessibility label.
 */
export type Label56 = string | null;
export type Description23 = string | null;
export type DeviceId = string | null;
export type MaxBytes1 = number | null;
export type MimeTypes = string[];
export type MinDurationMs = number;
export type VadThreshold = number | null;
/**
 * Continuous mode only: duration of continuous below-threshold silence required after speech to consider an utterance finished and trigger upload. Ignored when continuous=False.
 */
export type SilenceMs = number;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing26 = ("fill" | "content") | null;
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
 * Push-to-talk auto-stop timeout. In continuous mode this instead acts as a maximum-utterance safety cap: recording is force-stopped and uploaded if speech continues this long without a silence gap, even if the speaker hasn't paused.
 */
export type TimeoutMs = number;
export type Type27 = "mic_button";
/**
 * Audio upload endpoint URL.
 */
export type UploadUrl1 = string;
/**
 * If false, widget is removed from layout flow.
 */
export type Visible27 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight26 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone26 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect28 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect29 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect30 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect31 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Header accent color.
 */
export type Color38 =
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
export type Disabled29 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group30 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id52 = string;
/**
 * Optional display or accessibility label.
 */
export type Label57 = string | null;
export type Actions1 = ActionSpec[];
export type Anchor = string | null;
export type Description24 = string | null;
export type Subtitle1 = string | null;
/**
 * Header size token.
 */
export type Size2 = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing27 = ("fill" | "content") | null;
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
/**
 * Header text content.
 */
export type Text4 = string;
export type Type28 = "lcars_header";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible28 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight27 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone27 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Horizontal label alignment.
 */
export type Align2 = "start" | "center" | "end";
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect32 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Rounded terminals to render.
 */
export type Caps = "none" | "start" | "end" | "both";
/**
 * Optional LCARS palette color.
 */
export type Color39 =
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
export type Disabled30 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group31 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id53 = string;
/**
 * Optional display or accessibility label.
 */
export type Label58 = string | null;
/**
 * Whether label text sits on pigment or in a black cutout.
 */
export type LabelMode = "embedded" | "cutout";
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing28 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span28 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole28 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant28 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle28 = string | null;
/**
 * Optional label carried by the bar.
 */
export type Text5 = string | null;
/**
 * Bar thickness in px.
 */
export type Thickness = number;
export type Type29 = "lcars_bar";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible29 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight28 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone28 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
export type Align3 = "start" | "center" | "end" | "stretch";
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect33 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect34 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Explicitly positioned composition areas.
 */
export type Children7 = CompositionArea[];
/**
 * Optional LCARS palette color.
 */
export type Color40 =
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
 * CSS length used between columns.
 */
export type ColumnGap = string;
/**
 * CSS grid column track definitions.
 *
 * @minItems 1
 */
export type Columns3 = [string, ...string[]];
export type DesignHeight = number;
export type DesignWidth = number;
/**
 * If true, interaction is disabled.
 */
export type Disabled31 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group32 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id54 = string;
/**
 * Optional display or accessibility label.
 */
export type Label59 = string | null;
export type MinWidth = number;
/**
 * Behavior below min_width.
 */
export type Narrow = "scroll" | "scale" | "adaptive";
/**
 * CSS length used between rows.
 */
export type RowGap = string;
/**
 * CSS grid row track definitions.
 *
 * @minItems 1
 */
export type Rows4 = [string, ...string[]];
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing29 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span29 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole29 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant29 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle29 = string | null;
export type Type30 = "authored_composition";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible30 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight29 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone29 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect35 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect36 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color41 =
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
export type Disabled32 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group33 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id55 = string;
/**
 * Optional display or accessibility label.
 */
export type Label60 = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing30 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span30 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole30 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant30 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle30 = string | null;
export type Type31 = "webui_settings";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible31 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight30 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone30 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect37 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect38 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color42 =
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
export type Id56 = string;
export type Label61 = string;
export type Edge1 = "JUSTIFICATION" | "DOMAIN" | "PREREQUISITE" | "PROVENANCE";
export type Id57 = string;
export type Kind8 = "assertion" | "anchor" | "gap" | "framework" | "quantity";
export type Label62 = string;
export type Terminal1 = boolean;
export type Frontier1 = FrontierItem[];
export type Id58 = string;
export type Label63 = string;
export type Path2 = WebRef[];
/**
 * If true, interaction is disabled.
 */
export type Disabled33 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group34 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id59 = string;
/**
 * Optional display or accessibility label.
 */
export type Label64 = string | null;
export type LayerFilter = ("JUSTIFICATION" | "DOMAIN" | "PREREQUISITE" | "PROVENANCE")[] | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing31 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span31 = [unknown, unknown] | null;
export type StrictRole31 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant31 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle31 = string | null;
export type Type32 = "frontier";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible32 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight31 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone31 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect39 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect40 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color43 =
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
export type Id60 = string;
export type Inspectable = string;
export type Label65 = string;
export type Polarity = "SUPPORTS" | "EXCLUDES";
export type SiblingAnchors = string[];
export type Citation = string;
export type Id61 = string;
export type Status6 = ("retracted" | "superseded")[];
export type Type33 = "empirical" | "formal";
/**
 * If true, interaction is disabled.
 */
export type Disabled34 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group35 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id62 = string;
/**
 * Optional display or accessibility label.
 */
export type Label66 = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing32 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span32 = [unknown, unknown] | null;
export type StrictRole32 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant32 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle32 = string | null;
export type Type34 = "anchor_card";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible33 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight32 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone32 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect41 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color44 =
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
export type Commitment = string;
export type Mode2 = "FAST" | "EXACT";
export type Query = string;
export type Reason2 = "label_truncated" | "no_compatible_environment" | "complete";
export type Result = "YES" | "NO" | "UNKNOWN";
export type Subject = string;
/**
 * If true, interaction is disabled.
 */
export type Disabled35 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group36 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id63 = string;
/**
 * Optional display or accessibility label.
 */
export type Label67 = string | null;
export type OnEscalate = "EXACT" | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing33 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span33 = [unknown, unknown] | null;
export type StrictRole33 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant33 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle33 = string | null;
export type Type35 = "tri_state";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible34 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight33 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone33 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect42 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color45 =
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
export type Id64 = string;
export type Label68 = string;
export type Position7 = number | null;
export type Claims = PositionedClaim[];
export type Max6 = number | null;
export type Min6 = number | null;
export type Quantity = string;
export type Unit3 = string;
export type Conditions = ConstraintCondition[];
export type Confidence = string;
export type Max7 = number | null;
export type Min7 = number | null;
export type Id65 = string;
export type Label69 = string;
export type Unit4 = string;
export type Representation =
  "INTERVAL" | "INEQUALITY" | "COVARIANCE" | "LIKELIHOOD" | "CONTOUR" | "FUNCTION" | "SAMPLES";
/**
 * If true, interaction is disabled.
 */
export type Disabled36 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group37 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id66 = string;
/**
 * Optional display or accessibility label.
 */
export type Label70 = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing34 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span34 = [unknown, unknown] | null;
export type StrictRole34 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant34 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle34 = string | null;
export type Type36 = "constraint_band";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible35 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight34 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone34 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect43 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional aspect override for adaptive placement: wide (spans columns), tall (spans rows), square, or flex.
 */
export type Aspect44 = ("wide" | "tall" | "square" | "flex") | null;
/**
 * Optional LCARS palette color.
 */
export type Color46 =
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
export type Active = string;
/**
 * @minItems 1
 */
export type Available = [CommitmentOption, ...CommitmentOption[]];
export type Assumptions = string[];
export type Id67 = string;
export type Label71 = string;
export type ConflictSet = string[];
export type EmpiricallyGrounded = string[];
export type SupportedUnder = string[];
/**
 * If true, interaction is disabled.
 */
export type Disabled37 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group38 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id68 = string;
/**
 * Optional display or accessibility label.
 */
export type Label72 = string | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing35 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span35 = [unknown, unknown] | null;
export type StrictRole35 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant35 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle35 = string | null;
export type Type37 = "commitment_selector";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible36 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight35 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone35 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
export type Children11 = (
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Optional LCARS palette color.
 */
export type Color47 =
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
export type Constraints = string[];
export type Environments = number;
export type Id69 = string;
export type Label73 = string;
export type Contenders = GapContender[];
/**
 * @minItems 2
 * @maxItems 2
 */
export type Endpoints = [WebRef, WebRef];
export type Id70 = string;
export type KnownDependency = string;
export type Missing = string;
export type Type38 = "RELATIONAL" | "MECHANISTIC" | "REDUCTION" | "EVIDENTIAL" | "ONTOLOGICAL";
/**
 * If true, interaction is disabled.
 */
export type Disabled38 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group39 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id71 = string;
/**
 * Optional display or accessibility label.
 */
export type Label74 = string | null;
export type ShowContenders = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing36 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span36 = [unknown, unknown] | null;
export type StrictRole36 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant36 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle36 = string | null;
export type Type39 = "gap_panel";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible37 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight36 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone36 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
export type Children10 = (
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Optional LCARS palette color.
 */
export type Color48 =
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
export type Canonical = boolean;
export type Label75 = string;
export type Qualifier = string;
/**
 * @minItems 1
 */
export type Roles = [
  (
    | "SEMANTIC_FRAMEWORK"
    | "APPLICABILITY_DOMAIN"
    | "SYSTEM_CLASS"
    | "STATE_CONDITION"
    | "PARAMETER_RESTRICTION"
  ),
  ...(
    | "SEMANTIC_FRAMEWORK"
    | "APPLICABILITY_DOMAIN"
    | "SYSTEM_CLASS"
    | "STATE_CONDITION"
    | "PARAMETER_RESTRICTION"
  )[],
];
export type Context = ContextQualifier[];
export type Id72 = string;
export type Label76 = string;
export type Gloss = string;
export type Id73 = string;
export type Status7 = string[];
/**
 * If true, interaction is disabled.
 */
export type Disabled39 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group40 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id74 = string;
/**
 * Optional display or accessibility label.
 */
export type Label77 = string | null;
export type ShowContext = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing37 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span37 = [unknown, unknown] | null;
export type StrictRole37 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant37 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle37 = string | null;
export type Type40 = "assertion_card";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible38 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight37 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone37 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
export type Children9 = (
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Optional LCARS palette color.
 */
export type Color49 =
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
export type Reason3 = string | null;
export type Returned = number | null;
export type State2 = "complete" | "partial";
export type Total = number | null;
export type Id75 = string;
export type Label78 = string;
export type Type41 = "empirical" | "formal" | "assumption";
export type Atoms = SupportAtom[];
export type Environments1 = SupportEnvironment[];
export type Node = string;
export type Truncated = boolean;
/**
 * If true, interaction is disabled.
 */
export type Disabled40 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group41 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id76 = string;
/**
 * Optional display or accessibility label.
 */
export type Label79 = string | null;
export type ShowAtomLegend = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing38 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span38 = [unknown, unknown] | null;
export type StrictRole38 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant38 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle38 = string | null;
export type Title2 = string;
export type Type42 = "support_panel";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible39 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight38 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone38 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Widgets rendered inside the floating window.
 */
export type Children8 = (
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Optional action emitted with {'kind': 'close'} when the user dismisses it.
 */
export type CloseActionId = string | null;
/**
 * Window frame and head-band accent.
 */
export type Color50 =
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
export type Disabled41 = boolean;
/**
 * Allow Escape, the close control, and (for modal windows) backdrop dismissal.
 */
export type Dismissible1 = boolean;
/**
 * Allow pointer and keyboard repositioning.
 */
export type Draggable = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group42 = string | null;
/**
 * Initial height in px.
 */
export type Height = number;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id77 = string;
/**
 * Optional display or accessibility label.
 */
export type Label80 = string | null;
/**
 * Dim and inert the console behind the window.
 */
export type Modal = boolean;
/**
 * Server-controlled requested open state.
 */
export type Open1 = boolean;
/**
 * Optional initial viewport [x, y] position; omitted centers the window.
 */
export type Position8 = [unknown, unknown] | null;
/**
 * Show a bounded corner resize handle.
 */
export type Resizable = boolean;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing39 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span39 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole39 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant39 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle39 = string | null;
/**
 * Window title shown in the draggable head band.
 */
export type Title3 = string;
export type Type43 = "popup";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible40 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight39 = number | null;
/**
 * Initial width in px.
 */
export type Width = number;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone39 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Area content widgets.
 */
export type Children6 = (
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Optional LCARS palette color.
 */
export type Color51 =
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
 * One-based starting grid column.
 */
export type Column1 = number;
/**
 * Number of grid columns occupied.
 */
export type ColumnSpan = number;
/**
 * Exclude this area when authored content falls back to the adaptive mosaic.
 */
export type Decorative = boolean;
/**
 * If true, interaction is disabled.
 */
export type Disabled42 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group43 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id78 = string;
export type Justify = "start" | "center" | "end" | "stretch";
/**
 * Optional display or accessibility label.
 */
export type Label81 = string | null;
/**
 * Explicit stacking layer.
 */
export type Layer1 = number;
/**
 * One-based starting grid row.
 */
export type Row1 = number;
/**
 * Number of grid rows occupied.
 */
export type RowSpan = number;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing40 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span40 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole40 = ("primary" | "secondary" | "terminal") | null;
/**
 * Optional strict surface rendering variant for manifest-native renderers.
 */
export type StrictSurfaceVariant40 = ("readout_frame" | "chart_frame") | null;
/**
 * Optional explicit strict-surface title override; blank suppresses the strict title band.
 */
export type StrictTitle40 = string | null;
export type Type44 = "composition_area";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible41 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight40 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone40 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Bracket content children.
 */
export type Children5 = (
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Bracket accent color.
 */
export type Color52 =
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
export type Disabled43 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group44 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id79 = string;
/**
 * Optional display or accessibility label.
 */
export type Label82 = string | null;
export type Collapsible = boolean;
export type Density2 = "compact" | "normal";
export type Description25 = string | null;
export type InitialCollapsed = boolean;
export type Overflow = "visible" | "auto" | "hidden";
/**
 * Bracket side orientation.
 */
export type Orientation = "left" | "right" | "both";
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing41 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span41 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole41 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant41 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle41 = string | null;
export type Type45 = "lcars_bracket";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible42 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight41 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone41 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Legacy sweep children list (strict lowering compiles this into regions).
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Sweep accent color.
 */
export type Color53 =
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
    )[]
  | null;
/**
 * If true, interaction is disabled.
 */
export type Disabled44 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group45 = string | null;
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
    )[]
  | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id80 = string;
/**
 * Optional display or accessibility label.
 */
export type Label83 = string | null;
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
    )[]
  | null;
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing42 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span42 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole42 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant42 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle42 = string | null;
/**
 * Optional sweep subtitle.
 */
export type Subtitle2 = string | null;
/**
 * Optional sweep title.
 */
export type Title4 = string | null;
export type Type46 = "lcars_sweep";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible43 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight42 = number | null;
/**
 * Sweep column width in px (strict fidelity range).
 */
export type WidthSidebar = number;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone42 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Main content children rendered inside the box.
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Base color inherited by corners and bars.
 */
export type Color54 =
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
export type Disabled45 = boolean;
/**
 * Optional cluster key. Panels sharing a group are packed adjacent so a control sits beside the instrument it drives.
 */
export type Group46 = string | null;
/**
 * Unique widget identifier used for event targeting.
 */
export type Id81 = string;
/**
 * Optional display or accessibility label.
 */
export type Label84 = string | null;
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
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
      | FileUpload
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
      | GraphWorkspace
      | MicButton
      | LcarsBox
      | LcarsSweep
      | LcarsBracket
      | LcarsHeader
      | LcarsBar
      | CompositionArea
      | AuthoredComposition
      | Popup
      | WebUISettings
      | SupportPanel
      | Frontier
      | AssertionCard
      | AnchorCard
      | TriState
      | ConstraintBand
      | GapPanel
      | CommitmentSelector
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
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing43 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span43 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole43 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant43 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle43 = string | null;
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
export type Title5 = string | null;
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
export type Type47 = "lcars_box";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible44 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight43 = number | null;
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
export type Zone43 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
/**
 * Widgets rendered inside the hint surface, declared via lcars.hint().
 */
export type Children = (
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Hover open delay.
 */
export type DelayMs = number;
/**
 * If true, a pinned hint shows a close affordance.
 */
export type Dismissible2 = boolean;
/**
 * Grace period before closing so the pointer can travel into the hint.
 */
export type HideDelayMs = number;
/**
 * Optional px cap on hint width; defaults to the stylesheet value.
 */
export type MaxWidth = number | null;
/**
 * Manual open state for trigger='manual'. None leaves the hint under renderer control.
 */
export type Open2 = boolean | null;
/**
 * Preferred side relative to the widget. auto picks the side with room; any explicit side still flips and shifts to stay on screen.
 */
export type Placement = "auto" | "top" | "bottom" | "left" | "right";
/**
 * Plain-text hint body.
 */
export type Text6 = string | null;
/**
 * Optional hint head band title.
 */
export type Title6 = string | null;
/**
 * How the hint opens: hover (pointer, after delay_ms), focus (keyboard), click (tap to pin open), press (touch long-press), always (pinned open), manual (server-driven via lcars.show_hint/hide_hint).
 */
export type Trigger = ("hover" | "focus" | "click" | "press" | "always" | "manual")[];
/**
 * Unique widget identifier used for event targeting.
 */
export type Id82 = string;
/**
 * Optional display or accessibility label.
 */
export type Label85 = string | null;
export type Copyable1 = boolean;
export type Description26 = string | null;
export type MaxLines1 = number | null;
export type Selectable = boolean;
export type Semantic = "div" | "p" | "span";
export type Wrap1 = "wrap" | "pre" | "nowrap";
/**
 * Typography style token.
 */
export type Size3 = "display" | "h1" | "h2" | "body" | "label" | "micro" | "mono";
/**
 * Optional adaptive-layout sizing override. 'fill' lets a top-level panel absorb free deck space; 'content' keeps it at its intrinsic size.
 */
export type Sizing44 = ("fill" | "content") | null;
/**
 * Optional explicit mosaic footprint as [columns, rows]. Overrides the size the renderer derives from the panel's content.
 */
export type Span44 = [unknown, unknown] | null;
/**
 * Strict composition role.
 */
export type StrictRole44 = ("primary" | "secondary" | "terminal") | null;
/**
 * Strict surface variant.
 */
export type StrictSurfaceVariant44 = ("readout_frame" | "chart_frame") | null;
/**
 * Strict surface title override.
 */
export type StrictTitle44 = string | null;
export type Type48 = "text";
/**
 * If false, widget is removed from layout flow.
 */
export type Visible45 = boolean;
/**
 * Optional 1-12 importance. Heavier panels anchor the mosaic first and are sized up relative to their neighbours.
 */
export type Weight44 = number | null;
/**
 * Optional adaptive-layout placement hint overriding auto-placement: primary (main lane), side (support column), readout (metric strip), dock (controls), rail (into the menu spine), full (span the field).
 */
export type Zone44 = ("primary" | "side" | "readout" | "dock" | "rail" | "full") | null;
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
  | FileUpload
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
  | GraphWorkspace
  | MicButton
  | LcarsBox
  | LcarsSweep
  | LcarsBracket
  | LcarsHeader
  | LcarsBar
  | CompositionArea
  | AuthoredComposition
  | Popup
  | WebUISettings
  | SupportPanel
  | Frontier
  | AssertionCard
  | AnchorCard
  | TriState
  | ConstraintBand
  | GapPanel
  | CommitmentSelector
)[];
/**
 * Layout width hint (e.g. 1fr, 300px).
 */
export type Width1 = string;
/**
 * Columns in this row.
 */
export type Columns = Column[];
/**
 * Layout height hint (e.g. auto, 1fr, 200px).
 */
export type Height1 = string;
/**
 * Unique row identifier.
 */
export type Id83 = string;
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
 * Default adaptive panel sizing. 'fill' distributes free deck space among expanded panels; 'content' keeps panels at intrinsic size.
 */
export type Sizing45 = "fill" | "content";
/**
 * Page title.
 */
export type Title7 = string;

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
  chrome?: Chrome;
  fillers?: Fillers;
  id: Id1;
  rows?: Rows;
  sizing?: Sizing45;
  title: Title7;
}
/**
 * A page row.
 *
 * In strict mode this remains a compatibility band boundary, while interior
 * composition is container-driven after normalization.
 */
export interface Row {
  columns?: Columns;
  height?: Height1;
  id: Id83;
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
  width?: Width1;
}
/**
 * Simple text content widget.
 */
export interface Text {
  align?: Align;
  aspect?: Aspect;
  color?: Color3;
  content: Content;
  disabled?: Disabled;
  group?: Group;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id82;
  label?: Label85;
  /**
   * Enhanced text capabilities.
   */
  options?: TextOptions | null;
  size?: Size3;
  sizing?: Sizing44;
  span?: Span44;
  strict_role?: StrictRole44;
  strict_surface_variant?: StrictSurfaceVariant44;
  strict_title?: StrictTitle44;
  type?: Type48;
  visible?: Visible45;
  weight?: Weight44;
  zone?: Zone44;
}
/**
 * A floating surface attached to a widget.
 *
 * A hint carries either plain ``text`` (the common case) or a full ``children``
 * widget subtree, so the same field covers a one-line label and a pop-up video.
 */
export interface Hint {
  children?: Children;
  delay_ms?: DelayMs;
  dismissible?: Dismissible2;
  hide_delay_ms?: HideDelayMs;
  max_width?: MaxWidth;
  open?: Open2;
  placement?: Placement;
  text?: Text6;
  title?: Title6;
  trigger?: Trigger;
}
/**
 * Status and readout tile.
 */
export interface StatusTile {
  aspect?: Aspect1;
  color?: Color4;
  disabled?: Disabled1;
  group?: Group1;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id3;
  label?: Label2;
  /**
   * Enhanced metric capabilities.
   */
  options?: MetricOptions | null;
  sizing?: Sizing;
  span?: Span;
  status: Status;
  strict_role?: StrictRole;
  strict_surface_variant?: StrictSurfaceVariant;
  strict_title?: StrictTitle;
  type?: Type;
  value: Value;
  visible?: Visible;
  weight?: Weight;
  zone?: Zone;
}
export interface MetricOptions {
  description?: Description;
  feedback?: WidgetFeedback | null;
  secondary_value?: SecondaryValue;
  trend?: Trend;
  value_format?: ValueFormat | null;
}
/**
 * Optional loading, empty, or error presentation for a widget.
 */
export interface WidgetFeedback {
  message?: Message;
  state?: State;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id4;
  label?: Label3;
  message: Message1;
  /**
   * Enhanced alert capabilities.
   */
  options?: AlertOptions | null;
  severity: Severity;
  sizing?: Sizing1;
  span?: Span1;
  strict_role?: StrictRole1;
  strict_surface_variant?: StrictSurfaceVariant1;
  strict_title?: StrictTitle1;
  type?: Type1;
  visible?: Visible1;
  weight?: Weight1;
  zone?: Zone1;
}
export interface AlertOptions {
  action?: ActionSpec | null;
  description?: Description1;
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
  label: Label4;
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
  density?: Density;
  detail?: Detail;
  disabled?: Disabled3;
  /**
   * Optional procedural atom glyph.
   */
  glyph?: AtomGlyph | null;
  group?: Group3;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id5;
  label?: Label5;
  /**
   * Enhanced button capabilities.
   */
  options?: ButtonOptions | null;
  presentation?: Presentation;
  sizing?: Sizing2;
  span?: Span2;
  strict_role?: StrictRole2;
  strict_surface_variant?: StrictSurfaceVariant2;
  strict_title?: StrictTitle2;
  symbol?: Symbol;
  terminal?: Terminal;
  type?: Type2;
  visible?: Visible2;
  weight?: Weight2;
  zone?: Zone2;
}
/**
 * Parameters for a deterministic, code-rendered atomic orbital glyph.
 */
export interface AtomGlyph {
  electrons?: Electrons;
  rings?: Rings;
  rotation?: Rotation;
  spokes?: Spokes;
}
export interface ButtonOptions {
  busy_label?: BusyLabel;
  confirm?: Confirm;
  debounce_ms?: DebounceMs;
  description?: Description2;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id6;
  label?: Label6;
  /**
   * Enhanced toggle capabilities.
   */
  options?: ToggleOptions | null;
  sizing?: Sizing3;
  span?: Span3;
  strict_role?: StrictRole3;
  strict_surface_variant?: StrictSurfaceVariant3;
  strict_title?: StrictTitle3;
  type?: Type3;
  visible?: Visible3;
  weight?: Weight3;
  zone?: Zone3;
}
export interface ToggleOptions {
  description?: Description3;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id7;
  label?: Label7;
  /**
   * Enhanced checkbox capabilities.
   */
  options?: ToggleOptions | null;
  sizing?: Sizing4;
  span?: Span4;
  strict_role?: StrictRole4;
  strict_surface_variant?: StrictSurfaceVariant4;
  strict_title?: StrictTitle4;
  type?: Type4;
  visible?: Visible4;
  weight?: Weight4;
  zone?: Zone4;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id8;
  label?: Label8;
  options: Options;
  /**
   * Enhanced radio capabilities.
   */
  settings?: ChoiceOptions | null;
  sizing?: Sizing5;
  span?: Span5;
  strict_role?: StrictRole5;
  strict_surface_variant?: StrictSurfaceVariant5;
  strict_title?: StrictTitle5;
  type?: Type5;
  value: Value3;
  visible?: Visible5;
  weight?: Weight5;
  zone?: Zone5;
}
/**
 * Selectable option entry.
 */
export interface SelectOption {
  description?: Description4;
  disabled?: Disabled7;
  group?: Group7;
  label: Label9;
  value: Value2;
}
export interface ChoiceOptions {
  description?: Description5;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id9;
  label?: Label10;
  options: Options1;
  /**
   * Enhanced segmented choice capabilities.
   */
  settings?: ChoiceOptions | null;
  sizing?: Sizing6;
  span?: Span6;
  strict_role?: StrictRole6;
  strict_surface_variant?: StrictSurfaceVariant6;
  strict_title?: StrictTitle6;
  type?: Type6;
  value: Value4;
  visible?: Visible6;
  weight?: Weight6;
  zone?: Zone6;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id10;
  label?: Label11;
  options: Options2;
  /**
   * Enhanced select capabilities.
   */
  settings?: ChoiceOptions | null;
  sizing?: Sizing7;
  span?: Span7;
  strict_role?: StrictRole7;
  strict_surface_variant?: StrictSurfaceVariant7;
  strict_title?: StrictTitle7;
  type?: Type7;
  value: Value5;
  visible?: Visible7;
  weight?: Weight7;
  zone?: Zone7;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id11;
  label?: Label12;
  /**
   * Enhanced text-input capabilities.
   */
  options?: TextInputOptions | null;
  password?: Password;
  placeholder?: Placeholder1;
  regex?: Regex;
  sizing?: Sizing8;
  span?: Span8;
  strict_role?: StrictRole8;
  strict_surface_variant?: StrictSurfaceVariant8;
  strict_title?: StrictTitle8;
  type?: Type8;
  value?: Value6;
  visible?: Visible8;
  weight?: Weight8;
  zone?: Zone8;
}
export interface TextInputOptions {
  commit?: Commit;
  debounce_ms?: DebounceMs1;
  description?: Description6;
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
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id12;
  label?: Label13;
  max?: Max;
  min?: Min;
  /**
   * Enhanced number-input capabilities.
   */
  options?: NumberInputOptions | null;
  placeholder?: Placeholder2;
  sizing?: Sizing9;
  span?: Span9;
  step?: Step;
  strict_role?: StrictRole9;
  strict_surface_variant?: StrictSurfaceVariant9;
  strict_title?: StrictTitle9;
  type?: Type9;
  value?: Value7;
  visible?: Visible9;
  weight?: Weight9;
  zone?: Zone9;
}
export interface NumberInputOptions {
  commit?: Commit1;
  debounce_ms?: DebounceMs2;
  description?: Description7;
  feedback?: WidgetFeedback | null;
  precision?: Precision1;
  prefix?: Prefix1;
  required?: Required1;
  suffix?: Suffix1;
}
/**
 * Drag/drop file picker that uploads multipart data to an application endpoint.
 */
export interface FileUpload {
  accept?: Accept;
  action_id: ActionId8;
  aspect?: Aspect11;
  color?: Color14;
  disabled?: Disabled12;
  group?: Group12;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id13;
  label?: Label14;
  max_bytes?: MaxBytes;
  max_files?: MaxFiles;
  multiple?: Multiple1;
  sizing?: Sizing10;
  span?: Span10;
  strict_role?: StrictRole10;
  strict_surface_variant?: StrictSurfaceVariant10;
  strict_title?: StrictTitle10;
  type?: Type10;
  upload_url?: UploadUrl;
  visible?: Visible10;
  weight?: Weight10;
  zone?: Zone10;
}
/**
 * Logical container for grouped input widgets.
 */
export interface Form {
  action_id: ActionId9;
  aspect?: Aspect12;
  children?: Children1;
  color?: Color15;
  disabled?: Disabled13;
  group?: Group13;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id14;
  label?: Label15;
  /**
   * Enhanced form capabilities.
   */
  options?: FormOptions | null;
  sizing?: Sizing11;
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
  description?: Description8;
  feedback?: WidgetFeedback | null;
  layout?: Layout1;
  reset_label?: ResetLabel;
}
/**
 * Strict row/column data table.
 */
export interface Table {
  aspect?: Aspect13;
  color?: Color16;
  disabled?: Disabled14;
  group?: Group14;
  headers: Headers;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id15;
  label?: Label16;
  /**
   * Enhanced table capabilities.
   */
  options?: TableOptions | null;
  rows: Rows2;
  sizing?: Sizing12;
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
  density?: Density1;
  description?: Description9;
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
  sort_cycle?: SortCycle;
  sticky_header?: StickyHeader;
}
/**
 * Enhanced table column definition.
 */
export interface TableColumn {
  align?: Align1;
  filter?: Filter;
  first_sort_direction?: FirstSortDirection;
  key: Key;
  label?: Label17;
  sort_as?: SortAs;
  sort_nulls?: SortNulls;
  sort_order?: SortOrder;
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
  children?: Children2;
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
  copyable?: Copyable;
  display?: Display;
  link?: LinkSpec | null;
  status?: Status1;
  value?: Value9;
}
/**
 * A safe, code-rendered hyperlink.
 */
export interface LinkSpec {
  href: Href;
  label?: Label18;
  rel?: Rel;
  target?: Target;
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
  action_id: ActionId10;
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
  aspect?: Aspect14;
  color?: Color17;
  disabled?: Disabled15;
  group?: Group15;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id17;
  label?: Label22;
  /**
   * Enhanced chart capabilities.
   */
  options?: ChartOptions | null;
  series: Series;
  sizing?: Sizing13;
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
  description?: Description10;
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
  color?: Color18;
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
  color?: Color19;
  data: Data;
  name: Name;
}
/**
 * Compact line chart without full axes/grid.
 */
export interface Sparkline {
  aspect?: Aspect15;
  color?: Color20;
  disabled?: Disabled16;
  group?: Group16;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id18;
  label?: Label25;
  /**
   * Enhanced sparkline capabilities.
   */
  options?: SparklineOptions | null;
  series: Series1;
  sizing?: Sizing14;
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
  description?: Description11;
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
  aspect?: Aspect16;
  color?: Color21;
  data: Data1;
  disabled?: Disabled17;
  down_color?: DownColor;
  group?: Group17;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id19;
  label?: Label26;
  markers?: Markers;
  /**
   * Enhanced financial-chart capabilities.
   */
  options?: FinancialChartOptions | null;
  sizing?: Sizing15;
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
  color?: Color22;
  position?: Position1;
  shape?: Shape;
  text?: Text2;
  time: Time1;
}
export interface FinancialChartOptions {
  description?: Description12;
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
  aspect?: Aspect17;
  color?: Color23;
  data: Data2;
  disabled?: Disabled18;
  down_color?: DownColor1;
  group?: Group18;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id20;
  label?: Label27;
  markers?: Markers1;
  /**
   * Enhanced financial-chart capabilities.
   */
  options?: FinancialChartOptions | null;
  sizing?: Sizing16;
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
  aspect?: Aspect18;
  aspect_ratio?: AspectRatio;
  color?: Color24;
  disabled?: Disabled19;
  fragment_shader: FragmentShader;
  group?: Group19;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id21;
  label?: Label28;
  /**
   * Enhanced shader capabilities.
   */
  options?: ShaderOptions | null;
  sizing?: Sizing17;
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
  description?: Description13;
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
  aspect?: Aspect19;
  color?: Color25;
  crit_threshold?: CritThreshold;
  disabled?: Disabled20;
  group?: Group20;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id22;
  label?: Label29;
  max?: Max3;
  min?: Min3;
  /**
   * Enhanced gauge capabilities.
   */
  options?: MeterOptions | null;
  sizing?: Sizing18;
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
  description?: Description14;
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
  aspect?: Aspect20;
  color?: Color26;
  disabled?: Disabled21;
  group?: Group21;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id23;
  label?: Label30;
  /**
   * Enhanced meter capabilities.
   */
  options?: MeterOptions | null;
  show_label?: ShowLabel;
  sizing?: Sizing19;
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
  aspect?: Aspect21;
  color?: Color27;
  content: Content1;
  disabled?: Disabled22;
  group?: Group22;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id24;
  label?: Label31;
  /**
   * Enhanced markdown capabilities.
   */
  options?: MarkdownOptions | null;
  sizing?: Sizing20;
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
  description?: Description15;
  feedback?: WidgetFeedback | null;
  link_target?: LinkTarget;
  max_height?: MaxHeight;
}
/**
 * Scrolling terminal-style log viewer.
 */
export interface LogViewer {
  aspect?: Aspect22;
  auto_scroll?: AutoScroll;
  color?: Color28;
  disabled?: Disabled23;
  group?: Group23;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id25;
  label?: Label32;
  max_lines?: MaxLines;
  /**
   * Enhanced log capabilities.
   */
  options?: LogOptions | null;
  sizing?: Sizing21;
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
  description?: Description16;
  feedback?: WidgetFeedback | null;
  interaction?: InteractionOptions | null;
  levels?: Levels;
  line_numbers?: LineNumbers;
  paused?: Paused1;
  search?: Search;
  timestamps?: Timestamps;
  toolbar?: Toolbar;
  wrap?: Wrap;
}
/**
 * HLS video playback widget.
 */
export interface VideoHls {
  aspect?: Aspect23;
  autoplay?: Autoplay;
  color?: Color29;
  disabled?: Disabled24;
  group?: Group24;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id26;
  label?: Label33;
  muted?: Muted;
  /**
   * Enhanced video capabilities.
   */
  options?: VideoOptions | null;
  sizing?: Sizing22;
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
  description?: Description17;
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
  aspect?: Aspect24;
  aspect_ratio?: AspectRatio1;
  color?: Color30;
  disabled?: Disabled25;
  group?: Group25;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id27;
  label?: Label34;
  module: Module;
  /**
   * Scene capabilities.
   */
  options?: ThreeSceneOptions | null;
  props?: Props;
  sizing?: Sizing23;
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
  description?: Description18;
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
  aspect?: Aspect25;
  color?: Color31;
  disabled?: Disabled26;
  document?: GraphDocument;
  /**
   * Application-owned run status; never set by the library.
   */
  execution?: GraphExecutionState | null;
  group?: Group27;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id37;
  label?: Label43;
  options?: NodeCanvasOptions | null;
  sizing?: Sizing24;
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
  version?: Version1;
  viewport?: GraphViewport;
}
/**
 * Free text pinned to the canvas.
 */
export interface GraphComment {
  id: Id28;
  position?: Position3;
  size?: Size;
  text?: Text3;
}
/**
 * A wire from one node's output to another node's input.
 */
export interface GraphEdge {
  accessible_label?: AccessibleLabel;
  id: Id29;
  label?: Label35;
  layer?: Layer;
  relation?: Relation;
  source: Source;
  source_port: SourcePort;
  target: Target3;
  target_port: TargetPort;
}
/**
 * A titled frame drawn behind a set of nodes.
 */
export interface GraphGroup {
  color?: Color32;
  id: Id30;
  label?: Label36;
  position?: Position4;
  size?: Size1;
}
/**
 * Caller-defined visual grammar for one edge layer.
 *
 * Layer ids and meanings belong to the application. LCARS only knows how to
 * render the supplied visual treatment and expose it as reader state.
 */
export interface GraphLayer {
  color?: Color33;
  default_emphasized?: DefaultEmphasized;
  default_visible?: DefaultVisible;
  description?: Description19;
  id: Id31;
  label?: Label37;
  label_zoom_threshold?: LabelZoomThreshold;
  marker?: Marker;
  pattern?: Pattern1;
  token?: Token;
}
/**
 * A placed instance of a template.
 */
export interface GraphNode {
  group?: Group26;
  id: Id32;
  label?: Label38;
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
  id: Id33;
  position?: Position6;
}
/**
 * A node type: what it is called, what it carries, and how it wires up.
 */
export interface NodeTemplate {
  category?: Category;
  color?: Color34;
  fields?: Fields;
  id: Id35;
  inputs?: Inputs;
  label?: Label42;
  outputs?: Outputs;
}
/**
 * An editable value carried by a node.
 */
export interface GraphField {
  default?: Default;
  id: Id34;
  kind?: Kind5;
  label?: Label39;
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
  label?: Label40;
  value: Value14;
}
/**
 * One connection point on a node template.
 */
export interface GraphPort {
  capacity?: Capacity;
  id: Id36;
  label?: Label41;
  shape?: Shape1;
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
  movable?: Movable;
  show_cancel?: ShowCancel;
  show_palette?: ShowPalette;
  show_queue?: ShowQueue;
  show_run?: ShowRun;
  snap_to_grid?: SnapToGrid;
  visible_edge_ids?: VisibleEdgeIds;
}
/**
 * Canonical graph plus a visually and transactionally separate proposal.
 */
export interface GraphWorkspace {
  aspect?: Aspect26;
  color?: Color35;
  disabled?: Disabled27;
  group?: Group28;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id38;
  label?: Label44;
  options?: GraphWorkspaceOptions | null;
  sizing?: Sizing25;
  span?: Span25;
  strict_role?: StrictRole25;
  strict_surface_variant?: StrictSurfaceVariant25;
  strict_title?: StrictTitle25;
  type?: Type26;
  visible?: Visible25;
  weight?: Weight25;
  workspace: GraphWorkspaceDocument;
  zone?: Zone25;
}
/**
 * General presentation and interaction capabilities for a workspace.
 */
export interface GraphWorkspaceOptions {
  autosave_delay_ms?: AutosaveDelayMs;
  autosave_key?: AutosaveKey;
  canonical_collapsed?: CanonicalCollapsed;
  canonical_title?: CanonicalTitle;
  description?: Description21;
  fan_page_size?: FanPageSize;
  feedback?: WidgetFeedback | null;
  interaction?: InteractionOptions | null;
  proposal_title?: ProposalTitle;
  tree_commit_mode?: TreeCommitMode;
  virtual_row_height?: VirtualRowHeight;
}
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
  version: Version3;
  workspace_id: WorkspaceId;
}
/**
 * Caller-supplied action surfaced by later workspace render phases.
 */
export interface WorkspaceAction {
  command: Command;
  confirmation?: Confirmation;
  id: Id39;
  label: Label45;
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
  state?: State1;
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
 * A caller-owned record represented without domain-specific fields.
 */
export interface WorkspaceRecord {
  fields?: Fields1;
  id: Id40;
  kind: Kind6;
  label?: Label46;
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
  version: Version2;
}
/**
 * One caller-defined structured value node.
 *
 * Slot values are always ordered lists.  A schema may later constrain a slot
 * to zero, one, or many children without changing the stored tree shape.
 */
export interface WorkspaceTreeNode {
  fields?: Fields2;
  id: Id41;
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
 * A structured value's root, part, slot, and field changes are intermediate
 * edits until the reviewed working tree is committed as one group edit.
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
  unit?: Unit2;
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
  status?: Status5;
  title: Title1;
}
/**
 * One proposal-local operation; canonical data is referred to, never edited.
 */
export interface ProposalChange {
  base_record_id?: BaseRecordId;
  dependencies?: Dependencies;
  id: Id42;
  operation: Operation;
  record?: WorkspaceRecord | null;
  record_id: RecordId1;
}
/**
 * A caller, server, or generic client validator result.
 */
export interface ValidationFinding {
  blocking?: Blocking;
  id: Id43;
  message: Message5;
  rule_id?: RuleId;
  severity: Severity1;
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
  filters?: Filters1;
  focus?: ReaderFocus | null;
  history?: History;
  history_index?: HistoryIndex;
  layer_state?: LayerState;
  positions?: Positions;
  revision?: Revision2;
  search?: Search1;
  selection?: Selection;
  step_selections?: StepSelections;
  viewport?: GraphViewport;
}
export interface ReaderNavigationEntry {
  id: Id44;
  label: Label47;
  selection?: WorkspaceSelection | null;
  step?: Step2;
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
  direction?: Direction1;
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
  visible?: Visible26;
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
  kind: Kind7;
  label: Label50;
  search_fields?: SearchFields;
}
/**
 * Caller-selected key into library-supported code-rendered geometry.
 */
export interface WorkspaceRecordAppearance {
  color?: Color36;
  shape: Shape2;
  token: Token1;
}
/**
 * How the library may present one caller-owned record or tree-part field.
 */
export interface WorkspaceFieldSchema {
  choices?: Choices;
  description?: Description22;
  id: Id45;
  label: Label49;
  reference_kinds?: ReferenceKinds;
  required?: Required2;
  structural?: Structural;
  tree_schema?: TreeSchema;
  value_kind: ValueKind;
}
/**
 * One caller-supplied choice for a declarative field.
 */
export interface WorkspaceChoice {
  label: Label48;
  value: JsonValue;
}
/**
 * A caller-declared searchable path and its diagnostic match label.
 */
export interface WorkspaceSearchField {
  id: Id46;
  label: Label51;
  match?: Match;
  path: Path1;
}
/**
 * Caller-supplied structural vocabulary for one typed value editor.
 */
export interface WorkspaceTreeSchema {
  id: Id47;
  label: Label52;
  limitation?: Limitation;
  parts: Parts;
  root_parts: RootParts;
  unsupported_parts?: UnsupportedParts;
}
export interface WorkspaceTreePartSchema {
  fields?: Fields4;
  id: Id48;
  label: Label53;
  shape?: Shape3;
  slots?: Slots1;
  token: Token2;
}
export interface WorkspaceTreeSlotSchema {
  accepts: Accepts;
  cardinality?: Cardinality;
  id: Id49;
  label: Label54;
  ordered?: Ordered;
  shape?: Shape4;
}
/**
 * Caller-owned declarative rule or server-validation declaration.
 */
export interface WorkspaceValidationRule {
  blocking?: Blocking1;
  evaluator: Evaluator;
  field?: Field;
  id: Id50;
  label: Label55;
  message: Message6;
  parameters?: Parameters;
  scope: Scope1;
  severity?: Severity2;
  target_kinds?: TargetKinds;
}
export interface Parameters {
  [k: string]: JsonValue;
}
/**
 * Push-to-talk or continuous (VAD-driven) microphone control.
 */
export interface MicButton {
  action_id: ActionId11;
  aspect?: Aspect27;
  color?: Color37;
  continuous?: Continuous;
  disabled?: Disabled28;
  group?: Group29;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id51;
  label?: Label56;
  /**
   * Enhanced microphone capabilities.
   */
  options?: MicOptions | null;
  silence_ms?: SilenceMs;
  sizing?: Sizing26;
  span?: Span26;
  strict_role?: StrictRole26;
  strict_surface_variant?: StrictSurfaceVariant26;
  strict_title?: StrictTitle26;
  timeout_ms?: TimeoutMs;
  type?: Type27;
  upload_url: UploadUrl1;
  visible?: Visible27;
  weight?: Weight26;
  zone?: Zone26;
}
export interface MicOptions {
  description?: Description23;
  device_id?: DeviceId;
  feedback?: WidgetFeedback | null;
  max_bytes?: MaxBytes1;
  mime_types?: MimeTypes;
  min_duration_ms?: MinDurationMs;
  vad_threshold?: VadThreshold;
}
/**
 * Composable LCARS container with configurable corners and side bars.
 */
export interface LcarsBox {
  aspect?: Aspect28;
  children?: Children3;
  color?: Color54;
  corner_colors?: CornerColors;
  corners?: Corners;
  disabled?: Disabled45;
  group?: Group46;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id81;
  label?: Label84;
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
  sizing?: Sizing43;
  span?: Span43;
  strict_role?: StrictRole43;
  strict_surface_variant?: StrictSurfaceVariant43;
  strict_title?: StrictTitle43;
  subtitle?: Subtitle3;
  subtitle_color?: SubtitleColor;
  title?: Title5;
  title_color?: TitleColor;
  type?: Type47;
  visible?: Visible44;
  weight?: Weight43;
  width_left?: WidthLeft;
  width_right?: WidthRight;
  zone?: Zone43;
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
  aspect?: Aspect29;
  children?: Children4;
  color?: Color53;
  column_inputs?: ColumnInputs;
  content_children?: ContentChildren;
  disabled?: Disabled44;
  group?: Group45;
  header_children?: HeaderChildren;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id80;
  label?: Label83;
  left_children?: LeftChildren;
  left_width?: LeftWidth;
  /**
   * Enhanced container capabilities.
   */
  options?: ContainerOptions | null;
  rail_children?: RailChildren;
  reverse?: Reverse;
  right_children?: RightChildren;
  sizing?: Sizing42;
  span?: Span42;
  strict_role?: StrictRole42;
  strict_surface_variant?: StrictSurfaceVariant42;
  strict_title?: StrictTitle42;
  subtitle?: Subtitle2;
  title?: Title4;
  type?: Type46;
  visible?: Visible43;
  weight?: Weight42;
  width_sidebar?: WidthSidebar;
  zone?: Zone42;
}
/**
 * LCARS bracket container for grouping related content.
 */
export interface LcarsBracket {
  aspect?: Aspect30;
  children?: Children5;
  color?: Color52;
  disabled?: Disabled43;
  group?: Group44;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id79;
  label?: Label82;
  /**
   * Enhanced container capabilities.
   */
  options?: ContainerOptions | null;
  orientation?: Orientation;
  sizing?: Sizing41;
  span?: Span41;
  strict_role?: StrictRole41;
  strict_surface_variant?: StrictSurfaceVariant41;
  strict_title?: StrictTitle41;
  type?: Type45;
  visible?: Visible42;
  weight?: Weight41;
  zone?: Zone41;
}
/**
 * LCARS section header with bar-and-pill presentation.
 */
export interface LcarsHeader {
  aspect?: Aspect31;
  color?: Color38;
  disabled?: Disabled29;
  group?: Group30;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id52;
  label?: Label57;
  /**
   * Enhanced header capabilities.
   */
  options?: HeaderOptions | null;
  size?: Size2;
  sizing?: Sizing27;
  span?: Span27;
  strict_role?: StrictRole27;
  strict_surface_variant?: StrictSurfaceVariant27;
  strict_title?: StrictTitle27;
  text: Text4;
  type?: Type28;
  visible?: Visible28;
  weight?: Weight27;
  zone?: Zone27;
}
export interface HeaderOptions {
  actions?: Actions1;
  anchor?: Anchor;
  description?: Description24;
  feedback?: WidgetFeedback | null;
  subtitle?: Subtitle1;
}
/**
 * A structural horizontal LCARS bar with independently selectable terminals.
 */
export interface LcarsBar {
  align?: Align2;
  aspect?: Aspect32;
  caps?: Caps;
  color?: Color39;
  disabled?: Disabled30;
  group?: Group31;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id53;
  label?: Label58;
  label_mode?: LabelMode;
  sizing?: Sizing28;
  span?: Span28;
  strict_role?: StrictRole28;
  strict_surface_variant?: StrictSurfaceVariant28;
  strict_title?: StrictTitle28;
  text?: Text5;
  thickness?: Thickness;
  type?: Type29;
  visible?: Visible29;
  weight?: Weight28;
  zone?: Zone28;
}
/**
 * One explicitly placed region inside an authored composition.
 */
export interface CompositionArea {
  align?: Align3;
  aspect?: Aspect33;
  children?: Children6;
  color?: Color51;
  column: Column1;
  column_span?: ColumnSpan;
  decorative?: Decorative;
  disabled?: Disabled42;
  group?: Group43;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id78;
  justify?: Justify;
  label?: Label81;
  layer?: Layer1;
  row: Row1;
  row_span?: RowSpan;
  sizing?: Sizing40;
  span?: Span40;
  strict_role?: StrictRole40;
  strict_surface_variant?: StrictSurfaceVariant40;
  strict_title?: StrictTitle40;
  type?: Type44;
  visible?: Visible41;
  weight?: Weight40;
  zone?: Zone40;
}
/**
 * Deterministic CSS-grid composition for canon-sensitive LCARS layouts.
 */
export interface AuthoredComposition {
  aspect?: Aspect34;
  children?: Children7;
  color?: Color40;
  column_gap?: ColumnGap;
  columns: Columns3;
  design_height?: DesignHeight;
  design_width?: DesignWidth;
  disabled?: Disabled31;
  group?: Group32;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id54;
  label?: Label59;
  min_width?: MinWidth;
  narrow?: Narrow;
  row_gap?: RowGap;
  rows: Rows4;
  sizing?: Sizing29;
  span?: Span29;
  strict_role?: StrictRole29;
  strict_surface_variant?: StrictSurfaceVariant29;
  strict_title?: StrictTitle29;
  type?: Type30;
  visible?: Visible30;
  weight?: Weight29;
  zone?: Zone29;
}
/**
 * Movable, optionally modal LCARS window rendered above the console deck.
 */
export interface Popup {
  aspect?: Aspect35;
  children?: Children8;
  close_action_id?: CloseActionId;
  color?: Color50;
  disabled?: Disabled41;
  dismissible?: Dismissible1;
  draggable?: Draggable;
  group?: Group42;
  height?: Height;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id77;
  label?: Label80;
  modal?: Modal;
  open?: Open1;
  position?: Position8;
  resizable?: Resizable;
  sizing?: Sizing39;
  span?: Span39;
  strict_role?: StrictRole39;
  strict_surface_variant?: StrictSurfaceVariant39;
  strict_title?: StrictTitle39;
  title: Title3;
  type?: Type43;
  visible?: Visible40;
  weight?: Weight39;
  width?: Width;
  zone?: Zone39;
}
/**
 * Renderer-owned controls for local LCARS WebUI preferences.
 */
export interface WebUISettings {
  aspect?: Aspect36;
  color?: Color41;
  disabled?: Disabled32;
  group?: Group33;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id55;
  label?: Label60;
  sizing?: Sizing30;
  span?: Span30;
  strict_role?: StrictRole30;
  strict_surface_variant?: StrictSurfaceVariant30;
  strict_title?: StrictTitle30;
  type?: Type31;
  visible?: Visible31;
  weight?: Weight30;
  zone?: Zone30;
}
/**
 * Alternative support environments for one node.
 */
export interface SupportPanel {
  aspect?: Aspect37;
  children?: Children9;
  color?: Color49;
  data: SupportData;
  disabled?: Disabled40;
  group?: Group41;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id76;
  label?: Label79;
  show_atom_legend?: ShowAtomLegend;
  sizing?: Sizing38;
  span?: Span38;
  strict_role?: StrictRole38;
  strict_surface_variant?: StrictSurfaceVariant38;
  strict_title?: StrictTitle38;
  title: Title2;
  type?: Type42;
  visible?: Visible39;
  weight?: Weight38;
  zone?: Zone38;
}
/**
 * One-hop traversal control for a node and its immediate neighbours.
 */
export interface Frontier {
  aspect?: Aspect38;
  color?: Color42;
  data: FrontierData;
  disabled?: Disabled33;
  group?: Group34;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id59;
  label?: Label64;
  layer_filter?: LayerFilter;
  sizing?: Sizing31;
  span?: Span31;
  strict_role?: StrictRole31;
  strict_surface_variant?: StrictSurfaceVariant31;
  strict_title?: StrictTitle31;
  type?: Type32;
  visible?: Visible32;
  weight?: Weight31;
  zone?: Zone31;
}
export interface FrontierData {
  current: FrontierCurrent;
  frontier?: Frontier1;
  path?: Path2;
}
export interface FrontierCurrent {
  id: Id56;
  label: Label61;
}
export interface FrontierItem {
  edge: Edge1;
  id: Id57;
  kind: Kind8;
  label: Label62;
  terminal: Terminal1;
}
/**
 * An identified, human-readable entity in a knowledge graph.
 */
export interface WebRef {
  id: Id58;
  label: Label63;
}
/**
 * Primary assertion view with optional context qualifier rendering.
 */
export interface AssertionCard {
  aspect?: Aspect39;
  children?: Children10;
  color?: Color48;
  data: AssertionData;
  disabled?: Disabled39;
  group?: Group40;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id74;
  label?: Label77;
  show_context?: ShowContext;
  sizing?: Sizing37;
  span?: Span37;
  strict_role?: StrictRole37;
  strict_surface_variant?: StrictSurfaceVariant37;
  strict_title?: StrictTitle37;
  type?: Type40;
  visible?: Visible38;
  weight?: Weight37;
  zone?: Zone37;
}
/**
 * Empirical or formal anchor and its source.
 */
export interface AnchorCard {
  aspect?: Aspect40;
  color?: Color43;
  data: AnchorData;
  disabled?: Disabled34;
  group?: Group35;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id62;
  label?: Label66;
  sizing?: Sizing32;
  span?: Span32;
  strict_role?: StrictRole32;
  strict_surface_variant?: StrictSurfaceVariant32;
  strict_title?: StrictTitle32;
  type?: Type34;
  visible?: Visible33;
  weight?: Weight32;
  zone?: Zone32;
}
export interface AnchorData {
  id: Id60;
  inspectable: Inspectable;
  label: Label65;
  polarity: Polarity;
  sibling_anchors?: SiblingAnchors;
  source: SourceRef;
  status?: Status6;
  type: Type33;
}
export interface SourceRef {
  citation: Citation;
  id: Id61;
}
/**
 * Neutral three-valued query result.
 */
export interface TriState {
  aspect?: Aspect41;
  color?: Color44;
  data: TriStateData;
  disabled?: Disabled35;
  group?: Group36;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id63;
  label?: Label67;
  on_escalate?: OnEscalate;
  sizing?: Sizing33;
  span?: Span33;
  strict_role?: StrictRole33;
  strict_surface_variant?: StrictSurfaceVariant33;
  strict_title?: StrictTitle33;
  type?: Type35;
  visible?: Visible34;
  weight?: Weight33;
  zone?: Zone33;
}
export interface TriStateData {
  commitment: Commitment;
  mode: Mode2;
  query: Query;
  reason: Reason2;
  result: Result;
  subject: Subject;
}
/**
 * An excluded interval with positioned and uncommitted claims.
 */
export interface ConstraintBand {
  aspect?: Aspect42;
  color?: Color45;
  data: ConstraintData;
  disabled?: Disabled36;
  group?: Group37;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id66;
  label?: Label70;
  sizing?: Sizing34;
  span?: Span34;
  strict_role?: StrictRole34;
  strict_surface_variant?: StrictSurfaceVariant34;
  strict_title?: StrictTitle34;
  type?: Type36;
  visible?: Visible35;
  weight?: Weight34;
  zone?: Zone34;
}
export interface ConstraintData {
  claims?: Claims;
  conditions?: Conditions;
  confidence: Confidence;
  excluded: NumericInterval;
  quantity: QuantityRef;
  representation: Representation;
  source: SourceRef;
}
export interface PositionedClaim {
  id: Id64;
  label: Label68;
  position?: Position7;
}
export interface ConstraintCondition {
  max?: Max6;
  min?: Min6;
  quantity: Quantity;
  unit: Unit3;
}
export interface NumericInterval {
  max?: Max7;
  min?: Min7;
}
export interface QuantityRef {
  id: Id65;
  label: Label69;
  unit: Unit4;
}
/**
 * A missing explanatory bridge and optional contenders.
 */
export interface GapPanel {
  aspect?: Aspect43;
  children?: Children11;
  color?: Color47;
  data: GapData;
  disabled?: Disabled38;
  group?: Group39;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id71;
  label?: Label74;
  show_contenders?: ShowContenders;
  sizing?: Sizing36;
  span?: Span36;
  strict_role?: StrictRole36;
  strict_surface_variant?: StrictSurfaceVariant36;
  strict_title?: StrictTitle36;
  type?: Type39;
  visible?: Visible37;
  weight?: Weight36;
  zone?: Zone36;
}
/**
 * Commitment-set selector with separate consequence sets.
 */
export interface CommitmentSelector {
  aspect?: Aspect44;
  color?: Color46;
  data: CommitmentData;
  disabled?: Disabled37;
  group?: Group38;
  /**
   * Optional floating hint shown on hover, focus, tap or on demand. A bare string is accepted as shorthand for a text-only hint.
   */
  hint?: Hint | null;
  id: Id68;
  label?: Label72;
  sizing?: Sizing35;
  span?: Span35;
  strict_role?: StrictRole35;
  strict_surface_variant?: StrictSurfaceVariant35;
  strict_title?: StrictTitle35;
  type?: Type37;
  visible?: Visible36;
  weight?: Weight35;
  zone?: Zone35;
}
export interface CommitmentData {
  active: Active;
  available: Available;
  conflict_set?: ConflictSet;
  empirically_grounded?: EmpiricallyGrounded;
  supported_under?: SupportedUnder;
}
export interface CommitmentOption {
  assumptions?: Assumptions;
  id: Id67;
  label: Label71;
}
export interface GapData {
  constraints?: Constraints;
  contenders?: Contenders;
  endpoints: Endpoints;
  id: Id70;
  known_dependency: KnownDependency;
  missing: Missing;
  type: Type38;
}
export interface GapContender {
  environments: Environments;
  id: Id69;
  label: Label73;
}
export interface AssertionData {
  canonical: Canonical;
  context?: Context;
  framework: FrameworkRef;
  gloss: Gloss;
  id: Id73;
  status?: Status7;
}
export interface ContextQualifier {
  label: Label75;
  qualifier: Qualifier;
  roles: Roles;
}
export interface FrameworkRef {
  id: Id72;
  label: Label76;
}
export interface SupportData {
  completeness?: SupportCompleteness;
  environments?: Environments1;
  node: Node;
  truncated?: Truncated;
}
/**
 * Structured completeness metadata for a :class:`SupportData` result.
 *
 * ``state`` is the source of truth. ``SupportData.truncated`` is kept as a
 * read-only compatibility projection (``state == "partial"``) for older
 * consumers that only understand the boolean.
 */
export interface SupportCompleteness {
  reason?: Reason3;
  returned?: Returned;
  state?: State2;
  total?: Total;
}
export interface SupportEnvironment {
  atoms?: Atoms;
}
export interface SupportAtom {
  id: Id75;
  label: Label78;
  type: Type41;
}
export interface ContainerOptions {
  collapsible?: Collapsible;
  density?: Density2;
  description?: Description25;
  feedback?: WidgetFeedback | null;
  initial_collapsed?: InitialCollapsed;
  interaction?: InteractionOptions | null;
  overflow?: Overflow;
}
export interface TextOptions {
  copyable?: Copyable1;
  description?: Description26;
  feedback?: WidgetFeedback | null;
  link?: LinkSpec | null;
  max_lines?: MaxLines1;
  selectable?: Selectable;
  semantic?: Semantic;
  wrap?: Wrap1;
}
