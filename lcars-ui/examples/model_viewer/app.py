"""LCARS Astrometrics — a 3D model viewer.

A Phase 5 real target for the *viewer* archetype: a framed central viewport with
command rails. The "model" is a wireframe astrometric globe drawn as inline SVG,
so it needs no new contract widget.

Run with:
    cd lcars-ui && PYTHONPATH=src python examples/model_viewer/app.py
"""

from __future__ import annotations

import os

import lcars_ui as lcars

# A wireframe globe — outer sphere, latitude rings, meridians, scan markers.
GLOBE_SVG = """
<div align="center">
<svg viewBox="0 0 360 360" width="92%" xmlns="http://www.w3.org/2000/svg" fill="none">
<circle cx="180" cy="180" r="150" stroke="#8aa9ff" stroke-width="1.4"/>
<ellipse cx="180" cy="180" rx="150" ry="48" stroke="#ffd27f" stroke-width="1"/>
<ellipse cx="180" cy="110" rx="133" ry="42" stroke="#ffd27f" stroke-width="0.8"/>
<ellipse cx="180" cy="250" rx="133" ry="42" stroke="#ffd27f" stroke-width="0.8"/>
<ellipse cx="180" cy="60" rx="90" ry="29" stroke="#ffd27f" stroke-width="0.7"/>
<ellipse cx="180" cy="300" rx="90" ry="29" stroke="#ffd27f" stroke-width="0.7"/>
<ellipse cx="180" cy="180" rx="120" ry="150" stroke="#8aa9ff" stroke-width="0.8"/>
<ellipse cx="180" cy="180" rx="80" ry="150" stroke="#8aa9ff" stroke-width="0.8"/>
<ellipse cx="180" cy="180" rx="35" ry="150" stroke="#8aa9ff" stroke-width="0.8"/>
<line x1="180" y1="30" x2="180" y2="330" stroke="#8aa9ff" stroke-width="0.8"/>
<circle cx="246" cy="120" r="4" fill="#ffd27f"/>
<circle cx="132" cy="232" r="4" fill="#cc99cc"/>
<circle cx="210" cy="250" r="3" fill="#8aa9ff"/>
</svg>
</div>
"""


def ui() -> None:
    lcars.config(
        "LCARS Astrometrics",
        theme="galaxy",
        subtitle="MODEL VIEWPORT",
        header_color="orange",
    )

    lcars.nav("Viewport", page="viewport")
    lcars.nav("Library", page="library")

    with lcars.page("Viewport", id="viewport"):
        with lcars.row():
            with lcars.col("260px"):
                with lcars.control_panel("Camera", color="orange"):
                    if lcars.button("Rotate +", color="anakiwa"):
                        lcars.notify("Yaw +15°")
                    if lcars.button("Rotate −", color="anakiwa"):
                        lcars.notify("Yaw −15°")
                    if lcars.button("Reset View", color="orange"):
                        lcars.notify("Camera reset to origin.")
                    model = lcars.select(
                        "Model",
                        ["Astrometric Globe", "Hull Mesh", "Sensor Net"],
                        value="Astrometric Globe",
                    )
                    lcars.text(f"LOADED {model}", size="mono")
                    wire = lcars.toggle("Wireframe", value=True)
                    if not wire:
                        lcars.text("SOLID SHADING", size="body", color="anakiwa")

            with lcars.col("1fr"):
                with lcars.data_panel("Astrometric Model — Sector 001", color="blue"):
                    lcars.markdown(GLOBE_SVG)

            with lcars.col("300px"):
                with lcars.data_panel("Mesh Telemetry", color="orange"):
                    lcars.metric("Vertices", "24,108", status="ok", color="blue")
                    lcars.metric("Polygons", "47,992", status="ok", color="blue")
                    lcars.metric("Scale", "1 : 4.2e6", status="ok", color="blue")
                    lcars.gauge(
                        "Render Load", 54.0, unit="%", warn_threshold=80.0, crit_threshold=95.0
                    )
                    lcars.progress("Mesh Stream", 71.0, color="orange")
                    lcars.metric("Frame Rate", "60 FPS", status="ok", color="blue")

    with lcars.page("Library", id="library"):
        with lcars.padd("Model Library"):
            lcars.table(
                [
                    {"Model": "Astrometric Globe", "Verts": "24,108", "Status": "Loaded"},
                    {"Model": "Hull Mesh", "Verts": "182,440", "Status": "Cached"},
                    {"Model": "Sensor Net", "Verts": "9,612", "Status": "Cached"},
                ],
                title="Available Meshes",
            )


if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
