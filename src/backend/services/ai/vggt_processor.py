"""
VGGT (Visual Geometry Grounded Transformer) Processor

Integrates VGGT for 3D reconstruction and geometry extraction from images.
This provides accurate 3D geometry for OmniVinci environment understanding.

Based on: https://github.com/Abracahedron-ai/vggt
"""

import torch
import numpy as np
from typing import Dict, Optional, Any, List, Tuple
from dataclasses import dataclass
from datetime import datetime
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    from transformers import AutoModel
    import torch.nn.functional as F
    TRANSFORMERS_AVAILABLE = True
except ImportError as e:
    TRANSFORMERS_AVAILABLE = False
    logger.warning(f"Transformers not available: {e}")


@dataclass
class VGGTReconstruction:
    """VGGT 3D reconstruction results."""
    cameras: Dict[str, Any]  # Extrinsic and intrinsic matrices
    depth_map: torch.Tensor
    depth_conf: torch.Tensor
    point_map: torch.Tensor
    point_conf: torch.Tensor
    point_map_by_unprojection: torch.Tensor
    scene_geometry: Dict[str, Any]
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class VGGTProcessor:
    """
    VGGT Processor for 3D reconstruction and geometry extraction.
    
    Uses VGGT (Visual Geometry Grounded Transformer) to extract:
    - Camera poses (extrinsic/intrinsic)
    - Depth maps
    - Point clouds
    - 3D geometry
    """
    
    def __init__(
        self,
        model_name: str = "facebook/vggt",
        device: Optional[str] = None,
        dtype: Optional[torch.dtype] = None
    ):
        """
        Initialize VGGT processor.
        
        Args:
            model_name: HuggingFace model identifier for VGGT
            device: Target device (cuda/cpu). Auto-detected if None.
            dtype: Model dtype (float16/bfloat16). Auto if None.
        """
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers library is required")
        
        self.model_name = model_name
        self.device = device or self._get_device()
        self.dtype = dtype or torch.bfloat16 if torch.cuda.is_available() else torch.float32
        
        self.model: Optional[Any] = None
        self.aggregator: Optional[Any] = None
        self.camera_head: Optional[Any] = None
        self.depth_head: Optional[Any] = None
        self.point_head: Optional[Any] = None
        self.track_head: Optional[Any] = None
        
        logger.info(f"Initializing VGGT processor: {model_name}")
        logger.info(f"Device: {self.device}, dtype: {self.dtype}")
    
    def _get_device(self) -> str:
        """Determine the best available device."""
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
    
    def load_model(self) -> Any:
        """
        Load VGGT model.
        
        Returns:
            Loaded VGGT model
        """
        if self.model is not None:
            return self.model
        
        logger.info(f"Loading VGGT model: {self.model_name}")
        
        try:
            # Load VGGT model
            model = AutoModel.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                torch_dtype=self.dtype
            )
            
            # Move to device
            model = model.to(self.device)
            model.eval()
            
            # Extract model components
            if hasattr(model, 'aggregator'):
                self.aggregator = model.aggregator
            if hasattr(model, 'camera_head'):
                self.camera_head = model.camera_head
            if hasattr(model, 'depth_head'):
                self.depth_head = model.depth_head
            if hasattr(model, 'point_head'):
                self.point_head = model.point_head
            if hasattr(model, 'track_head'):
                self.track_head = model.track_head
            
            self.model = model
            logger.info("VGGT model loaded successfully")
            
            return model
            
        except Exception as e:
            error_msg = f"Failed to load VGGT model: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e
    
    def process_images(
        self,
        images: torch.Tensor,
        query_points: Optional[torch.Tensor] = None
    ) -> VGGTReconstruction:
        """
        Process images and extract 3D geometry.
        
        Args:
            images: Input images tensor (B, C, H, W) or (C, H, W)
            query_points: Optional query points for tracking (N, 2)
            
        Returns:
            VGGTReconstruction with 3D geometry
        """
        if self.model is None:
            self.load_model()
        
        # Add batch dimension if needed
        if images.dim() == 3:
            images = images[None]
        
        images = images.to(self.device)
        
        # Ensure images are in correct format
        if images.dtype != self.dtype:
            images = images.to(self.dtype)
        
        try:
            with torch.no_grad():
                with torch.cuda.amp.autocast(dtype=self.dtype) if self.device == "cuda" else torch.no_grad():
                    # Aggregate tokens
                    aggregated_tokens_list, ps_idx = self.aggregator(images)
                    
                    # Predict Cameras
                    pose_enc = self.camera_head(aggregated_tokens_list)[-1]
                    
                    # Convert pose encoding to extrinsic/intrinsic matrices
                    from vggt.utils.pose_enc import pose_encoding_to_extri_intri
                    extrinsic, intrinsic = pose_encoding_to_extri_intri(
                        pose_enc,
                        images.shape[-2:]
                    )
                    
                    # Predict Depth Maps
                    depth_map, depth_conf = self.depth_head(
                        aggregated_tokens_list,
                        images,
                        ps_idx
                    )
                    
                    # Predict Point Maps
                    point_map, point_conf = self.point_head(
                        aggregated_tokens_list,
                        images,
                        ps_idx
                    )
                    
                    # Construct 3D Points from Depth Maps and Cameras
                    from vggt.utils.geometry import unproject_depth_map_to_point_map
                    point_map_by_unprojection = unproject_depth_map_to_point_map(
                        depth_map.squeeze(0),
                        extrinsic.squeeze(0),
                        intrinsic.squeeze(0)
                    )
                    
                    # Predict Tracks (if query points provided)
                    track_list = None
                    vis_score = None
                    conf_score = None
                    
                    if query_points is not None and self.track_head is not None:
                        query_points = query_points.to(self.device)
                        if query_points.dim() == 2:
                            query_points = query_points[None]
                        
                        track_list, vis_score, conf_score = self.track_head(
                            aggregated_tokens_list,
                            images,
                            ps_idx,
                            query_points=query_points
                        )
                    
                    # Format scene geometry
                    scene_geometry = {
                        "num_points": point_map_by_unprojection.shape[0],
                        "point_cloud": point_map_by_unprojection.cpu().numpy(),
                        "depth_map_shape": depth_map.shape,
                        "point_map_shape": point_map.shape,
                        "has_tracks": track_list is not None
                    }
                    
                    # Create reconstruction result
                    reconstruction = VGGTReconstruction(
                        cameras={
                            "extrinsic": extrinsic.cpu().numpy(),
                            "intrinsic": intrinsic.cpu().numpy(),
                            "pose_encoding": pose_enc.cpu().numpy()
                        },
                        depth_map=depth_map,
                        depth_conf=depth_conf,
                        point_map=point_map,
                        point_conf=point_conf,
                        point_map_by_unprojection=point_map_by_unprojection,
                        scene_geometry=scene_geometry
                    )
                    
                    return reconstruction
                    
        except ImportError as e:
            # If vggt utils not available, use fallback
            logger.warning(f"VGGT utils not available: {e}, using fallback")
            return self._process_fallback(images)
            
        except Exception as e:
            logger.error(f"Error processing images with VGGT: {e}")
            raise
    
    def _process_fallback(self, images: torch.Tensor) -> VGGTReconstruction:
        """Fallback processing if VGGT utils not available."""
        logger.warning("Using fallback VGGT processing")
        
        # Create dummy reconstruction
        B, C, H, W = images.shape
        
        return VGGTReconstruction(
            cameras={
                "extrinsic": np.eye(4)[None],
                "intrinsic": np.array([[W, 0, W/2], [0, H, H/2], [0, 0, 1]])[None],
                "pose_encoding": np.zeros((B, 256))
            },
            depth_map=torch.ones((B, 1, H, W), device=self.device),
            depth_conf=torch.ones((B, 1, H, W), device=self.device),
            point_map=torch.zeros((B, 3, H, W), device=self.device),
            point_conf=torch.ones((B, 1, H, W), device=self.device),
            point_map_by_unprojection=torch.zeros((B, H*W, 3), device=self.device),
            scene_geometry={
                "num_points": H * W,
                "point_cloud": np.zeros((H * W, 3)),
                "depth_map_shape": (B, 1, H, W),
                "point_map_shape": (B, 3, H, W),
                "has_tracks": False
            }
        )
    
    def process_numpy_image(
        self,
        image: np.ndarray,
        query_points: Optional[np.ndarray] = None
    ) -> VGGTReconstruction:
        """
        Process numpy image array.
        
        Args:
            image: Input image as numpy array (H, W, C) or (C, H, W)
            query_points: Optional query points for tracking (N, 2)
            
        Returns:
            VGGTReconstruction with 3D geometry
        """
        # Convert numpy to tensor
        if isinstance(image, np.ndarray):
            # Normalize to [0, 1] if uint8
            if image.dtype == np.uint8:
                image = image.astype(np.float32) / 255.0
            
            # Convert to CHW format if needed
            if image.shape[-1] == 3:  # HWC format
                image = np.transpose(image, (2, 0, 1))
            
            image = torch.from_numpy(image).float()
        
        # Convert query points if provided
        query_points_tensor = None
        if query_points is not None:
            query_points_tensor = torch.from_numpy(query_points).float()
        
        return self.process_images(image, query_points_tensor)
    
    def extract_geometry_features(
        self,
        reconstruction: VGGTReconstruction
    ) -> Dict[str, Any]:
        """
        Extract geometry features from reconstruction for OmniVinci.
        
        Args:
            reconstruction: VGGT reconstruction result
            
        Returns:
            Dictionary with geometry features formatted for OmniVinci
        """
        point_cloud = reconstruction.scene_geometry["point_cloud"]
        
        # Extract features
        features = {
            "point_cloud": point_cloud,
            "num_points": len(point_cloud),
            "cameras": reconstruction.cameras,
            "depth_map": reconstruction.depth_map.cpu().numpy(),
            "spatial_understanding": "vggt_reconstructed",
            "geometry_type": "point_cloud_3d",
            "feature_dim": point_cloud.shape[1] if len(point_cloud.shape) > 1 else 3,
            "model_id": "vggt"
        }
        
        return features
    
    def unload_model(self):
        """Unload model and free memory."""
        if self.model is not None:
            del self.model
            self.model = None
            self.aggregator = None
            self.camera_head = None
            self.depth_head = None
            self.point_head = None
            self.track_head = None
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.info("VGGT model unloaded")


# Global processor instance
_processor_instance: Optional[VGGTProcessor] = None


def get_vggt_processor(
    model_name: str = "facebook/vggt",
    device: Optional[str] = None,
    reload: bool = False
) -> VGGTProcessor:
    """
    Get or create VGGT processor (singleton pattern).
    
    Args:
        model_name: HuggingFace model identifier
        device: Target device (cuda/cpu). Auto-detected if None.
        reload: Force reload even if already loaded
        
    Returns:
        VGGTProcessor instance
    """
    global _processor_instance
    
    if _processor_instance is None or reload:
        _processor_instance = VGGTProcessor(model_name=model_name, device=device)
    
    if _processor_instance.model is None or reload:
        _processor_instance.load_model()
    
    return _processor_instance


def reset_processor():
    """Reset global processor instance."""
    global _processor_instance
    if _processor_instance:
        _processor_instance.unload_model()
    _processor_instance = None


