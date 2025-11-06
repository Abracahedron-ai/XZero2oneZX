# OmniVinci Integration Guide

## Overview

This document describes the integration of NVIDIA OmniVinci with Zero2oneZ for natural scene reactions based on multimodal environment understanding.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Facebook Models (Fast Environment Mapping)                 │
│  • MetaCLIP: Image → semantic embeddings                     │
│  • DINOv2: Visual understanding → 3D geometry mapping         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3D Scene Understanding                                      │
│  • Spatial geometry extraction                               │
│  • Object detection and mapping                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sentiment Analysis (Text/Keylogger)                         │
│  • TextBlob: Text sentiment                                  │
│  • Arousal/Valence mapping                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  OmniVinci (Multimodal Reactor)                              │
│  • Processes: Vision + Audio + Text + 3D Geometry           │
│  • Reacts to environment stimuli                             │
│  • Generates emotional responses                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Emotion Fusion → Behavior Brain                             │
│  • Multi-modal emotion fusion (SER + FER + OmniVinci)        │
│  • Arousal/Valence state management                         │
│  • Natural scene reactions                                  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. OmniVinci Reactor (`services/omnivinci_reactor.py`)

Main service that processes environment stimuli and generates emotional responses.

**Key Features:**
- Processes multimodal inputs (vision, audio, text, 3D geometry)
- Integrates with Facebook models for environment mapping
- Extracts sentiment from text
- Generates context-aware emotional responses
- Updates emotion fusion system

**Usage:**
```python
from services.omnivinci_reactor import get_omnivinci_reactor

reactor = get_omnivinci_reactor()

# Process environment
response = reactor.process_environment(
    image=camera_frame,
    audio=audio_stream,
    text="This is frustrating!",
    scene_3d=None  # Auto-extracted if None
)

# Response contains:
# - emotion: str
# - arousal: float
# - valence: float
# - confidence: float
# - context_understanding: str
# - reaction_suggestion: str
```

### 2. Facebook Model Swarm (`services/facebook_swarm/model_swarm.py`)

Extended to support 3D geometry extraction from images.

**New Features:**
- Vision processing (MetaCLIP, DINOv2)
- 3D geometry extraction via `extract_3d_geometry()`
- Automatic model selection for vision tasks

**Usage:**
```python
from services.facebook_swarm.model_swarm import FacebookModelSwarm

configs = [
    {"model_id": "metaclip", "model_path": "facebook/metaclip-h14-fullcc2.5b"},
    {"model_id": "dinov2", "model_path": "facebook/dinov2-giant"}
]

swarm = FacebookModelSwarm(configs)

# Extract 3D geometry
geometry = swarm.extract_3d_geometry(image)
# Returns: {features, spatial_understanding, geometry_type, ...}
```

### 3. Emotion Fusion (`services/emotion_fusion.py`)

Extended to accept OmniVinci inputs as a third source.

**New Features:**
- `add_omnivinci_result()` method
- Weighted fusion of SER + FER + OmniVinci
- Configurable OmniVinci weight (default: 0.5)

**Usage:**
```python
from services.emotion_fusion import get_fusion

fusion = get_fusion()

# Add OmniVinci result
fusion.add_omnivinci_result(
    emotion="frustrated",
    confidence=0.85,
    arousal=0.7,
    valence=-0.5
)

# Fuse all sources
emotion_state = fusion.fuse()
```

## API Endpoints

### POST `/omnivinci/process`

Process environment and generate emotional response.

**Request:**
```json
{
  "image": "base64_encoded_image",  // Optional
  "audio": "base64_encoded_audio",  // Optional
  "text": "User input text",        // Optional
  "scene_3d": {}                     // Optional, auto-extracted if None
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

### GET `/omnivinci/status`

Get OmniVinci reactor status.

**Response:**
```json
{
  "loaded": true,
  "last_response": {
    "emotion": "neutral",
    "timestamp": "2024-01-01T00:00:00"
  },
  "context_history_count": 42
}
```

## Integration Flow

### Example: User types "This is so frustrating!" in cluttered room

1. **Facebook Models:**
   - MetaCLIP detects "cluttered workspace" in image
   - DINOv2 maps 3D geometry (messy desk, scattered objects)

2. **Sentiment Analysis:**
   - TextBlob: Negative sentiment (-0.7 polarity)
   - Maps to: Arousal=0.7, Valence=-0.5 (frustrated)

3. **OmniVinci:**
   - Processes: Cluttered scene + negative sentiment + 3D geometry
   - Generates: "User appears frustrated with cluttered environment"
   - Extracts emotion: Frustrated, with environmental context

4. **Emotion Fusion:**
   - Combines OmniVinci + sentiment analysis
   - Weighted fusion: Confidence 0.85
   - Final state: Frustrated (Arousal=0.7, Valence=-0.5)

5. **Behavior Brain:**
   - Triggers: Concerned expression
   - Gaze: Looks at cluttered area
   - Animation: Slight head tilt (sympathetic)

## Configuration

### Facebook Models

Default configuration in `OmniVinciReactor`:
```python
default_configs = [
    {
        "model_id": "metaclip",
        "model_path": "facebook/metaclip-h14-fullcc2.5b"
    },
    {
        "model_id": "dinov2",
        "model_path": "facebook/dinov2-giant"
    }
]
```

### Emotion Fusion Weights

Default weights in `EmotionFusion`:
```python
ser_weight = 0.6      # Speech emotion
fer_weight = 0.4      # Face emotion
omnivinci_weight = 0.5  # OmniVinci (context-aware)
```

## Dependencies

Required packages (already in `requirements.txt`):
- `transformers==4.36.2`
- `torch==2.1.2`
- `numpy==1.26.3`

## Testing

### Test OmniVinci Loader
```bash
python Models/core/nvidia/omnivinci_loader.py
```

### Test OmniVinci Reactor
```python
from services.omnivinci_reactor import get_omnivinci_reactor
import numpy as np

reactor = get_omnivinci_reactor()

# Test with text only
response = reactor.process_environment(
    text="This is amazing!"
)
print(response)
```

### Test Emotion Fusion
```python
from services.emotion_fusion import get_fusion

fusion = get_fusion()
fusion.add_omnivinci_result(
    emotion="happy",
    confidence=0.9,
    arousal=0.6,
    valence=0.8
)

state = fusion.fuse()
print(state)
```

## Next Steps

1. **API Integration:** Add endpoints to FastAPI server
2. **WebSocket Support:** Stream OmniVinci responses to frontend
3. **Caching:** Cache environment processing results
4. **Optimization:** Batch processing for multiple frames
5. **Testing:** End-to-end integration tests

## Troubleshooting

### OmniVinci model not loading
- Check HuggingFace token: `huggingface-cli login`
- Verify model name: `nvidia/omnivinci`
- Check GPU availability: `torch.cuda.is_available()`

### Facebook models not working
- Verify model paths are correct
- Check internet connection (downloads models)
- Ensure transformers library is installed

### Emotion fusion not updating
- Check if OmniVinci results are being added
- Verify fusion weights are configured
- Ensure `fuse()` is called after adding results

## References

- [OmniVinci Paper](https://arxiv.org/abs/2510.15870)
- [MetaCLIP Documentation](https://github.com/facebookresearch/MetaCLIP)
- [DINOv2 Documentation](https://github.com/facebookresearch/dinov2)




