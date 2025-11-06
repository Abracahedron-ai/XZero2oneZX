# Keyframe Editor

Manage keyed transforms, materials, and custom channels with dope-sheet style editing.

## Responsibilities

Manage keyed transforms, materials, and custom channels with dope-sheet style editing.

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
