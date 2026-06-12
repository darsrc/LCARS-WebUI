# LCARS-WebUI Wiki

LCARS-WebUI lets you build server-driven LCARS dashboards in Python. You declare
pages, LCARS containers, widgets, and handlers in a Python function; the library builds a
manifest, serves it with FastAPI, and renders it in the browser with the bundled frontend.

This wiki is organized for application authors first. Start with the tutorial, then use
the concepts, API reference, widget pages, and recipes when you need specifics.

![LCARS kitchen sink overview](images/kitchen-sink-overview.png)

## Start Here

| Goal | Page |
| --- | --- |
| Install and run a minimal app | [[Getting Started|Getting-Started]] |
| Build a practical dashboard step by step | [[Tutorial: Build a Dashboard|Tutorial-Build-a-Dashboard]] |
| Understand reruns, ids, state, and effects | [[Core Concepts|Core-Concepts]] |
| Find function signatures quickly | [[API Reference|API-Reference]] |
| Copy common patterns | [[Recipes|Recipes]] |
| Fix common problems | [[Troubleshooting|Troubleshooting]] |

## Main Guides

- [[Getting Started|Getting-Started]]
- [[Tutorial: Build a Dashboard|Tutorial-Build-a-Dashboard]]
- [[Core Concepts|Core-Concepts]]
- [[Usage Patterns and Edge Cases|Usage-Patterns-and-Edge-Cases]]
- [[API Reference|API-Reference]]
- [[Recipes|Recipes]]
- [[Themes and Visual Language|Themes-and-Visual-Language]]
- [[Deployment|Deployment]]
- [[Troubleshooting|Troubleshooting]]

## Widget Reference

| Family | Widgets | Page |
| --- | --- | --- |
| Primitives | `text`, `markdown`, `metric`, `alert`, `progress`, `header` | [[Primitive Widgets|Primitive-Widgets]] |
| Data | `chart`, `sparkline`, `gauge`, `table` | [[Data Widgets|Data-Widgets]] |
| Inputs | `button`, `toggle`, `checkbox`, `select`, `radio`, `radio_toggle`, `text_input`, `number_input`, `form` | [[Input Widgets|Input-Widgets]] |
| Media | `log`, `video_hls`, `mic_button` | [[Media Widgets|Media-Widgets]] |
| Layouts | `box`, `sweep`, `bracket`, `console`, `padd`, `diagnostic`, `data_panel`, `control_panel`, `row`, `col`, `columns` | [[Layouts and Containers|Layouts-and-Containers]] |

## Examples in the Repository

Run examples from `lcars-ui/` after installing the package:

```bash
LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/dashboard.py
LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/kitchen_sink/app.py
LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/lcars_console/app.py
```

The kitchen sink example is the source for the documentation screenshots.

## Common Questions

- "How do I use a button?" See [[Input Widgets|Input-Widgets#buttons]].
- "Why did my input reset?" See [[Core Concepts|Core-Concepts#widget-ids]].
- "How do I update a metric from a click?" See [[Live Updates and Actions|Live-Updates-and-Actions#widget-updates]].
- "When should I use `data_panel` versus `box`?" See [[Layouts and Containers|Layouts-and-Containers]].
- "Can I deploy this behind a reverse proxy?" See [[Deployment|Deployment]].
