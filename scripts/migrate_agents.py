#!/usr/bin/env python3
"""
Agent Catalog Migration Script

Populates agent_catalog table from Ottomator ingestor.
"""

import asyncio
import asyncpg
import sys
import os
from pathlib import Path
import json

# Add services to path
sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
from ottomator_ingestor import OttomatorIngestor, AgentMetadata


# Use environment variable with fallback to local ScatterBrain database
DATABASE_URL = os.getenv(
    'DATABASE_URL', 
    'postgresql://tomlee3d:%24Pos%24904pine@localhost:5432/ScatterBrain'
)


async def migrate_agents():
    """Migrate agents from ingestor to database."""
    # Ingest agents
    agents_dir = Path("EXPERIMENTAL/ottomator-agents")
    ingestor = OttomatorIngestor(agents_dir)
    agents = ingestor.ingest_all()
    
    print(f"Found {len(agents)} agents")
    
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Insert agents into catalog
        for agent in agents:
            try:
                await conn.execute(
                    """
                    INSERT INTO agent_catalog (
                        agent_id, name, description, type,
                        inputs, outputs, tools, dependencies,
                        runtime, metadata, yaml_path, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (agent_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        type = EXCLUDED.type,
                        inputs = EXCLUDED.inputs,
                        outputs = EXCLUDED.outputs,
                        tools = EXCLUDED.tools,
                        dependencies = EXCLUDED.dependencies,
                        runtime = EXCLUDED.runtime,
                        metadata = EXCLUDED.metadata,
                        yaml_path = EXCLUDED.yaml_path,
                        updated_at = NOW()
                    """,
                    agent.id,
                    agent.name,
                    agent.description,
                    agent.type,
                    agent.inputs,
                    agent.outputs,
                    agent.tools,
                    agent.dependencies,
                    json.dumps(agent.runtime),
                    json.dumps(agent.metadata),
                    agent.metadata.get('yaml_path'),
                    'active'
                )
                print(f"✓ Migrated agent: {agent.name}")
            except Exception as e:
                print(f"✗ Error migrating agent {agent.name}: {e}")
    
    finally:
        await conn.close()
    
    print(f"\nMigration complete: {len(agents)} agents migrated")


if __name__ == "__main__":
    asyncio.run(migrate_agents())


