"""
UI Configuration Interface for Object Brain

FastAPI routes for builder configuration:
- Quality threshold configuration (per-class tunable)
- Detection backend selection
- Status overrides (force_admit, force_quarantine)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional, Any, List
import logging

from src.backend.services.objects.object_brain import get_object_brain
from src.backend.services.objects.object_detector import get_detector, reset_detector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/objects/config", tags=["object-brain-config"])


# === Pydantic Models ===

class QualityThresholds(BaseModel):
    """Quality threshold configuration."""
    orbit_deg_min: float = 240.0
    mvs_consistency_max: float = 0.1
    silhouette_iou_min: float = 0.7
    texture_cov_min: float = 0.6
    scale_conf_min: float = 0.8


class PerClassThresholds(BaseModel):
    """Per-class threshold configuration."""
    class_name: str
    thresholds: QualityThresholds


class DetectorConfig(BaseModel):
    """Detector backend configuration."""
    backend: str  # 'yolov8', 'detectron2', 'metaclip', 'custom'
    model: Optional[str] = None
    device: Optional[str] = None
    conf_threshold: Optional[float] = None
    kwargs: Optional[Dict[str, Any]] = None


class ObjectBrainConfig(BaseModel):
    """Complete object brain configuration."""
    thresholds: QualityThresholds
    per_class_thresholds: Optional[List[PerClassThresholds]] = None
    detector: DetectorConfig
    observation_window_sec: int = 30
    observation_min_views: int = 10
    quarantine_failed_attempts: int = 3


# === Configuration Endpoints ===

@router.get("/")
async def get_config():
    """Get current builder configuration."""
    try:
        brain = get_object_brain()
        
        # Get current thresholds
        thresholds = brain.get_thresholds()
        
        # Get current detector (would need to track this)
        detector_config = {
            'backend': 'yolov8',  # Default
            'model': None,
            'device': None,
            'conf_threshold': None
        }
        
        return {
            'thresholds': thresholds,
            'detector': detector_config,
            'observation_window_sec': brain.observation_window_sec,
            'observation_min_views': brain.observation_min_views,
            'quarantine_failed_attempts': brain.quarantine_failed_attempts
        }
        
    except Exception as e:
        logger.error(f"Error getting configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def update_config(config: ObjectBrainConfig):
    """Update builder configuration."""
    try:
        brain = get_object_brain()
        
        # Update thresholds
        thresholds_dict = {
            'orbit_deg_min': config.thresholds.orbit_deg_min,
            'mvs_consistency_max': config.thresholds.mvs_consistency_max,
            'silhouette_iou_min': config.thresholds.silhouette_iou_min,
            'texture_cov_min': config.thresholds.texture_cov_min,
            'scale_conf_min': config.thresholds.scale_conf_min
        }
        brain.update_thresholds(thresholds_dict)
        
        # Update detector backend
        if config.detector:
            detector_kwargs = config.detector.kwargs or {}
            if config.detector.model:
                detector_kwargs['model'] = config.detector.model
            if config.detector.device:
                detector_kwargs['device'] = config.detector.device
            if config.detector.conf_threshold:
                detector_kwargs['conf_threshold'] = config.detector.conf_threshold
            
            # Reset detector with new backend
            reset_detector()
            get_detector(config.detector.backend, **detector_kwargs)
        
        # Update observation settings
        brain.observation_window_sec = config.observation_window_sec
        brain.observation_min_views = config.observation_min_views
        brain.quarantine_failed_attempts = config.quarantine_failed_attempts
        
        logger.info("Configuration updated successfully")
        
        return {
            'success': True,
            'message': 'Configuration updated successfully'
        }
        
    except Exception as e:
        logger.error(f"Error updating configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/thresholds")
async def update_thresholds(thresholds: QualityThresholds):
    """Update quality thresholds."""
    try:
        brain = get_object_brain()
        
        thresholds_dict = {
            'orbit_deg_min': thresholds.orbit_deg_min,
            'mvs_consistency_max': thresholds.mvs_consistency_max,
            'silhouette_iou_min': thresholds.silhouette_iou_min,
            'texture_cov_min': thresholds.texture_cov_min,
            'scale_conf_min': thresholds.scale_conf_min
        }
        
        brain.update_thresholds(thresholds_dict)
        
        logger.info("Quality thresholds updated")
        
        return {
            'success': True,
            'thresholds': brain.get_thresholds()
        }
        
    except Exception as e:
        logger.error(f"Error updating thresholds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detector")
async def update_detector(config: DetectorConfig):
    """Update detector backend."""
    try:
        detector_kwargs = config.kwargs or {}
        if config.model:
            detector_kwargs['model'] = config.model
        if config.device:
            detector_kwargs['device'] = config.device
        if config.conf_threshold:
            detector_kwargs['conf_threshold'] = config.conf_threshold
        
        # Reset detector with new backend
        reset_detector()
        get_detector(config.backend, **detector_kwargs)
        
        logger.info(f"Detector backend updated: {config.backend}")
        
        return {
            'success': True,
            'backend': config.backend
        }
        
    except Exception as e:
        logger.error(f"Error updating detector: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/per-class-thresholds")
async def update_per_class_thresholds(per_class: PerClassThresholds):
    """Update per-class quality thresholds."""
    try:
        brain = get_object_brain()
        
        # For now, apply to all objects of this class
        # In production, would maintain per-class threshold mapping
        thresholds_dict = {
            'orbit_deg_min': per_class.thresholds.orbit_deg_min,
            'mvs_consistency_max': per_class.thresholds.mvs_consistency_max,
            'silhouette_iou_min': per_class.thresholds.silhouette_iou_min,
            'texture_cov_min': per_class.thresholds.texture_cov_min,
            'scale_conf_min': per_class.thresholds.scale_conf_min
        }
        
        brain.update_thresholds(thresholds_dict)
        
        logger.info(f"Per-class thresholds updated for: {per_class.class_name}")
        
        return {
            'success': True,
            'class_name': per_class.class_name,
            'thresholds': brain.get_thresholds()
        }
        
    except Exception as e:
        logger.error(f"Error updating per-class thresholds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


