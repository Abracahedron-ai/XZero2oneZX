# AI Agents

Daemon-grade workers spun up on demand. Each agent category has runtime manifests and task contracts.

## Modules

- **Asset Creators** — Generate 3D content, textures, and motion clips for rapid iteration.
- **Behavior Controllers** — Drive interactive agents with goals, navigation, and conversational state.
- **Data Processors** — Transform captured telemetry into tagged, queryable datasets.
- **Experimental** — Incubator for bleeding-edge agent concepts.
- **Optimizers** — Keep GPU, render, and network budgets in check.
- **Scene Analyzers** — Continuously observe the live scene to surface layout, collision, and coverage issues.
- **Utilities** — Supporting services for conversion, validation, and packaging.

## Integration Notes

- Designed for floating window layout; dockable and composable with other tool panes.
- Communicates through the shared Redux store and realtime event bus for scene updates.
- Exposes manifest metadata so runtime agents can reference the tool capabilities dynamically.
