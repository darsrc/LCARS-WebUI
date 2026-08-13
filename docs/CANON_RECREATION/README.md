# LCARS WebUI canon recreations

Each set contains one selected `LCARS_TRUTH` frame, a native-resolution screenshot rendered by LCARS WebUI, and a labeled side-by-side comparison.

| Source folder | Frame | Viewport | Output prefix |
|---|---|---:|---|
| `LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames` | `frame_000321.png` | 984×750 | `seismographic` |
| `LCARS_TNG_Rascals_Periodic_Table_of_Elements_frames` | `frame_000001.png` | 1476×1080 | `periodic-table` |
| `LCARS_TNG_The_Outrageous_Okona_Holodeck_Selection_frames` | `frame_000043.png` | 1388×1080 | `holodeck` |
| `LCN adge intro2_frames` | `frame_000055.png` | 1682×1080 | `access-console` |

The recreations are declared in `lcars-ui/examples/canon_recreation/app.py` using the public `lcars_ui` Python DSL. The capture script launches the normal LCARS server and React frontend, rejects image requests and forbidden raster-bearing DOM/CSS, and takes the screenshots at each reference frame's native dimensions. The periodic-table capture also enforces its 75-tile count, chrome-free surface, and key geometry anchors within four pixels.

No reference frame is served to, embedded in, or rendered by the application. The original PNGs are used only for offline documentation comparisons after the WebUI screenshots have been captured.

Regenerate the WebUI screenshots from `lcars-ui/`:

```bash
node scripts/capture_canon_recreations.mjs
```

Capture just one design while iterating:

```bash
LCARS_CANON_DESIGN=periodic node scripts/capture_canon_recreations.mjs
```
