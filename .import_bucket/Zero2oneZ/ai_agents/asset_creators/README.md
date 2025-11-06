# Asset Creators

This directory contains AI agents responsible for generating various types of assets for the Zero2oneZ platform.

## Overview

Asset creator agents run in the background to generate 3D models, textures, animations, and other content based on specifications and references. They use a combination of procedural generation techniques and machine learning models to create high-quality assets.

## Agent Types

- **3D Modeler**: Generates 3D geometry and models
- **Texture Artist**: Creates textures, materials, and surface properties
- **Animator**: Produces animations, poses, and motion sequences

## Common Features

- Reference image interpretation
- Style matching and transfer
- Quality validation and improvement
- Metadata generation and tagging
- Version management and iteration

## Technical Architecture

Asset creator agents:
- Run as background processes
- Can use headless versions of Blender, 3ds Max, or other content creation tools
- Export to standard formats like USD, glTF, or FBX
- Generate proxy versions for quick preview
- Support progressive refinement

## Integration

Asset creators integrate with:
- Asset shelf for making new content available
- Project management for tracking creation tasks
- Data processors for tagging and indexing
- Optimizers for resource-efficient asset variants
