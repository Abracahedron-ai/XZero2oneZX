# Utilities

Supporting services for conversion, validation, and packaging.

## Modules

- **Asset Compressor** — Optimizes textures, meshes, and audio for streaming pipelines.
- **File Converter** — Batch converts between source formats with checksum tracking.
- **Format Validator** — Ensures assets meet schema expectations before entering the shelf.

## Integration Notes

- Designed for floating window layout; dockable and composable with other tool panes.
- Communicates through the shared Redux store and realtime event bus for scene updates.
- Exposes manifest metadata so runtime agents can reference the tool capabilities dynamically.
