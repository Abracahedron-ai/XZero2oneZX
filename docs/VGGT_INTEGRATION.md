# VGGT Integration Guide

## Overview

VGGT (Visual Geometry Grounded Transformer) is integrated into the Zero2oneZ pipeline to provide accurate 3D geometry reconstruction from images. This enhances the OmniVinci environment understanding with precise spatial information.

**Repository:** [https://github.com/Abracahedron-ai/vggt](https://github.com/Abracahedron-ai/vggt)

**Paper:** CVPR 2025 Best Paper Award - "VGGT: Visual Geometry Grounded Transformer"

## What VGGT Provides

VGGT extracts comprehensive 3D geometry from images:

- **Camera Poses**: Extrinsic and intrinsic matrices (OpenCV convention)
- **Depth Maps**: Dense depth estimation
- **Point Clouds**: 3D point reconstruction
- **Point Maps**: Direct 3D point predictions
- **Tracks**: Point tracking across frames (optional)

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Input Image (Camera Frame)                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  VGGT Processor                                              │
│  • Aggregates visual tokens                                  │
│  • Predicts camera poses                                     │
│  • Extracts depth maps                                       │
│  • Reconstructs 3D point clouds                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3D Geometry Features                                        │
│  • Point cloud (N, 3)                                       │
│  • Camera matrices                                           │
│  • Depth maps                                                │
│  • Spatial understanding                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  OmniVinci Reactor                                           │
│  • Processes: Vision + Audio + Text + 3D Geometry (VGGT)    │
│  • Generates context-aware emotional responses               │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```python
from services.vggt_processor import get_vggt_processor
import numpy as np
from PIL import Image

# Get VGGT processor
processor = get_vggt_processor()

# Load image
image = np.array(Image.open("scene.jpg"))

# Process and extract 3D geometry
reconstruction = processor.process_numpy_image(image)

# Access results
point_cloud = reconstruction.scene_geometry["point_cloud"]
cameras = reconstruction.cameras
depth_map = reconstruction.depth_map

print(f"Extracted {len(point_cloud)} 3D points")
```

### Integration with OmniVinci

The VGGT processor is automatically integrated into the OmniVinci reactor:

```python
from services.omnivinci_reactor import get_omnivinci_reactor
import numpy as np

reactor = get_omnivinci_reactor()

# Process environment - VGGT automatically extracts 3D geometry
response = reactor.process_environment(
    image=camera_frame,  # numpy array
    text="This room is cluttered"
)

# OmniVinci uses VGGT's 3D geometry for context-aware responses
print(response.context_understanding)
```

## VGGT Processor API

### `VGGTProcessor`

Main class for VGGT processing.

**Methods:**

- `load_model()` - Load VGGT model
- `process_images(images, query_points=None)` - Process tensor images
- `process_numpy_image(image, query_points=None)` - Process numpy image
- `extract_geometry_features(reconstruction)` - Extract features for OmniVinci
- `unload_model()` - Unload model and free memory

### `get_vggt_processor()`

Get or create VGGT processor (singleton pattern).

```python
from services.vggt_processor import get_vggt_processor

processor = get_vggt_processor(
    model_name="facebook/vggt",  # Default
    device="cuda",  # Auto-detected
    reload=False
)
```

## Model Configuration

### Default Model

- **Model Name**: `facebook/vggt`
- **Device**: Auto-detected (CUDA/MPS/CPU)
- **Dtype**: bfloat16 (CUDA) or float32 (CPU)

### Model Capabilities

- **Single-view reconstruction**: Works with single images
- **Multi-view reconstruction**: Processes multiple images
- **Zero-shot**: No fine-tuning needed
- **Fast processing**: < 1 second for typical scenes

## Performance

### Runtime Benchmarks (H100 GPU)

| Input Frames | Time (s) | Memory (GB) |
|--------------|----------|-------------|
| 1            | 0.04     | 1.88        |
| 2            | 0.05     | 2.07        |
| 4            | 0.07     | 2.45        |
| 8            | 0.11     | 3.23        |
| 20           | 0.31     | 5.58        |
| 50           | 1.04     | 11.41       |
| 100          | 3.12     | 21.15       |

*Source: [VGGT GitHub](https://github.com/Abracahedron-ai/vggt)*

## Integration with Existing Pipeline

### Automatic Integration

VGGT is automatically used when available:

1. **OmniVinci Reactor** checks for VGGT processor
2. If available, uses VGGT for 3D geometry extraction
3. Falls back to Facebook models (DINOv2) if VGGT unavailable
4. Formats VGGT output for OmniVinci processing

### Manual Override

You can force fallback to Facebook models:

```python
# In omnivinci_reactor.py initialization
reactor = OmniVinciReactor()
reactor.vggt_processor = None  # Force fallback
```

## Output Format

### VGGTReconstruction

```python
@dataclass
class VGGTReconstruction:
    cameras: Dict[str, Any]  # Extrinsic/intrinsic matrices
    depth_map: torch.Tensor
    depth_conf: torch.Tensor
    point_map: torch.Tensor
    point_conf: torch.Tensor
    point_map_by_unprojection: torch.Tensor
    scene_geometry: Dict[str, Any]
    timestamp: datetime
```

### Geometry Features (for OmniVinci)

```python
{
    "point_cloud": np.ndarray,  # (N, 3) 3D points
    "num_points": int,
    "cameras": {
        "extrinsic": np.ndarray,
        "intrinsic": np.ndarray,
        "pose_encoding": np.ndarray
    },
    "depth_map": np.ndarray,
    "spatial_understanding": "vggt_reconstructed",
    "geometry_type": "point_cloud_3d",
    "feature_dim": 3,
    "model_id": "vggt"
}
```

## Dependencies

VGGT requires:

- `torch>=2.0`
- `transformers>=4.36.0`
- `numpy>=1.24.0`
- `pillow>=10.0.0`

Optional (for full functionality):
- `vggt` package (if installed from source)

## Installation

### Option 1: Use HuggingFace Model (Recommended)

The model is automatically downloaded from HuggingFace:

```python
from services.vggt_processor import get_vggt_processor

processor = get_vggt_processor()  # Downloads automatically
```

### Option 2: Install from Source

```bash
git clone https://github.com/Abracahedron-ai/vggt.git
cd vggt
pip install -e .
```

## Troubleshooting

### Model Not Loading

- Check HuggingFace token: `huggingface-cli login`
- Verify model name: `facebook/vggt`
- Check GPU availability: `torch.cuda.is_available()`

### Import Errors

If `vggt.utils` modules are not available:

- The processor will use fallback mode
- Still provides basic 3D geometry
- Full functionality requires VGGT source installation

### Memory Issues

- Reduce input image size
- Use fewer frames for multi-view
- Enable gradient checkpointing if available

## Example: Complete Pipeline

```python
from services.omnivinci_reactor import get_omnivinci_reactor
import numpy as np
from PIL import Image

# Initialize reactor (VGGT automatically loaded)
reactor = get_omnivinci_reactor()

# Load scene image
image = np.array(Image.open("scene.jpg"))

# Process environment with VGGT 3D geometry
response = reactor.process_environment(
    image=image,
    text="This is a beautiful space!",
    audio=None
)

# Response includes:
# - VGGT-extracted 3D geometry
# - Context-aware emotional response
# - Natural reaction suggestion

print(f"Emotion: {response.emotion}")
print(f"Context: {response.context_understanding}")
print(f"Reaction: {response.reaction_suggestion}")
```

## References

- [VGGT GitHub Repository](https://github.com/Abracahedron-ai/vggt)
- [CVPR 2025 Best Paper Award](https://github.com/Abracahedron-ai/vggt)
- [OmniVinci Integration](docs/OMNIVINCI_INTEGRATION.md)




