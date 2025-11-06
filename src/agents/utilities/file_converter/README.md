# File Converter

Batch converts between source formats with checksum tracking.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Batch converts between source formats with checksum tracking.

## Input/Output Format

### Input
- **input_path** (str): Path to the input file
- **output_path** (str): Path to the output file
- **input_format** (str, optional): Input format (auto-detected if not provided)
- **output_format** (str): Output format (e.g., "fbx", "gltf", "obj")
- **options** (dict, optional): Conversion options
  ```json
  {
    "scale": 1.0,
    "flip_uvs": false,
    "preserve_normals": true
  }
  ```
- **verify_checksum** (bool, optional): Verify checksum after conversion (default: true)

### Output
```json
{
  "success": true,
  "conversion_id": "conv_123",
  "input_path": "/path/to/input.fbx",
  "output_path": "/path/to/output.gltf",
  "input_format": "fbx",
  "output_format": "gltf",
  "checksums": {
    "input": "abc123...",
    "output": "def456..."
  },
  "metadata": {
    "conversion_time_ms": 2345,
    "file_size_mb": 5.2,
    "options_used": {
      "scale": 1.0,
      "preserve_normals": true
    }
  }
}
```

## Example Usage

### Command Line
```bash
python file_converter.py --input="model.fbx" --output="model.gltf" --output-format="gltf" --verify-checksum
```

### Python API
```python
from ai_agents.utilities.file_converter.file_converter import convert_file

result = convert_file(
    input_path="model.fbx",
    output_path="model.gltf",
    output_format="gltf",
    options={
        "scale": 1.0,
        "preserve_normals": True
    },
    verify_checksum=True
)
```

### Via Agent Executor
```json
{
  "tool": "file_converter",
  "params": {
    "input_path": "model.fbx",
    "output_path": "model.gltf",
    "output_format": "gltf",
    "verify_checksum": true
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Format Libraries**: 
  - FBX: FBX SDK or similar
  - glTF: gltf-transform or similar
  - OBJ: Standard OBJ parser
- **Checksum Library**: hashlib or similar
- **File I/O**: Standard file I/O libraries
- **Permissions**: `fs:read`, `fs:write` (file system read/write access)
- **Context**: Requires file selection (`{"selection": {"type": "file"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
