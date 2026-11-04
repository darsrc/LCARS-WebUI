# Widget inventory

Zone defaults summarize `frontend/src/compose/layout.ts` for the default console/telemetry archetypes; explicit hints and grid/menu archetypes can change placement. `none` means no independent default is assigned by that logic.

| type | DSL function | kind (leaf / container / surface-primitive) | semantic role | zone default | has children? | notes |
|---|---|---|---|---|---|---|
| `text` | `text()` | leaf | display | primary | no | Plain text content |
| `status_tile` | `metric()` | leaf | metric | side | no | Status and value readout |
| `alert` | `alert()` | leaf | display | primary | no | Severity message banner |
| `progress_bar` | `progress()` | leaf | metric | side | no | Percentage meter |
| `markdown` | `markdown()` | leaf | display | primary | no | Rich markdown content |
| `webui_settings` | none (renderer-owned) | leaf | control | dock | no | Local interface preferences |
| `button` | `button()` | leaf | command | dock | no | Action button |
| `toggle` | `toggle()` | leaf | control | dock | no | Boolean toggle |
| `lcars_checkbox` | `checkbox()` | leaf | control | dock | no | Checkbox control |
| `select` | `select()` | leaf | control | dock | no | Choice selector |
| `lcars_radio` | `radio()` | leaf | control | dock | no | Radio choice control |
| `lcars_radio_toggle` | `radio_toggle()` | leaf | control | dock | no | Segmented radio toggle |
| `text_input` | `text_input()` | leaf | form | dock | no | Text entry field |
| `number_input` | `number_input()` | leaf | form | dock | no | Numeric entry field |
| `file_upload` | `file_upload()` | leaf | data-collection | dock | no | File selection and upload |
| `form` | `form()` | container | form | dock | yes | Groups submitted fields |
| `table` | `table()` | leaf | data | primary | no | Tabular records |
| `line_chart` | `chart()` | leaf | data | primary | no | Time series chart |
| `sparkline` | `sparkline()` | leaf | data | primary | no | Compact trend chart |
| `candlestick` | `candlestick()` | leaf | data | primary | no | Financial price chart |
| `renko` | `renko()` | leaf | data | primary | no | Renko chart |
| `shader` | `shader()` | leaf | immersive | primary | no | Shader visualization |
| `gauge` | `gauge()` | leaf | metric | side | no | Gauge readout |
| `log_viewer` | `log()` | leaf | log | primary | no | Streaming log display |
| `video_hls` | `video_hls()` | leaf | media | primary | no | HLS video playback |
| `three_scene` | `three_scene()` | leaf | immersive | primary | no | Three.js scene |
| `mic_button` | `mic_button()` | leaf | command | dock | no | Microphone action |
| `lcars_box` | `box()`, `diagnostic()`, `data_panel()`, `control_panel()` | container | structure | primary | yes | Box and panel layouts |
| `lcars_sweep` | `sweep()`, `console()`, `padd()` | container | structure | primary | yes | Sweep and console layouts |
| `lcars_bracket` | `bracket()` | container | structure | primary | yes | Bracket-framed group |
| `lcars_header` | `header()` | leaf | navigation | primary | no | Header/title strip |
| `lcars_bar` | `bar()` | leaf | structure | primary | no | Decorative bar |
| `composition_area` | `composition().area()` | container | structure | none | yes | Positioned composition region |
| `authored_composition` | `composition()` | container | structure | none | yes | Explicit grid composition |
| `popup` | `popup()` | container | structure | none | yes | Overlay window; excluded from panels |
| `node_canvas` | `node_canvas()` | leaf | data | primary | no | Node graph editor canvas |
| `graph_workspace_state` | `graph_workspace()` | leaf | data | primary | no | Workspace state payload |
| `graph_workspace` | `graph_workspace()` | container | data | primary | yes | Graph workspace with canvas |
| `support_panel` | `support_panel()` | container | data | primary | yes | Support environment panel |
| `tri_state` | `tri_state()` | leaf | metric | side | no | YES/NO/UNKNOWN state |

## Surface Engine primitives

| name | DSL method | what it draws |
|---|---|---|
| `rect` | `surface().rect()` | Axis-aligned rectangle |
| `rounded_rect` | `surface().rounded_rect()` | Rounded rectangle |
| `capsule` | `surface().capsule()` | Capsule shape |
| `circle` | `surface().circle()` | Circle |
| `ellipse` | `surface().ellipse()` | Ellipse |
| `arc` | `surface().arc()` | Circular arc |
| `ring` | `surface().ring()` | Annular arc |
| `wedge` | `surface().wedge()` | Annular sector |
| `elbow` | `surface().elbow()` | Rounded L-shaped corner |
| `polygon` | `surface().polygon()` | Polygon |
| `path` | `surface().path()` | SVG-style path |
| `connector` | `surface().connector()` | Line between node anchors |
| `text_path` | `surface().text_path()` | Text along a path |
| `region` | `surface().region()` | Positioned child-content region |
| `group` | `surface().group()` | Transform wrapper for nested elements |
| `effect` | `surface().effect()` | Animation styling on a target node |
| `ticks` | `surface().ticks()` | Repeated radial ticks and optional labels |
| `polar` / `track` | `surface().polar().track()` | Polar track regions |
