# Path Finder

Computes navigation meshes, path solutions, and replans around blockers.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Computes navigation meshes, path solutions, and replans around blockers.

## Input/Output Format

### Input
- **start_position** (dict): Starting position `{"x": 0, "y": 0, "z": 0}`
- **target_position** (dict): Target position `{"x": 10, "y": 0, "z": 5}`
- **navigation_mesh** (str, optional): Path to navigation mesh file
- **agent_radius** (float, optional): Agent collision radius (default: 0.5)
- **replan_on_blocker** (bool, optional): Enable replanning on blockers (default: true)

### Output
```json
{
  "success": true,
  "path_id": "path_123",
  "path": [
    {"x": 0, "y": 0, "z": 0},
    {"x": 2, "y": 0, "z": 1},
    {"x": 5, "y": 0, "z": 3},
    {"x": 10, "y": 0, "z": 5}
  ],
  "metadata": {
    "path_length": 12.5,
    "waypoints": 4,
    "replanned": false,
    "blockers_avoided": 0,
    "computation_time_ms": 45
  }
}
```

## Example Usage

### Command Line
```bash
python path_finder.py --start="0,0,0" --target="10,0,5" --nav-mesh="navmesh.obj" --agent-radius=0.5
```

### Python API
```python
from ai_agents.behavior_controllers.path_finder.path_finder import find_path

result = find_path(
    start_position={"x": 0, "y": 0, "z": 0},
    target_position={"x": 10, "y": 0, "z": 5},
    navigation_mesh="navmesh.obj",
    agent_radius=0.5,
    replan_on_blocker=True
)
```

### Via Agent Executor
```json
{
  "tool": "path_finder",
  "params": {
    "start_position": {"x": 0, "y": 0, "z": 0},
    "target_position": {"x": 10, "y": 0, "z": 5},
    "navigation_mesh": "navmesh.obj",
    "agent_radius": 0.5
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Pathfinding Library**: A* or similar pathfinding algorithm
- **Navigation Mesh**: NavMesh generation/loading library
- **Collision Detection**: Collision detection library
- **Permissions**: `runtime:query` (scene query permission)
- **Context**: Requires scene context (`{"selection": {"type": "scene"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
