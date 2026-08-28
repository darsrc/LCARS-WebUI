# Surface Engine

## Overview

`advanced.surface()` is a design-coordinate canvas for LCARS screens whose topology is not
rectangular. It renders geometry such as arcs, rings, elbows, arbitrary paths, and mirrored or
repeated console structures in SVG, while placing ordinary LCARS widgets in absolutely positioned
HTML regions over that geometry. The result remains code-rendered: a surface does not use a
screenshot or raster backdrop.

Choose among the three layout regimes by the structure you need:

- Use the adaptive mosaic and its archetypes for ordinary responsive applications whose panels
  may be rearranged as the viewport changes.
- Use `advanced.composition()` when the topology is fixed but can be expressed as rows, columns, and
  rectangular CSS-grid areas.
- Use `advanced.surface()` when the screen itself is geometric: radial instruments, polygonal frames,
  routed diagrams, mirrored consoles, or another arrangement that a grid cannot express.

The full container signature is
`advanced.surface(*, design_size=(1920, 1080), min_width=960, narrow="scroll",
narrow_design_size=None, id="surface")`. On an authored page, a minimal surface looks like this:

```python
from lcars_ui import App, advanced, ui

app = App()

@app.page("Tactical", id="tactical", layout="authored", chrome="none")
def tactical() -> None:
    with advanced.surface(
        design_size=(1200, 700),
        min_width=800,
        narrow="scale",
    ) as surface:
        surface.rect(20, 20, 1160, 40, color="orange", id="header-bar")
        with surface.region("main", x=40, y=90, w=1120, h=570):
            ui.text("TACTICAL DISPLAY", size="h1")
```

(Executed while writing this guide — `app.build_manifest()` succeeds.)

`design_size` defines the surface coordinate space in pixels. `min_width` is the viewport width
at which the selected narrow policy takes effect. Give multiple surfaces in the same manifest
distinct `id` values.

## Basic shapes

The five basic shapes use surface design coordinates:

| Method | Geometry arguments | Shape-specific defaults |
| --- | --- | --- |
| `surface.rect()` | `x=None, y=None, w=None, h=None` | square corners |
| `surface.rounded_rect()` | `x=None, y=None, w=None, h=None` | `radius=24` |
| `surface.capsule()` | `x=None, y=None, w=None, h=None` | end radius follows half the rendered height |
| `surface.circle()` | `cx, cy, r` | none |
| `surface.ellipse()` | `cx, cy, rx, ry` | none |

For `rect`, `rounded_rect`, and `capsule`, pass all four of `x`, `y`, `w`, and `h` for absolute
placement, or use the constraints described below. `x` and `y` locate the upper-left corner.
Circle and ellipse coordinates locate their center and are always explicit.

Every shape accepts `color=None`, `id=None`, and
`layer="geometry"`. The permitted layer values are `"geometry"`, `"content"`, `"overlay"`, and
`"effects"`. Shape calls also accept the common layout metadata `zone`, `span`, `weight`,
`aspect`, `group`, and `sizing`; these do not replace surface-coordinate placement.

```python
surface.rect(40, 40, 180, 28, color="orange", id="title-rule")
surface.rounded_rect(40, 90, 420, 220, radius=28, color="mariner", id="housing")
surface.capsule(80, 330, 240, 32, color="atomic-tangerine", id="status-bar")
surface.circle(620, 190, 70, color="red", id="core")
surface.ellipse(820, 190, 120, 70, color="lilac", layer="overlay", id="field")
```

## Regions and content

Geometry nodes do not host widgets. A `surface.region()` is an absolutely positioned HTML
container that does:

```python
with surface.region("commands", x=80, y=390, w=420, h=180):
    ui.text("COMMAND FUNCTIONS", size="label")
    ui.button("ENGAGE", color="atomic-tangerine", id="engage")
    ui.text_input("Authorization", id="authorization")
```

A region can contain anything the surrounding page can contain: text, buttons, form controls,
data widgets, containers, or the nested layouts described later. Its placement arguments are
`x=None, y=None, w=None, h=None`; its default layer is `"content"`. It also accepts `color`, the
common layout metadata, and the full set of anchor and size constraints. The required first
argument, `area_id`, is also the region's widget id.

Regions on the same layer are checked for rectangular overlap after their constraints have been
resolved. Polar tracks are deliberately exempt from that check because their rectangles are only
approximations of curved sectors.

## Anchors and constraints

`rect`, `rounded_rect`, `capsule`, and `region` accept these constraint keywords:

- `anchor_left`, `anchor_right`, `anchor_top`, and `anchor_bottom`
- `center_x` and `center_y`
- `match_width_of` and `match_height_of`

