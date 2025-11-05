import asyncio
import subprocess
import json
import uuid
from typing import Dict, Optional, List
from datetime import datetime
from pathlib import Path
from services.tool_registry import registry, Tool


class AgentExecutor:
    """Execute tools in a sandboxed environment with permission checks"""

    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}
        self.fs_allowlist = [
            "D:/Zero2oneZ/output",
            "D:/Zero2oneZ/temp",
        ]
        self.gpu_budget_tokens = 1000  # Max GPU compute tokens

    async def execute(
        self,
        tool: Tool,
        intent: str,
        context: Dict,
        params: Dict = None,
        user_approved: bool = False,
    ) -> Dict:
        """
        Execute a tool with sandboxing and permission checks.
        
        Returns:
        {
            "session_id": "uuid",
            "success": true,
            "output": {...},
            "mutations": [...],
            "execution_time_ms": 1234
        }
        """
        session_id = str(uuid.uuid4())
        start_time = datetime.now()

        # Create session
        self.active_sessions[session_id] = {
            "tool": tool,
            "intent": intent,
            "context": context,
            "mutations": [],
            "start_time": start_time,
        }

        try:
            # 1. Check permissions
            if not user_approved:
                permission_check = await self._check_permissions(tool)
                if not permission_check["allowed"]:
                    return {
                        "session_id": session_id,
                        "success": False,
                        "error": f"Permission denied: {permission_check['reason']}",
                        "requires_approval": True,
                        "intent_card": self._generate_intent_card(tool, intent, context),
                    }

            # 2. Execute based on command type
            command_schema = tool.command_schema
            command_type = command_schema.get("type")

            if command_type == "script":
                result = await self._execute_script(session_id, command_schema, params or {})
            elif command_type == "mcp":
                result = await self._execute_mcp(session_id, command_schema, params or {})
            elif command_type == "r3f":
                result = await self._execute_r3f(session_id, command_schema, params or {})
            elif command_type == "blender":
                result = await self._execute_blender(session_id, command_schema, params or {})
            else:
                raise ValueError(f"Unknown command type: {command_type}")

            # 3. Track execution time
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)

            # 4. Log telemetry
            await registry.log_telemetry(
                tool_id=tool.id,
                context=context,
                intent=intent,
                execution_time_ms=execution_time,
                success=result["success"],
                error_message=result.get("error"),
                output=result.get("output"),
            )

            # 5. Increment usage
            if result["success"]:
                await registry.increment_usage(tool.id)

            return {
                "session_id": session_id,
                "success": result["success"],
                "output": result.get("output"),
                "mutations": self.active_sessions[session_id]["mutations"],
                "execution_time_ms": execution_time,
                "error": result.get("error"),
            }

        except Exception as e:
            print(f"[Executor] Error executing tool {tool.name}: {e}")
            return {
                "session_id": session_id,
                "success": False,
                "error": str(e),
            }

    async def _check_permissions(self, tool: Tool) -> Dict:
        """Check if tool has required permissions"""
        required = tool.required_perms or []

        for perm in required:
            if perm.startswith("fs:"):
                # Check file system permissions
                action = perm.split(":")[1]
                if action not in ["read", "write"]:
                    return {"allowed": False, "reason": f"Invalid FS permission: {action}"}

            elif perm.startswith("gpu:"):
                # Check GPU budget
                if self.gpu_budget_tokens < 100:
                    return {"allowed": False, "reason": "Insufficient GPU budget"}

            elif perm == "network":
                # Network access check
                pass  # TODO: Implement network sandboxing

        return {"allowed": True}

    def _generate_intent_card(self, tool: Tool, intent: str, context: Dict) -> Dict:
        """Generate an intent card for user approval"""
        return {
            "tool_name": tool.name,
            "description": tool.description,
            "intent": intent,
            "context": context,
            "required_perms": tool.required_perms,
            "estimated_duration": "< 1 minute",
            "risk_level": "medium" if "fs:write" in tool.required_perms else "low",
        }

    async def _execute_script(self, session_id: str, schema: Dict, params: Dict) -> Dict:
        """Execute a Python script"""
        script_path = schema.get("path")
        args = schema.get("args", [])

        # Build command
        cmd = ["python", script_path] + [str(v) for v in params.values()]

        # Execute in subprocess
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd="D:/Zero2oneZ",
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                return {
                    "success": True,
                    "output": {"stdout": stdout.decode(), "stderr": stderr.decode()},
                }
            else:
                return {
                    "success": False,
                    "error": stderr.decode(),
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _execute_mcp(self, session_id: str, schema: Dict, params: Dict) -> Dict:
        """Execute an MCP tool via HTTP"""
        import aiohttp

        endpoint = schema.get("endpoint")
        method = schema.get("method", "POST")
        path = schema.get("path", "/execute")

        url = f"{endpoint}{path}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(method, url, json=params) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        return {"success": True, "output": result}
                    else:
                        return {"success": False, "error": f"HTTP {resp.status}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _execute_r3f(self, session_id: str, schema: Dict, params: Dict) -> Dict:
        """Execute a React-Three-Fiber component injection"""
        component = schema.get("component")
        
        # Generate R3F component code
        output = {
            "type": "r3f_component",
            "component": component,
            "props": params,
        }

        # Track mutation
        self.active_sessions[session_id]["mutations"].append({
            "type": "scene_add",
            "target": component,
            "data": params,
        })

        return {"success": True, "output": output}

    async def _execute_blender(self, session_id: str, schema: Dict, params: Dict) -> Dict:
        """Execute a Blender operation (via bpy or API)"""
        op = schema.get("op")
        
        # TODO: Implement Blender API integration
        output = {
            "type": "blender_op",
            "operation": op,
            "params": params,
        }

        return {"success": True, "output": output}

    async def undo_session(self, session_id: str) -> Dict:
        """Undo all mutations from a session"""
        if session_id not in self.active_sessions:
            return {"success": False, "error": "Session not found"}

        session = self.active_sessions[session_id]
        mutations = session["mutations"]

        # Reverse mutations
        for mutation in reversed(mutations):
            await self._reverse_mutation(mutation)

        return {
            "success": True,
            "undone_mutations": len(mutations),
        }

    async def _reverse_mutation(self, mutation: Dict):
        """Reverse a single mutation"""
        mutation_type = mutation["type"]

        if mutation_type == "file_create":
            # Delete created file
            Path(mutation["target"]).unlink(missing_ok=True)

        elif mutation_type == "file_edit":
            # Restore previous content
            with open(mutation["target"], "w") as f:
                f.write(mutation["before_state"])

        elif mutation_type == "scene_add":
            # Remove added object
            print(f"[Executor] Reverting scene_add: {mutation['target']}")

        print(f"[Executor] Reversed mutation: {mutation_type}")


# Singleton instance
executor = AgentExecutor()
