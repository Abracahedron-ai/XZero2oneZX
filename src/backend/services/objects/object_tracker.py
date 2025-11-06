"""
Object Tracker Service

Multi-object tracking across frames with orbit calculation and best frame selection.
Integrates with Redis for frame caching.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime
import logging
import math
import json
from collections import defaultdict

from src.backend.utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)


@dataclass
class ObjectTrack:
    """Track for a single object."""
    obj_id: str
    class_name: str
    frames: List[Dict[str, Any]]  # List of frame observations
    orbit_deg: float  # Orbit coverage in degrees (0-360)
    best_frames: Dict[str, str]  # Best frames by view type: {front, side, back}
    last_seen_ts: float


class ObjectTracker:
    """
    Multi-object tracker across frames.
    
    Tracks:
    - Object positions across frames
    - Orbit calculation (coverage in degrees)
    - Best frame selection (front/side/back views)
    - Frame caching in Redis ZSET
    """
    
    def __init__(self):
        """Initialize object tracker."""
        self.redis = get_redis_client()
        self.tracks: Dict[str, ObjectTrack] = {}
        self.iou_threshold = 0.5  # IoU threshold for tracking
        self.max_age = 30  # Maximum frames without detection before removing track
    
    def update(self, frame_id: str, detections: List[Any], timestamp: Optional[float] = None) -> List[str]:
        """
        Update tracker with new detections.
        
        Args:
            frame_id: Current frame identifier
            detections: List of DetectionResult objects
            timestamp: Optional timestamp (defaults to now)
            
        Returns:
            List of object IDs that were updated
        """
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        updated_obj_ids = []
        
        # Match detections to existing tracks
        matched_tracks = self._match_detections(detections)
        
        # Update matched tracks
        for obj_id, detection in matched_tracks.items():
            self._update_track(obj_id, frame_id, detection, timestamp)
            updated_obj_ids.append(obj_id)
        
        # Create new tracks for unmatched detections
        matched_detection_indices = set(matched_tracks.values())
        for i, detection in enumerate(detections):
            if i not in matched_detection_indices:
                obj_id = self._create_new_track(frame_id, detection, timestamp)
                updated_obj_ids.append(obj_id)
        
        # Remove stale tracks
        self._remove_stale_tracks(timestamp)
        
        return updated_obj_ids
    
    def _match_detections(self, detections: List[Any]) -> Dict[str, Any]:
        """
        Match detections to existing tracks using IoU.
        
        Args:
            detections: List of DetectionResult objects
            
        Returns:
            Dictionary mapping obj_id to detection index
        """
        if not self.tracks:
            return {}
        
        matched = {}
        used_detections = set()
        
        # Calculate IoU matrix
        for obj_id, track in self.tracks.items():
            if not track.frames:
                continue
            
            # Get last detection bbox
            last_frame = track.frames[-1]
            last_bbox = last_frame.get('bbox', [])
            
            best_iou = 0.0
            best_detection_idx = None
            
            for i, detection in enumerate(detections):
                if i in used_detections:
                    continue
                
                iou = self._calculate_iou(last_bbox, detection.bbox)
                if iou > best_iou and iou >= self.iou_threshold:
                    best_iou = iou
                    best_detection_idx = i
            
            if best_detection_idx is not None:
                matched[obj_id] = best_detection_idx
                used_detections.add(best_detection_idx)
        
        return matched
    
    def _calculate_iou(self, bbox1: List[float], bbox2: List[float]) -> float:
        """
        Calculate Intersection over Union (IoU) between two bounding boxes.
        
        Args:
            bbox1: First bounding box [x1, y1, x2, y2]
            bbox2: Second bounding box [x1, y1, x2, y2]
            
        Returns:
            IoU score (0-1)
        """
        # Convert to [x1, y1, x2, y2] format if needed
        if len(bbox1) == 4 and len(bbox2) == 4:
            x1_1, y1_1, x2_1, y2_1 = bbox1
            x1_2, y1_2, x2_2, y2_2 = bbox2
        else:
            return 0.0
        
        # Calculate intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i < x1_i or y2_i < y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        # Calculate union
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def _update_track(self, obj_id: str, frame_id: str, detection: Any, timestamp: float):
        """Update existing track with new detection."""
        if obj_id not in self.tracks:
            self.tracks[obj_id] = ObjectTrack(
                obj_id=obj_id,
                class_name=detection.class_name,
                frames=[],
                orbit_deg=0.0,
                best_frames={},
                last_seen_ts=timestamp
            )
        
        track = self.tracks[obj_id]
        
        # Add frame observation
        frame_obs = {
            'frame_id': frame_id,
            'bbox': detection.bbox,
            'confidence': detection.confidence,
            'timestamp': timestamp
        }
        
        track.frames.append(frame_obs)
        track.last_seen_ts = timestamp
        
        # Calculate orbit coverage
        track.orbit_deg = self._calculate_orbit(track)
        
        # Update best frames
        self._update_best_frames(track, frame_id, detection)
        
        # Cache frame in Redis
        self.redis.add_view(obj_id, frame_id, timestamp)
        
        # Update Redis object data
        self.redis.update_object_field(obj_id, 'orbit_deg', track.orbit_deg)
        self.redis.update_object_field(obj_id, 'views', len(track.frames))
        self.redis.update_object_field(obj_id, 'last_seen_ts', timestamp)
        
        # Update best frames
        best_frames_json = json.dumps(track.best_frames) if track.best_frames else '{}'
        self.redis.update_object_field(obj_id, 'best_frames', best_frames_json)
    
    def _create_new_track(self, frame_id: str, detection: Any, timestamp: float) -> str:
        """Create new track for unmatched detection."""
        import uuid
        obj_id = str(uuid.uuid4())
        
        track = ObjectTrack(
            obj_id=obj_id,
            class_name=detection.class_name,
            frames=[],
            orbit_deg=0.0,
            best_frames={},
            last_seen_ts=timestamp
        )
        
        # Add first frame
        frame_obs = {
            'frame_id': frame_id,
            'bbox': detection.bbox,
            'confidence': detection.confidence,
            'timestamp': timestamp
        }
        
        track.frames.append(frame_obs)
        
        # Initialize in Redis
        self.redis.set_object(obj_id, {
            'class': detection.class_name,
            'status': 'pending',
            'orbit_deg': 0.0,
            'views': 1,
            'best_frames': {},
            'conf_class': detection.confidence,
            'scale_conf': 0.0,  # Will be computed later
            'last_seen_ts': timestamp
        })
        
        # Cache frame in Redis
        self.redis.add_view(obj_id, frame_id, timestamp)
        
        self.tracks[obj_id] = track
        
        return obj_id
    
    def _calculate_orbit(self, track: ObjectTrack) -> float:
        """
        Calculate orbit coverage in degrees.
        
        Estimates camera orbit around object based on bounding box positions.
        
        Args:
            track: Object track
            
        Returns:
            Orbit coverage in degrees (0-360)
        """
        if len(track.frames) < 2:
            return 0.0
        
        # Calculate bounding box centers
        centers = []
        for frame in track.frames:
            bbox = frame['bbox']
            if len(bbox) >= 4:
                center_x = (bbox[0] + bbox[2]) / 2
                center_y = (bbox[1] + bbox[3]) / 2
                centers.append((center_x, center_y))
        
        if len(centers) < 2:
            return 0.0
        
        # Calculate angles from center of all centers
        all_x = [c[0] for c in centers]
        all_y = [c[1] for c in centers]
        center_x = sum(all_x) / len(all_x)
        center_y = sum(all_y) / len(all_y)
        
        angles = []
        for x, y in centers:
            dx = x - center_x
            dy = y - center_y
            angle = math.atan2(dy, dx) * 180 / math.pi
            angles.append(angle)
        
        # Calculate coverage
        if not angles:
            return 0.0
        
        angles_sorted = sorted(angles)
        
        # Find maximum gap
        max_gap = 0.0
        for i in range(len(angles_sorted)):
            gap = (angles_sorted[(i + 1) % len(angles_sorted)] - angles_sorted[i]) % 360
            max_gap = max(max_gap, gap)
        
        coverage = 360 - max_gap
        
        return min(coverage, 360.0)
    
    def _update_best_frames(self, track: ObjectTrack, frame_id: str, detection: Any):
        """
        Update best frames for different views (front/side/back).
        
        Simplified: selects frames with highest confidence for now.
        In production, would use more sophisticated view classification.
        """
        # Simple heuristic: use confidence and bbox size
        confidence = detection.confidence
        bbox = detection.bbox
        bbox_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) if len(bbox) >= 4 else 0
        
        score = confidence * math.sqrt(bbox_area)
        
        # Update best frames (simplified - would need view classification)
        if not track.best_frames or score > track.best_frames.get('score', 0):
            # For now, just update the best overall frame
            track.best_frames['best'] = frame_id
            track.best_frames['score'] = score
    
    def _remove_stale_tracks(self, current_timestamp: float):
        """Remove tracks that haven't been seen recently."""
        stale_obj_ids = []
        
        for obj_id, track in self.tracks.items():
            age = current_timestamp - track.last_seen_ts
            if age > self.max_age:
                stale_obj_ids.append(obj_id)
        
        for obj_id in stale_obj_ids:
            del self.tracks[obj_id]
            # Keep in Redis but mark as stale
    
    def get_track(self, obj_id: str) -> Optional[ObjectTrack]:
        """Get track for object ID."""
        return self.tracks.get(obj_id)
    
    def get_all_tracks(self) -> Dict[str, ObjectTrack]:
        """Get all tracks."""
        return self.tracks


# Global tracker instance
_tracker_instance: Optional[ObjectTracker] = None


def get_object_tracker() -> ObjectTracker:
    """Get global object tracker instance."""
    global _tracker_instance
    if _tracker_instance is None:
        _tracker_instance = ObjectTracker()
    return _tracker_instance


def reset_tracker():
    """Reset global tracker instance."""
    global _tracker_instance
    _tracker_instance = None