A plain integer anchor is an inset from the corresponding surface edge. For example,
`anchor_right=20` places the node's right edge 20 pixels inside the surface's right edge. The
explicit form, `advanced.edge_anchor(target, edge, offset=0)`, anchors to the named edge of another
positionable node. Use `target="parent"` to spell out a surface-edge anchor explicitly.

Each axis needs enough information to determine a position and size. A near edge plus a far edge
with no explicit size fills the gap between the anchors. An edge plus a size pins the node to that
edge; a center coordinate plus a size centers it. `match_width_of="node-id"` or
`match_height_of="node-id"` obtains the size from another node and must be paired with an edge or
center on that axis. If both absolute position and absolute size are supplied on an axis, that
absolute pair takes precedence over constraints on the same axis.

This condensed tactical display keeps both rails 220 pixels wide and lets the viewscreen fill the
space between them. Under the fluid policy, the right rail moves to the narrow surface edge and the
same anchors produce a narrower viewscreen:

```python
def tactical_surface():
    with advanced.surface(
        design_size=(1600, 900),
        min_width=1200,
        narrow="fluid",
        narrow_design_size=(800, 900),
        id="tactical-surface",
    ) as surface:
        surface.rounded_rect(0, 60, 220, 840, id="rail-left", color="mariner")
        surface.rounded_rect(
            y=60, w=220, h=840,
            anchor_right=0,
            id="rail-right",
            color="mariner",
        )

        viewport = {
            "anchor_left": advanced.edge_anchor("rail-left", "right", offset=24),
            "anchor_right": advanced.edge_anchor("rail-right", "left", offset=24),
            "anchor_top": 70,
            "anchor_bottom": 20,
        }
        surface.rounded_rect(id="viewscreen", radius=16, color="lilac", **viewport)
        with surface.region("viewscreen-content", **viewport):
            ui.text("MAIN VIEWSCREEN", size="h1", align="center")
```

Constraint references may point forward to a node declared later because all bounds are resolved
when the surface block exits. Unknown targets, dependency cycles, underdetermined axes, and
non-positive resolved sizes fail during manifest construction.

## The `narrow="fluid"` policy

All three narrow policies preserve the authored design above `min_width`. Below it:

| Policy | Behavior |
| --- | --- |
| `scroll` | Keeps a minimum-width stage and allows the viewport to scroll horizontally. |
| `scale` | Uniformly scales the minimum-width stage down to the available width. |
| `fluid` | Switches to a second set of bounds resolved against `narrow_design_size`. |

`narrow="fluid"` requires `narrow_design_size=(width, height)`. Python resolves the same anchors
twice: once against `design_size` and once against the narrow design size. The frontend then
selects the narrow bounds and view box below `min_width`; it does not solve constraints in the
browser. Nodes with plain absolute `x/y/w/h` resolve to the same bounds in both passes, while
anchored rails, bars, and central regions can move or stretch.

Use `fluid` when preserving fixed control sizes matters more than preserving the wide screen's
overall proportions. Use `scale` when the entire topology should shrink as one unit, and `scroll`
when the full-size console should remain available by panning.

## Arc, ring, wedge, and polar geometry

Angles are degrees with `0` pointing east and increasing clockwise.

| Method | Required geometry arguments | Rendering |
| --- | --- | --- |
| `surface.arc()` | `center_x, center_y, radius, start_angle, end_angle` | open stroked curve |
| `surface.ring()` | `center_x, center_y, inner_radius, outer_radius, start_angle, end_angle` | filled annular segment |
| `surface.wedge()` | `center_x, center_y, inner_radius, outer_radius, start_angle, end_angle` | filled wedge; `inner_radius=0` makes a pie slice |

These methods accept the same `color`, `id`, `layer`, and layout metadata as the basic shapes.
For either filled primitive, `inner_radius=0` collapses the inner boundary to a true pie slice.
Use a `0` to `360` span for a complete circle.

`surface.polar()` divides an angular band into equal tracks:

```python
surface.ring(450, 450, 230, 245, 0, 360, color="lilac", id="scan-ring")

compass = surface.polar(
    center_x=450,
    center_y=450,
    inner_radius=260,
    outer_radius=320,
    start_angle=0,
    end_angle=360,
    tracks=4,
    gap_deg=8,
    id="compass",
)
for index, label in enumerate(["000", "090", "180", "270"]):
    with compass.track(index, span=1, id=f"bearing-{index}", color="orange"):
        ui.text(label, size="micro", align="center")
```

The complete `polar()` parameters are `center_x`, `center_y`, `inner_radius`, `outer_radius`,
`start_angle`, `end_angle`, `tracks`, `gap_deg=0.0`, and `id="polar"`. A track takes `index`,
`span=1`, `id=None`, `layer="content"`, `color=None`, and the layout metadata `zone`, `weight`,
`aspect`, `group`, and `sizing`. Its context hosts widgets like a region.

