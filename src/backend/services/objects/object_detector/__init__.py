"""
Object Detector Package

Factory pattern for multiple detection backends:
- YOLOv8 (fast, balanced)
- Detectron2 (Meta, highly accurate)
- MetaCLIP (classification and detection)
- Custom detectors
"""

from .detector_factory import get_detector, DetectorFactory, DetectionResult, reset_detector

__all__ = ['get_detector', 'DetectorFactory', 'DetectionResult', 'reset_detector']


