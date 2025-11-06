# Viewport

GPU accelerated 3D view with gizmos, overlays, and navigation modes for review and manipulation.

## Implementation Status

⚠️ **Partial Implementation** - Prototype exists in `prototypes/gui_reference/scene_building_tools/viewport/`. Needs full integration with React Three Fiber and main renderer.

## Responsibilities

GPU accelerated 3D view with gizmos, overlays, and navigation modes for review and manipulation.

## Input/Output Format

### Input
- **scene_id** (str): ID of the scene to render
- **camera_mode** (str, optional): Camera mode `"perspective" | "orthographic" | "isometric"`
- **view_mode** (str, optional): View mode `"wireframe" | "solid" | "material" | "rendered"`
- **overlays** (list, optional): Overlays to display `["grid", "gizmos", "stats", "helpers"]`
- **selection_filters** (list, optional): Selection filters `["mesh", "light", "camera"]`

### Output
```json
{
  "viewport_id": "viewport_123",
  "scene_id": "scene_123",
  "camera": {
    "position": { "x": 0, "y": 5, "z": 10 },
    "rotation": { "x": -0.5, "y": 0, "z": 0 },
    "fov": 75,
    "near": 0.1,
    "far": 1000
  },
  "selection": {
    "object_ids": ["obj_123"],
    "selection_mode": "object"
  },
  "gizmos": {
    "translate": { "enabled": true, "space": "world" },
    "rotate": { "enabled": false, "space": "local" },
    "scale": { "enabled": false, "space": "local" }
  },
  "rendering": {
    "fps": 60,
    "draw_calls": 150,
    "triangles": 50000,
    "textures_loaded": 25
  }
}
```

## Example Usage

### React Component
```tsx
import { Viewport } from '@/components/Viewport';
import { Canvas } from '@react-three/fiber';

function SceneBuilder() {
  const [selectedObjects, setSelectedObjects] = useState([]);
  
  return (
    <Canvas>
      <Viewport
        sceneId="scene_123"
        cameraMode="perspective"
        viewMode="rendered"
        overlays={["grid", "gizmos", "stats"]}
        onObjectSelect={(objectId) => {
          setSelectedObjects([objectId]);
          dispatch(selectObject({ objectId }));
        }}
        onObjectTransform={(objectId, transform) => {
          dispatch(updateObjectTransform({ objectId, transform }));
        }}
      />
    </Canvas>
  );
}
```

### API Call
```typescript
const viewportState = await fetch(`/api/viewports/${viewportId}`, {
  method: 'GET'
});
```

### Viewport Operations
```typescript
// Set camera position
await setCameraPosition({
  viewportId: "viewport_123",
  position: { x: 0, y: 5, z: 10 }
});

// Select object
await selectObject({
  viewportId: "viewport_123",
  objectId: "obj_123",
  multiSelect: false
});

// Transform object
await transformObject({
  viewportId: "viewport_123",
  objectId: "obj_123",
  transform: {
    position: { x: 10, y: 0, z: 5 },
    rotation: { x: 0, y: 90, z: 0 }
  }
});
```

## Features

- **3D Rendering**: GPU-accelerated rendering with Three.js/React Three Fiber
- **Camera Controls**: Orbit, pan, zoom controls
- **Gizmos**: Interactive transform gizmos (translate, rotate, scale)
- **Selection**: Click, box, and lasso selection
- **Overlays**: Grid, gizmos, stats, helpers
- **View Modes**: Wireframe, solid, material preview, full render
- **Multiple Viewports**: Split view with multiple cameras
- **Snapping**: Grid and object snapping for precise placement
- **Undo/Redo**: Viewport operation history
- **Performance**: Adaptive quality based on FPS

## Navigation Controls

- **Orbit**: Left mouse button + drag
- **Pan**: Middle mouse button + drag (or Shift + Left mouse)
- **Zoom**: Mouse wheel (or Right mouse button + drag)
- **Focus**: F key (focus on selected object)
- **Frame All**: Home key
- **Rotate View**: Alt + Left mouse button

## Dependencies & Requirements

- **React/TypeScript**: Component framework
- **React Three Fiber**: React renderer for Three.js
- **Three.js**: 3D graphics library
- **@react-three/drei**: Useful helpers (gizmos, controls)
- **@react-three/postprocessing**: Post-processing effects
- **WebGL**: GPU rendering support
- **Redux Toolkit**: Viewport state management
- **Permissions**: `runtime:query`, `runtime:control` (scene rendering and manipulation)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
