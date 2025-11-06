# Object Brain with Quality Gating

## Overview

The Object Brain is a Redis-based real-time object tracking system with quality gating for 3D asset generation. It prevents single-view junk from polluting the scene by only admitting objects that meet quality thresholds.

## Architecture

### Redis Schema (Fast, Ephemeral)

- **`obj:{id}`** HASH → class, status(pending|observing|ready|quarantine), orbit_deg, views, best_frames[z=front|side|back], conf_class, scale_conf, last_seen_ts
- **`obj:{id}:views`** ZSET (score=timestamp) → frame IDs
- **`obj:{id}:metrics`** HASH → mvs_consistency, silhouette_iou, photometric_err, depth_var, pose_spread_deg, texture_cov%
- **`queue:triage`** LIST → object IDs awaiting decision
- **`queue:recon`** LIST → objects admitted for 3D build
- **`queue:quarantine`** LIST → low-quality cases

### Postgres Schema (Durable, Queryable)

- **`objects`** (id PK, class, created_at, final_asset_path, status, notes jsonb)
- **`object_observations`** (id, obj_id FK, ts, cam_id, frame_path, bbox, mask_path, pose jsonb, feats jsonb)
- **`object_metrics`** (obj_id, ts, orbit_deg, mvs_consistency, silhouette_iou, photometric_err, scale_conf, texture_cov, decision) (indexed by obj_id, ts)
- **`object_assets`** (obj_id, stage ENUM('proxy','mesh','3dgs','nerf'), path, quality_score, created_at)
- **`object_emotion`** (obj_id, ts, tags text[], valence float, arousal float, conf float)

## Quality Gating Policy

### Admission Criteria

Admit to recon only if ALL of the following are met:

- **orbit_deg ≥ 240°** - Sufficient camera coverage around object
- **mvs_consistency ≤ τ1 (0.1)** - Multi-view stereo consistency (lower is better)
- **silhouette_iou ≥ τ2 (0.7)** - Silhouette overlap across views (higher is better)
- **texture_cov ≥ τ3 (0.6)** - Texture coverage percentage (higher is better)
- **scale_conf ≥ τ4 (0.8)** - Scale confidence (higher is better)

### Status Transitions

1. **pending** → **observing**: After 3+ views detected
2. **observing** → **ready**: Quality thresholds met, 3D asset generated
3. **observing** → **quarantine**: Failed quality check 3+ times
4. **quarantine**: Object rejected, reason logged

### Observation Window

- Minimum: 30 seconds OR 10 views
- While observing: Render placeholder (billboard/low-poly proxy, no physics)
- Only swap to final mesh when status=ready

## Quality Metrics

### Orbit Score (0-360°)

Normalized yaw coverage around object. Calculated from bounding box positions across frames.

### Understanding Score (0-1)

Weighted blend of quality metrics:

```
understanding_score = 0.3*orbit + 0.25*(1-mvs_consistency) + 0.2*silhouette_iou + 0.15*texture_cov + 0.1*scale_conf
```

### Metrics

- **MVS Consistency**: Multi-view stereo consistency (lower is better, normalized 0-1)
- **Silhouette IoU**: Intersection over Union of silhouettes across views (0-1, higher is better)
- **Photometric Error**: Photometric consistency across views (lower is better, normalized 0-1)
- **Depth Variance**: Variance in depth values (lower is better, normalized 0-1)
- **Pose Spread**: Coverage of camera poses in degrees (0-360, higher is better)
- **Texture Coverage**: Texture coverage percentage (0-1, higher is better)
- **Scale Confidence**: Confidence in scale estimation (0-1, higher is better)

## Detection Backends

### YOLOv8 (Default)

- Fast, balanced accuracy
- Good for real-time detection
- Model: `yolov8n.pt` (default)

### Detectron2

- Meta's highly accurate detector
- Slower but more precise
- Better for complex scenes

### MetaCLIP

- Uses existing Facebook model swarm
- Classification and region proposal
- Good for semantic understanding

### Custom

- User-defined detector classes
- Flexible integration

## Runtime Flow

1. **Detector/Tracker** pushes frames → Redis `obj:*` counters + metrics updater
2. **Triage Worker** reads `queue:triage`, computes metrics (fast: depth/pose spread, silhouettes), updates Redis+PG
3. If thresholds met → push `obj_id` to `queue:recon`, else continue observing
4. **Recon Worker** (TRELLIS/photogrammetry) produces mesh/3DGS → writes to `object_assets` (stage='mesh') and flips status=ready
5. **Scene Loader** swaps proxy→final atomically; physics enabled only when status=ready
6. **OmniVinci** logs emotion tags to `object_emotion` table

## API Reference

### Object Detection

**POST** `/objects/detect`

Process frame and detect objects.

```json
{
  "frame_id": "frame_123",
  "image": "base64_encoded_image",
  "camera_id": "camera_1",
  "timestamp": 1234567890.0
}
```

**Response:**
```json
{
  "success": true,
  "object_ids": ["obj_1", "obj_2"],
  "count": 2
}
```

### Get Object Status

**GET** `/objects/{obj_id}`

Get object status from Redis.

**Response:**
```json
{
  "obj_id": "obj_1",
  "status": "observing",
  "class": "chair",
  "orbit_deg": 180.0,
  "views": 5,
  "metrics": {...},
  "last_seen_ts": "1234567890.0",
  "best_frames": {...}
}
```

