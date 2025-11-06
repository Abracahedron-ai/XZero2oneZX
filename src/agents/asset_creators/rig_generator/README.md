# Rig Generator

Procedural and ML-driven IK rig generation from mesh topology.

## Implementation Status

✅ **Implemented** - Basic implementation with placeholder rig generation logic. Ready for ML integration.

## Responsibilities

Generate inverse kinematics rigs from mesh geometry with automatic bone placement and IK chain configuration.

## Input/Output Format

### Input
- **mesh_name** (str): Name or path to the mesh file
- **output_path** (str): Destination path for the generated rig JSON file

### Output
```json
{
  "success": true,
  "rig_path": "/path/to/output/rig.json",
  "bones": 4,
  "ik_chains": 2
}
```

### Rig Data Structure
```json
{
  "mesh": "mesh_name",
  "bones": [
    {
      "name": "bone_name",
      "parent": "parent_bone_name" | null,
      "head": [x, y, z],
      "tail": [x, y, z]
    }
  ],
  "ik_chains": [
    {
      "name": "chain_name",
      "bones": ["bone1", "bone2"],
      "target": "target_name"
    }
  ]
}
```

## Example Usage

### Command Line
```bash
python rig_generator.py "character_mesh.fbx" "output/character_rig.json"
```

### Python API
```python
from ai_agents.asset_creators.rig_generator.rig_generator import generate_rig

result = generate_rig(
    mesh_name="character_mesh.fbx",
    output_path="output/character_rig.json"
)
print(result)
```

### Via Agent Executor
```json
{
  "tool": "rig_generator",
  "params": {
    "mesh_name": "character_mesh.fbx",
    "output_path": "output/character_rig.json"
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Standard Library**: `sys`, `json`, `pathlib`
- **Future**: ML model for bone placement (TBD)
- **Permissions**: `fs:write` (file system write access)
- **Context**: Requires mesh selection (`{"selection": {"type": "mesh"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.

