"""
Quality Metrics Calculator

Computes quality metrics for objects:
- MVS consistency (Multi-View Stereo)
- Silhouette IoU
- Photometric error
- Depth variance
- Pose spread
- Texture coverage
- Overall quality score (weighted blend)
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
import logging
import math

logger = logging.getLogger(__name__)


class QualityMetricsCalculator:
    """
    Calculator for object quality metrics.
    
    Computes:
    - MVS consistency: Multi-view stereo consistency score (lower is better)
    - Silhouette IoU: Silhouette Intersection over Union (0-1, higher is better)
    - Photometric error: Photometric error across views (lower is better)
    - Depth variance: Depth variance across views (lower is better)
    - Pose spread: Pose spread in degrees (higher is better for coverage)
    - Texture coverage: Texture coverage percentage (0-1, higher is better)
    - Scale confidence: Scale confidence (0-1, higher is better)
    """
    
    def __init__(self):
        """Initialize quality metrics calculator."""
        pass
    
    def calculate_mvs_consistency(
        self,
        depth_maps: List[np.ndarray],
        poses: List[Dict[str, Any]],
        intrinsics: List[np.ndarray]
    ) -> float:
        """
        Calculate Multi-View Stereo (MVS) consistency.
        
        Measures how consistent depth maps are across different views.
        Lower score = more consistent (better).
        
        Args:
            depth_maps: List of depth maps from different views
            poses: List of camera poses (extrinsic matrices)
            intrinsics: List of intrinsic matrices
            
        Returns:
            MVS consistency score (lower is better, typically 0-1)
        """
        if len(depth_maps) < 2:
            return 1.0  # High error if insufficient views
        
        try:
            # Project depth maps to 3D points
            points_3d_list = []
            for i, (depth_map, pose, intrinsic) in enumerate(zip(depth_maps, poses, intrinsics)):
                points_3d = self._depth_to_3d_points(depth_map, pose, intrinsic)
                points_3d_list.append(points_3d)
            
            # Calculate consistency by comparing projected points
            # Simplified: calculate variance of depth values
            all_depths = []
            for depth_map in depth_maps:
                valid_depths = depth_map[depth_map > 0]
                if len(valid_depths) > 0:
                    all_depths.extend(valid_depths.flatten())
            
            if len(all_depths) == 0:
                return 1.0
            
            # Normalize variance (0-1 scale)
            depth_variance = np.var(all_depths)
            depth_mean = np.mean(all_depths)
            
            if depth_mean == 0:
                return 1.0
            
            consistency = min(depth_variance / (depth_mean ** 2), 1.0)
            
            return float(consistency)
            
        except Exception as e:
            logger.error(f"Error calculating MVS consistency: {e}")
            return 1.0  # Return high error on failure
    
    def calculate_silhouette_iou(
        self,
        masks: List[np.ndarray],
        bboxes: List[List[float]]
    ) -> float:
        """
        Calculate Silhouette Intersection over Union.
        
        Measures how well silhouettes overlap across views.
        Higher score = better overlap (better).
        
        Args:
            masks: List of segmentation masks
            bboxes: List of bounding boxes
            
        Returns:
            Silhouette IoU score (0-1, higher is better)
        """
        if len(masks) < 2:
            return 0.0
        
        try:
            # If masks are available, use them
            if masks and all(mask is not None for mask in masks):
                # Calculate pairwise IoU between masks
                ious = []
                for i in range(len(masks)):
                    for j in range(i + 1, len(masks)):
                        iou = self._mask_iou(masks[i], masks[j])
                        ious.append(iou)
                
                if ious:
                    return float(np.mean(ious))
            
            # Fallback: use bounding box IoU
            if bboxes and len(bboxes) >= 2:
                ious = []
                for i in range(len(bboxes)):
                    for j in range(i + 1, len(bboxes)):
                        iou = self._bbox_iou(bboxes[i], bboxes[j])
                        ious.append(iou)
                
                if ious:
                    return float(np.mean(ious))
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating silhouette IoU: {e}")
            return 0.0
    
    def calculate_photometric_error(
        self,
        images: List[np.ndarray],
        poses: List[Dict[str, Any]],
        intrinsics: List[np.ndarray]
    ) -> float:
        """
        Calculate photometric error.
        
        Measures photometric consistency across views.
        Lower score = more consistent (better).
        
        Args:
            images: List of images
            poses: List of camera poses
            intrinsics: List of intrinsic matrices
            
        Returns:
            Photometric error (lower is better, typically 0-1)
        """
        if len(images) < 2:
            return 1.0
        
        try:
            # Simplified: calculate color variance across overlapping regions
            # In production, would do proper warping and comparison
            
            errors = []
            for i in range(len(images)):
                for j in range(i + 1, len(images)):
                    # Calculate mean squared error between images
                    # Simplified: use histogram comparison
                    hist1 = np.histogram(images[i].flatten(), bins=256)[0]
                    hist2 = np.histogram(images[j].flatten(), bins=256)[0]
                    
                    # Normalize histograms
                    hist1 = hist1 / (hist1.sum() + 1e-8)
                    hist2 = hist2 / (hist2.sum() + 1e-8)
                    
                    # Calculate chi-squared distance
                    chi_squared = np.sum(((hist1 - hist2) ** 2) / (hist1 + hist2 + 1e-8))
                    errors.append(chi_squared)
            
            if errors:
                # Normalize to 0-1 scale
                error = np.mean(errors)
                normalized_error = min(error / 100.0, 1.0)  # Rough normalization
                return float(normalized_error)
            
            return 1.0
            
        except Exception as e:
            logger.error(f"Error calculating photometric error: {e}")
            return 1.0
    
    def calculate_depth_variance(
        self,
        depth_maps: List[np.ndarray]
    ) -> float:
        """
        Calculate depth variance.
        
        Measures variance in depth values across views.
        Lower score = more consistent (better).
        
        Args:
            depth_maps: List of depth maps
            
        Returns:
            Depth variance (lower is better, normalized 0-1)
        """
        if len(depth_maps) < 2:
            return 1.0
        
        try:
            all_depths = []
            for depth_map in depth_maps:
                valid_depths = depth_map[depth_map > 0]
                if len(valid_depths) > 0:
                    all_depths.extend(valid_depths.flatten())
            
            if len(all_depths) == 0:
                return 1.0
            
            variance = np.var(all_depths)
            mean = np.mean(all_depths)
            
            if mean == 0:
                return 1.0
            
            # Normalize variance
            normalized_variance = min(variance / (mean ** 2), 1.0)
            
            return float(normalized_variance)
            
        except Exception as e:
            logger.error(f"Error calculating depth variance: {e}")
            return 1.0
    
    def calculate_pose_spread(
        self,
        poses: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate pose spread in degrees.
        
        Measures how spread out camera poses are around the object.
        Higher score = better coverage (better).
        
        Args:
            poses: List of camera poses
            
        Returns:
            Pose spread in degrees (0-360, higher is better)
        """
        if len(poses) < 2:
            return 0.0
        
        try:
            # Extract camera positions
            positions = []
            for pose in poses:
                if 'translation' in pose:
                    positions.append(np.array(pose['translation']))
                elif 'extrinsic' in pose:
                    # Extract translation from extrinsic matrix
                    extrinsic = np.array(pose['extrinsic'])
                    if extrinsic.shape == (4, 4):
                        translation = extrinsic[:3, 3]
                        positions.append(translation)
            
            if len(positions) < 2:
                return 0.0
            
            # Calculate center
            center = np.mean(positions, axis=0)
            
            # Calculate angles from center
            angles = []
            for pos in positions:
                vec = pos - center
                if np.linalg.norm(vec) > 0:
                    # Calculate angle in XY plane (azimuth)
                    angle = math.atan2(vec[1], vec[0]) * 180 / math.pi
                    angles.append(angle)
            
            if len(angles) < 2:
                return 0.0
            
            # Calculate coverage (similar to orbit calculation)
            angles_sorted = sorted(angles)
            max_gap = 0.0
            
            for i in range(len(angles_sorted)):
                gap = (angles_sorted[(i + 1) % len(angles_sorted)] - angles_sorted[i]) % 360
                max_gap = max(max_gap, gap)
            
            coverage = 360 - max_gap
            
            return float(coverage)
            
        except Exception as e:
            logger.error(f"Error calculating pose spread: {e}")
            return 0.0
    
    def calculate_texture_coverage(
        self,
        images: List[np.ndarray],
        masks: Optional[List[np.ndarray]] = None
    ) -> float:
        """
        Calculate texture coverage percentage.
        
        Measures how much of the object is covered by visible texture.
        Higher score = better coverage (better).
        
        Args:
            images: List of images
            masks: Optional list of segmentation masks
            
        Returns:
            Texture coverage (0-1, higher is better)
        """
        if not images:
            return 0.0
        
        try:
            # Simplified: estimate texture coverage from image variance
            # In production, would analyze actual texture on object surface
            
            coverages = []
            for img in images:
                if img is None:
                    continue
                
                # Calculate texture variance (higher variance = more texture)
                if len(img.shape) == 3:
                    gray = np.mean(img, axis=2)
                else:
                    gray = img
                
                variance = np.var(gray)
                
                # Normalize (rough heuristic)
                normalized_variance = min(variance / 10000.0, 1.0)
                coverages.append(normalized_variance)
            
            if coverages:
                return float(np.mean(coverages))
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating texture coverage: {e}")
            return 0.0
    
    def calculate_scale_confidence(
        self,
        bboxes: List[List[float]],
        depths: Optional[List[float]] = None
    ) -> float:
        """
        Calculate scale confidence.
        
        Measures confidence in object scale estimation.
        Higher score = more confident (better).
        
        Args:
            bboxes: List of bounding boxes
            depths: Optional list of depth values
            
        Returns:
            Scale confidence (0-1, higher is better)
        """
        if not bboxes:
            return 0.0
        
        try:
            # Calculate bbox sizes
            sizes = []
            for bbox in bboxes:
                if len(bbox) >= 4:
                    width = bbox[2] - bbox[0]
                    height = bbox[3] - bbox[1]
                    size = width * height
                    sizes.append(size)
            
            if len(sizes) < 2:
                return 0.5  # Medium confidence with single view
            
            # Higher confidence if sizes are consistent
            size_variance = np.var(sizes)
            size_mean = np.mean(sizes)
            
            if size_mean == 0:
                return 0.0
            
            # Normalize variance (lower variance = higher confidence)
            normalized_variance = min(size_variance / (size_mean ** 2), 1.0)
            confidence = 1.0 - normalized_variance
            
            return float(max(0.0, min(1.0, confidence)))
            
        except Exception as e:
            logger.error(f"Error calculating scale confidence: {e}")
            return 0.0
    
    def calculate_quality_score(
        self,
        orbit_deg: float,
        mvs_consistency: float,
        silhouette_iou: float,
        texture_cov: float,
        scale_conf: float,
        weights: Optional[Dict[str, float]] = None
    ) -> float:
        """
        Calculate overall quality score (weighted blend).
        
        Formula:
        understanding_score = 0.3*orbit + 0.25*(1-mvs_consistency) + 0.2*silhouette_iou + 0.15*texture_cov + 0.1*scale_conf
        
        Args:
            orbit_deg: Orbit coverage in degrees (0-360)
            mvs_consistency: MVS consistency (0-1, lower is better)
            silhouette_iou: Silhouette IoU (0-1, higher is better)
            texture_cov: Texture coverage (0-1, higher is better)
            scale_conf: Scale confidence (0-1, higher is better)
            weights: Optional custom weights
            
        Returns:
            Overall quality score (0-1, higher is better)
        """
        if weights is None:
            weights = {
                'orbit': 0.3,
                'mvs': 0.25,
                'silhouette': 0.2,
                'texture': 0.15,
                'scale': 0.1
            }
        
        # Normalize orbit to 0-1
        orbit_norm = min(orbit_deg / 360.0, 1.0)
        
        # Invert MVS consistency (lower is better, so invert)
        mvs_inv = 1.0 - mvs_consistency
        
        # Calculate weighted score
        score = (
            weights['orbit'] * orbit_norm +
            weights['mvs'] * mvs_inv +
            weights['silhouette'] * silhouette_iou +
            weights['texture'] * texture_cov +
            weights['scale'] * scale_conf
        )
        
        return float(max(0.0, min(1.0, score)))
    
    def _depth_to_3d_points(
        self,
        depth_map: np.ndarray,
        pose: Dict[str, Any],
        intrinsic: np.ndarray
    ) -> np.ndarray:
        """Convert depth map to 3D points (simplified)."""
        # Placeholder - would do proper 3D reconstruction
        return np.zeros((100, 3))
    
    def _mask_iou(self, mask1: np.ndarray, mask2: np.ndarray) -> float:
        """Calculate IoU between two masks."""
        intersection = np.logical_and(mask1, mask2).sum()
        union = np.logical_or(mask1, mask2).sum()
        
        if union == 0:
            return 0.0
        
        return float(intersection / union)
    
    def _bbox_iou(self, bbox1: List[float], bbox2: List[float]) -> float:
        """Calculate IoU between two bounding boxes."""
        if len(bbox1) < 4 or len(bbox2) < 4:
            return 0.0
        
        x1_1, y1_1, x2_1, y2_1 = bbox1[:4]
        x1_2, y1_2, x2_2, y2_2 = bbox2[:4]
        
        # Intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i < x1_i or y2_i < y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        # Union
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        if union == 0:
            return 0.0
        
        return float(intersection / union)


# Global calculator instance
_calculator_instance: Optional[QualityMetricsCalculator] = None


def get_quality_calculator() -> QualityMetricsCalculator:
    """Get global quality metrics calculator instance."""
    global _calculator_instance
    if _calculator_instance is None:
        _calculator_instance = QualityMetricsCalculator()
    return _calculator_instance


