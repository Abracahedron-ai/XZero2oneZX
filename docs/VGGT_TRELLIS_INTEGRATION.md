# VGGT + TRELLIS Integration Guide

## Overview

This document describes the integration of both **VGGT** (perception/mapping) and **TRELLIS** (generation) into the Zero2oneZ pipeline for live world mapping and asset generation.

## The Two Models

### VGGT: Live Mapping & Perception

**Repository:** [https://github.com/Abracahedron-ai/vggt](https://github.com/Abracahedron-ai/vggt)

**Purpose:** "Where am I / what's the geometry right now?"

**Capabilities:**
- Multi-view 3D reconstruction (1-100s images)
- Camera pose estimation (intrinsics/extrinsics)
- Depth maps and point clouds
- 3D tracking
- Fast feed-forward processing (seconds, no COLMAP loop)

**Use Cases:**
- Live mapping from crowd cameras
- NavMesh generation for avatar navigation
- Occlusion detection
- Real-time scene understanding
- SLAM-like localization

### TRELLIS: 3D Asset Generation

**Repository:** Microsoft TRELLIS

**Purpose:** "Show me a thing → usable 3D asset"

**Capabilities:**
- Generate 3D assets from text or images
- Multiple output formats: meshes, 3D Gaussians, radiance fields
- Game-ready props and characters
- High-quality textures

**Use Cases:**
- Generate props from phone shots
- Create characters from text descriptions
- Hot-swap assets at runtime
- Asset generation for virtual scenes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Input: Crowd Camera Frames / Text / Images                  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  VGGT Processor  │   │ TRELLIS Generator │
│  (Perception)    │   │  (Generation)     │
│                  │   │                   │
│  • Camera Poses  │   │  • Text → 3D      │
│  • Depth Maps    │   │  • Image → 3D     │
│  • Point Clouds  │   │  • Multiple Formats│
│  • Tracks        │   │  • Game-Ready      │
└────────┬─────────┘   └────────┬─────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  Scene Geometry  │   │  Asset Bus       │
│  • NavMesh       │   │  • Hot-Swapping  │
│  • Occlusion     │   │  • Asset Registry │
│  • Localization  │   │  • Format Convert│
└────────┬─────────┘   └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Compositor & Behavior Brain                                  │
│  • Avatars navigate mapped world                             │
│  • Assets hot-swapped at runtime                             │
│  • Natural scene interactions                                │
└─────────────────────────────────────────────────────────────┘
```

## QPipe Adapters

### Task: `scene-geometry` → VGGT Adapter

**Input:**
```python
{
    "images": [numpy_array, ...],  # Camera frames
    "query_points": [[x, y], ...]  # Optional tracking points
}
```

**Output:**
```python
{
    "cams": {
        "extrinsic": [...],
        "intrinsic": [...]
    },
    "depth": numpy_array,  # Depth maps
    "points": numpy_array,  # Point cloud (N, 3)
    "tracks": [...],  # If query_points provided
    "spatial_understanding": "vggt_reconstructed",
    "geometry_type": "point_cloud_3d"
}
```

**Usage:**
```python
from services.qpipe_adapters import process_qpipe_task

response = process_qpipe_task(
    task="scene-geometry",
    inputs={
        "images": [camera_frame1, camera_frame2],
        "query_points": [[100, 200], [150, 250]]
    }
)

if response.success:
    point_cloud = response.data["points"]
    cameras = response.data["cams"]
    # Use for NavMesh, occlusion, etc.
```

### Task: `image-to-3d-asset` → TRELLIS Adapter

**Input:**
```python
{
    "image": numpy_array,  # OR
    "text": "a wooden chair",  # OR both
    "output_format": "mesh",  # 'mesh', '3dgs', 'nerf', 'radiance_field'
    "asset_name": "chair_001",
    "asset_type": "prop"  # 'prop', 'character', 'environment'
}
```

**Output:**
```python
{
    "format": "mesh",
    "asset_path": "/path/to/asset.obj",
    "texture_path": "/path/to/texture.jpg",
    "preview_path": "/path/to/preview.png",
    "asset_id": "chair_001"
}
```

**Usage:**
```python
from services.qpipe_adapters import process_qpipe_task

response = process_qpipe_task(
    task="image-to-3d-asset",
    inputs={
        "image": phone_shot,
        "output_format": "mesh",
        "asset_name": "user_chair",
        "asset_type": "prop"
    }
)

if response.success:
    asset_path = response.data["asset_path"]
    # Asset automatically registered in asset bus
    # Ready for hot-swapping
```

## API Endpoints

### POST `/qpipe/process`

Process QPipe task (unified interface).

**Request:**
```json
{
  "task": "scene-geometry",
  "inputs": {
    "images": ["base64_image1", "base64_image2"],
    "query_points": [[100, 200], [150, 250]]
  }
}
```

### POST `/trellis/generate`

Generate 3D asset using TRELLIS.

**Request:**
```json
{
  "image": "base64_encoded_image",
  "text": "optional text prompt",
  "output_format": "mesh",
  "asset_name": "my_asset"
}
```

### GET `/assets/list`

List all registered assets.

**Query Parameters:**
- `asset_type`: Filter by type ('prop', 'character', 'environment')

**Response:**
```json
{
  "assets": [
    {
      "asset_id": "chair_001",
      "format": "mesh",
      "asset_type": "prop",
      "loaded": true,
      "usage_count": 5
    }
  ]
}
```

## Integration Examples

### Example 1: Live Mapping from Crowd Cameras

```python
from services.qpipe_adapters import process_qpipe_task
import numpy as np

# Collect frames from multiple phones
phone_frames = [frame1, frame2, frame3, ...]

# Process with VGGT
response = process_qpipe_task(
    task="scene-geometry",
    inputs={"images": phone_frames}
)

if response.success:
    # Build NavMesh from point cloud
    point_cloud = response.data["points"]
    cameras = response.data["cams"]
    
    # Update NavMesh for avatar navigation
    update_navmesh(point_cloud)
    
    # Use for occlusion detection
    setup_occlusion(point_cloud)
```

### Example 2: Generate Prop from Phone Shot

```python
from services.qpipe_adapters import process_qpipe_task
from services.asset_bus import get_asset_bus

# User takes photo of a chair
chair_photo = np.array(Image.open("chair_photo.jpg"))

# Generate 3D asset
response = process_qpipe_task(
    task="image-to-3d-asset",
    inputs={
        "image": chair_photo,
        "output_format": "mesh",
        "asset_name": "user_chair_v1",
        "asset_type": "prop"
    }
)

if response.success:
    # Asset automatically registered in asset bus
    asset_bus = get_asset_bus()
    
    # Hot-swap in scene
    asset_bus.hot_swap_asset(
        old_asset_id="proxy_chair",
        new_asset_id="user_chair_v1"
    )
```

### Example 3: Text-to-Character Generation

```python
from services.qpipe_adapters import process_qpipe_task

# Generate character from text
response = process_qpipe_task(
    task="image-to-3d-asset",
    inputs={
        "text": "a friendly robot character with blue eyes",
        "output_format": "mesh",
        "asset_name": "robot_character",
        "asset_type": "character"
    }
)

# Character ready for use in scene
```

## Runtime Performance

### VGGT Benchmarks (H100 GPU)

| Input Frames | Time (s) | Memory (GB) |
|--------------|----------|-------------|
| 1            | 0.04     | 1.88        |
| 8            | 0.11     | 3.23        |
| 20           | 0.31     | 5.58        |
| 100          | 3.12     | 21.15       |

**Recommendation:** Run VGGT on one GPU per stream for low-latency mapping. Cache keyframes.

### TRELLIS

- **Runtime:** Background job (large model)
- **Recommendation:** Run when GPU scheduler has headroom
- **Output:** Multiple formats (mesh for physics, 3DGS/NeRF for fast view synthesis)

## When to Use Which

### Use VGGT When:
- ✅ Need live mapping from camera feeds
- ✅ Need camera poses for localization
- ✅ Need depth maps for occlusion
- ✅ Need point clouds for NavMesh
- ✅ Need "where am I / what's the geometry" answers

### Use TRELLIS When:
- ✅ Need to generate props from images
- ✅ Need to create characters from text
- ✅ Need game-ready 3D assets
- ✅ Need hot-swappable assets
- ✅ Need "show me a thing → usable 3D" functionality

## Asset Bus Integration

### Hot-Swapping Assets

```python
from services.asset_bus import get_asset_bus

bus = get_asset_bus()

# Swap proxy asset with generated asset
bus.hot_swap_asset(
    old_asset_id="proxy_chair",
    new_asset_id="user_chair_v1"
)
```

### Asset Discovery

```python
# Automatically discovers assets in Models/generated_assets/
bus = get_asset_bus()
bus.discover_assets()

# List all props
props = bus.list_assets(asset_type="prop")
```

## Database Integration

### Store VGGT Results

```python
# Store camera poses and point clouds in pgvector
import psycopg2

conn = psycopg2.connect("...")
cur = conn.cursor()

# Store point cloud embedding
cur.execute(
    "INSERT INTO scene_geometry (embedding, cameras, timestamp) VALUES (%s, %s, %s)",
    (point_cloud_vector, json.dumps(cameras), datetime.now())
)
```

## Complete Pipeline Example

```python
from services.omnivinci_reactor import get_omnivinci_reactor
from services.qpipe_adapters import process_qpipe_task

# 1. Live mapping from crowd cameras
geometry_response = process_qpipe_task(
    task="scene-geometry",
    inputs={"images": crowd_camera_frames}
)

# 2. Generate prop from user photo
asset_response = process_qpipe_task(
    task="image-to-3d-asset",
    inputs={
        "image": user_photo,
        "output_format": "mesh",
        "asset_name": "user_prop"
    }
)

# 3. Process environment with OmniVinci (uses VGGT geometry)
reactor = get_omnivinci_reactor()
emotion_response = reactor.process_environment(
    image=current_frame,
    text="This is a beautiful space!",
    scene_3d=geometry_response.data  # VGGT geometry
)

# 4. Avatars navigate mapped world with generated assets
# - NavMesh from VGGT point cloud
# - Hot-swapped assets from TRELLIS
# - Natural reactions from OmniVinci
```

## Licensing

### VGGT
- **License:** Meta's license (check repo for commercial terms)
- **Repository:** [https://github.com/Abracahedron-ai/vggt](https://github.com/Abracahedron-ai/vggt)

### TRELLIS
- **License:** Microsoft's license (check repo for commercial terms)
- **Repository:** Check Microsoft TRELLIS repository

**Important:** Verify licensing terms for your use case, especially for commercial applications.

## References

- **VGGT:** [https://github.com/Abracahedron-ai/vggt](https://github.com/Abracahedron-ai/vggt)
- **VGGT Paper:** CVPR 2025 Best Paper Award
- **TRELLIS:** Microsoft TRELLIS (check official repositories)
- **Integration Guide:** This document




