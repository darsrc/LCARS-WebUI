# LCARS-WebUI

LCARS-WebUI is a Python DSL for building live LCARS dashboards. You write Python, the
library builds a manifest, FastAPI serves it, and the browser renders a strict LCARS
interface with the bundled frontend.

![LCARS kitchen sink overview](images/kitchen-sink-overview.png)

This wiki is written for application authors. It is not a dump of API fragments. Start
with the first two pages, then use the rest as reference while building.

## Documentation Map

| Page | Use it when you need to |
| --- | --- |
| [Getting Started](Getting-Started) | Install the package, run an example, and create a tiny app. |
| [Build a Dashboard](Build-a-Dashboard) | Build a complete two-page app with controls, logs, and live updates. |
| [Concepts](Concepts) | Understand manifests, reruns, ids, state, effects, pages, and layout. |
| [Layouts](Layouts) | Choose containers and page archetypes without fighting the renderer. |
| [Widgets](Widgets) | Use every supported widget, including buttons and edge cases. |
| [Actions and State](Actions-and-State) | Wire button handlers, stateful inputs, forms, logs, notifications, and live polling. |
| [Recipes](Recipes) | Copy common patterns into your app. |
| [Reference](Reference) | Look up public function signatures and accepted values. |
| [Deployment](Deployment) | Put an app behind HTTPS, auth, CORS, and a reverse proxy. |
| [Troubleshooting](Troubleshooting) | Fix common install, widget, layout, live update, and deployment problems. |
| [Visual Gallery](Visual-Gallery) | See the generated documentation screenshots. |

## A Minimal App

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("Bridge Ops", subtitle="Operations", theme="galaxy")
    lcars.nav("Main", page="main", color="orange-peel")

    with lcars.page("Main", id="main", layout="console"):
        with lcars.data_panel("Readouts", color="anakiwa", id="readouts"):
            lcars.metric("Warp Core", "98%", status="ok", id="warp-core")
            lcars.progress("Shield Recharge", 72, id="shield-recharge")

        with lcars.control_panel("Commands", color="orange", id="commands"):
            if lcars.button("Red Alert", color="red", id="red-alert"):
                lcars.set_alert_condition("red")
                lcars.notify("Battle stations", level="error")


if __name__ == "__main__":
    lcars.run(ui)
```

## What Makes LCARS-WebUI Different

- You do not write HTML, CSS, or JavaScript for normal dashboards.
- The Python function is rerun for browser actions, so current input values are available
  directly in Python.
- Widget ids are the contract between the browser, session state, actions, and
  `lcars.update(...)`.
- Layout is LCARS-first: use panels, sweeps, brackets, rails, readouts, and control
  containers rather than generic cards.
- The GitHub Wiki you are reading is the user-facing documentation. The checked-in
  `wiki/` folder is only a source mirror.

## Rules for Parity Work

Reference screenshots may be used for measurement and validation only. Do not render
screenshots, screenshot derivatives, raster backdrops, CSS image masks, or `data:` URL
image assets in parity UI paths. LCARS pages should be code-rendered geometry and content.
