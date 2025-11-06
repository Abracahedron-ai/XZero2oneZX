# Scene Indexer

Generates searchable snapshots of scene states and timelines.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Generates searchable snapshots of scene states and timelines.

## Input/Output Format

### Input
- **scene_id** (str): ID of the scene to index
- **index_type** (str, optional): Index type ("full", "incremental", "timeline")
- **snapshot_timestamp** (str, optional): Timestamp for snapshot (if not provided, uses current time)
- **include_assets** (bool, optional): Include asset metadata (default: true)
- **include_actors** (bool, optional): Include actor states (default: true)

### Output
```json
{
  "success": true,
  "index_id": "index_123",
  "scene_id": "scene_123",
  "snapshot": {
    "timestamp": "2024-01-01T12:00:00Z",
    "objects_count": 50,
    "actors_count": 10,
    "assets_count": 25
  },
  "searchable_data": {
    "keywords": ["character", "prop", "environment"],
    "objects": ["obj_123", "obj_456"],
    "actors": ["actor_123"],
    "assets": ["asset_123"]
  },
  "metadata": {
    "index_time_ms": 1234,
    "data_size_kb": 512,
    "searchable_fields": 10
  }
}
```

## Example Usage

### Command Line
```bash
python scene_indexer.py "scene_123" --index-type="full" --include-assets --include-actors
```

### Python API
```python
from ai_agents.data_processors.scene_indexer.scene_indexer import index_scene

result = index_scene(
    scene_id="scene_123",
    index_type="full",
    include_assets=True,
    include_actors=True
)
```

### Via Agent Executor
```json
{
  "tool": "scene_indexer",
  "params": {
    "scene_id": "scene_123",
    "index_type": "full",
    "include_assets": true,
    "include_actors": true
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Database**: PostgreSQL with access to scene tables
- **Search Engine**: Full-text search capabilities (PostgreSQL FTS or Elasticsearch)
- **Serialization**: JSON serialization for scene state
- **Permissions**: `db:write` (database write permission)
- **Context**: Requires scene context (`{"selection": {"type": "scene"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
