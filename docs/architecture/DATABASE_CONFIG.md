# Database Configuration

## Local PostgreSQL Database with pgvector

The project is configured to use a local PostgreSQL database named **ScatterBrain** with the **pgvector** extension enabled for vector similarity search.

### Connection Details

- **Database Name**: `ScatterBrain`
- **User**: `tomlee3d`
- **Password**: `$Pos$904pine`
- **Host**: `localhost`
- **Port**: `5432`

### Connection String

```
postgresql://tomlee3d:%24Pos%24904pine@localhost:5432/ScatterBrain
```

Note: The password is URL-encoded (`$` becomes `%24`).

### Environment Variable

Set the `DATABASE_URL` environment variable to override the default:

```bash
export DATABASE_URL=postgresql://tomlee3d:%24Pos%24904pine@localhost:5432/ScatterBrain
```

Or create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://tomlee3d:%24Pos%24904pine@localhost:5432/ScatterBrain
```

### Files Using Database Connection

- `services/object_persistence.py` - Syncs Redis data to Postgres
- `services/agent_factory.py` - Agent lifecycle management
- `scripts/migrate_agents.py` - Agent catalog migration

All these files now use the `DATABASE_URL` environment variable with a fallback to the ScatterBrain database.

### pgvector Extension

The database uses the **pgvector** extension for semantic search and embeddings. The schema includes:
- Vector embeddings column (1536 dimensions) for tool registry
- IVFFlat index for efficient similarity search
- Vector cosine similarity operations

Make sure pgvector is installed in your PostgreSQL database:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

