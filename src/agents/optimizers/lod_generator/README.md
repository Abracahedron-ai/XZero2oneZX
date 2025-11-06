# Lod Generator

Builds level-of-detail stacks and imposters from source assets.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Builds level-of-detail stacks and imposters from source assets.

## Input/Output Format

### Input
- **asset_id** (str): ID of the source asset
- **asset_path** (str): Path to the source asset file
- **lod_levels** (list, optional): LOD levels to generate (e.g., [1, 2, 3, 4])
- **polygon_targets** (list, optional): Target polygon counts for each LOD level
- **generate_imposters** (bool, optional): Generate imposters for distant views (default: true)

### Output
```json
{
  "success": true,
  "lod_id": "lod_123",
  "source_asset_id": "asset_123",
  "lod_levels": [
    {
      "level": 0,
      "polygon_count": 5000,
      "file_path": "/path/to/lod0.fbx"
    },
    {
      "level": 1,
      "polygon_count": 2500,
      "file_path": "/path/to/lod1.fbx"
    }
  ],
  "imposters": [
    {
      "type": "billboard",
      "file_path": "/path/to/imposter.png"
    }
  ],
  "metadata": {
    "lod_levels_generated": 4,
    "total_files_generated": 5,
    "generation_time_ms": 2345
  }
}
```

## Example Usage

### Command Line
```bash
python lod_generator.py "asset_123" --asset-path="model.fbx" --lod-levels="0,1,2,3" --generate-imposters
```

### Python API
```python
from ai_agents.optimizers.lod_generator.lod_generator import generate_lod

result = generate_lod(
    asset_id="asset_123",
    asset_path="model.fbx",
    lod_levels=[0, 1, 2, 3],
    polygon_targets=[5000, 2500, 1000, 500],
    generate_imposters=True
)
```

### Via Agent Executor
```json
{
  "tool": "lod_generator",
  "params": {
    "asset_id": "asset_123",
    "asset_path": "model.fbx",
    "lod_levels": [0, 1, 2, 3],
    "generate_imposters": true
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **3D Libraries**: Blender Python API or similar for mesh processing
- **Mesh Simplification**: Mesh decimation algorithms
- **Imposter Generation**: Billboard/texture generation
- **Permissions**: `fs:write` (file system write access)
- **Context**: Requires asset selection (`{"selection": {"type": "asset"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
