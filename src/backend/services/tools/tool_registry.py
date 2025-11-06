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
        """Initialize database connection pool (optional - falls back to in-memory if unavailable)"""
        try:
            self.pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
            print("[ToolRegistry] Connected to Postgres")
        except Exception as e:
            # Catch all exceptions (InvalidCatalogNameError, connection errors, etc.)
            print(f"[ToolRegistry] Warning: Could not connect to Postgres: {type(e).__name__}: {e}")
            print("[ToolRegistry] Running in in-memory mode (tools will not persist)")
            self.pool = None

    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()

    async def register_tool(self, tool: Tool) -> str:
        """Register a new tool in the registry"""
        import uuid
        
        if self.pool:
            # Use database
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
                tool.id = str(tool_id)
        else:
            # In-memory mode
            tool.id = str(uuid.uuid4())
        
        # Update cache
        self.cache[tool.id] = tool
        
        print(f"[ToolRegistry] Registered tool: {tool.name} ({tool.id})")
        return tool.id

    async def get_tool(self, tool_id: str) -> Optional[Tool]:
        """Get tool by ID (cache-first)"""
        # Check cache
        if tool_id in self.cache:
            return self.cache[tool_id]

        # Query database if available
        if self.pool:
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
        if self.pool:
            # Use database
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
        else:
            # In-memory mode - search cache
            results = []
            for tool in self.cache.values():
                if tool.status != 'active':
                    continue
                
                # Match tags
                if tags:
                    if not any(tag in tool.tags for tag in tags):
                        continue
                
                # Match context
                if context:
                    matches = True
                    for key, value in context.items():
                        if key not in tool.context_predicates:
                            matches = False
                            break
                        if tool.context_predicates[key] != value:
                            matches = False
                            break
                    if not matches:
                        continue
                
                # Match query (simple text search)
                if query:
                    query_lower = query.lower()
                    if query_lower not in tool.name.lower() and query_lower not in (tool.description or "").lower():
                        continue
                
                results.append(tool)
            
            # Sort by usage_count and last_used
            results.sort(key=lambda t: (t.usage_count, t.last_used or datetime.min), reverse=True)
            return results[:limit]

    async def increment_usage(self, tool_id: str):
        """Increment usage count and update last_used"""
        # Update cache
        if tool_id in self.cache:
            self.cache[tool_id].usage_count += 1
            self.cache[tool_id].last_used = datetime.now()
        
        # Update database if available
        if self.pool:
            query = """
                UPDATE tool_registry 
                SET usage_count = usage_count + 1, 
                    last_used = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            """
            async with self.pool.acquire() as conn:
                await conn.execute(query, tool_id)

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
        # Only log to database if available (telemetry is optional)
        if self.pool:
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
        if self.pool:
            # Use database
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
        else:
            # In-memory mode
            tools = [t for t in self.cache.values() if t.status == 'active' and t.last_used]
            tools.sort(key=lambda t: t.last_used or datetime.min, reverse=True)
            return tools[:limit]

    async def cleanup_expired(self):
        """Remove expired tools (past TTL)"""
        if self.pool:
            # Use database
            query = """
                DELETE FROM tool_registry
                WHERE status = 'active' 
                AND source = 'generated'
                AND created_at + (ttl * interval '1 second') < NOW()
            """
            async with self.pool.acquire() as conn:
                deleted = await conn.execute(query)
                print(f"[ToolRegistry] Cleaned up expired tools: {deleted}")
        else:
            # In-memory mode - cleanup cache
            now = datetime.now()
            expired = []
            for tool_id, tool in list(self.cache.items()):
                if tool.source == 'generated' and tool.ttl:
                    # Simple TTL check (would need created_at tracking for full implementation)
                    expired.append(tool_id)
            for tool_id in expired:
                del self.cache[tool_id]
            if expired:
                print(f"[ToolRegistry] Cleaned up {len(expired)} expired tools from cache")


# Singleton instance
registry = ToolRegistry()
