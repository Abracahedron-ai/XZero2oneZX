from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import asyncio
import json
from datetime import datetime

# Import services
from src.backend.services.tools.tool_registry import registry, Tool
from src.backend.services.tools.discovery_bus import discovery
from src.backend.services.tools.capability_resolver import resolver
from src.backend.services.tools.agent_executor import executor
from src.backend.api.models.contracts import ExecuteCommand, MutationIngest

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


@app.get("/tools/recent", response_model=List[Tool])
async def get_recent_tools(limit: int = 5):
    """Get recently used tools"""
    return await registry.get_recent_tools(limit=limit)


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


@app.get("/tools/{tool_id}", response_model=Tool)
async def get_tool(tool_id: str):
    """Get tool by ID"""
    # Don't match "recent" or "search" as tool IDs
    if tool_id in ["recent", "search", "register"]:
        raise HTTPException(status_code=404, detail="Invalid tool ID")
    tool = await registry.get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool


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

# === OmniVinci Environment Reactor Endpoints ===

class OmniVinciProcessRequest(BaseModel):
    image: Optional[str] = None  # Base64 encoded image
    audio: Optional[str] = None  # Base64 encoded audio
    text: Optional[str] = None
    scene_3d: Optional[Dict] = None


@app.post("/omnivinci/process")
async def process_environment(request: OmniVinciProcessRequest):
    """Process environment and generate emotional response using OmniVinci"""
    try:
        import sys
        from pathlib import Path
        import base64
        import numpy as np
        from PIL import Image
        import io
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from omnivinci_reactor import get_omnivinci_reactor
        
        reactor = get_omnivinci_reactor()
        
        # Decode image if provided
        image = None
        if request.image:
            image_data = base64.b64decode(request.image)
            image = Image.open(io.BytesIO(image_data))
            image = np.array(image)
        
        # Decode audio if provided (placeholder - needs proper audio decoding)
        audio = None
        if request.audio:
            # TODO: Implement proper audio decoding
            audio_data = base64.b64decode(request.audio)
            audio = np.frombuffer(audio_data, dtype=np.float32)
        
        # Process environment
        response = reactor.process_environment(
            image=image,
            audio=audio,
            text=request.text,
            scene_3d=request.scene_3d
        )
        
        return {
            "emotion": response.emotion,
            "arousal": response.arousal,
            "valence": response.valence,
            "confidence": response.confidence,
            "context_understanding": response.context_understanding,
            "reaction_suggestion": response.reaction_suggestion,
            "sources": response.sources
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing environment: {str(e)}")


@app.get("/omnivinci/status")
async def get_omnivinci_status():
    """Get OmniVinci reactor status"""
    try:
        import sys
        from pathlib import Path
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from omnivinci_reactor import get_omnivinci_reactor
        
        reactor = get_omnivinci_reactor()
        last_response = reactor.get_last_response()
        context_history = reactor.get_context_history(limit=1)
        
        return {
            "loaded": reactor.omnivinci_model is not None,
            "last_response": {
                "emotion": last_response.emotion if last_response else None,
                "timestamp": last_response.timestamp.isoformat() if last_response and hasattr(last_response, 'timestamp') else None
            } if last_response else None,
            "context_history_count": len(reactor.context_history)
        }
        
    except Exception as e:
        return {
            "loaded": False,
            "error": str(e)
        }


# === QPipe Adapters (VGGT + TRELLIS) ===

class QPipeTaskRequest(BaseModel):
    task: str  # "scene-geometry" or "image-to-3d-asset"
    inputs: Dict[str, Any]


@app.post("/qpipe/process")
async def process_qpipe_task(request: QPipeTaskRequest):
    """Process QPipe task (scene-geometry or image-to-3d-asset)"""
    try:
        import sys
        from pathlib import Path
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from qpipe_adapters import process_qpipe_task
        
        response = process_qpipe_task(request.task, request.inputs)
        
        return {
            "task": response.task,
            "success": response.success,
            "data": response.data,
            "metadata": response.metadata,
            "error": response.error
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing QPipe task: {str(e)}")


@app.post("/trellis/generate")
async def generate_trellis_asset(
    image: Optional[str] = None,  # Base64 encoded
    text: Optional[str] = None,
    output_format: str = "mesh",
    asset_name: Optional[str] = None
):
    """Generate 3D asset using TRELLIS"""
    try:
        import sys
        from pathlib import Path
        import base64
        import numpy as np
        from PIL import Image
        import io
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from trellis_generator import get_trellis_generator
        
        generator = get_trellis_generator()
        
        # Generate asset
        if image:
            image_data = base64.b64decode(image)
            image = Image.open(io.BytesIO(image_data))
            image = np.array(image)
            asset = generator.generate_from_image(image, output_format, asset_name)
        elif text:
            asset = generator.generate_from_text(text, output_format, asset_name)
        else:
            raise HTTPException(status_code=400, detail="Either image or text must be provided")
        
        return {
            "success": True,
            "asset_id": asset_name or asset.metadata.get("asset_name"),
            "format": asset.format,
            "asset_path": asset.asset_path,
            "metadata": asset.metadata
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating asset: {str(e)}")


@app.get("/assets/list")
async def list_assets(asset_type: Optional[str] = None):
    """List available assets"""
    try:
        import sys
        from pathlib import Path
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from asset_bus import get_asset_bus
        
        bus = get_asset_bus()
        assets = bus.list_assets(asset_type=asset_type)
        
        return {
            "assets": [
                {
                    "asset_id": a.asset_id,
                    "format": a.format,
                    "asset_type": a.asset_type,
                    "loaded": a.loaded,
                    "usage_count": a.usage_count
                }
                for a in assets
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing assets: {str(e)}")


# === Object Brain Endpoints ===

class ObjectDetectRequest(BaseModel):
    frame_id: str
    image: str  # Base64 encoded
    camera_id: Optional[str] = None
    timestamp: Optional[float] = None


class ForceAdmitRequest(BaseModel):
    reason: str = "Manual override"


class ForceQuarantineRequest(BaseModel):
    reason: str


@app.post("/objects/detect")
async def detect_objects(request: ObjectDetectRequest):
    """Process frame and detect objects."""
    try:
        import sys
        from pathlib import Path
        import base64
        import numpy as np
        from PIL import Image
        import io
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from object_brain import get_object_brain
        
        brain = get_object_brain()
        
        # Decode image
        image_data = base64.b64decode(request.image)
        image = Image.open(io.BytesIO(image_data))
        image = np.array(image)
        
        # Process frame
        obj_ids = brain.process_frame(
            frame_id=request.frame_id,
            image=image,
            camera_id=request.camera_id,
            timestamp=request.timestamp
        )
        
        return {
            "success": True,
            "object_ids": obj_ids,
            "count": len(obj_ids)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting objects: {str(e)}")


@app.get("/objects/{obj_id}")
async def get_object_status(obj_id: str):
    """Get object status from Redis."""
    try:
        import sys
        from pathlib import Path
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from object_brain import get_object_brain
        
        brain = get_object_brain()
        status = brain.get_object_status(obj_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Object not found")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting object status: {str(e)}")


@app.get("/objects/{obj_id}/metrics")
async def get_object_metrics(obj_id: str):
    """Get quality metrics for object."""
    try:
        from src.backend.services.objects.object_brain import get_object_brain
        from src.backend.services.objects.object_persistence import get_persistence
        
        brain = get_object_brain()
        persistence = get_persistence()
        
        # Get current metrics from Redis
        from src.backend.utils.redis_client import get_redis_client
        redis = get_redis_client()
        metrics = redis.get_metrics(obj_id)
        
        # Get historical metrics from Postgres
        historical_metrics = persistence.get_object_metrics(obj_id)
        
        return {
            "current_metrics": metrics,
            "historical_metrics": historical_metrics,
            "threshold_check": brain.check_quality_thresholds(obj_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting object metrics: {str(e)}")


@app.post("/objects/{obj_id}/force_admit")
async def force_admit_object(obj_id: str, request: ForceAdmitRequest):
    """Force admit object to recon queue (manual override)."""
    try:
        import sys
        from pathlib import Path
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from object_brain import get_object_brain
        
        brain = get_object_brain()
        success = brain.force_admit(obj_id, request.reason)
        
        if not success:
            raise HTTPException(status_code=404, detail="Object not found")
        
        return {
            "success": True,
            "message": f"Object {obj_id} force-admitted to recon queue"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error force-admitting object: {str(e)}")


@app.post("/objects/{obj_id}/force_quarantine")
async def force_quarantine_object(obj_id: str, request: ForceQuarantineRequest):
    """Force quarantine object (manual override)."""
    try:
        import sys
        from pathlib import Path
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from object_brain import get_object_brain
        
        brain = get_object_brain()
        success = brain.force_quarantine(obj_id, request.reason)
        
        if not success:
            raise HTTPException(status_code=404, detail="Object not found")
        
        return {
            "success": True,
            "message": f"Object {obj_id} quarantined"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error quarantining object: {str(e)}")


@app.get("/objects/list")
async def list_objects(status: Optional[str] = None):
    """List objects by status."""
    try:
        import sys
        from pathlib import Path
        
        sys.path.insert(0, str(Path(__file__).parent.parent / "services"))
        from object_brain import get_object_brain
        
        brain = get_object_brain()
        objects = brain.list_objects(status=status)
        
        return {
            "objects": objects,
            "count": len(objects)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing objects: {str(e)}")


# Include configuration routes
from src.backend.api.routes.object_brain_config import router as config_router
app.include_router(config_router)


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
