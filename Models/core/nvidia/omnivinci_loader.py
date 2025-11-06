"""
OmniVinci Model Loader

Loads the nvidia/omnivinci model for scene reaction to external environment.
This model enables natural scene reactions to external stimuli.
"""

import os
import sys
from typing import Optional, Any
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from transformers import AutoModel
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError as e:
    TRANSFORMERS_AVAILABLE = False
    logger.error(f"Transformers not available: {e}")
    logger.error("Install with: pip install transformers torch")


class OmniVinciModelLoader:
    """Loader for nvidia/omnivinci model."""
    
    def __init__(self, model_name: str = "nvidia/omnivinci"):
        """
        Initialize OmniVinci model loader.
        
        Args:
            model_name: HuggingFace model identifier
        """
        self.model_name = model_name
        self.model: Optional[Any] = None
        self.device = self._get_device()
        
    def _get_device(self) -> str:
        """Determine the best available device."""
        if not TRANSFORMERS_AVAILABLE:
            return "cpu"
        
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
    
    def load_model(self, device: Optional[str] = None, **kwargs) -> Any:
        """
        Load the OmniVinci model.
        
        Args:
            device: Target device (cuda/cpu/mps). Auto-detected if None.
            **kwargs: Additional arguments for AutoModel.from_pretrained()
            
        Returns:
            Loaded model instance
            
        Raises:
            ImportError: If transformers is not installed
            RuntimeError: If model loading fails
        """
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "transformers library is required. Install with: pip install transformers torch"
            )
        
        if device is None:
            device = self.device
        
        logger.info(f"Loading OmniVinci model: {self.model_name}")
        logger.info(f"Target device: {device}")
        
        try:
            # Load model with trust_remote_code and auto dtype
            model = AutoModel.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                torch_dtype="auto",
                **kwargs
            )
            
            # Move to device if not CPU
            if device != "cpu":
                model = model.to(device)
                logger.info(f"Model moved to {device}")
            
            self.model = model
            logger.info("OmniVinci model loaded successfully")
            
            return model
            
        except Exception as e:
            error_msg = f"Failed to load OmniVinci model: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e
    
    def get_model(self) -> Optional[Any]:
        """Get the loaded model instance."""
        return self.model
    
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model is not None
    
    def unload_model(self):
        """Unload the model and free memory."""
        if self.model is not None:
            del self.model
            self.model = None
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.info("OmniVinci model unloaded")


# Global singleton instance
_loader_instance: Optional[OmniVinciModelLoader] = None


def get_omnivinci_model(
    model_name: str = "nvidia/omnivinci",
    device: Optional[str] = None,
    reload: bool = False,
    **kwargs
) -> Any:
    """
    Get or load the OmniVinci model (singleton pattern).
    
    Args:
        model_name: HuggingFace model identifier
        device: Target device (cuda/cpu/mps). Auto-detected if None.
        reload: Force reload even if already loaded
        **kwargs: Additional arguments for AutoModel.from_pretrained()
        
    Returns:
        Loaded model instance
    """
    global _loader_instance
    
    if _loader_instance is None or reload:
        _loader_instance = OmniVinciModelLoader(model_name)
    
    if not _loader_instance.is_loaded() or reload:
        _loader_instance.load_model(device=device, **kwargs)
    
    return _loader_instance.get_model()


# Convenience function for direct loading
def load_omnivinci():
    """
    Load model directly - convenience function.
    
    Example:
        from Models.core.nvidia.omnivinci_loader import load_omnivinci
        model = load_omnivinci()
    """
    return get_omnivinci_model()


if __name__ == "__main__":
    """Test loading the model."""
    print("Testing OmniVinci model loader...")
    print("=" * 50)
    
    try:
        # Load model directly
        model = load_omnivinci()
        print(f"\n✅ Model loaded successfully!")
        print(f"Model type: {type(model)}")
        print(f"Device: {_loader_instance.device if _loader_instance else 'unknown'}")
        
    except Exception as e:
        print(f"\n❌ Error loading model: {e}")
        print("\nMake sure you have:")
        print("  - transformers installed: pip install transformers")
        print("  - torch installed: pip install torch")
        print("  - HuggingFace token if needed: huggingface-cli login")
        sys.exit(1)




