# Asset Compressor

Optimizes textures, meshes, and audio for streaming pipelines.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Optimizes textures, meshes, and audio for streaming pipelines.

## Input/Output Format

### Input
- **asset_id** (str): ID of the asset to compress
- **asset_path** (str): Path to the asset file
- **asset_type** (str): Type of asset ("texture", "mesh", "audio")
- **compression_level** (str, optional): Compression level ("low", "medium", "high")
- **target_size_mb** (float, optional): Target file size in MB
- **format** (str, optional): Output format (e.g., "ktx2", "draco", "opus")

### Output
```json
{
  "success": true,
  "compression_id": "comp_123",
  "asset_id": "asset_123",
  "original_size_mb": 10.5,
  "compressed_size_mb": 2.1,
  "compression_ratio": 0.2,
  "output_path": "/path/to/compressed_asset.ktx2",
  "metadata": {
    "compression_time_ms": 1234,
    "format": "ktx2",
    "quality_loss": 0.05
  }
}
```

## Example Usage

### Command Line
```bash
python asset_compressor.py "asset_123" --path="texture.png" --asset-type="texture" --compression-level="high" --format="ktx2"
```

### Python API
```python
from ai_agents.utilities.asset_compressor.asset_compressor import compress_asset

result = compress_asset(
    asset_id="asset_123",
    asset_path="texture.png",
    asset_type="texture",
    compression_level="high",
    format="ktx2",
    target_size_mb=2.0
)
```

### Via Agent Executor
```json
{
  "tool": "asset_compressor",
  "params": {
    "asset_id": "asset_123",
    "asset_path": "texture.png",
    "asset_type": "texture",
    "compression_level": "high",
    "format": "ktx2"
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Compression Libraries**: 
  - Textures: KTX2/Basis, ASTC encoders
  - Meshes: Draco, gltf-transform
  - Audio: Opus, Vorbis encoders
- **File Format Libraries**: Format-specific libraries
- **Permissions**: `fs:write` (file system write access)
- **Context**: Requires asset selection (`{"selection": {"type": "asset"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
