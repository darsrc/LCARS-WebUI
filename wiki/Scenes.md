# Scenes

A scene declares the meaning and task structure of a page. Python describes regions, their
relationships, modes, and layout policy; the browser measures the content and available field,
then resolves a suitable family and geometry. Python does not provide pixel coordinates.

Use a scene when regions have semantic relationships and the important regions change with the
task. Use a classic layout when ordinary panels should be arranged as a responsive mosaic, and
`advanced.composition()` or `advanced.surface()` when the topology or geometry is authored.

## Minimal example

```python
from lcars_ui import App, ui

app = App()
app.config("Water Quality", settings_page=False)

@app.page("Survey", id="survey", layout="scene")
def survey() -> None:
    with ui.scene(initial_mode="inspect") as scene:
        with scene.region("reading", label="WATER READING", role="instrument"):
            ui.metric("pH", "7.2", id="ph-reading")
        with scene.region("commands", label="SURVEY COMMANDS", role="commands"):
            ui.button("Refresh", id="refresh-reading")
        with scene.region("notes", label="SITE NOTES", role="detail"):
            ui.text("North basin sampling point", id="site-note")

        scene.controls("commands", "reading")
        scene.details("notes", "reading")
        scene.mode(
            "inspect", "INSPECT", focal=["reading"],
            required=["reading", "commands"], optional=["notes"],
        )

if __name__ == "__main__":
    app.serve()
```

Run with `python app.py`. `layout="scene"` selects a scene page and implies `chrome="none"`;
it is optional when a page's only top-level widget is a scene. A scene page contains exactly
one scene.

## Regions

Each `scene.region()` is a container for ordinary widgets. Its `label` is the visible heading
and accessible name. `subject` is an optional domain identifier. `fold` controls whether a
region may be folded: `"never"`, `"summary"` (the default), or `"terminal"`; `summary` supplies
the summary text. `slot` explicitly overrides a family slot, and `color` supplies the region
color token.

The region role is a closed set:

| Role | Meaning |
| --- | --- |
| `instrument` | A primary instrument or work area; the default. |
| `commands` | Actions that operate on another region or subject. |
| `context` | Context needed to interpret current work. |
| `data` | A data source or result. |
| `detail` | Supporting detail about a subject. |
| `alert` | An alert or recovery area. |
| `viewer` | A view of an object or scene. |

## Relations

The first argument is the source and the second is the target. Every relation method accepts
optional `label` and `id` keywords. Relations determine semantic attachment and the geometry
produced by the compositor; an explicit region `slot=` can override slot derivation.

| Kind | Direction | Geometry and meaning |
| --- | --- | --- |
| `controls(source, target)` | Commands → target | Attaches the command bank to the region it operates. The source role must be `commands`. |
| `details(source, target)` | Detail → target | Places supporting detail as an anchored branch of its subject. |
| `compares(a, b)` | A ↔ B | Places the focal regions as a fork pair with a bridge between them. |
| `feeds(source, target)` | Source → consumer | Draws a directed connector from the data source to its consumer. |
| `part_of(member, group)` | Member → group | Places the member in a shared band or enclosure with its group. |
| `recovers(source, target)` | Alert → target | Reserves an alert branch for the target's recovery path. The source role must be `alert`. |

Relations provide derived slots: focal regions occupy focal slots; controls, details, comparisons,
alerts, membership, and data flow produce their corresponding attachments. Relations are also
described in text in the access view.

## Modes and families

Declare a mode with `scene.mode(mode_id, label, ...)`. The scene's `initial_mode` names the mode
shown first.

| Field | Meaning |
| --- | --- |
| `focal` | One or more regions at the center of the task; each must also be required. |
| `required` | Regions that must remain visible in this mode. |
| `optional` | Regions shown when they fit; defaults to an empty list. A region cannot be both required and optional. |
| `families` | Preferred family names in order; defaults to `wrap`, `branch`, `focus`. |
| `returns_to` | Optional mode to restore when this context ends. |

The five families are:

