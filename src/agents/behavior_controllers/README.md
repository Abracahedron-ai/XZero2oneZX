# Behavior Controllers

Drive interactive agents with goals, navigation, and conversational state.

## Modules

- **Goal Planner** — Assigns objectives, schedules, and dependencies to runtime actors.
- **Interaction Handler** — Mediates character to character and character to prop interactions.
- **Path Finder** — Computes navigation meshes, path solutions, and replans around blockers.

## Integration Notes

- Designed for floating window layout; dockable and composable with other tool panes.
- Communicates through the shared Redux store and realtime event bus for scene updates.
- Exposes manifest metadata so runtime agents can reference the tool capabilities dynamically.
