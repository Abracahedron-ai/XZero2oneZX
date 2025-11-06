# Data Processors

Transform captured telemetry into tagged, queryable datasets.

## Modules

- **Analytics Aggregator** — Aggregates quality metrics, success rates, and anomaly reports.
- **Asset Tagger** — Writes metadata back to Postgres, including embeddings and ownership.
- **Scene Indexer** — Generates searchable snapshots of scene states and timelines.

## Integration Notes

- Designed for floating window layout; dockable and composable with other tool panes.
- Communicates through the shared Redux store and realtime event bus for scene updates.
- Exposes manifest metadata so runtime agents can reference the tool capabilities dynamically.
