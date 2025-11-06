# Complete Pipeline: OmniVinci + VGGT Integration

## Overview

This document describes the complete integration of OmniVinci and VGGT into the Zero2oneZ pipeline for natural scene reactions based on multimodal environment understanding.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Input: Image, Audio, Text                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  VGGT Processor  │   │  Facebook Models │
│  • 3D Geometry   │   │  • Visual Features│
│  • Point Clouds  │   │  • MetaCLIP       │
│  • Depth Maps    │   │  • DINOv2         │
└────────┬─────────┘   └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sentiment Analysis (Text/Keylogger)                       │
│  • TextBlob: Text sentiment                                │
│  • Arousal/Valence mapping                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  OmniVinci (Multimodal Reactor)                             │
│  • Model: nvidia/omnivinci                                  │
│  • Processes: Vision + Audio + Text + 3D Geometry (VGGT)   │
│  • Reacts to environment stimuli                             │
│  • Generates emotional responses                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Emotion Fusion → Behavior Brain                            │
│  • Multi-modal fusion (SER + FER + OmniVinci)              │
│  • Arousal/Valence state management                         │
│  • Natural scene reactions                                  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. OmniVinci Model Loader

**Location:** `Models/core/nvidia/omnivinci_loader.py`

**Loading Pattern:**
```python
from transformers import AutoModel

model = AutoModel.from_pretrained("nvidia/omnivinci", trust_remote_code=True, torch_dtype="auto")
```

This exact pattern is used in the loader.

### 2. VGGT Processor

**Location:** `services/vggt_processor.py`

