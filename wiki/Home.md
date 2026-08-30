# LCARS-WebUI

LCARS-WebUI is a Python library for building live, browser-rendered LCARS applications.
You declare pages and instruments in Python; the package builds a typed manifest, serves
it with FastAPI, and renders it with a bundled React frontend.

![LCARS kitchen sink overview](images/kitchen-sink-overview.png)

## What it can build

- Adaptive operational consoles, telemetry scopes, grid walls, menus, and diagnostic
  surfaces, plus exact authored compositions and arbitrary-topology Surface Engine
  screens for spatial layouts a grid can't express.
- Stateful controls, model-backed forms, sortable/filterable tables, live logs,
  notifications, financial charts, HLS video, WebGL shaders, Three.js scenes, and
  editable node graphs.
- Typed application and framework keyboard bindings, with browser-local remapping in the
  built-in Options page.
- LCARS-native choice, toggle, and numeric controls plus a purpose-built command/chat
  composer — there is no dropdown, native checkbox, or spinner anywhere in the product
  surface.
- Real-time dashboards driven by explicit action handlers or a server-side `@app.live`
  job.
- Knowledge-graph clients using the two general-purpose evidence and tri-state
  instruments that survived the v7 audit.
- Generic graph proposal workspaces with canonical/proposal separation, structured
  values, transactional history, density navigation, virtualization, diff, and
  submission.
- Internet-facing applications with scoped token auth, CORS, secure headers, rate
  limits, and bounded uploads.

## Documentation map

| Page | Use it when you need to |
| --- | --- |
| [Getting Started](Getting-Started) | Install, run an example, and build a first app. |
| [Build a Dashboard](Build-a-Dashboard) | Follow a complete multi-page dashboard tutorial. |
| [Concepts](Concepts) | Understand `App`, pages, actions, IDs, state, and transport. |
| [Layouts](Layouts) | Choose page archetypes, containers, zones, and sizing hints. |
| [Surface Engine](Surface-Engine) | Build arbitrary-topology screens - arcs, polygons, mirrored consoles, effects. |
| [Widgets](Widgets) | Find every supported widget family and its capabilities. |
| [Knowledge Graph](Knowledge-Graph) | Use the surviving support-panel and tri-state instruments. |
| [Graph Workspace](Graph-Workspace) | Build generic proposal authoring and density navigation. |
| [Actions and State](Actions-and-State) | Handle controls, forms, table state, effects, and live updates. |
| [Recipes](Recipes) | Copy practical authoring patterns. |
| [Reference](Reference) | Look up public entry points, accepted values, and routes. |
| [Deployment](Deployment) | Configure HTTPS, auth, limits, uploads, and reverse proxies. |
| [Troubleshooting](Troubleshooting) | Diagnose install, state, upload, layout, and transport issues. |
| [Visual Gallery](Visual-Gallery) | Inspect code-rendered example output. |

## Minimal app

```python
from lcars_ui import ActionContext, App, ui

app = App()
app.config("Bridge Ops", subtitle="Operations", theme="galaxy")


@app.page("Main", id="main", layout="console")
def main() -> None:
    with ui.data_panel("Readouts", zone="side", id="readouts"):
        ui.metric("Warp Core", "98%", status="ok", id="warp-core")
        ui.progress("Shield Recharge", 72, id="shield-recharge")

    with ui.control_panel("Commands", id="commands"):
        ui.button("Red Alert", color="red", id="red-alert")


@app.action("red-alert")
def red_alert(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("red")
    ctx.notify("Battle stations", level="error")


if __name__ == "__main__":
    app.serve(port=8077, open_browser=True)
```

(Built with `app.build_manifest()` and exercised through `app.test_client()` while
writing this page.)

## Mental model

- **No rerun.** `@app.page("Main", id="main")` registers `main()`, which runs exactly
  once — at startup, and again whenever `app.build_manifest()` runs (e.g. in a test) — to
  declare that page's widgets. It never runs again when a browser action arrives.
- **Actions are explicit.** To react to something a widget did, register a handler for
  its `id` with `@app.action(...)`. It runs once per matching action and receives an
  `ActionContext[T]`, whose `ctx.value` carries the event's payload.
- **Effects are methods on `ctx`** — `ctx.update(...)`, `ctx.notify(...)`,
  `ctx.append_log(...)`, `ctx.set_theme(...)`, `ctx.set_alert_condition(...)` — private to
  the triggering session by default; pass `audience="all"` to broadcast.
- **IDs are the operational contract.** They route browser actions, retain session
  state, connect form values, and target effects. Give every widget you'll reference
  later an explicit `id=`.
- **Layout is semantic:** declare LCARS panels and their content; the adaptive mosaic
  composes the screen. Use placement hints only when the automatic result needs
  direction, or opt into `layout="authored"` / `advanced.surface()` when exact topology
  is itself meaningful.
- **Keyboard bindings are managed:** declare application shortcuts with `app.bind_key()`;
  the Options page can change, disable, and reset them alongside framework graph commands.

The UI remains code-rendered. Reference screenshots (where used to build an authored or
Surface Engine screen) are measurement inputs only, never page assets or backdrops.

If you know an earlier version of this library — `lcars.run(ui)`, `if lcars.button(...)`,
a flat `lcars.*` namespace — see [docs/migration.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/migration.md);
its `lcars migrate` scanner finds every place the change affects.

---

**Next:** [Getting Started](Getting-Started) · [Build a Dashboard](Build-a-Dashboard) ·
[Widgets](Widgets) · [Reference](Reference)
