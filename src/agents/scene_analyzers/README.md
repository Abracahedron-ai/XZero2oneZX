# Scene Analyzers

Continuously observe the live scene to surface layout, collision, and coverage issues.

## Modules

- **Collision Checker** — Runs physics sweeps to report intersections and grounding errors.
- **Layout Planner** — Proposes staging adjustments, symmetry guides, and crowd spacing.
- **Object Detector** — Computer vision pass that finds tracked entities and writes Redis manifests.

## Integration Notes

- Designed for floating window layout; dockable and composable with other tool panes.
- Communicates through the shared Redux store and realtime event bus for scene updates.
- Exposes manifest metadata so runtime agents can reference the tool capabilities dynamically.
