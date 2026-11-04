# Scene Engine

## Overview

`ui.scene()` declares a semantic console: regions describe the content, relations describe how
regions connect, and modes describe which regions matter for a task. The browser currently presents
that model as an accessible linear view; scene declarations do not specify pixel positions.

Choose a layout regime by the structure you need:

- Use the adaptive mosaic and its archetypes for ordinary responsive applications whose panels
  may be rearranged as the viewport changes.
- Use `advanced.composition()` when the topology is fixed and can be expressed as rows, columns,
  and rectangular CSS-grid areas.
- Use `advanced.surface()` when the screen itself is geometric and needs authored design-coordinate
  shapes and regions.
- Use `ui.scene()` when content has semantic roles, relationships, and task-specific modes, with
  placement resolved from that meaning rather than authored coordinates.

## Minimal example

```python
from lcars_ui import App, ui

app = App()

@app.page("Survey", id="survey", layout="scene")
def survey() -> None:
    with ui.scene(initial_mode="inspect") as scene:
        with scene.region("sample", label="SAMPLE"):
            ui.text("SENSOR 12")
        with scene.region("commands", label="COMMANDS", role="commands"):
            ui.button("Refresh", id="refresh")
        scene.controls("commands", "sample")
        scene.mode("inspect", "INSPECT", focal=["sample"],
                   required=["sample", "commands"])

app.build_manifest()
```

(Executed while writing this guide — `app.build_manifest()` succeeds.)

`layout="scene"` selects a scene page and implies `chrome="none"`. A scene page must contain
exactly one `ui.scene()`.

## Regions and roles

Each `scene.region()` is a container for ordinary widgets. Its `label` is the visible heading and
accessible name. `subject` is an optional domain identifier; `fold` can be `"never"`, `"summary"`,
or `"terminal"`; `summary` supplies text for a summary fold; and `slot` overrides the family slot.

| Role | Use for |
| --- | --- |
| `instrument` | A primary instrument or work area (the default). |
| `commands` | Actions that operate on another region or subject. |
| `context` | Context needed to interpret the current work. |
| `data` | A data source or result. |
| `detail` | Supporting detail about a subject. |
| `alert` | An alert or recovery area. |
| `viewer` | A view of an object or scene. |

## Relations

The first argument is the source and the second is the target. The relation methods also accept
optional `label` and `id` keywords.

| Kind | Direction | Meaning |
| --- | --- | --- |
| `controls(source, target)` | Commands → subject | A command region operates on its target. |
| `details(source, target)` | Detail → subject | Supporting detail belongs with its target. |
| `compares(a, b)` | A ↔ B | The two subjects form a comparison. |
| `feeds(source, target)` | Source → consumer | Data flows from one region to another. |
| `part_of(member, group)` | Member → group | A region belongs to a larger group. |
| `recovers(source, target)` | Alert → source | The alert region offers recovery for its target. |

Use the correspondingly named methods on the `scene` value: `controls`, `details`, `compares`,
`feeds`, `part_of`, and `recovers`.

## Modes

Declare each mode with `scene.mode(mode_id, label, ...)`. `initial_mode` on `ui.scene()` names the
mode shown first.

| Field | Meaning |
| --- | --- |
| `id`, `label` | Stable mode identifier and visible label. |
| `focal` | One or more regions at the center of the task; every focal region must also be required. |
| `required` | Regions that must be shown in this mode. |
| `optional` | Regions to show when they fit; defaults to empty. |
| `families` | Preferred family order; defaults to `wrap`, `branch`, `focus`. |
| `returns_to` | Optional mode to restore when this context ends. |

The available family names are `wrap`, `branch`, `fork`, `contour`, and `focus`. Their order in
`families` expresses preference. Regions may be required or optional in a mode, but not both.

## Changing modes

For a simple action-to-mode mapping, `scene.transition(on=action_id, to=mode_id)` registers a server
action for the declared mode. It conflicts with an action registered for the same id. For custom
logic, an action handler can call `ctx.set_mode(mode_id)`; pass `subjects={region_id: label}` to
provide display labels for known regions. `ctx.end_mode()` returns to the current mode's
`returns_to` mode and raises an error if none is declared.

Mode state is scoped to the current session. A change is retained for that session and restored
when it reconnects.

## Validation rules

At manifest build time:

- A scene page needs exactly one scene, and `ui.scene()` must be on a scene page.
- Region ids and relation ids must be unique. Relation endpoints must name two distinct regions.
- `controls` sources must have role `commands`; `recovers` sources must have role `alert`.
- Every mode needs a focal region and at least one family. Focal regions must be required, and no
  region may be both required and optional.
- Every region referenced by a mode, relation, or `mode_subjects` must exist. Every region must be
  required or optional in at least one mode.
- `initial_mode` and each `returns_to` value must name a declared mode.
- A `compares` relation's regions must be focal together in at least one mode.
- A transition target must name a declared mode, and transition action ids cannot conflict with
  other registered actions or transitions.

## Current status

Scenes are the v8 milestone M1 feature. The frontend currently renders an accessible linear view;
the spatial compositor is planned for M2. Scene declarations describe semantic topology and modes,
but do not yet produce spatial layouts.
