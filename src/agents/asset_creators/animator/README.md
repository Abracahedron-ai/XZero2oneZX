# Animator

Keyframe and motion capture blending to produce action beats and idles.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Keyframe and motion capture blending to produce action beats and idles.

## Input/Output Format

### Input
- **action_type** (str): Type of animation ("idle", "walk", "run", "jump", "custom")
- **character_rig** (str): Path to character rig JSON file
- **blend_mode** (str, optional): Blending mode ("linear", "cubic", "mocap")
- **duration** (float, optional): Animation duration in seconds
- **keyframes** (list, optional): Custom keyframe data
  ```json
  [
    {
      "time": 0.0,
      "bone": "root",
      "rotation": [0, 0, 0],
      "position": [0, 0, 0]
    }
  ]
  ```

### Output
```json
{
  "success": true,
  "animation_id": "anim_123",
  "animation_path": "/path/to/generated/animation.fbx",
  "metadata": {
    "duration": 5.0,
    "fps": 30,
    "keyframe_count": 150,
    "blend_mode": "linear",
    "bones_animated": 25
  }
}
```

## Example Usage

### Command Line
```bash
python animator.py "walk" --rig="character_rig.json" --duration=5.0 --blend-mode="mocap"
```

### Python API
```python
from ai_agents.asset_creators.animator.animator import generate_animation

result = generate_animation(
    action_type="walk",
    character_rig="character_rig.json",
    blend_mode="mocap",
    duration=5.0
)
```

### Via Agent Executor
```json
{
  "tool": "animator",
  "params": {
    "action_type": "walk",
    "character_rig": "character_rig.json",
    "blend_mode": "mocap",
    "duration": 5.0
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Animation Libraries**: Blender Python API or similar animation framework
- **Motion Capture Data**: MoCap dataset library (optional)
- **Keyframe Interpolation**: Animation interpolation algorithms
- **Permissions**: `fs:write` (file system write access)
- **Context**: Requires rig selection (`{"selection": {"type": "rig"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
