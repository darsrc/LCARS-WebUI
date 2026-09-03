# v7.2.0 — project-local themes

_Prepared 2026-08-31. Unreleased. Additive contract change._

v7.2.0 makes LCARS themes editable as ordinary project files without turning the
renderer into a CSS editor or theme package manager. An application can ship a theme
alongside its source, an operator can copy, edit, or remove that file with normal file
tools, and the existing Options page discovers the result automatically.

## What changed

Themes live in `themes/*.toml` at the application project root. The filename stem is the
stable theme id; for example, `themes/bridge-night.toml` is selected with
`app.config(..., theme="bridge-night")` or `set_theme("bridge-night")`. `App` also accepts
`themes_dir=` for embedded or non-standard layouts. The `lcars` CLI attaches its discovered
project root; direct scripts resolve the default directory from their current working
directory.

Each file is a small, partial TOML definition:

```toml
version = 1
label = "Bridge Night"
extends = "galaxy"

[colors]
field = "#000000"
surface = "#120c08"
frame = "#e58b17"
orange = "#e58b17"

[fonts]
interface = '"Aptos Narrow", "Rajdhani", sans-serif'
display = '"Antonio", "Rajdhani", sans-serif'
mono = '"DejaVu Sans Mono", monospace'
```

Built-in themes remain immutable. A custom file must extend exactly one bundled base;
custom-to-custom inheritance and built-in-name collisions are rejected. Omitted values
continue to come from that base. The scaffold now includes an unselected
`themes/bridge-night.toml` sample that an author can copy or select.

## Deliberate limits

The file format permits only the typed, allowlisted LCARS pigment roles and named widget
pigments, plus interface, display, and monospace font-family stacks. Color values are
six-digit hex values. Font values are family names and fallbacks only; they cannot load
font files or inject CSS.

Themes do not provide arbitrary CSS, browser-side editing, downloads, font hosting,
layout geometry, spacing, animation, images, or new widget behavior. The LCARS visual
language remains structural: a theme can tune pigments and typefaces, not alter the
system's geometry or hierarchy.

## Options and runtime behavior

The manifest now carries a typed `theme_catalog` containing the immutable built-ins and
the validated project themes. The frontend uses that catalogue for the Options theme
choices rather than maintaining a second hardcoded list. A custom selection keeps its
declared bundled base as the CSS theme and layers its supplied variables over it.

Browser preferences still persist per application. A saved theme that is deleted from the
catalogue falls back to the application default and is removed from storage. A server-side
`set_theme()` update takes effect in the current session even when a browser preference
already exists.

## Validation and compatibility

Files are read on manifest construction so `lcars check`, `lcars dev`, `lcars run`, and
application startup report bad themes before rendering. Missing theme directories are
valid and expose only bundled themes. Invalid TOML, unsupported versions, bad filename ids,
blank labels, unknown keys, invalid colors or fonts, invalid bases, and reserved ids fail
with the source path and field.

The manifest change is additive: `Meta.theme` accepts the existing built-in ids plus valid
project ids, and `theme_catalog` has a built-in default. Existing manifests that name a
bundled theme retain their previous base CSS and validate without adding a catalogue.

## Release evidence

The JSON Schema, generated TypeScript declarations, standalone manifest validator, and
golden manifest were regenerated together. The frozen v7.0.0 manifest still validates
against the current schema, proving that the catalogue addition remains additive.

- `make ci`: exit 0; 15 strict contract tests, 670 backend tests passed with 7 skipped,
  92.99% backend coverage, 554 frontend tests, both dependency audits, documentation
  checks, and the production frontend bundle passed.
- Chromium Playwright: 10 passed, 8 skipped. The existing browser installation was used;
  no Playwright browser installation was run.
- Documentation: `llms.txt`, `llms-full.txt`, the context bundle, and `MAP.md` were
  regenerated for 7.2.0. Three added TOML examples parsed successfully, and the scaffold
  suite executed the generated application with its unselected sample theme.
- Editable-install security audit: package metadata reports 7.2.0, `pip check` and both
  dependency audits passed.

No wheel, commit, tag, push, or publication was performed as part of this preparation.
