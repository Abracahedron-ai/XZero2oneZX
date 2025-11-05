from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import asyncio
import json
from datetime import datetime

# Import services
from services.tool_registry import registry, Tool
from services.discovery_bus import discovery
from services.capability_resolver import resolver
from services.agent_executor import executor
from models.contracts import ExecuteCommand, MutationIngest

app = FastAPI(title="Zero2oneZ Runtime Agent Launcher")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections: List[WebSocket] = []


# === Pydantic Models ===

class ToolSearchRequest(BaseModel):
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    context: Optional[Dict] = None
    limit: int = 20


class UndoRequest(BaseModel):
    session_id: str


# === Startup/Shutdown ===

@app.on_event("startup")
async def startup():
    """Initialize services"""
    print("[API] Starting Zero2oneZ Runtime Agent Launcher...")
    
    # Connect to database
    await registry.connect()
    
    # Start discovery bus
    await discovery.start()
    
    # Start periodic cleanup task
    asyncio.create_task(periodic_cleanup())
    
    print("[API] Services started successfully")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup services"""
    print("[API] Shutting down...")
    await discovery.stop()
    await registry.disconnect()


# === Tool Registry Endpoints ===

@app.get("/")
async def root():
    return {
        "service": "Zero2oneZ Runtime Agent Launcher",
        "version": "1.0.0",
        "status": "running",
    }


@app.post("/tools/register", response_model=Dict)
async def register_tool(tool: Tool):
    """Register a new tool"""
    tool_id = await registry.register_tool(tool)
    return {"success": True, "tool_id": tool_id}


@app.get("/tools/{tool_id}", response_model=Tool)
async def get_tool(tool_id: str):
    """Get tool by ID"""
    tool = await registry.get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool


@app.post("/tools/search", response_model=List[Tool])
async def search_tools(request: ToolSearchRequest):
    """Search tools by query, tags, or context"""
    tools = await registry.search_tools(
        query=request.query,
        tags=request.tags,
        context=request.context,
        limit=request.limit,
    )
    return tools


@app.get("/tools/recent", response_model=List[Tool])
async def get_recent_tools(limit: int = 5):
    """Get recently used tools"""
    return await registry.get_recent_tools(limit=limit)


# === Capability Resolver Endpoints ===

@app.post("/resolve", response_model=List[Tool])
async def resolve_tools(context: Dict, query: Optional[str] = None):
    """Resolve tools for current context"""
    return await resolver.resolve(context, query)


@app.get("/category/{category}", response_model=List[Tool])
async def get_category_tools(category: str, context: Dict = None):
    """Get tools for a specific radial menu category"""
    return await resolver.get_by_category(category, context or {})


# === Agent Executor Endpoints ===

@app.post("/execute", response_model=Dict)
async def execute_tool(command: ExecuteCommand):
    """Execute a tool"""
    tool = await registry.get_tool(command.tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    operation_context = dict(command.context or {})
    operation_context.setdefault("selection", command.selection)

    result = await executor.execute(
        tool=tool,
        intent=command.intent or f"Execute {tool.name}",
        context=operation_context,
        params=command.payload.model_dump(by_alias=True, exclude_none=True),
        user_approved=command.user_approved,
    )

    # Broadcast execution to WebSocket clients
    await broadcast_event({
        "type": "tool_executed",
        "tool": tool.dict(),
        "result": result,
    })

    return result


@app.post("/undo", response_model=Dict)
async def undo_session(request: UndoRequest):
    """Undo all mutations from a session"""
    result = await executor.undo_session(request.session_id)
    return result


@app.post("/mutations/ingest", response_model=Dict)
async def ingest_mutation(payload: MutationIngest):
    """Receive mutation telemetry from renderer"""
    print(
        f"[Mutation] {payload.mutation.type} "
        f"selection={payload.context.selection_count} "
        f"space={payload.context.transform_space} "
        f"snap={payload.context.snap_mode} "
        f"duration_ms={payload.context.duration_ms:.2f}"
    )
    return {"success": True}


# === Discovery Endpoints ===

@app.post("/discovery/trigger")
async def trigger_discovery():
    """Manually trigger discovery scan"""
    await discovery.trigger_discovery()
    return {"success": True, "message": "Discovery scan triggered"}


@app.get("/discovery/status")
async def discovery_status():
    """Get discovery bus status"""
    return {
        "running": discovery.running,
        "watched_paths": discovery.observer.emitters if discovery.running else [],
    }


# === WebSocket for Real-Time Updates ===

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time updates (tool executions, discoveries, etc.)"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle client messages (if needed)
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print("[WS] Client disconnected")


async def broadcast_event(event: Dict):
    """Broadcast event to all WebSocket clients"""
    for connection in active_connections:
        try:
            await connection.send_json(event)
        except:
            active_connections.remove(connection)


# === Background Tasks ===

async def periodic_cleanup():
    """Periodic cleanup of expired tools"""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        await registry.cleanup_expired()


# === LiveKit Director Endpoints ===

@app.get("/api/livekit/telemetry/{camera_id}")
async def get_livekit_telemetry(camera_id: str):
    """Get telemetry overlay for camera."""
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from livekit_director import get_director
        
        director = get_director()
        telemetry = director.get_telemetry_overlay(camera_id)
        return telemetry
    except Exception as e:
        print(f"Error getting telemetry: {e}")
        return {}

@app.post("/api/livekit/camera/switch")
async def switch_camera(camera_id: str):
    """Switch to a different camera."""
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from livekit_director import get_director
        
        director = get_director()
        selected = await director.auto_direct()
        return {"success": True, "selected_camera": selected}
    except Exception as e:
        print(f"Error switching camera: {e}")
        return {"success": False, "error": str(e)}

# === Health Check ===

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "connections": len(active_connections),
        "registry": "connected",
        "discovery": "running" if discovery.running else "stopped",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
