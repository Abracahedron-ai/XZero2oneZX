"""
Object Detector Factory

Factory pattern for multiple detection backends.
Supports YOLOv8, Detectron2, MetaCLIP, and custom detectors.
Builder-configurable via UI settings.
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class DetectionResult:
    """Detection result from object detector."""
    bbox: List[float]  # [x1, y1, x2, y2] or [x, y, width, height]
    class_id: int
    class_name: str
    confidence: float
    mask: Optional[np.ndarray] = None  # Optional segmentation mask
    features: Optional[np.ndarray] = None  # Optional feature embeddings


class DetectorFactory:
    """
    Factory for creating object detectors.
    
    Supports multiple backends:
    - YOLOv8: Fast, balanced accuracy
    - Detectron2: Meta, highly accurate
    - MetaCLIP: Classification and detection
    - Custom: User-defined detectors
    """
    
    _detectors: Dict[str, Any] = {}
    
    @staticmethod
    def create_detector(backend: str = "yolov8", **kwargs) -> Any:
        """
        Create detector instance.
        
        Args:
            backend: Detector backend ('yolov8', 'detectron2', 'metaclip', 'custom')
            **kwargs: Backend-specific configuration
            
        Returns:
            Detector instance
        """
        backend = backend.lower()
        
        if backend == "yolov8":
            return DetectorFactory._create_yolov8(**kwargs)
        elif backend == "detectron2":
            return DetectorFactory._create_detectron2(**kwargs)
        elif backend == "metaclip":
            return DetectorFactory._create_metaclip(**kwargs)
        elif backend == "custom":
            return DetectorFactory._create_custom(**kwargs)
        else:
            raise ValueError(f"Unknown detector backend: {backend}")
    
    @staticmethod
    def _create_yolov8(**kwargs) -> Any:
        """Create YOLOv8 detector."""
        try:
            from ultralytics import YOLO
            
            model_name = kwargs.get('model', 'yolov8n.pt')
            device = kwargs.get('device', 'cuda' if __import__('torch').cuda.is_available() else 'cpu')
            
            detector = YOLO(model_name)
            detector.model.to(device)
            
            logger.info(f"YOLOv8 detector created: {model_name} on {device}")
            
            class YOLOv8Detector:
                def __init__(self, model):
                    self.model = model
                    self.device = device
                
                def detect(self, image: np.ndarray) -> List[DetectionResult]:
                    """Detect objects in image."""
                    results = self.model(image, conf=kwargs.get('conf_threshold', 0.25))
                    
                    detections = []
                    for result in results:
                        boxes = result.boxes
                        for i in range(len(boxes)):
                            box = boxes.xyxy[i].cpu().numpy()
                            cls = int(boxes.cls[i])
                            conf = float(boxes.conf[i])
                            
                            detections.append(DetectionResult(
                                bbox=box.tolist(),
                                class_id=cls,
                                class_name=result.names[cls],
                                confidence=conf
                            ))
                    
                    return detections
            
            return YOLOv8Detector(detector)
            
        except ImportError:
            logger.warning("YOLOv8 not available. Install with: pip install ultralytics")
            return DetectorFactory._create_dummy()
    
    @staticmethod
    def _create_detectron2(**kwargs) -> Any:
        """Create Detectron2 detector."""
        try:
            import torch
            from detectron2 import model_zoo
            from detectron2.engine import DefaultPredictor
            from detectron2.config import get_cfg
            from detectron2.utils.visualizer import Visualizer
            from detectron2.data import MetadataCatalog
            
            cfg = get_cfg()
            cfg.MODEL.WEIGHTS = kwargs.get('weights', 'COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml')
            cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = kwargs.get('conf_threshold', 0.5)
            cfg.MODEL.DEVICE = kwargs.get('device', 'cuda' if torch.cuda.is_available() else 'cpu')
            
            predictor = DefaultPredictor(cfg)
            metadata = MetadataCatalog.get(cfg.DATASETS.TEST[0] if cfg.DATASETS.TEST else 'coco_2017_val')
            
            logger.info(f"Detectron2 detector created on {cfg.MODEL.DEVICE}")
            
            class Detectron2Detector:
                def __init__(self, predictor, metadata):
                    self.predictor = predictor
                    self.metadata = metadata
                
                def detect(self, image: np.ndarray) -> List[DetectionResult]:
                    """Detect objects in image."""
                    outputs = self.predictor(image)
                    
                    detections = []
                    instances = outputs["instances"]
                    
                    for i in range(len(instances)):
                        box = instances.pred_boxes[i].tensor[0].cpu().numpy()
                        cls = int(instances.pred_classes[i])
                        conf = float(instances.scores[i])
                        
                        # Get mask if available
                        mask = None
                        if instances.has("pred_masks"):
                            mask = instances.pred_masks[i].cpu().numpy()
                        
                        detections.append(DetectionResult(
                            bbox=box.tolist(),
                            class_id=cls,
                            class_name=self.metadata.thing_classes[cls] if cls < len(self.metadata.thing_classes) else f"class_{cls}",
                            confidence=conf,
                            mask=mask
                        ))
                    
                    return detections
            
            return Detectron2Detector(predictor, metadata)
            
        except ImportError:
            logger.warning("Detectron2 not available. Install with: pip install detectron2")
            return DetectorFactory._create_dummy()
    
    @staticmethod
    def _create_metaclip(**kwargs) -> Any:
        """Create MetaCLIP detector (using existing Facebook model swarm)."""
        try:
            from src.backend.services.ai.facebook_swarm.model_swarm import FacebookModelSwarm
            
            # Use MetaCLIP for classification and region proposal
            configs = [
                {"model_id": "metaclip", "model_path": "facebook/metaclip-h14-fullcc2.5b"}
            ]
            
            swarm = FacebookModelSwarm(configs)
            
            logger.info("MetaCLIP detector created via Facebook model swarm")
            
            class MetaCLIPDetector:
                def __init__(self, swarm):
                    self.swarm = swarm
                
                def detect(self, image: np.ndarray) -> List[DetectionResult]:
                    """Detect objects using MetaCLIP."""
                    # MetaCLIP is primarily for classification, so we'll do region-based classification
                    # This is a simplified implementation
                    from PIL import Image
                    
                    pil_image = Image.fromarray(image)
                    
                    # Use MetaCLIP for classification (this would need more sophisticated implementation)
                    # For now, return a dummy detection
                    detections = []
                    
                    # In production, you'd use MetaCLIP to classify regions and generate detections
                    # This is a placeholder
                    
                    return detections
            
            return MetaCLIPDetector(swarm)
            
        except Exception as e:
            logger.warning(f"MetaCLIP detector not available: {e}")
            return DetectorFactory._create_dummy()
    
    @staticmethod
    def _create_custom(**kwargs) -> Any:
        """Create custom detector from user-defined class."""
        detector_class = kwargs.get('detector_class')
        if detector_class is None:
            logger.warning("Custom detector class not provided")
            return DetectorFactory._create_dummy()
        
        try:
            return detector_class(**kwargs)
        except Exception as e:
            logger.error(f"Failed to create custom detector: {e}")
            return DetectorFactory._create_dummy()
    
    @staticmethod
    def _create_dummy() -> Any:
        """Create dummy detector for fallback."""
        class DummyDetector:
            def detect(self, image: np.ndarray) -> List[DetectionResult]:
                """Dummy detection - returns empty list."""
                logger.warning("Using dummy detector - no detections will be made")
                return []
        
        return DummyDetector()


# Global detector instance
_detector_instance: Optional[Any] = None
_detector_backend: Optional[str] = None


def get_detector(backend: str = "yolov8", **kwargs) -> Any:
    """
    Get or create detector instance (singleton pattern).
    
    Args:
        backend: Detector backend ('yolov8', 'detectron2', 'metaclip', 'custom')
        **kwargs: Backend-specific configuration
        
    Returns:
        Detector instance
    """
    global _detector_instance, _detector_backend
    
    if _detector_instance is None or _detector_backend != backend:
        _detector_instance = DetectorFactory.create_detector(backend, **kwargs)
        _detector_backend = backend
    
    return _detector_instance


def reset_detector():
    """Reset global detector instance."""
    global _detector_instance, _detector_backend
    _detector_instance = None
    _detector_backend = None