- `wrap` arranges regions around a central focal area with connected bands.
- `branch` attaches related regions along branches from the focal area.
- `fork` gives two focal regions parallel placement with a comparison bridge.
- `contour` organizes dense regions around an instrumented central area and its boundary.
- `focus` presents a focused subscene when the preferred full composition cannot fit.

The browser rejects candidates that violate hard constraints, tries the mode's families in order,
and prefers fewer region moves when candidates are otherwise tied. It falls back to `focus`, then
offers the linear access view if no spatial family fits.

## Transitions

For a direct action-to-mode mapping, `scene.transition(on=action_id, to=mode_id)` registers a
server action. The action id must not conflict with another action or transition. For custom
logic, an action handler can call `ctx.set_mode(mode_id, subjects={region_id: label})`; subjects
maps known region ids to display labels for the new mode. If multiple scenes declare that mode,
pass `scene=scene_id` to identify one.

`ctx.end_mode(scene=scene_id)` returns from the current mode to its declared `returns_to` mode;
the current mode must declare that destination. When any mode has `returns_to`, the scene adds a
return terminal and registers the built-in action id `"<scene_id>.return"`. That action calls
`ctx.end_mode(scene=scene_id)`. Mode state and mode subjects are scoped to the current session.

For example, the `compare` mode in [scene_console](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/examples/scene_console/app.py) returns to
`inspect`; its `scene.transition` declaration connects a button action to the mode.

## Policy and continuity

`policy` is a `ScenePolicy`. Its v8 defaults preserve interaction locks, defer background layout
changes through a 750 ms quiet window, and enforce a 5000 ms minimum interval between background
structural commits. `on_infeasible` is `"focus-then-access"`. Focus, pointer capture, text
composition, and dirty drafts lock a region's identity and placement. If a background change
would hide, fold, or move a locked region, the renderer defers it until the lock releases.
Geometric resizing and explicit user-requested mode changes commit immediately.

While a structural background change is deferred, the current scene remains visible and a
**LAYOUT PENDING · APPLY** terminal appears. Applying commits that pending layout as a user
request. When stable layout is enabled, background data or server changes remain pending until
APPLY; field resizing can still commit when required for fit. These controls and their settings
are local to the browser.

## User controls

The **LAYOUT** panel explains the resolved family and placement, any pending change, and available
controls:

- **Why** shows the compositor's explanation and pending reason.
- **Stable layout** holds background structural changes until APPLY.
- **Pins** keep selected regions visible across modes. A pinned optional region behaves as
  required; pins represent region ids rather than coordinates.
- **Reset** clears pins and the stable-layout setting.

Pins and stable layout persist in browser local storage for that scene. Placement itself is
resolved again from current measurements and field size.

## Access and keyboard

The linear access view presents the same mounted regions in semantic order, with relations
described as text; it does not define a second set of content. It can be selected at any time and
is offered automatically if no spatial family fits. Add `#scene-view=linear` to the URL to open a
scene directly in that view.

All scene controls are keyboard reachable, focus is preserved through recomposition, and scene
controls use targets of at least 44 by 44 CSS pixels. The spatial bands are not controls; ordinary
rectangular DOM controls receive input. Reduced motion makes placement changes immediate.

## Multi-page applications

A `layout="scene"` page owns the available field without the console chrome. Its built-in scene
context terminal presents the page title, current mode, navigation, and return path. A scene page
can coexist with classic pages in the same app; navigation between pages remains application
navigation.

## v8.0 limitations

The current release has these recorded limitations:

- RTL refit, data freshness, and command lifecycle are not covered in v8.0.
- Each region has one rectangular interior; multi-interior shaped regions are deferred.
- Automatic testing covers Chromium only. Assistive technology and real-user validation remain
  manual and have not yet been completed.

## Compatibility

Scenes are additive. Existing adaptive archetypes, the rail shell, `advanced.surface()`, and
`advanced.composition()` keep their existing behavior. `layout="scene"` is opt-in; automatic
layout does not choose scenes. Scene regions contain ordinary widgets, so existing widget updates
and forms continue to work.