### Get Object Metrics

**GET** `/objects/{obj_id}/metrics`

Get quality metrics for object.

**Response:**
```json
{
  "current_metrics": {
    "mvs_consistency": 0.05,
    "silhouette_iou": 0.8,
    "texture_cov": 0.7,
    "scale_conf": 0.9
  },
  "historical_metrics": [...],
  "threshold_check": {
    "meets_thresholds": true,
    "checks": {...}
  }
}
```

### Force Admit Object

**POST** `/objects/{obj_id}/force_admit`

Force admit object to recon queue (manual override).

```json
{
  "reason": "Manual override"
}
```

### Force Quarantine Object

**POST** `/objects/{obj_id}/force_quarantine`

Force quarantine object (manual override).

```json
{
  "reason": "Low quality"
}
```

### List Objects

**GET** `/objects/list?status=observing`

List objects by status.

**Response:**
```json
{
  "objects": [...],
  "count": 10
}
```

### Configuration

**GET** `/objects/config`

Get current builder configuration.

**POST** `/objects/config`

Update builder configuration.

```json
{
  "thresholds": {
    "orbit_deg_min": 240.0,
    "mvs_consistency_max": 0.1,
    "silhouette_iou_min": 0.7,
    "texture_cov_min": 0.6,
    "scale_conf_min": 0.8
  },
  "detector": {
    "backend": "yolov8",
    "model": "yolov8n.pt",
    "device": "cuda",
    "conf_threshold": 0.25
  },
  "observation_window_sec": 30,
  "observation_min_views": 10,
  "quarantine_failed_attempts": 3
}
```

**POST** `/objects/config/thresholds`

Update quality thresholds.

**POST** `/objects/config/detector`

Update detector backend.

**POST** `/objects/config/per-class-thresholds`

Update per-class quality thresholds.

## Builder Configuration Guide

### Setting Quality Thresholds

Quality thresholds are configurable per class or globally. Lower thresholds admit more objects but may reduce quality.

```python
from services.object_brain import get_object_brain

brain = get_object_brain()
brain.update_thresholds({
    'orbit_deg_min': 240.0,
    'mvs_consistency_max': 0.1,
    'silhouette_iou_min': 0.7,
    'texture_cov_min': 0.6,
    'scale_conf_min': 0.8
})
```

### Changing Detection Backend

```python
from services.object_detector import get_detector, reset_detector

# Reset current detector
reset_detector()

# Get new detector backend
detector = get_detector('detectron2', model='COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml')
```

### Manual Overrides

```python
from services.object_brain import get_object_brain

brain = get_object_brain()

# Force admit object
brain.force_admit('obj_123', reason='Manual override')

# Force quarantine object
brain.force_quarantine('obj_456', reason='Low quality')
```

## Integration Examples

### With Asset Bus

When object status becomes 'ready', the recon worker automatically triggers asset swap:

```python
from services.asset_bus import get_asset_bus

bus = get_asset_bus()
bus.hot_swap_asset(
    old_asset_id="proxy_obj_123",
    new_asset_id="obj_123"
)
```

### With OmniVinci

Log emotion tags for objects:

```python
from services.omnivinci_reactor import get_omnivinci_reactor

reactor = get_omnivinci_reactor()
reactor.log_object_emotion(
    obj_id="obj_123",
    tags=["happy", "excited"]
)
```

### With VGGT

Use VGGT for depth/pose calculations:

```python
from services.vggt_processor import get_vggt_processor

vggt = get_vggt_processor()
reconstruction = vggt.process_numpy_image(image)
```

## Safety Valves

### Human-in-Loop Override

- **force_admit**: Force admit object to recon queue
- **force_quarantine**: Force quarantine object

### TTL for Redis Observations

Redis observations have TTL to prevent memory bloat. Default: 24 hours.

### Per-Class Caps

Don't recon 20 near-duplicates. Dedupe via DINO/MetaCLIP embedding similarity.

### "Seen-Before" Dedupe

Use DINOv2/MetaCLIP embeddings to detect duplicate objects before processing.

## Performance Considerations

### Redis Performance

- Redis keeps ultra-fast per-object state
- Use TTL to prevent memory bloat
- Batch operations where possible

### Postgres Performance

- Postgres is your history/analytics
- Batch inserts for performance
- Periodic flush jobs (default: 10 seconds)

### Worker Threading

- Triage worker: Fast metric computation
- Recon worker: Slower 3D generation (TRELLIS)
- Both run as background threads

## Troubleshooting

### Objects Stuck in "observing"

Check quality metrics:
```bash
GET /objects/{obj_id}/metrics
```

If metrics are below thresholds, either:
1. Wait for more views
2. Adjust thresholds (if appropriate)
3. Force admit (if manual review confirms quality)

### Objects Quarantined

Check notes for reason:
```bash
GET /objects/{obj_id}
```

Review `notes.status_transitions` for quarantine reason.

### Detection Not Working

Check detector backend:
```bash
GET /objects/config
```

Verify detector is loaded and configured correctly.

## References

- **Redis**: Fast, ephemeral object state
- **Postgres**: Durable, queryable history
- **TRELLIS**: 3D asset generation
- **VGGT**: Depth/pose calculations
- **OmniVinci**: Emotion tagging
- **Asset Bus**: Hot-swapping assets


