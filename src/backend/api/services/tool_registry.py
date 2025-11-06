import asyncpg
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import numpy as np

DATABASE_URL = "postgresql://postgres:password@localhost:5432/zero2onez"

class Tool(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    context_predicates: Dict = {}
    icon: str = "tool"
    required_perms: List[str] = []
    command_schema: Dict
    capabilities: Dict = {}
    embedding: Optional[List[float]] = None
    ttl: int = 86400
    usage_count: int = 0
    last_used: Optional[datetime] = None
    source: str = "manual"
    status: str = "active"


class ToolRegistry:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.cache: Dict[str, Tool] = {}  # In-memory LRU cache
        self.cache_size = 100

    async def connect(self):
        """Initialize database connection pool"""
        self.pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
        print("[ToolRegistry] Connected to Postgres")

    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()

    async def register_tool(self, tool: Tool) -> str:
        """Register a new tool in the registry"""
        query = """
            INSERT INTO tool_registry (
                name, description, tags, context_predicates, icon, 
                required_perms, command_schema, embedding, ttl, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        """
        async with self.pool.acquire() as conn:
            command_schema = dict(tool.command_schema or {})
            if tool.capabilities:
                command_schema["capabilities"] = tool.capabilities
            tool_id = await conn.fetchval(
                query,
                tool.name,
                tool.description,
                tool.tags,
                json.dumps(tool.context_predicates),
                tool.icon,
                tool.required_perms,
                json.dumps(command_schema),
                tool.embedding,
                tool.ttl,
                tool.source,
            )
            
            # Update cache
            tool.id = str(tool_id)
            self.cache[tool.id] = tool
            
            print(f"[ToolRegistry] Registered tool: {tool.name} ({tool_id})")
            return str(tool_id)

    async def get_tool(self, tool_id: str) -> Optional[Tool]:
        """Get tool by ID (cache-first)"""
        # Check cache
        if tool_id in self.cache:
            return self.cache[tool_id]

        # Query database
        query = "SELECT * FROM tool_registry WHERE id = $1 AND status = 'active'"
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, tool_id)
            if row:
                tool = Tool(
                    id=str(row["id"]),
                    name=row["name"],
                    description=row["description"],
                    tags=row["tags"],
                    context_predicates=row["context_predicates"],
                    icon=row["icon"],
                    required_perms=row["required_perms"],
                    command_schema=row["command_schema"],
                    capabilities=(row["command_schema"] or {}).get("capabilities", {}),
                    embedding=row["embedding"],
                    ttl=row["ttl"],
                    usage_count=row["usage_count"],
                    last_used=row["last_used"],
                    source=row["source"],
                    status=row["status"],
                )
                self.cache[tool_id] = tool
                return tool
        return None

    async def search_tools(
        self, 
        query: str = None,
        tags: List[str] = None,
        context: Dict = None,
        limit: int = 20
    ) -> List[Tool]:
        """Search tools by tags, context, or semantic similarity"""
        conditions = ["status = 'active'"]
        params = []
        param_count = 1

        if tags:
            conditions.append(f"tags && ${param_count}")
            params.append(tags)
            param_count += 1

        if context:
            # Match context predicates
            for key, value in context.items():
                conditions.append(f"context_predicates @> ${param_count}")
                params.append(json.dumps({key: value}))
                param_count += 1

        where_clause = " AND ".join(conditions)
        
        # TODO: Add semantic search via embeddings
        # if query:
        #     embedding = await get_embedding(query)
        #     conditions.append(f"embedding <-> ${param_count} < 0.5")
        #     params.append(embedding)

        sql = f"""
            SELECT * FROM tool_registry 
            WHERE {where_clause}
            ORDER BY usage_count DESC, last_used DESC NULLS LAST
            LIMIT {limit}
        """

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
            return [
                Tool(
                    id=str(row["id"]),
                    name=row["name"],
                    description=row["description"],
                    tags=row["tags"],
                    context_predicates=row["context_predicates"],
                    icon=row["icon"],
                    required_perms=row["required_perms"],
                    command_schema=row["command_schema"],
                    capabilities=(row["command_schema"] or {}).get("capabilities", {}),
                    ttl=row["ttl"],
                    usage_count=row["usage_count"],
                    last_used=row["last_used"],
                    source=row["source"],
                )
                for row in rows
            ]

    async def increment_usage(self, tool_id: str):
        """Increment usage count and update last_used"""
        query = """
            UPDATE tool_registry 
            SET usage_count = usage_count + 1, 
                last_used = NOW(),
                updated_at = NOW()
            WHERE id = $1
        """
        async with self.pool.acquire() as conn:
            await conn.execute(query, tool_id)
        
        # Update cache
        if tool_id in self.cache:
            self.cache[tool_id].usage_count += 1
            self.cache[tool_id].last_used = datetime.now()

    async def log_telemetry(
        self,
        tool_id: str,
        context: Dict,
        intent: str,
        execution_time_ms: int,
        success: bool,
        error_message: Optional[str] = None,
        output: Optional[Dict] = None,
    ):
        """Log tool execution telemetry"""
        query = """
            INSERT INTO tool_telemetry (
                tool_id, context, intent, execution_time_ms, 
                success, error_message, output
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                tool_id,
                json.dumps(context),
                intent,
                execution_time_ms,
                success,
                error_message,
                json.dumps(output) if output else None,
            )

    async def get_recent_tools(self, limit: int = 5) -> List[Tool]:
        """Get recently used tools"""
        query = """
            SELECT * FROM tool_registry
            WHERE status = 'active' AND last_used IS NOT NULL
            ORDER BY last_used DESC
            LIMIT $1
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, limit)
            return [
                Tool(
                    id=str(row["id"]),
                    name=row["name"],
                    description=row["description"],
                    tags=row["tags"],
                    context_predicates=row["context_predicates"],
                    icon=row["icon"],
                    command_schema=row["command_schema"],
                    usage_count=row["usage_count"],
                    last_used=row["last_used"],
                )
                for row in rows
            ]

    async def cleanup_expired(self):
        """Remove expired tools (past TTL)"""
        query = """
            DELETE FROM tool_registry
            WHERE status = 'active' 
            AND source = 'generated'
            AND created_at + (ttl * interval '1 second') < NOW()
        """
        async with self.pool.acquire() as conn:
            deleted = await conn.execute(query)
            print(f"[ToolRegistry] Cleaned up expired tools: {deleted}")


# Singleton instance
registry = ToolRegistry()
