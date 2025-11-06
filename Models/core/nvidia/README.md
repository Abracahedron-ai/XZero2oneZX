# NVIDIA OmniVinci Model Loader

This module loads the `nvidia/omnivinci` model to enable scene reactions to external environment stimuli.

## Quick Start

```python
from Models.core.nvidia.omnivinci_loader import load_omnivinci

# Load model directly
model = load_omnivinci()
```

## Usage Examples

### Basic Usage

```python
from Models.core.nvidia import get_omnivinci_model

# Load model (singleton pattern - loads once)
model = get_omnivinci_model()

# Use the model for scene reactions
# ... your code here ...
```

### Advanced Usage

```python
from Models.core.nvidia import OmniVinciModelLoader

# Create loader instance
loader = OmniVinciModelLoader(model_name="nvidia/omnivinci")

# Load to specific device
model = loader.load_model(device="cuda")  # or "cpu", "mps"

# Check if loaded
if loader.is_loaded():
    print("Model is ready!")

# Get model instance
model = loader.get_model()

# Unload when done
loader.unload_model()
```

## Requirements

The model loader requires:
- `transformers` (already in requirements.txt)
- `torch` (already in requirements.txt)
- HuggingFace token (if model requires authentication)

## Device Support

The loader automatically detects the best available device:
- CUDA (if GPU available)
- MPS (if Apple Silicon)
- CPU (fallback)

## Notes

- The model uses `trust_remote_code=True` and `torch_dtype="auto"` as specified
- The loader implements a singleton pattern to avoid loading the model multiple times
- Model is automatically moved to the best available device




