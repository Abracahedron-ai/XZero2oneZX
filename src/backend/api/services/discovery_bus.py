import asyncio
import json
import aiohttp
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent
from typing import Dict, List, Optional
from pathlib import Path
from src.backend.services.tools.tool_registry import registry, Tool
from src.backend.api.models.contracts import ToolManifest

MCP_DISCOVERY_URLS = [
    "http://localhost:3001/mcp/manifest",  # Local MCP server
    "http://localhost:3002/mcp/manifest",
]

WATCH_PATHS = [
    "D:/Zero2oneZ/agents",      # Generated agent scripts
    "D:/Zero2oneZ/tools",       # User tools
]


class ToolFileHandler(FileSystemEventHandler):
    """Watch for new/modified tool files and hot-register them"""

    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith((".py", ".json")):
            return

        print(f"[Discovery] File modified: {event.src_path}")
        asyncio.create_task(self.register_from_file(event.src_path))

    async def register_from_file(self, filepath: str):
        """Parse tool manifest from file and register"""
        try:
            path = Path(filepath)
            
            # Look for manifest.json or parse Python docstring
            if path.suffix == ".json":
                with open(filepath, "r") as f:
                    manifest = json.load(f)
            else:
                # Parse Python file for manifest comment
                with open(filepath, "r") as f:
                    content = f.read()
                    if "# TOOL_MANIFEST:" in content:
                        manifest_line = [
                            line for line in content.split("\n") 
                            if "# TOOL_MANIFEST:" in line
                        ][0]
                        manifest = json.loads(manifest_line.split(":", 1)[1].strip())
                    else:
                        print(f"[Discovery] No manifest found in {filepath}")
                        return

            manifest_model = ToolManifest.model_validate(manifest)

            command_schema = manifest_model.command_schema or {
                "type": "script",
                "path": str(path.absolute()),
                "args": manifest.get("args", []),
            }

            tool = Tool(
                name=manifest_model.name,
                description=manifest_model.description or "",
                tags=manifest_model.tags,
                context_predicates=manifest.get("context_predicates", {}),
                icon=manifest.get("icon", "tool"),
                required_perms=manifest.get("required_perms", []),
                command_schema=command_schema,
                capabilities=manifest_model.capabilities.model_dump(exclude_none=True),
                source="file",
            )

            tool_id = await registry.register_tool(tool)
            print(f"[Discovery] Registered tool from file: {tool.name} ({tool_id})")

        except Exception as e:
            print(f"[Discovery] Error registering from file: {e}")


class DiscoveryBus:
    """Watch MCP endpoints and file system for new tools"""

    def __init__(self):
        self.observer = Observer()
        self.session: Optional[aiohttp.ClientSession] = None
        self.running = False

    async def start(self):
        """Start discovery bus"""
        self.running = True
        self.session = aiohttp.ClientSession()

        # Start file watcher
        handler = ToolFileHandler()
        for watch_path in WATCH_PATHS:
            Path(watch_path).mkdir(parents=True, exist_ok=True)
            self.observer.schedule(handler, watch_path, recursive=True)
        
        self.observer.start()
        print(f"[Discovery] Watching paths: {WATCH_PATHS}")

        # Start MCP polling
        asyncio.create_task(self.poll_mcp_endpoints())

        print("[Discovery] Discovery Bus started")

    async def stop(self):
        """Stop discovery bus"""
        self.running = False
        self.observer.stop()
        self.observer.join()
        if self.session:
            await self.session.close()
        print("[Discovery] Discovery Bus stopped")

    async def poll_mcp_endpoints(self):
        """Poll MCP endpoints for new tools"""
        while self.running:
            for url in MCP_DISCOVERY_URLS:
                try:
                    async with self.session.get(url, timeout=5) as resp:
                        if resp.status == 200:
                            manifest = await resp.json()
                            await self.process_mcp_manifest(url, manifest)
                except Exception as e:
                    print(f"[Discovery] Failed to reach {url}: {e}")

            await asyncio.sleep(30)  # Poll every 30 seconds

    async def process_mcp_manifest(self, url: str, manifest: Dict):
        """Process MCP manifest and register tools"""
        tools = manifest.get("tools", [])
        
        for tool_def in tools:
            # Check if tool already exists
            existing = await registry.search_tools(
                tags=[tool_def.get("id")],
                limit=1
            )
            
            if existing:
                continue  # Already registered

            capabilities = tool_def.get("capabilities", {})

            tool = Tool(
                name=tool_def["name"],
                description=tool_def.get("description", ""),
                tags=[tool_def.get("id"), "mcp"] + tool_def.get("tags", []),
                context_predicates=tool_def.get("context_predicates", {}),
                icon=tool_def.get("icon", "mcp"),
                required_perms=tool_def.get("required_perms", []),
                command_schema={
                    "type": "mcp",
                    "endpoint": url,
                    "method": tool_def.get("method", "POST"),
                    "path": tool_def.get("path", "/execute"),
                },
                capabilities=capabilities,
                source="mcp",
            )

            tool_id = await registry.register_tool(tool)
            print(f"[Discovery] Registered MCP tool: {tool.name} from {url}")

    async def trigger_discovery(self):
        """Manually trigger discovery scan"""
        print("[Discovery] Manual discovery triggered")
        for url in MCP_DISCOVERY_URLS:
            try:
                async with self.session.get(url, timeout=5) as resp:
                    if resp.status == 200:
                        manifest = await resp.json()
                        await self.process_mcp_manifest(url, manifest)
            except Exception as e:
                print(f"[Discovery] Error during manual discovery: {e}")


# Singleton instance
discovery = DiscoveryBus()
