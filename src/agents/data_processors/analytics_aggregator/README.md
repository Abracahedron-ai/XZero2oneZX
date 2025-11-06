# Analytics Aggregator

Aggregates quality metrics, success rates, and anomaly reports.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Aggregates quality metrics, success rates, and anomaly reports.

## Input/Output Format

### Input
- **time_range** (dict): Time range for aggregation
  ```json
  {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-02T00:00:00Z"
  }
  ```
- **metrics** (list, optional): Metrics to aggregate (if empty, aggregates all)
- **agent_ids** (list, optional): Agent IDs to filter by (if empty, includes all)
- **aggregation_type** (str, optional): Aggregation type ("daily", "hourly", "custom")

### Output
```json
{
  "success": true,
  "aggregation_id": "agg_123",
  "metrics": {
    "total_tasks": 1000,
    "successful_tasks": 950,
    "failed_tasks": 50,
    "success_rate": 0.95,
    "avg_execution_time_ms": 1234,
    "quality_score": 0.87
  },
  "anomalies": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "type": "high_failure_rate",
      "severity": "warning",
      "details": "Failure rate increased to 15%"
    }
  ],
  "metadata": {
    "time_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-02T00:00:00Z"
    },
    "agents_analyzed": 25,
    "aggregation_time_ms": 234
  }
}
```

## Example Usage

### Command Line
```bash
python analytics_aggregator.py --start="2024-01-01T00:00:00Z" --end="2024-01-02T00:00:00Z" --aggregation-type="daily"
```

### Python API
```python
from ai_agents.data_processors.analytics_aggregator.analytics_aggregator import aggregate_analytics

result = aggregate_analytics(
    time_range={
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-02T00:00:00Z"
    },
    aggregation_type="daily",
    agent_ids=["agent_123", "agent_456"]
)
```

### Via Agent Executor
```json
{
  "tool": "analytics_aggregator",
  "params": {
    "time_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-02T00:00:00Z"
    },
    "aggregation_type": "daily"
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **Database**: PostgreSQL with access to telemetry tables
- **Analytics Library**: Pandas or similar for data aggregation
- **Time Series**: Time series analysis library (optional)
- **Permissions**: `db:read` (database read permission)
- **Context**: No specific context required

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
