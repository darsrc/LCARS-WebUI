# PLAN — Surface Engine Phase 1.1 (Contract Types)
STATUS: [ ] pending · [~] in progress · [x] done · [!] blocked · [-] paused

## M1 — Add Surface Foundation TypeScript interfaces and matching Pydantic models
PROVES: `cd frontend && npm run typecheck` passes; `python -c "from lcars_ui.core.models import Surface, SurfaceRegion, RectNode, RoundedRectNode, CapsuleNode, CircleNode, EllipseNode"` imports cleanly

### P1.1 — Add SurfaceWidget/SurfaceRegionWidget/SurfaceNode types to frontend/src/types/contract.ts
- [x] S1.1.1 — Read existing AuthoredCompositionWidget/CompositionAreaWidget patterns
      ACTION: read file
      FILES: frontend/src/types/contract.ts
      EXIT: understand base fields and union pattern
      DEPENDS_ON: none
- [x] S1.1.2 — Add SurfaceWidget interface with required fields
      ACTION: edit file
      FILES: frontend/src/types/contract.ts
      EXIT: SurfaceWidget added with correct shape
      DEPENDS_ON: S1.1.1
- [x] S1.1.3 — Add SurfaceRegionWidget interface with required fields
      ACTION: edit file
      FILES: frontend/src/types/contract.ts
      EXIT: SurfaceRegionWidget added with correct shape
      DEPENDS_ON: S1.1.2
- [x] S1.1.4 — Add five geometry node interfaces (RectNode, RoundedRectNode, CapsuleNode, CircleNode, EllipseNode)
      ACTION: edit file
      FILES: frontend/src/types/contract.ts
      EXIT: all five nodes added with correct shapes
      DEPENDS_ON: S1.1.3
- [x] S1.1.5 — Update Widget discriminated union to include new types
      ACTION: edit file
      FILES: frontend/src/types/contract.ts
      EXIT: Widget includes SurfaceWidget and SurfaceRegionWidget
      DEPENDS_ON: S1.1.4

### P1.2 — Add matching Pydantic models in src/lcars_ui/core/models.py
- [ ] S1.2.1 — Read existing AuthoredComposition/CompositionArea model patterns
      ACTION: read file
      FILES: src/lcars_ui/core/models.py
      EXIT: understand base classes and literal field pattern
      DEPENDS_ON: none
- [ ] S1.2.2 — Add Surface and SurfaceRegion Pydantic models
      ACTION: edit file
      FILES: src/lcars_ui/core/models.py
      EXIT: models import cleanly
      DEPENDS_ON: S1.2.1
- [ ] S1.2.3 — Add five geometry node Pydantic models
      ACTION: edit file
      FILES: src/lcars_ui/core/models.py
      EXIT: all five nodes defined correctly
      DEPENDS_ON: S1.2.2

### P1.3 — Bump manifest schema version
- [ ] S1.3.1 — Change hardcoded '1.0' → '1.1' in dsl/_builder.py
      ACTION: edit file
      FILES: src/lcars_ui/dsl/_builder.py
      EXIT: line ~418 updated to '1.1'
      DEPENDS_ON: none
- [ ] S1.3.2 — Change hardcoded '1.0.0' → '1.1.0' in scripts/generate_golden.py
      ACTION: edit file
      FILES: scripts/generate_golden.py
      EXIT: example manifest version updated to '1.1.0'
      DEPENDS_ON: S1.3.1

---END---
