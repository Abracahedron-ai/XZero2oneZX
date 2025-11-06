# Format Validator

Ensures assets meet schema expectations before entering the shelf.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Ensures assets meet schema expectations before entering the shelf.

## Input/Output Format

### Input
- **asset_path** (str): Path to the asset file to validate
- **asset_type** (str, optional): Asset type ("mesh", "texture", "audio", "animation")
- **schema_path** (str, optional): Path to schema file (if not provided, uses default schema)
- **validation_rules** (dict, optional): Custom validation rules
  ```json
  {
    "max_file_size_mb": 100,
    "required_fields": ["name", "type"],
    "format_versions": ["1.0", "2.0"]
  }
  ```

### Output
```json
{
  "success": true,
  "validation_id": "val_123",
  "asset_path": "/path/to/asset.fbx",
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "type": "deprecated_format",
      "message": "Using deprecated format version 1.0",
      "severity": "warning"
    }
  ],
  "metadata": {
    "validation_time_ms": 123,
    "schema_version": "2.0",
    "rules_checked": 10,
    "rules_passed": 9,
    "rules_failed": 0
  }
}
```

## Example Usage

### Command Line
```bash
python format_validator.py "asset.fbx" --asset-type="mesh" --schema="schema.json"
```

### Python API
```python
from ai_agents.utilities.format_validator.format_validator import validate_format

result = validate_format(
    asset_path="asset.fbx",
    asset_type="mesh",
    validation_rules={
        "max_file_size_mb": 100,
        "required_fields": ["name", "type"]
    }
)
```

### Via Agent Executor
```json
{
  "tool": "format_validator",
  "params": {
    "asset_path": "asset.fbx",
    "asset_type": "mesh",
    "validation_rules": {
      "max_file_size_mb": 100
    }
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Schema Validation**: JSON Schema or similar validation library
- **File Format Parsers**: Format-specific parsers for validation
- **File Analysis**: File metadata extraction libraries
- **Permissions**: `fs:read` (file system read access)
- **Context**: Requires file selection (`{"selection": {"type": "file"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
