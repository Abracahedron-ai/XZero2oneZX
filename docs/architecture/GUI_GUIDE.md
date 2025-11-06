# GUI Toolkit Guide

This guide describes the modular GUI surface for the Zero2oneZ runtime scene builder. The interface is composed of floating panes that can dock, stack, or be summoned on demand by runtime agents. Each pane advertises a manifest so the object brain can orchestrate workflows across Redis (fast state) and Postgres (durable manifests).

## High-Level Layout

- **Viewport Cluster** – Primary 3D view, auxiliary camera ports, and HTML overlay preview.
- **Control Shelf** – Asset shelves, personality selectors, timeline transport, and toolbars.
- **Inspector Stack** – Property editors, quality metrics, and builder configuration panels.
- **Background Agents** – Spawnable AI daemons that populate assets, analyse the scene, and enforce quality gates.

## Component Categories

| Category | Purpose | Key Modules |
|----------|---------|-------------|
| Animation Tools | Manipulate time-based motion, poses, and playback. | Keyframe Editor, Timeline, Pose Library |
| Scene Building Tools | Assemble layout, manage hierarchy, and drop assets into the stage. | Asset Shelf, Property Editor, Viewport |
| Character Tools | Shape personality, emotions, and behaviour. | Personality Editor, Behavior Tree Editor, Dialogue Editor |
| VFX Tools | Layered graphics and shader treatments synced to the timeline. | HTML/CSS Effects, Shader Editor, Particle Editor |
| Audio Tools | TTS, voice shaping, and sonic asset management. | TTS Editor, Voice Modulation, Music Library |
| Project Management | Operational dashboards for tasks, versions, and permissions. | Asset Tracker, Task Board, User Roles |
| Streaming | Live pipeline control integrating OBS, WebRTC, and overlays. | OBS Integration, Stream Overlays |
| Video Production | Offline editorial workflows and render orchestration. | Storyboard Editor, Video Sequencer |
| Game Development | Rapid prototyping of interactive behaviours and multiplayer tests. | Level Editor, AI Choreography |
| Avatar Creation | Avatar customization for multiple downstream channels. | Character Customization, Lip Sync |
| Architectural Viz | CAD import, lighting, and VR reviews. | CAD Import, Lighting Editor |
| Product Design | Manufacturing-oriented modeling, assembly, and AR QC. | Geometry Editing, AR QC Tools |
| AI Agents | Background workers generating, analysing, or optimising content. | Asset Creators, Scene Analyzers, Optimizers |

## Communication Patterns

1. **State Store** – Redux slice per category; agents hydrate state from Redis and persist changes back through typed actions.
2. **Realtime Events** – WebSocket channels broadcast selection changes, playback states, and quality alerts to subscribed panes.
3. **Task Manifests** – AI agents advertise capabilities via Postgres manifests; UI panes can spawn tasks and subscribe to progress topics.
4. **Quality Gates** – Asset shelf and builder config consult Postgres thresholds before admission, allowing overrides via the GUI.

## Floating Pane Principles

- Each pane ships with a `PaneContract` manifest (name, tags, data requirements, hotkeys).
- Docking framework supports snap grids, tab stacks, and radial quick summon.
- Pane state serialises to the project session so layout can be restored across machines.
- Toolchains expose command palettes so agents or scripts can trigger UI workflows programmatically.

## Extending the GUI

1. **Create a Directory** – Place new panes in the appropriate category (e.g. `scene_building_tools/gpu_profiler`).
2. **Author README** – Document scope, data dependencies, and integration hooks.
3. **Register Pane** – Export its manifest via `renderer/components/panes/<Pane>.ts` and append metadata to the registry service.
4. **Wire State** – Add Redux slice or selectors in `store/` and register socket listeners as needed.
5. **Expose API** – Ensure any Postgres/Redis endpoints are described in `services/api.js` with authentication rules.

## Quality & Runtime Considerations

- **Latency** – Viewport, Asset Shelf, and Quality Metrics panes subscribe to high-frequency updates; throttle or batch updates when agents flood telemetry.
- **Undo Safety** – Every pane must log mutations with before/after snapshots for the global undo service.
- **Multi-Operator** – UI enforces optimistic locking where multiple operators or agents edit the same entity; conflicts surface in the Inspector.
- **Theming** – Global theme tokens live in `styles/theme.js`; panes should inherit typography, spacing, and colour tokens.

## Next Steps

- Flesh out component implementations under `renderer/components/` mapped to the directory structure above.
- Align backend APIs with the manifests expected by each pane.
- Prototype docking interactions and agent-driven pane spawning to validate the floating layout design.
- Review the standalone reference scaffolding in `prototypes/gui_reference/` when experimenting with Redux-based layouts.
