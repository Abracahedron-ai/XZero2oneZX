# Goal Planner

Assigns objectives, schedules, and dependencies to runtime actors.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Assigns objectives, schedules, and dependencies to runtime actors.

## Input/Output Format

### Input
- **actor_id** (str): ID of the actor to assign goals to
- **goals** (list): List of goal objects
  ```json
  [
    {
      "id": "goal_123",
      "type": "move_to",
      "target": {"x": 10, "y": 0, "z": 5},
      "priority": 1,
      "deadline": "2024-01-01T12:00:00Z",
      "dependencies": ["goal_122"]
    }
  ]
  ```
- **schedule_mode** (str, optional): Scheduling mode ("fifo", "priority", "deadline")

### Output
```json
{
  "success": true,
  "actor_id": "actor_123",
  "goals_assigned": 3,
  "schedule": [
    {
      "goal_id": "goal_123",
      "start_time": "2024-01-01T10:00:00Z",
      "estimated_duration": 300,
      "status": "scheduled"
    }
  ],
  "metadata": {
    "total_goals": 3,
    "scheduled": 3,
    "blocked": 0
  }
}
```

## Example Usage

### Command Line
```bash
python goal_planner.py "actor_123" --goals="goals.json" --schedule-mode="priority"
```

### Python API
```python
from ai_agents.behavior_controllers.goal_planner.goal_planner import assign_goals

result = assign_goals(
    actor_id="actor_123",
    goals=[
        {
            "id": "goal_123",
            "type": "move_to",
            "target": {"x": 10, "y": 0, "z": 5},
            "priority": 1
        }
    ],
    schedule_mode="priority"
)
```

### Via Agent Executor
```json
{
  "tool": "goal_planner",
  "params": {
    "actor_id": "actor_123",
    "goals": [
      {
        "id": "goal_123",
        "type": "move_to",
        "target": {"x": 10, "y": 0, "z": 5},
        "priority": 1
      }
    ]
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Scheduling Library**: Task scheduling algorithms
- **Dependency Resolution**: Dependency graph library
- **Permissions**: `runtime:control` (actor control permission)
- **Context**: Requires actor selection (`{"selection": {"type": "actor"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
