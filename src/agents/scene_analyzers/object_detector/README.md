# Object Detector

Computer vision pass that finds tracked entities and writes Redis manifests.

## Implementation Status

❌ **Not Implemented** - Documentation only. Ready for implementation.

## Responsibilities

Computer vision pass that finds tracked entities and writes Redis manifests.

## Input/Output Format

### Input
- **scene_id** (str): ID of the scene to analyze
- **image_path** (str, optional): Path to image file (if not provided, uses scene render)
- **detection_model** (str, optional): Detection model to use ("yolo", "faster_rcnn", "custom")
- **confidence_threshold** (float, optional): Confidence threshold (default: 0.5)
- **object_categories** (list, optional): Categories to detect (if empty, detects all)

### Output
```json
{
  "success": true,
  "detection_id": "detection_123",
  "detections": [
    {
      "object_id": "obj_123",
      "category": "character",
      "confidence": 0.95,
      "bbox": {"x": 100, "y": 200, "width": 50, "height": 80},
      "position": {"x": 5, "y": 0, "z": 3}
    }
  ],
  "metadata": {
    "objects_detected": 15,
    "categories_found": ["character", "prop", "environment"],
    "confidence_avg": 0.87,
    "detection_time_ms": 234
  }
}
```

## Example Usage

### Command Line
```bash
python object_detector.py "scene_123" --model="yolo" --confidence=0.5 --categories="character,prop"
```

### Python API
```python
from ai_agents.scene_analyzers.object_detector.object_detector import detect_objects

result = detect_objects(
    scene_id="scene_123",
    detection_model="yolo",
    confidence_threshold=0.5,
    object_categories=["character", "prop"]
)
```

### Via Agent Executor
```json
{
  "tool": "object_detector",
  "params": {
    "scene_id": "scene_123",
    "detection_model": "yolo",
    "confidence_threshold": 0.5
  }
}
```

## Dependencies & Requirements

- **Python**: 3.10+
- **ML Framework**: PyTorch or TensorFlow for object detection
- **Computer Vision**: OpenCV, PIL/Pillow
- **Object Detection**: YOLO, Faster R-CNN, or similar models
- **GPU**: Recommended for ML inference
- **Permissions**: `runtime:query` (scene query permission)
- **Context**: Requires scene context (`{"selection": {"type": "scene"}}`)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
