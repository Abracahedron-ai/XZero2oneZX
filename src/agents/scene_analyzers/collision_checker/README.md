# Collision Checker

Runs physics sweeps to report intersections and grounding errors.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Runs physics sweeps to report intersections and grounding errors.

## Input/Output Format

### Input
- **scene_id** (str): ID of the scene to check
- **objects** (list, optional): List of object IDs to check (if empty, checks all objects)
- **check_type** (str, optional): Type of check ("collisions", "grounding", "all")
- **tolerance** (float, optional): Collision tolerance (default: 0.01)

### Output
```json
{
  "success": true,
  "check_id": "check_123",
  "collisions": [
    {
      "object1": "obj_123",
      "object2": "obj_456",
      "type": "intersection",
      "severity": "warning",
      "position": {"x": 5, "y": 2, "z": 3},
      "penetration": 0.05
    }
  ],
  "grounding_errors": [
    {
      "object": "obj_789",
      "type": "floating",
      "distance_above_ground": 0.5,
      "position": {"x": 10, "y": 0.5, "z": 5}
    }
  ],
  "metadata": {
    "objects_checked": 50,
    "collisions_found": 2,
    "grounding_errors": 1,
    "check_time_ms": 123
  }
}
```

## Example Usage

### Command Line
```bash
python collision_checker.py "scene_123" --check-type="all" --tolerance=0.01
```

### Python API
```python
from ai_agents.scene_analyzers.collision_checker.collision_checker import check_collisions

result = check_collisions(
    scene_id="scene_123",
    check_type="all",
    tolerance=0.01
)
```

### Via Agent Executor
```json
{
  "tool": "collision_checker",
  "params": {
    "scene_id": "scene_123",
    "check_type": "all",
    "tolerance": 0.01
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Physics Engine**: Physics simulation library (e.g., Bullet, Havok)
- **Collision Detection**: Collision detection algorithms
- **Permissions**: `runtime:query` (scene query permission)
- **Context**: Requires scene context (`{"selection": {"type": "scene"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
