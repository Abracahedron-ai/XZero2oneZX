# Interaction Handler

Mediates character to character and character to prop interactions.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Mediates character to character and character to prop interactions.

## Input/Output Format

### Input
- **interaction_type** (str): Type of interaction ("character_character", "character_prop", "prop_prop")
- **participants** (list): List of participant IDs
  ```json
  [
    {
      "id": "character_123",
      "role": "initiator",
      "capabilities": ["grab", "talk", "move"]
    },
    {
      "id": "prop_456",
      "role": "target",
      "properties": {"grabbable": true, "weight": 5}
    }
  ]
  ```
- **interaction_data** (dict, optional): Additional interaction parameters
  - `duration`: Interaction duration in seconds
  - `force`: Force applied (for physics)
  - `animation`: Animation to play

### Output
```json
{
  "success": true,
  "interaction_id": "interaction_123",
  "participants": ["character_123", "prop_456"],
  "interaction_type": "character_prop",
  "result": {
    "status": "completed",
    "outcome": "grabbed",
    "duration": 2.5
  },
  "metadata": {
    "animations_triggered": ["grab_animation"],
    "physics_events": ["collision", "grab"]
  }
}
```

## Example Usage

### Command Line
```bash
python interaction_handler.py "character_prop" --participants="participants.json" --duration=2.5
```

### Python API
```python
from ai_agents.behavior_controllers.interaction_handler.interaction_handler import handle_interaction

result = handle_interaction(
    interaction_type="character_prop",
    participants=[
        {"id": "character_123", "role": "initiator"},
        {"id": "prop_456", "role": "target"}
    ],
    interaction_data={"duration": 2.5}
)
```

### Via Agent Executor
```json
{
  "tool": "interaction_handler",
  "params": {
    "interaction_type": "character_prop",
    "participants": [
      {"id": "character_123", "role": "initiator"},
      {"id": "prop_456", "role": "target"}
    ]
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Physics Engine**: Physics simulation library (optional)
- **Animation System**: Animation playback library
- **Permissions**: `runtime:control` (interaction control permission)
- **Context**: Requires multiple selections (`{"selection": {"type": ["character", "prop"]}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
