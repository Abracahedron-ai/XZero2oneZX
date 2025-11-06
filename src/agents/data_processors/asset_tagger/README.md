# Asset Tagger

Writes metadata back to Postgres, including embeddings and ownership.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Writes metadata back to Postgres, including embeddings and ownership.

## Input/Output Format

### Input
- **asset_id** (str): ID of the asset to tag
- **asset_path** (str): Path to the asset file
- **metadata** (dict): Metadata to write
  ```json
  {
    "name": "asset_name",
    "type": "mesh",
    "tags": ["character", "humanoid"],
    "owner": "user_123",
    "created_at": "2024-01-01T12:00:00Z"
  }
  ```
- **generate_embeddings** (bool, optional): Generate embeddings for the asset (default: true)
- **embedding_model** (str, optional): Embedding model to use ("clip", "custom")

### Output
```json
{
  "success": true,
  "asset_id": "asset_123",
  "metadata_written": true,
  "embedding_generated": true,
  "embedding_id": "emb_123",
  "metadata": {
    "tags_count": 5,
    "embedding_dimension": 512,
    "write_time_ms": 45
  }
}
```

## Example Usage

### Command Line
```bash
python asset_tagger.py "asset_123" --path="asset.fbx" --metadata="metadata.json" --generate-embeddings
```

### Python API
```python
from ai_agents.data_processors.asset_tagger.asset_tagger import tag_asset

result = tag_asset(
    asset_id="asset_123",
    asset_path="asset.fbx",
    metadata={
        "name": "character_mesh",
        "type": "mesh",
        "tags": ["character", "humanoid"],
        "owner": "user_123"
    },
    generate_embeddings=True
)
```

### Via Agent Executor
```json
{
  "tool": "asset_tagger",
  "params": {
    "asset_id": "asset_123",
    "asset_path": "asset.fbx",
    "metadata": {
      "name": "character_mesh",
      "type": "mesh",
      "tags": ["character", "humanoid"]
    },
    "generate_embeddings": true
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Database**: PostgreSQL with access to asset tables
- **ML Framework**: PyTorch or TensorFlow for embeddings (optional)
- **Embedding Models**: CLIP or similar embedding models
- **Vector Database**: pgvector extension for PostgreSQL
- **Permissions**: `db:write` (database write permission)
- **Context**: Optional asset selection (`{"selection": {"type": "asset"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
