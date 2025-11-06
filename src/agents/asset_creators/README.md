# Asset Creators

Generate 3D content, textures, and motion clips for rapid iteration.

## Modules

- **3D Modeler** — Procedural and ML driven mesh authoring with topology validation.
- **Rig Generator** — Procedural and ML-driven IK rig generation from mesh topology.
- **Animator** — Keyframe and motion capture blending to produce action beats and idles.
- **Texture Artist** — Style-transfer and PBR material synthesis with variant batching.

## Integration Notes

- Designed for floating window layout; dockable and composable with other tool panes.
- Communicates through the shared Redux store and realtime event bus for scene updates.
- Exposes manifest metadata so runtime agents can reference the tool capabilities dynamically.
