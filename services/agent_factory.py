"""
Agent Factory Service

Spawns agents from catalog with lifecycle management and resource allocation.
"""

import asyncio
import asyncpg
import json
import subprocess
import os
import sys
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime
import uuid
import logging

# Add utils to path
sys.path.insert(0, str(Path(__file__).parent.parent / "python" / "utils"))
from port_manager import find_available_port

# Add services to path
sys.path.insert(0, str(Path(__file__).parent))
from gpu_scheduler import get_scheduler, TaskType


DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/zero2onez"


class AgentFactory:
    """Factory for spawning and managing agent instances."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.pool: Optional[asyncpg.Pool] = None
        self.gpu_scheduler = get_scheduler()
        self.active_instances: Dict[str, Dict] = {}  # instance_id -> instance data
    
    async def connect(self):
        """Connect to database."""
        self.pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
        self.logger.info("Connected to database")
    
    async def disconnect(self):
        """Disconnect from database."""
        if self.pool:
            await self.pool.close()
    
    async def spawn_agent(
        self,
        agent_id: str,
        session_id: str,
        params: Dict[str, Any] = None
    ) -> str:
        """
        Spawn an agent instance.
        
        Args:
            agent_id: Agent catalog ID
            session_id: Session identifier
            params: Runtime parameters
        
        Returns:
            Instance ID
        """
        if params is None:
            params = {}
        
        # Get agent from catalog
        async with self.pool.acquire() as conn:
            agent = await conn.fetchrow(
                "SELECT * FROM agent_catalog WHERE agent_id = $1 AND status = 'active'",
                agent_id
            )
        
        if not agent:
            raise ValueError(f"Agent not found: {agent_id}")
        
        # Allocate resources
        port = find_available_port(start_port=8001)
        runtime = json.loads(agent['runtime']) if isinstance(agent['runtime'], str) else agent['runtime']
        
        gpu_id = None
        if runtime.get('gpu', False):
            # Submit to GPU scheduler
            task_id = self.gpu_scheduler.submit_task(
                task_id=f"agent_{agent_id}_{session_id}",
                task_type=TaskType.OTHER,
                estimated_duration=300.0,  # 5 minutes default
                vram_required=runtime.get('memory_mb', 1024),
                priority=5
            )
            # Find available GPU
            gpu_info = self.gpu_scheduler.get_next_task()
            if gpu_info:
                gpu_id, _ = gpu_info
        
        # Create instance record
        instance_id = str(uuid.uuid4())
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO agent_instances (
                    id, session_id, agent_id, status, params, port, gpu_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                instance_id,
                session_id,
                agent['id'],
                'pending',
                json.dumps(params),
                port,
                gpu_id
            )
        
        # Start agent process
        try:
            await self._start_agent_process(agent, instance_id, port, params)
            
            # Update status to running
            async with self.pool.acquire() as conn:
                await conn.execute(
                    "UPDATE agent_instances SET status = 'running', started_at = NOW() WHERE id = $1",
                    instance_id
                )
            
            self.active_instances[instance_id] = {
                "agent_id": agent_id,
                "session_id": session_id,
                "port": port,
                "gpu_id": gpu_id,
                "process": None  # Will be set by _start_agent_process
            }
            
            self.logger.info(f"Spawned agent {agent_id} as instance {instance_id} on port {port}")
            return instance_id
        
        except Exception as e:
            # Update status to error
            async with self.pool.acquire() as conn:
                await conn.execute(
                    "UPDATE agent_instances SET status = 'error', error_message = $1 WHERE id = $2",
                    str(e),
                    instance_id
                )
            raise
    
    async def _start_agent_process(
        self,
        agent: asyncpg.Record,
        instance_id: str,
        port: int,
        params: Dict[str, Any]
    ):
        """Start agent process."""
        agent_type = agent['type']
        agent_path = Path("EXPERIMENTAL/ottomator-agents") / agent['agent_id']
        
        if agent_type == 'python':
            # Start Python agent
            main_file = agent_path / "main.py"
            if not main_file.exists():
                main_file = agent_path / "app.py"
            if not main_file.exists():
                # Find first .py file
                py_files = list(agent_path.glob("*.py"))
                if py_files:
                    main_file = py_files[0]
                else:
                    raise ValueError(f"No Python file found for agent {agent['agent_id']}")
            
            # Start process
            env = os.environ.copy()
            env['PORT'] = str(port)
            env['INSTANCE_ID'] = instance_id
            env['PARAMS'] = json.dumps(params)
            
            process = subprocess.Popen(
                [sys.executable, str(main_file)],
                cwd=str(agent_path),
                env=env
            )
            
            self.active_instances[instance_id]['process'] = process
        
        elif agent_type == 'n8n':
            # TODO: Start n8n workflow
            self.logger.warning(f"n8n agent type not yet implemented: {agent['agent_id']}")
        
        elif agent_type == 'mcp':
            # TODO: Start MCP agent
            self.logger.warning(f"MCP agent type not yet implemented: {agent['agent_id']}")
    
    async def stop_agent(self, instance_id: str):
        """Stop an agent instance."""
        if instance_id not in self.active_instances:
            raise ValueError(f"Instance not found: {instance_id}")
        
        instance = self.active_instances[instance_id]
        
        # Stop process
        if instance['process']:
            instance['process'].terminate()
            try:
                instance['process'].wait(timeout=5)
            except subprocess.TimeoutExpired:
                instance['process'].kill()
        
        # Update database
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE agent_instances SET status = 'stopped', stopped_at = NOW() WHERE id = $1",
                instance_id
            )
        
        # Release GPU if allocated
        if instance['gpu_id'] is not None:
            # TODO: Release GPU task from scheduler
            pass
        
        del self.active_instances[instance_id]
        self.logger.info(f"Stopped agent instance {instance_id}")
    
    async def list_agents(self, session_id: Optional[str] = None) -> List[Dict]:
        """List agents from catalog."""
        async with self.pool.acquire() as conn:
            if session_id:
                rows = await conn.fetch(
                    "SELECT * FROM agent_catalog WHERE status = 'active' ORDER BY name"
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM agent_catalog WHERE status = 'active' ORDER BY name"
                )
        
        return [dict(row) for row in rows]
    
    async def list_instances(self, session_id: Optional[str] = None) -> List[Dict]:
        """List running agent instances."""
        async with self.pool.acquire() as conn:
            if session_id:
                rows = await conn.fetch(
                    "SELECT * FROM agent_instances WHERE session_id = $1 ORDER BY created_at DESC",
                    session_id
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM agent_instances ORDER BY created_at DESC"
                )
        
        return [dict(row) for row in rows]
    
    async def get_instance(self, instance_id: str) -> Optional[Dict]:
        """Get agent instance details."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM agent_instances WHERE id = $1",
                instance_id
            )
        
        return dict(row) if row else None


# Global factory instance
_factory_instance: Optional[AgentFactory] = None


async def get_factory() -> AgentFactory:
    """Get global agent factory instance."""
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = AgentFactory()
        await _factory_instance.connect()
    return _factory_instance


async def close_factory():
    """Close global agent factory instance."""
    global _factory_instance
    if _factory_instance:
        await _factory_instance.disconnect()
    _factory_instance = None


if __name__ == "__main__":
    # Test factory
    async def test():
        factory = await get_factory()
        agents = await factory.list_agents()
        print(f"Found {len(agents)} agents")
        for agent in agents[:5]:
            print(f"  - {agent['name']} ({agent['type']})")
        await close_factory()
    
    asyncio.run(test())

