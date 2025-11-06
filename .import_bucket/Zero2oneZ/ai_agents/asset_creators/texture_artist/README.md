# Texture Artist

The Texture Artist agent is responsible for generating textures, materials, and surface properties for 3D models.

## Capabilities

- Generate PBR material sets (albedo, normal, roughness, metallic, etc.)
- Create stylized textures based on reference images
- Texture unwrapped 3D models automatically
- Transfer textures between different models
- Generate procedural textures and patterns
- Create texture variations and weathering
- Bake lighting and ambient occlusion
- Generate displacement and height maps
- Texture upscaling and enhancement

## Implementation

The Texture Artist agent uses:
- GAN-based texture synthesis
- Procedural texture generation
- Image-to-image translation
- Style transfer algorithms
- Texture baking via headless applications
- Material parameter optimization

## Input Formats

- Unwrapped 3D models
- Reference images
- Material descriptions
- Style guides
- Existing texture sets for transfer
- Surface property parameters

## Output Formats

- PNG/JPEG/TIFF textures
- Substance material definitions
- USDZ/USDA materials
- glTF material definitions
- MTL files

## Technical Requirements

- GPU-accelerated texture generation
- Support for various texture resolutions
- Automatic UV unwrapping capabilities
- PBR workflow compliance
- Texture quality validation
