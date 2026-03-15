# Phase 14 Family Reuse Ledger

## Scope
This ledger records the primitive reuse boundary after Phase 5, covering the currently accepted families:
- `seismographic_scan`
- `holodeck_programming`
- `periodic_table_matrix`

## Shared Phase 14 primitives

### `frontend/src/components/primitives/lcarsChartFramePrimitives.tsx`
- `LcarsSvgFrame`
  - Shared chart/readout frame outline plus title-anchor primitive.
  - Used by:
    - `SeismographicFamilyScene.tsx` waveform payload frame
    - `SeismographicFamilyScene.tsx` eruption-map payload frame
- `LcarsFramedSurface`
  - Shared HTML chart/readout frame shell for product widgets.
  - Used by:
    - `LineChartWidget.tsx`
    - `SparklineWidget.tsx`
    - `LcarsMetricControl.tsx`
    - `LcarsGaugeControl.tsx`
    - `LcarsProgressControl.tsx`

### `frontend/src/components/phase14/phase14Primitives.tsx`
- `Phase14SceneSurface`
  - Shared scene root and SVG host for canonical family scenes.
  - Used by:
    - `SeismographicFamilyScene.tsx`
    - `HolodeckFamilyScene.tsx`
- `Phase14SegmentRun`
  - Shared repeated segment/bar primitive.
  - Used by:
    - Seismographic sweep bars
    - Holodeck scaffold bars and accent segments
- `Phase14TextRows`
  - Shared repeated text-row primitive.
  - Used by:
    - Seismographic telemetry strips
    - Holodeck dense console telemetry blocks
- `Phase14Pill`
  - Shared rounded LCARS pill primitive.
  - Used by:
    - Holodeck top bar and action pills
    - Holodeck footer pills
- `Phase14MatrixCell`
  - Shared dense repeated LCARS cell primitive with icon badge and stacked labels.
  - Used by:
    - Periodic Table dense matrix body

## Family-local implementations

### Seismographic-local
- `frontend/src/components/phase14/SeismographicFamilyScene.tsx`
  - Waveform payload renderer
  - Eruption-map payload renderer
  - Left numeric rail geometry
  - Seismographic frame scales

### Holodeck-local
- `frontend/src/components/phase14/HolodeckFamilyScene.tsx`
  - Large header/elbow scaffold composition
  - Sidebar control stack layout
  - Numeric badge column
  - Dense console payload
  - Roster payload

### Periodic Table-local
- `frontend/src/components/phase14/PeriodicTableFamilyScene.tsx`
  - Dense matrix scene composition
  - Series divider placement
  - Top and bottom frame runs
  - Educational footer copy placement

## Reuse boundary
- Shared primitives own repeated scene mechanics and repeated LCARS forms.
- Family-local components own family grammar and payload-specific composition.
- New Phase 14 family work must extend shared primitives only when a reused form is real across families; it must not force families into one generic scene schema prematurely.

## Phase 5 confirmation
- Holodeck did not land as an isolated renderer silo.
- Shared primitives are now materially reused across at least two accepted families.
- Remaining family-local logic is intentional and tied to family grammar, not to target IDs.
- Dense repetition is now covered by a dedicated repeated-cell primitive instead of generic grid/card rendering.

## Current oracle-only boundary
- Seismographic waveform burst composition, grid density, axis placement, and map payload data remain oracle-only.
- Holodeck scaffold placement, badge columns, roster layout, and dense-console composition remain oracle-only.
- Periodic table series placement, matrix population, and footer-copy layout remain oracle-only.