Track regions use axis-aligned bounds derived from the angular sector's corner points. Those loose
bounds can overlap even when concentric sectors do not, so polar tracks use
`check_overlap=False` internally to avoid false-positive rectangle-overlap errors.

## Path geometry

### Elbows, polygons, and paths

`surface.elbow(x, y, w, h, arm_thickness_x, arm_thickness_y, corner, *,
outer_radius=24, inner_radius=16, ...)` draws a four-corner LCARS bracket. `corner` is one of
`"top-left"`, `"top-right"`, `"bottom-left"`, or `"bottom-right"`.

`surface.polygon(points, *, ...)` draws a closed polygon from a list of `(x, y)` pairs.

`surface.path(commands, *, filled=True, ...)` builds an arbitrary path from typed command
dictionaries:

| `op` | Fields |
| --- | --- |
| `"move"` | `x`, `y` |
| `"line"` | `x`, `y` |
| `"arc"` | `rx`, `ry`, `x`, `y`; optional `rotation=0`, `large_arc=0`, `sweep=1` |
| `"close"` | no additional fields |

Set `filled=False` for an open or outlined stroked path. Unknown operations fail when the surface
is built.

```python
surface.path(
    [
        {"op": "move", "x": 80, "y": 100},
        {"op": "line", "x": 300, "y": 100},
        {"op": "arc", "rx": 40, "ry": 40, "x": 340, "y": 140},
        {"op": "line", "x": 340, "y": 260},
        {"op": "close"},
    ],
    filled=True,
    color="mariner",
    id="instrument-frame",
)
```

Elbow, polygon, and path accept `layer="geometry"`, `color`, `id`, and the common layout metadata.

### Connectors and text on a path

`surface.connector(from_, to, *, style="straight", layer="overlay", color=None, id=None, ...)`
routes between two node ids. `style` is `"straight"`, `"elbow"`, or `"bezier"`. Both endpoint
nodes must be declared before the connector call. Their anchor coordinates are resolved in Python
during manifest construction and stored as points in the manifest; the frontend does not look up node ids to route
the line.

`surface.text_path(path_ref, text, *, start_offset=0.0, layer="overlay", color=None, id=None,
...)` follows an already-declared `arc`, `ring`, `wedge`, `elbow`, `polygon`, `path`, or
`connector`. `start_offset` is a percentage from `0` through `100`. Native shapes such as `rect`,
`circle`, and `ellipse` are not valid path references.

Both methods also accept the common layout metadata `zone`, `span`, `weight`, `aspect`, `group`,
and `sizing`.

```python
surface.circle(450, 350, 90, color="mariner", id="core")
surface.rounded_rect(90, 90, 120, 60, radius=12, color="orange", id="sensor")
surface.connector("sensor", "core", style="bezier", color="orange", id="sensor-link")
surface.arc(450, 350, 130, 200, 340, color="lilac", id="core-label-arc")
surface.text_path(
    "core-label-arc",
    "WARP FIELD DECOHESION",
    start_offset=8,
    color="lilac",
)
```

### Ticks

`surface.ticks(center_x, center_y, radius, start_angle, end_angle, count, *, tick_length=10,
inward=False, labels=None, label_offset=20, color=None, id=None)` is a compositing helper, not a
manifest primitive. It loops over `path(filled=False)` for the marks and, when labels are supplied,
`region()` plus `ui.text()` for their text. `count` must be at least two, and the labels list
must contain exactly `count` strings.

## Transform groups

`surface.group()` stores a transform template around geometry and regions. It accepts:

- `mirror="x" | "y" | "xy"` and optional `mirror_axis=(x, y)`
- `repeat_radial={"count": n, "start_angle": a, "end_angle": b}` with optional
  `"center": (x, y)`, defaulting to `(0, 0)`
- `repeat_linear={"count": n, "dx": dx, "dy": dy}`
- `rotate=degrees` and optional `rotate_pivot=(x, y)`
- `id=None`

At most one of `mirror`, `repeat_radial`, and `repeat_linear` may be set. `rotate` composes onto
whichever mode is selected, or rotates one copy by itself. A missing mirror axis or rotation pivot
defaults to the surface center. Mirroring across `x` reflects around the vertical `axis_x` line;
mirroring across `y` reflects around the horizontal `axis_y` line; `xy` reflects through their
intersection. Every mirror mode renders the original plus one reflected copy. A radial repeat
places `count` copies from `start_angle` through `end_angle`, inclusive when there is more than one
copy. A linear repeat starts with the unshifted template and adds `(dx, dy)` for each subsequent
copy.

