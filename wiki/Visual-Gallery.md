# Visual Gallery

Screenshots generated from live code-rendered LCARS-WebUI examples. All images are
captured from running apps — no static mockups or design tools.

The application surfaces themselves are code-rendered geometry and content. These
documentation captures are examples only; they are not embedded as UI backdrops.

## Console archetype

Primary data lane (left), side readouts (right), control dock (bottom).

![LCARS kitchen sink overview](images/kitchen-sink-overview.png)

## Core widget gallery

A broad widget set rendered across a single page. Newer interactive surfaces are listed
below and are best inspected live.

![Full widget gallery](images/widgets-gallery.png)

## Display widget states

`metric` status variants (`ok` / `warn` / `crit`), `alert` severity bands, `progress` fill levels.

![Display widget states](images/display-widgets-states.png)

## Input widgets

Initial state:

![Input widgets initial state](images/input-widgets-initial.png)

Active / interacted state:

![Input widgets active state](images/input-widgets-active-states.png)

## Data readouts

Gauge, sparkline, and metric readouts on a side rail.

![Data readouts](images/data-readouts-panel.png)

## Telemetry archetype

Dominant data scope filling the primary zone with a readout rail.

![Telemetry panel](images/telemetry-panel.png)

## Layout containers

The LCARS-native containers: `ui.data_panel`, `ui.control_panel`, `ui.box`, `advanced.sweep`.

![Layout containers](images/layout-containers.png)

## Sweep container

`advanced.sweep` with header rail, column inputs, and bilateral content lanes.

![Sweep container](images/sweep-container.png)

## PADD container

`advanced.padd` for detail and form views in the menu archetype.

![PADD container](images/padd-container.png)

## Diagnostic container

`advanced.diagnostic` with main and side zones for paired data and control views.

![Diagnostic container](images/diagnostic-container.png)

## Typed capabilities

| Data display and interaction state | Controls, validation, and container state |
| --- | --- |
| ![Typed data capabilities](images/widget-capabilities-data.png) | ![Typed control capabilities](images/widget-capabilities-controls.png) |

## Rich interaction states

These captures intentionally exercise browser interaction rather than showing only the
initial manifest.

| Click hint, red alert, and notification | Movable pop-up, file upload, and notifications |
| --- | --- |
| ![Rich click hint and red-alert notification](images/rich-hint-notification.png) | ![Interaction overlays and uploaded-file state](images/interaction-overlays.png) |

## Spatial workspaces

| Managed Three.js scene | Editable typed node canvas |
| --- | --- |
| ![Managed Three.js scene](images/three-scene.png) | ![Editable typed node canvas](images/node-canvas.png) |

### Layered graph reader

The version-2 reader draws four caller-defined edge treatments, including parallel,
reciprocal, and nested self-loop routing. The second capture hides one layer and
emphasizes another; the underlying graph document is unchanged.

| All declared layers | Reader-local filter and emphasis |
| --- | --- |
| ![Layered node canvas with distinct patterns, labels, legend, and routes](images/layered-node-canvas.png) | ![Layered node canvas with one layer hidden, one emphasized, and a selected-edge trace](images/layered-node-canvas-filtered.png) |

### Graph proposal workspace

The generic workspace keeps the loaded canonical revision locked while proposal records,
typed values, edge fans, navigation state, diff, and submission remain inspectable.

| Canonical and proposal planes | Draft authoring and structural diff |
| --- | --- |
| ![Read-only canonical and editable proposal planes](images/graph-workspace.png) | ![Typed proposal authoring, history, diff, and preflight](images/graph-workspace-authoring.png) |

## Enhanced table

The repository browser combines typed columns, client-side sorting/filtering, selection,
and lazy expanded content.

![Enhanced table with an expanded lazy row](images/enhanced-table.png)

## Surface Engine recreation

The measured Pentharan seismic monitor is rendered at 984×750 from Surface paths, rectangles,
an ellipse, and positioned text regions. Reference material is used only for offline measurement;
the running page receives no raster asset or image URL.

![Measured Pentharan seismic monitor](images/surface-seismic-monitor.png)

## Knowledge-graph instruments

The gallery above predates the v7 knowledge-graph trim (`docs/knowledge-graph-audit.md`)
and doesn't yet have captures of the two surviving instruments, `support_panel` and
`tri_state` — see [Knowledge Graph](Knowledge-Graph) for their runnable code instead.

## Run the examples

```bash
cd lcars-ui
python examples/widget_capabilities/app.py
python examples/table_repositories/app.py
python examples/kitchen_sink/app.py
python examples/layered_graph/app.py
python examples/graph_workspace/app.py
python examples/canon_recreation/app.py
python examples/surface_recreation/app.py
```

Every one of these builds cleanly under `lcars check examples/<name>/app.py` (verified
while writing this page). The kitchen sink's **Scene** and **Graph** pages contain the
managed Three.js scene and editable node canvas. The layered-graph example is the
focused read-only version-2 reader. The kitchen sink's **Widgets** page contains the
hint, pop-up, upload, microphone, and notification demonstrations.

## Rebuild this gallery

From `lcars-ui/`, build the bundled frontend and run the deterministic Playwright capture:

```bash
make frontend-bundle
make docs-screenshots
```

The capture uses 1920×1080 Chromium for README images and the established 1280×800
viewport for this Wiki gallery, always with reduced motion. Set `LCARS_CHROMIUM_PATH`
when Chromium is not at `/usr/bin/chromium`; set `PYTHON` to choose another interpreter.

---

**See Also:** [Layouts](Layouts) · [Widgets](Widgets) · [Build a Dashboard](Build-a-Dashboard)
