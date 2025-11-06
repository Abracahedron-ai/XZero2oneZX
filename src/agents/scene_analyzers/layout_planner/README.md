# Layout Planner

Proposes staging adjustments, symmetry guides, and crowd spacing.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Proposes staging adjustments, symmetry guides, and crowd spacing.

## Input/Output Format

### Input
- **scene_id** (str): ID of the scene to plan
- **layout_type** (str, optional): Layout type ("staging", "symmetry", "crowd", "all")
- **spacing_rules** (dict, optional): Spacing rules
  ```json
  {
    "min_distance": 2.0,
    "max_density": 0.5,
    "group_size": 5
  }
  ```
- **target_composition** (dict, optional): Target composition rules

### Output
```json
{
  "success": true,
  "layout_id": "layout_123",
  "proposals": [
    {
      "object_id": "obj_123",
      "current_position": {"x": 5, "y": 0, "z": 3},
      "suggested_position": {"x": 6, "y": 0, "z": 4},
      "reason": "improve_symmetry",
      "priority": 1
    }
  ],
  "metadata": {
    "objects_analyzed": 20,
    "proposals_generated": 5,
    "symmetry_score": 0.85,
    "spacing_score": 0.92
  }
}
```

## Example Usage

### Command Line
```bash
python layout_planner.py "scene_123" --layout-type="symmetry" --spacing-rules="rules.json"
```

### Python API
```python
from ai_agents.scene_analyzers.layout_planner.layout_planner import plan_layout

result = plan_layout(
    scene_id="scene_123",
    layout_type="symmetry",
    spacing_rules={
        "min_distance": 2.0,
        "max_density": 0.5
    }
)
```

### Via Agent Executor
```json
{
  "tool": "layout_planner",
  "params": {
    "scene_id": "scene_123",
    "layout_type": "symmetry",
    "spacing_rules": {
      "min_distance": 2.0,
      "max_density": 0.5
    }
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Layout Algorithms**: Spatial arrangement algorithms
- **Composition Analysis**: Composition analysis library
- **Permissions**: `runtime:query` (scene query permission)
- **Context**: Requires scene context (`{"selection": {"type": "scene"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
