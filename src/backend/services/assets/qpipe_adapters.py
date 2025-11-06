"""
QPipe Adapters for Scene Geometry and Asset Generation

Provides task-based adapters for:
- task="scene-geometry" → VGGT adapter (perception/mapping)
- task="image-to-3d-asset" → TRELLIS adapter (generation)
"""

import numpy as np
from typing import Dict, Optional, Any, Union
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class QPipeResponse:
    """QPipe task response."""
    task: str
    success: bool
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    error: Optional[str] = None


class QPipeAdapter:
    """
    QPipe adapter for routing tasks to appropriate processors.
    
    Routes:
    - "scene-geometry" → VGGT processor
    - "image-to-3d-asset" → TRELLIS generator
    """
    
    def __init__(self):
        """Initialize QPipe adapter."""
        self.vggt_processor = None
        self.trellis_generator = None
        self.asset_bus = None
        
        # Lazy load components
        self._init_components()
    
    def _init_components(self):
        """Lazy initialization of components."""
        try:
            from src.backend.services.ai.vggt_processor import get_vggt_processor
            self.vggt_processor = get_vggt_processor()
            logger.info("VGGT processor available")
        except Exception as e:
            logger.warning(f"VGGT not available: {e}")
        
        try:
            from src.backend.services.assets.trellis_generator import get_trellis_generator
            self.trellis_generator = get_trellis_generator()
            logger.info("TRELLIS generator available")
        except Exception as e:
            logger.warning(f"TRELLIS not available: {e}")
        
        try:
            from src.backend.services.assets.asset_bus import get_asset_bus
            self.asset_bus = get_asset_bus()
            logger.info("Asset bus available")
        except Exception as e:
            logger.warning(f"Asset bus not available: {e}")
    
    def process_task(
        self,
        task: str,
        inputs: Dict[str, Any]
    ) -> QPipeResponse:
        """
        Process a QPipe task.
        
        Args:
            task: Task type ("scene-geometry" or "image-to-3d-asset")
            inputs: Task inputs
            
        Returns:
            QPipeResponse with results
        """
        if task == "scene-geometry":
            return self._process_scene_geometry(inputs)
        
        elif task == "image-to-3d-asset":
            return self._process_image_to_asset(inputs)
        
        else:
            return QPipeResponse(
                task=task,
                success=False,
                data={},
                metadata={},
                error=f"Unknown task: {task}"
            )
    
    def _process_scene_geometry(self, inputs: Dict[str, Any]) -> QPipeResponse:
        """
        Process scene geometry task using VGGT.
        
        Inputs:
            - images: List of images or single image (numpy array)
            - query_points: Optional query points for tracking
            
        Returns:
            QPipeResponse with:
            - cams: Camera parameters (extrinsic/intrinsic)
            - depth: Depth maps
            - points: Point clouds
            - tracks: Tracks (if query_points provided)
        """
        if self.vggt_processor is None:
            return QPipeResponse(
                task="scene-geometry",
                success=False,
                data={},
                metadata={},
                error="VGGT processor not available"
            )
        
        try:
            images = inputs.get("images")
            if images is None:
                return QPipeResponse(
                    task="scene-geometry",
                    success=False,
                    data={},
                    metadata={},
                    error="No images provided"
                )
            
            # Convert single image to list
            if isinstance(images, np.ndarray):
                images = [images]
            
            # Process first image (or batch if supported)
            image = images[0] if isinstance(images, list) else images
            
            query_points = inputs.get("query_points")
            
            # Process with VGGT
            reconstruction = self.vggt_processor.process_numpy_image(
                image,
                query_points=query_points
            )
            
            # Extract geometry features
            geometry_features = self.vggt_processor.extract_geometry_features(
                reconstruction
            )
            
            return QPipeResponse(
                task="scene-geometry",
                success=True,
                data={
                    "cams": reconstruction.cameras,
                    "depth": reconstruction.depth_map.cpu().numpy(),
                    "points": geometry_features["point_cloud"],
                    "tracks": None,  # TODO: Extract from reconstruction if available
                    "spatial_understanding": geometry_features["spatial_understanding"],
                    "geometry_type": geometry_features["geometry_type"]
                },
                metadata={
                    "num_points": geometry_features["num_points"],
                    "model": "vggt",
                    "timestamp": reconstruction.timestamp.isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing scene geometry: {e}")
            return QPipeResponse(
                task="scene-geometry",
                success=False,
                data={},
                metadata={},
                error=str(e)
            )
    
    def _process_image_to_asset(self, inputs: Dict[str, Any]) -> QPipeResponse:
        """
        Process image-to-3D-asset task using TRELLIS.
        
        Inputs:
            - image: Input image (numpy array, path, or PIL Image)
            - text: Optional text prompt (for hybrid generation)
            - output_format: Desired format ('mesh', '3dgs', 'nerf', 'radiance_field')
            - asset_name: Optional name for the asset
            
        Returns:
            QPipeResponse with:
            - format: Asset format
            - paths: Asset file paths
            - asset_id: Asset identifier
        """
        if self.trellis_generator is None:
            return QPipeResponse(
                task="image-to-3d-asset",
                success=False,
                data={},
                metadata={},
                error="TRELLIS generator not available"
            )
        
        try:
            image = inputs.get("image")
            text = inputs.get("text")
            output_format = inputs.get("output_format", "mesh")
            asset_name = inputs.get("asset_name")
            
            # Generate asset
            if image is not None:
                asset = self.trellis_generator.generate_from_image(
                    image=image,
                    output_format=output_format,
                    asset_name=asset_name
                )
            elif text is not None:
                asset = self.trellis_generator.generate_from_text(
                    text_prompt=text,
                    output_format=output_format,
                    asset_name=asset_name
                )
            else:
                return QPipeResponse(
                    task="image-to-3d-asset",
                    success=False,
                    data={},
                    metadata={},
                    error="No image or text provided"
                )
            
            # Register with asset bus
            if self.asset_bus:
                self.asset_bus.register_asset(
                    asset_id=asset_name or asset.metadata.get("asset_name"),
                    asset_path=asset.asset_path,
                    format=asset.format,
                    asset_type=inputs.get("asset_type", "prop"),
                    metadata=asset.metadata
                )
            
            return QPipeResponse(
                task="image-to-3d-asset",
                success=True,
                data={
                    "format": asset.format,
                    "asset_path": asset.asset_path,
                    "texture_path": asset.texture_path,
                    "preview_path": asset.preview_path,
                    "asset_id": asset_name or asset.metadata.get("asset_name")
                },
                metadata=asset.metadata
            )
            
        except Exception as e:
            logger.error(f"Error processing image-to-asset: {e}")
            return QPipeResponse(
                task="image-to-3d-asset",
                success=False,
                data={},
                metadata={},
                error=str(e)
            )


# Global adapter instance
_adapter_instance: Optional[QPipeAdapter] = None


def get_qpipe_adapter() -> QPipeAdapter:
    """Get global QPipe adapter instance."""
    global _adapter_instance
    if _adapter_instance is None:
        _adapter_instance = QPipeAdapter()
    return _adapter_instance


def process_qpipe_task(task: str, inputs: Dict[str, Any]) -> QPipeResponse:
    """
    Convenience function for processing QPipe tasks.
    
    Args:
        task: Task type ("scene-geometry" or "image-to-3d-asset")
        inputs: Task inputs
        
    Returns:
        QPipeResponse with results
    """
    adapter = get_qpipe_adapter()
    return adapter.process_task(task, inputs)


