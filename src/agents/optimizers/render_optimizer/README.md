# Render Optimizer

Schedules render jobs and adjusts sampling to hit frame budgets.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Schedules render jobs and adjusts sampling to hit frame budgets.

## Input/Output Format

### Input
- **scene_id** (str): ID of the scene to render
- **target_fps** (float, optional): Target frames per second (default: 60)
- **quality_target** (str, optional): Quality target ("low", "medium", "high", "ultra")
- **budget_ms** (float, optional): Maximum frame budget in milliseconds (default: 16.67 for 60fps)
- **optimization_mode** (str, optional): Optimization mode ("aggressive", "balanced", "conservative")

### Output
```json
{
  "success": true,
  "optimization_id": "opt_123",
  "scene_id": "scene_123",
  "recommendations": [
    {
      "type": "reduce_samples",
      "target": "lighting",
      "current_value": 64,
      "recommended_value": 32,
      "estimated_fps_gain": 5
    },
    {
      "type": "enable_lod",
      "target": "distant_objects",
      "current_value": false,
      "recommended_value": true,
      "estimated_fps_gain": 10
    }
  ],
  "metadata": {
    "current_fps": 45,
    "target_fps": 60,
    "estimated_fps_after": 60,
    "optimization_time_ms": 123
  }
}
```

## Example Usage

### Command Line
```bash
python render_optimizer.py "scene_123" --target-fps=60 --quality-target="high" --budget-ms=16.67
```

### Python API
```python
from ai_agents.optimizers.render_optimizer.render_optimizer import optimize_render

result = optimize_render(
    scene_id="scene_123",
    target_fps=60,
    quality_target="high",
    budget_ms=16.67,
    optimization_mode="balanced"
)
```

### Via Agent Executor
```json
{
  "tool": "render_optimizer",
  "params": {
    "scene_id": "scene_123",
    "target_fps": 60,
    "quality_target": "high",
    "budget_ms": 16.67
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Rendering Engine**: Render engine integration (e.g., Blender, Unity)
- **Performance Profiling**: Performance profiling tools
- **Sampling Algorithms**: Adaptive sampling algorithms
- **Permissions**: `runtime:query` (scene query permission)
- **Context**: Requires scene context (`{"selection": {"type": "scene"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
