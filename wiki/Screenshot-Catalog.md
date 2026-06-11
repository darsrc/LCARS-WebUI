# Screenshot Catalog

All screenshots are generated from `lcars-ui/examples/kitchen_sink/app.py`.

## Pages

| Screenshot | File |
| --- | --- |
| Overview page | `images/kitchen-sink-overview.png` |
| Widget gallery | `images/widgets-gallery.png` |
| Layout containers | `images/layout-containers.png` |

## Focused Panels

| Screenshot | File |
| --- | --- |
| Display widget states | `images/display-widgets-states.png` |
| Input widgets initial | `images/input-widgets-initial.png` |
| Input widgets active | `images/input-widgets-active-states.png` |
| Data readouts | `images/data-readouts-panel.png` |
| Telemetry | `images/telemetry-panel.png` |
| PADD container | `images/padd-container.png` |
| Diagnostic container | `images/diagnostic-container.png` |
| Sweep container | `images/sweep-container.png` |

## Regenerate

Start the showcase:

```bash
cd lcars-ui
LCARS_PORT=8126 LCARS_OPEN_BROWSER=0 PYTHONPATH=src .venv/bin/python examples/kitchen_sink/app.py
```

Then capture fresh screenshots with your preferred browser automation against:

```text
http://127.0.0.1:8126/?page=overview
http://127.0.0.1:8126/?page=widgets
http://127.0.0.1:8126/?page=layouts
```