Groups are resolved entirely at render time in the frontend. Python stores one child template in
the manifest rather than expanding it into repeated nodes. SVG geometry receives the full affine
transform. An HTML region is handled differently: each copy's center point is transformed and the
same width and height are redrawn around it, but its contents are never rotated or mirrored. Text,
buttons, and other controls therefore remain upright and readable. For radial repetition and
rotation, this region behavior intentionally repositions the axis-aligned box without rotating it.

This condensed mirrored console declares one lobe and one tab template:

```python
def mirrored_console():
    with advanced.surface(
        design_size=(1000, 600),
        min_width=800,
        narrow="scale",
        id="mirrored-surface",
    ) as surface:
        with surface.group(mirror="x", id="lobe-group") as group:
            group.polygon(
                [(110, 60), (430, 60), (460, 90), (460, 490),
                 (430, 520), (110, 520), (40, 450), (40, 130)],
                color="golden-tanoi",
                id="lobe",
            )
            with group.region("lobe-readout", x=90, y=250, w=280, h=80):
                ui.text("PRIMARY SYSTEMS", size="label", align="center")

        with surface.group(
            repeat_linear={"count": 5, "dx": 150, "dy": 0},
            id="tab-group",
        ) as group:
            group.capsule(20, 16, 100, 24, color="atomic-tangerine", id="tab")
```

## Effects (animation)

`surface.effect(target, kind, *, period_ms=2000, direction="cw", from_angle=None,
to_angle=None, pivot=None, colors=None, id=None)` attaches an animation to an already-declared
geometry target. The effect node has no visual output of its own.

- `kind="sweep"` rotates the target continuously when both angle bounds are omitted. Supply both
  `from_angle` and `to_angle` for a bounded, back-and-forth sweep. `pivot=(x, y)` selects the
  rotation point; by default Python resolves the target's own anchor point. `direction` is `"cw"`
  or `"ccw"`.
- `kind="pulse"` pulses opacity when `colors` is omitted, or pulses the target's fill between the
  two LCARS colors in `colors=(color_a, color_b)`.
- `kind="flow"` animates dash offset along a stroked path. It is valid only for path-rendering
  targets: arc, ring, wedge, elbow, polygon, path, or connector.

The global motion stylesheet automatically neutralizes these animations when the user requests
reduced motion through `prefers-reduced-motion`; authors do not need to add a separate fallback.

```python
def animated_scanner():
    with advanced.surface(
        design_size=(800, 800),
        min_width=600,
        narrow="scale",
        id="scanner-surface",
    ) as surface:
        surface.arc(400, 400, 340, 0, 360, color="lilac", id="rim-arc")
        surface.effect("rim-arc", "flow", period_ms=1500, direction="cw")

        surface.wedge(
            400, 400, 0, 300, 0, 15,
            color="neon-carrot",
            id="sweep-wedge",
        )
        surface.effect("sweep-wedge", "sweep", period_ms=4000, direction="cw")
```

## Nesting

A `surface_region` can host another `advanced.surface()` or an `advanced.composition()`, not only plain
widgets. This is useful when an irregular outer frame contains an otherwise conventional
rectangular sub-layout.

The nested layout needs a `design_size` and `min_width` that fit its actual host region. Do not
leave it at page-scale defaults: a 1920-pixel nested stage inside a 700-pixel region will overflow
and may be clipped. Nested surfaces also need an id distinct from their outer surface.

This trimmed console uses a polygon for the housing and a three-column composition for its inner
instrument layout:

```python
def nested_console():
    with advanced.surface(
        design_size=(900, 700),
        min_width=700,
        narrow="scale",
        id="outer-console",
    ) as surface:
        surface.polygon(
            [(100, 60), (800, 60), (840, 100),
             (840, 640), (60, 640), (60, 100)],
            color="mariner",
            id="console-housing",
        )

        with surface.region("console-content", x=100, y=100, w=700, h=500):
            with advanced.composition(
                columns=["1fr", "1fr", "1fr"],
                rows=["70px", "120px", "250px"],
                design_size=(700, 500),
                min_width=700,
                id="console-grid",
            ) as grid:
                with grid.area("title", row=1, column=1, column_span=3):
                    ui.text("PATIENT MONITOR", size="h2", align="center")
                with grid.area("heart-rate", row=2, column=1):
                    ui.text("HEART RATE", size="label", align="center")
                    ui.text("72 BPM", size="h1", align="center")
                with grid.area("controls", row=3, column=1, column_span=3):
                    ui.button("SILENCE", color="atomic-tangerine")
                    ui.button("RECORD", color="atomic-tangerine")
```

The inverse composition works too: a region in one surface may host a nested surface with its own
appropriately sized coordinate system and narrow policy.
