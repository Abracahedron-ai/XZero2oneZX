"""
Object Brain Service

Main object brain service managing Redis operations for object state.
Handles status transitions (pending → observing → ready → quarantine)
and queue management (triage, recon, quarantine).
"""

import uuid
from typing import Dict, Optional, Any, List
from datetime import datetime
import logging
import json

from src.backend.utils.redis_client import get_redis_client
from src.backend.services.objects.object_tracker import get_object_tracker
from src.backend.services.objects.quality_metrics import get_quality_calculator
from src.backend.services.objects.object_detector.detector_factory import get_detector, DetectionResult

logger = logging.getLogger(__name__)


class ObjectBrain:
    """
    Object Brain Service
    
    Manages:
    - Object state in Redis
    - Status transitions (pending → observing → ready → quarantine)
    - Queue management (triage, recon, quarantine)
    - Integration with detector, tracker, metrics
    """
    
    def __init__(self):
        """Initialize object brain."""
        self.redis = get_redis_client()
        self.tracker = get_object_tracker()
        self.quality_calc = get_quality_calculator()
        
        # Quality thresholds (configurable)
        self.thresholds = {
            'orbit_deg_min': 240.0,  # Minimum orbit coverage
            'mvs_consistency_max': 0.1,  # τ1: Maximum MVS consistency
            'silhouette_iou_min': 0.7,  # τ2: Minimum silhouette IoU
            'texture_cov_min': 0.6,  # τ3: Minimum texture coverage
            'scale_conf_min': 0.8  # τ4: Minimum scale confidence
        }
        
        # Observation thresholds
        self.observation_window_sec = 30
        self.observation_min_views = 10
        self.quarantine_failed_attempts = 3
    
    def process_frame(
        self,
        frame_id: str,
        image: Any,
        camera_id: Optional[str] = None,
        timestamp: Optional[float] = None
    ) -> List[str]:
        """
        Process frame and detect/track objects.
        
        Args:
            frame_id: Frame identifier
            image: Input image (numpy array or PIL Image)
            camera_id: Optional camera identifier
            timestamp: Optional timestamp (defaults to now)
            
        Returns:
            List of object IDs that were detected/updated
        """
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        # Detect objects
        detector = get_detector()  # Uses configured backend
        detections = detector.detect(image)
        
        # Update tracker
        obj_ids = self.tracker.update(frame_id, detections, timestamp)
        
        # For each detected/updated object, update Redis state
        for obj_id in obj_ids:
            self._update_object_state(obj_id, frame_id, camera_id, timestamp)
            
            # Check if object should be moved to triage
            obj_data = self.redis.get_object(obj_id)
            if obj_data:
                status = obj_data.get('status', 'pending')
                views = int(obj_data.get('views', 0))
                
                # Move to triage if we have enough views or time has passed
                if status == 'pending' and views >= 3:
                    self.redis.update_object_field(obj_id, 'status', 'observing')
                    self.redis.push_to_triage(obj_id)
                
                elif status == 'observing':
                    # Check observation window
                    last_seen = float(obj_data.get('last_seen_ts', 0))
                    age = timestamp - last_seen
                    
                    if views >= self.observation_min_views or age >= self.observation_window_sec:
                        # Re-check triage eligibility
                        self.redis.push_to_triage(obj_id)
        
        return obj_ids
    
    def _update_object_state(
        self,
        obj_id: str,
        frame_id: str,
        camera_id: Optional[str],
        timestamp: float
    ):
        """Update object state in Redis."""
        obj_data = self.redis.get_object(obj_id)
        
        if not obj_data:
            # Initialize new object
            self.redis.set_object(obj_id, {
                'class': 'unknown',
                'status': 'pending',
                'orbit_deg': 0.0,
                'views': 1,
                'best_frames': {},
                'conf_class': 0.0,
                'scale_conf': 0.0,
                'last_seen_ts': timestamp
            })
        else:
            # Update existing object
            views = int(obj_data.get('views', 0)) + 1
            self.redis.update_object_field(obj_id, 'views', views)
            self.redis.update_object_field(obj_id, 'last_seen_ts', timestamp)
    
    def check_quality_thresholds(self, obj_id: str) -> Dict[str, Any]:
        """
        Check if object meets quality thresholds for admission.
        
        Args:
            obj_id: Object identifier
            
        Returns:
            Dictionary with threshold check results
        """
        obj_data = self.redis.get_object(obj_id)
        if not obj_data:
            return {'meets_thresholds': False, 'reason': 'Object not found'}
        
        metrics = self.redis.get_metrics(obj_id)
        
        # Check thresholds
        orbit_deg = float(obj_data.get('orbit_deg', 0))
        mvs_consistency = float(metrics.get('mvs_consistency', 1.0))
        silhouette_iou = float(metrics.get('silhouette_iou', 0.0))
        texture_cov = float(metrics.get('texture_cov', 0.0))
        scale_conf = float(obj_data.get('scale_conf', 0.0))
        
        checks = {
            'orbit_deg': orbit_deg >= self.thresholds['orbit_deg_min'],
            'mvs_consistency': mvs_consistency <= self.thresholds['mvs_consistency_max'],
            'silhouette_iou': silhouette_iou >= self.thresholds['silhouette_iou_min'],
            'texture_cov': texture_cov >= self.thresholds['texture_cov_min'],
            'scale_conf': scale_conf >= self.thresholds['scale_conf_min']
        }
        
        meets_thresholds = all(checks.values())
        
        return {
            'meets_thresholds': meets_thresholds,
            'checks': checks,
            'values': {
                'orbit_deg': orbit_deg,
                'mvs_consistency': mvs_consistency,
                'silhouette_iou': silhouette_iou,
                'texture_cov': texture_cov,
                'scale_conf': scale_conf
            }
        }
    
    def transition_status(
        self,
        obj_id: str,
        new_status: str,
        reason: Optional[str] = None
    ) -> bool:
        """
        Transition object status.
        
        Args:
            obj_id: Object identifier
            new_status: New status ('pending', 'observing', 'ready', 'quarantine')
            reason: Optional reason for transition
            
        Returns:
            True if transition successful
        """
        valid_statuses = ['pending', 'observing', 'ready', 'quarantine']
        if new_status not in valid_statuses:
            logger.error(f"Invalid status: {new_status}")
            return False
        
        obj_data = self.redis.get_object(obj_id)
        if not obj_data:
            logger.warning(f"Object not found: {obj_id}")
            return False
        
        old_status = obj_data.get('status', 'pending')
        
        # Update status
        self.redis.update_object_field(obj_id, 'status', new_status)
        
        # Update notes if reason provided
        if reason:
            notes = json.loads(obj_data.get('notes', '{}') or '{}')
            notes['status_transitions'] = notes.get('status_transitions', [])
            notes['status_transitions'].append({
                'from': old_status,
                'to': new_status,
                'reason': reason,
                'timestamp': datetime.now().isoformat()
            })
            self.redis.update_object_field(obj_id, 'notes', json.dumps(notes))
        
        logger.info(f"Object {obj_id} status: {old_status} → {new_status}")
        
        # Handle queue operations
        if new_status == 'ready':
            # Remove from recon queue (if present)
            # Object is ready for use
            pass
        elif new_status == 'quarantine':
            # Push to quarantine queue
            self.redis.push_to_quarantine(obj_id, reason or 'Quality check failed')
        elif new_status == 'observing':
            # Keep in triage queue for re-evaluation
            pass
        
        return True
    
    def force_admit(self, obj_id: str, reason: str = "Manual override") -> bool:
        """
        Force admit object to recon queue (manual override).
        
        Args:
            obj_id: Object identifier
            reason: Reason for manual override
            
        Returns:
            True if successful
        """
        obj_data = self.redis.get_object(obj_id)
        if not obj_data:
            return False
        
        # Update status to observing
        self.transition_status(obj_id, 'observing', reason)
        
        # Push to recon queue
        self.redis.push_to_recon(obj_id)
        
        logger.info(f"Object {obj_id} force-admitted to recon queue")
        
        return True
    
    def force_quarantine(self, obj_id: str, reason: str) -> bool:
        """
        Force quarantine object (manual override).
        
        Args:
            obj_id: Object identifier
            reason: Reason for quarantine
            
        Returns:
            True if successful
        """
        return self.transition_status(obj_id, 'quarantine', reason)
    
    def get_object_status(self, obj_id: str) -> Optional[Dict[str, Any]]:
        """
        Get object status from Redis.
        
        Args:
            obj_id: Object identifier
            
        Returns:
            Dictionary with object status and data
        """
        obj_data = self.redis.get_object(obj_id)
        if not obj_data:
            return None
        
        metrics = self.redis.get_metrics(obj_id)
        views = self.redis.get_view_count(obj_id)
        
        return {
            'obj_id': obj_id,
            'status': obj_data.get('status', 'pending'),
            'class': obj_data.get('class', 'unknown'),
            'orbit_deg': float(obj_data.get('orbit_deg', 0)),
            'views': views,
            'metrics': metrics,
            'last_seen_ts': obj_data.get('last_seen_ts'),
            'best_frames': json.loads(obj_data.get('best_frames', '{}') or '{}')
        }
    
    def list_objects(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List objects by status.
        
        Args:
            status: Optional status filter
            
        Returns:
            List of object status dictionaries
        """
        # Note: In production, you'd maintain a Redis SET of object IDs
        # For now, this is a placeholder - would need to scan or maintain index
        logger.warning("list_objects: Full scan not implemented - use with care")
        return []
    
    def update_thresholds(self, thresholds: Dict[str, float]):
        """Update quality thresholds (builder configuration)."""
        self.thresholds.update(thresholds)
        logger.info(f"Quality thresholds updated: {self.thresholds}")
    
    def get_thresholds(self) -> Dict[str, float]:
        """Get current quality thresholds."""
        return self.thresholds.copy()


# Global object brain instance
_brain_instance: Optional[ObjectBrain] = None


def get_object_brain() -> ObjectBrain:
    """Get global object brain instance."""
    global _brain_instance
    if _brain_instance is None:
        _brain_instance = ObjectBrain()
    return _brain_instance


def reset_brain():
    """Reset global object brain instance."""
    global _brain_instance
    _brain_instance = None