**Repository:** [https://github.com/Abracahedron-ai/vggt](https://github.com/Abracahedron-ai/vggt)

**Capabilities:**
- Extracts accurate 3D geometry from images
- Provides camera poses (extrinsic/intrinsic)
- Generates depth maps and point clouds
- Zero-shot single-view reconstruction

### 3. OmniVinci Reactor

**Location:** `services/omnivinci_reactor.py`

**Integration:**
- Automatically uses VGGT for 3D geometry extraction
- Falls back to Facebook models if VGGT unavailable
- Processes multimodal inputs
- Generates context-aware emotional responses

## Usage

### Complete Pipeline Example

```python
from services.omnivinci_reactor import get_omnivinci_reactor
import numpy as np
from PIL import Image

# Initialize reactor (OmniVinci + VGGT automatically loaded)
reactor = get_omnivinci_reactor()

# Load scene image
image = np.array(Image.open("scene.jpg"))

# Process environment
response = reactor.process_environment(
    image=image,                    # VGGT extracts 3D geometry
    text="This is so frustrating!", # Sentiment analysis
    audio=None                       # Optional audio
)

# Response includes:
# - VGGT-extracted 3D geometry
# - OmniVinci context understanding
# - Emotional response
# - Reaction suggestion

print(f"Emotion: {response.emotion}")
print(f"Arousal: {response.arousal}, Valence: {response.valence}")
print(f"Context: {response.context_understanding}")
print(f"Reaction: {response.reaction_suggestion}")
```

### Direct VGGT Usage

```python
from services.vggt_processor import get_vggt_processor
import numpy as np

processor = get_vggt_processor()

# Process image
reconstruction = processor.process_numpy_image(image)

# Access 3D geometry
point_cloud = reconstruction.scene_geometry["point_cloud"]
cameras = reconstruction.cameras
depth_map = reconstruction.depth_map

print(f"Extracted {len(point_cloud)} 3D points")
```

### Direct OmniVinci Usage

```python
from Models.core.nvidia.omnivinci_loader import load_omnivinci

# Load model directly (exact pattern)
model = load_omnivinci()
```

## Data Flow

### 1. Image Processing

```
Input Image (numpy array)
    │
    ├─► VGGT Processor
    │   └─► 3D Geometry (Point Cloud, Depth Maps, Cameras)
    │
    └─► Facebook Models (MetaCLIP/DINOv2)
        └─► Visual Features (Semantic Embeddings)
```

### 2. Text Processing

```
Input Text
    │
    └─► Sentiment Analysis (KeyloggerEmotion)
        └─► Arousal/Valence Coordinates
```

### 3. OmniVinci Processing

```
Multimodal Input:
├─ Visual Features (Facebook Models)
├─ 3D Geometry (VGGT)
├─ Text Sentiment
└─ Audio (optional)

    │
    └─► OmniVinci Model
        └─► Context-Aware Emotional Response
```

### 4. Emotion Fusion

```
Multiple Sources:
├─ SER (Speech Emotion Recognition)
├─ FER (Face Emotion Recognition)
└─ OmniVinci (Context-Aware)

    │
    └─► EmotionFusion
        └─► Unified Emotion State
            └─► Behavior Brain
                └─► Avatar Reactions
```

## Model Loading

### OmniVinci

```python
# Exact loading pattern (as specified)
from transformers import AutoModel

model = AutoModel.from_pretrained(
    "nvidia/omnivinci",
    trust_remote_code=True,
    torch_dtype="auto"
)
```

**Location in code:** `Models/core/nvidia/omnivinci_loader.py` (line 81-86)

### VGGT

```python
# Loaded via transformers AutoModel
from transformers import AutoModel

model = AutoModel.from_pretrained(
    "facebook/vggt",
    trust_remote_code=True,
    torch_dtype=torch.bfloat16  # or auto
)
```

**Location in code:** `services/vggt_processor.py` (line 72-80)

## API Endpoints

### POST `/omnivinci/process`

Process environment with OmniVinci + VGGT.

**Request:**
```json
{
  "image": "base64_encoded_image",
  "text": "User input text",
  "audio": "base64_encoded_audio",
  "scene_3d": null
}
```

**Response:**
```json
{
  "emotion": "frustrated",
  "arousal": 0.7,
  "valence": -0.5,
  "confidence": 0.85,
  "context_understanding": "User appears frustrated with cluttered environment",
  "reaction_suggestion": "Show concerned expression",
  "sources": {
    "omnivinci": 0.85
  }
}
```

## Configuration

### Model Paths

**OmniVinci:**
- Model: `nvidia/omnivinci`
- Loader: `Models/core/nvidia/omnivinci_loader.py`

**VGGT:**
- Model: `facebook/vggt`
- Processor: `services/vggt_processor.py`

### Device Selection

Both models auto-detect device:
- CUDA (if available)
- MPS (Apple Silicon)
- CPU (fallback)

### Dtype Selection

- **OmniVinci:** `torch_dtype="auto"` (as specified)
- **VGGT:** `bfloat16` (CUDA) or `float32` (CPU)

## Performance

### VGGT Benchmarks

- **Single frame:** ~0.04s on H100
- **Memory:** ~1.88 GB for single frame

### OmniVinci

- Loads on first use (singleton pattern)
- Processes multimodal inputs efficiently
- Integrates with existing emotion fusion

## Error Handling

### Fallback Chain

1. **VGGT unavailable** → Falls back to Facebook models (DINOv2)
2. **OmniVinci unavailable** → System continues with existing emotion fusion
3. **Facebook models unavailable** → Uses basic features

All components gracefully degrade without breaking the pipeline.

## Testing

### Test OmniVinci Loader

```bash
python Models/core/nvidia/omnivinci_loader.py
```

### Test VGGT Processor

```python
from services.vggt_processor import get_vggt_processor
import numpy as np

processor = get_vggt_processor()
reconstruction = processor.process_numpy_image(np.random.rand(224, 224, 3))
print("VGGT working!")
```

### Test Complete Pipeline

```python
from services.omnivinci_reactor import get_omnivinci_reactor

reactor = get_omnivinci_reactor()
response = reactor.process_environment(text="Test")
print(f"Pipeline working: {response.emotion}")
```

## Dependencies

All required packages are in `python/requirements.txt`:
- `transformers==4.36.2`
- `torch==2.1.2`
- `numpy==1.26.3`
- `pillow==10.2.0`

## References

- **OmniVinci:** NVIDIA OmniVinci model (`nvidia/omnivinci`)
- **VGGT:** [https://github.com/Abracahedron-ai/vggt](https://github.com/Abracahedron-ai/vggt)
- **CVPR 2025 Best Paper Award:** VGGT: Visual Geometry Grounded Transformer

## Next Steps

1. ✅ OmniVinci integrated with exact loading pattern
2. ✅ VGGT integrated for 3D geometry extraction
3. ✅ Pipeline automatically uses VGGT when available
4. ✅ Fallback to Facebook models if VGGT unavailable
5. ✅ API endpoints for processing
6. ⏳ Testing with real scenes
7. ⏳ Optimization for production use


