# Themes and Visual Language

LCARS-WebUI renders a strict LCARS visual language by default. App authors should compose
interfaces from LCARS containers and widgets instead of trying to reproduce screenshots
with images or CSS backdrops.

## Configure Visuals

```python
lcars.config(
    "Bridge Ops",
    theme="galaxy",
    subtitle="Operations",
    header_color="orange",
    sound_enabled=True,
    force_uppercase=True,
    label_uppercase=True,
    lcars_font_headers=True,
    lcars_font_labels=True,
    lcars_font_text=False,
    visual_language="strict",
)
```

The supported visual language is `strict`.

## Themes

| Theme | Use |
| --- | --- |
| `galaxy` | Default TNG/DS9-style LCARS palette. |
| `tng` | Earlier muted TNG palette. |
| `nemesis` | Later darker blue/bronze palette. |

Switch theme live from a handler:

```python
if lcars.button("Nemesis Theme", id="theme-nemesis"):
    lcars.set_theme("nemesis")
```

## Color Names

Use named LCARS colors in `color=` fields:

```python
lcars.metric("Core Output", "87%", color="pale-canary")
lcars.button("Refresh", color="anakiwa")
lcars.alert("EPS relay margin low.", level="yellow")
```

Common named colors:

| Group | Names |
| --- | --- |
| Warm | `orange`, `orange-peel`, `atomic-tangerine`, `golden-tanoi`, `sandy-brown` |
| Yellow | `pale-canary`, `tanoi`, `husk`, `yellow` |
| Blue | `anakiwa`, `mariner`, `bahama-blue`, `danub`, `near-blue`, `navy-blue` |
| Purple | `lilac`, `melrose`, `lavender-purple`, `purple` |
| Red | `red`, `hopbush`, `chestnut-rose`, `red-damask`, `tamarillo` |

Hex colors are accepted, but named LCARS colors keep the interface coherent.

## Typography Options

The defaults favor LCARS labels and readable body text:

- `force_uppercase=True`
- `label_uppercase=True`
- `lcars_font_headers=True`
- `lcars_font_labels=True`
- `lcars_font_text=False`

Set `lcars_font_text=True` only when body text is short enough to remain readable.

## Layout Guidance

Use containers to create the shape before adding widgets:

```python
with lcars.page("Bridge", id="bridge", layout="console"):
    with lcars.data_panel("Telemetry"):
        lcars.chart([1, 3, 5, 8], title="EPS")

    with lcars.control_panel("Actions"):
        lcars.button("Refresh")
```

Good default choices:

- Use `data_panel` for charts, tables, logs, metrics, gauges, and text groups.
- Use `control_panel` for buttons and inputs.
- Use `console` when you want an explicit multi-region composition.
- Use `padd` for compact detail or review screens.
- Use `diagnostic` for test/readout pages.
- Use `sweep` and `bracket` when you need lower-level geometry control.

## Parity Guardrails

For parity UI paths:

- Do not render reference screenshots in the UI.
- Do not use screenshot backdrops, raster embedding, `data:` URLs, or CSS image masks.
- Build LCARS geometry in code with containers and widgets.
- Use reference screenshots only for measurement, comparison, and validation.

Screenshots in this wiki are documentation assets generated from code-rendered examples.
