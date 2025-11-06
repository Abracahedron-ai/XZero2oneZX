# Optimizers

Keep GPU, render, and network budgets in check.

## Modules

- **Lod Generator** — Builds level-of-detail stacks and imposters from source assets.
- **Render Optimizer** — Schedules render jobs and adjusts sampling to hit frame budgets.
- **Resource Allocator** — Assigns GPU/CPU slots and manages Redis task queues.

## Integration Notes

- Designed for floating window layout; dockable and composable with other tool panes.
- Communicates through the shared Redux store and realtime event bus for scene updates.
- Exposes manifest metadata so runtime agents can reference the tool capabilities dynamically.
