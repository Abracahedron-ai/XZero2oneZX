# Zero2oneZ Production File Structure

This document describes the production-ready file/folder structure implemented for Zero2oneZ.

## Overview

The project is organized into clear categories:

- **`src/`** - Source code (version-controlled)
- **`assets/`** - Generated assets (not version-controlled)
- **`build/`** - Build artifacts (not version-controlled)
- **`runtime/`** - Runtime data (not version-controlled)
- **`config/`** - Configuration files
- **`docs/`** - Documentation
- **`specs/`** - Tool category specifications
- **`Models/`** - ML models (large files, gitignored)

## Directory Structure

```
Zero2oneZ/
├── src/                                    # Source code
│   ├── frontend/                          # React/Next.js frontend
│   │   ├── renderer/                      # Next.js application
│   │   └── electron/                      # Electron wrapper
│   │
│   ├── backend/                           # Python backend
│   │   ├── api/                           # FastAPI application
│   │   │   ├── main.py                    # API entry point
│   │   │   ├── models/                    # Pydantic models
│   │   │   ├── routes/                    # API routes
│   │   │   └── utils/                     # API utilities
│   │   │
│   │   ├── services/                      # Core services
│   │   │   ├── tools/                     # Tool registry, discovery, executor
│   │   │   ├── agents/                    # Agent factory, orchestrator
│   │   │   ├── assets/                     # Asset bus, TRELLIS generator
│   │   │   ├── objects/                    # Object brain, tracker, persistence
│   │   │   ├── ai/                         # OmniVinci, VGGT, emotion fusion
│   │   │   ├── audio/                      # Audio monitor, TTS wrappers
│   │   │   ├── video/                      # Video processing
│   │   │   ├── streaming/                  # LiveKit director
│   │   │   └── integrations/               # External integrations
│   │   │
│   │   ├── workers/                        # Background workers
│   │   └── utils/                          # Shared utilities
│   │
│   ├── agents/                             # AI agent scripts
│   ├── tools/                              # User-created tools
│   └── shaders/                            # Shader source files
│
├── assets/                                 # Generated assets
│   ├── models/                             # 3D models
│   │   ├── generated/                      # TRELLIS-generated
│   │   ├── imported/                       # Imported CAD/models
│   │   └── proxies/                        # Low-poly proxies
│   │
│   ├── textures/                            # Textures and materials
│   ├── audio/                               # Audio clips
│   │   ├── tts/                            # Generated TTS
│   │   ├── music/                          # Music library
│   │   └── sound_fx/                       # Sound effects
│   │
│   ├── video/                               # Video clips
│   └── cache/                               # Asset cache
│
├── build/                                   # Build artifacts
│   ├── tools/                               # Compiled/built tools
│   ├── frontend/                            # Next.js build output
│   └── backend/                             # Python build artifacts
│
├── runtime/                                 # Runtime data
│   ├── logs/                                # Application logs
│   ├── temp/                                # Temporary files
│   ├── cache/                                # Runtime cache
│   └── sessions/                            # User sessions
│
├── config/                                  # Configuration
│   ├── database/                            # Database configs
│   ├── docker/                              # Docker configs
│   ├── monitoring/                          # Prometheus/Grafana
│   └── livekit.yaml                         # LiveKit config
│
├── docs/                                    # Documentation
│   ├── architecture/                        # Architecture docs
│   ├── guides/                               # User guides
│   ├── api/                                  # API documentation
│   └── git/                                  # Git guides
│
├── specs/                                    # Tool category specs
│   ├── animation_tools/
│   ├── scene_building_tools/
│   ├── character_tools/
│   └── ... (other categories)
│
├── Models/                                   # ML models
│   ├── core/                                 # Core model loaders
│   ├── cache/                                # HuggingFace cache
│   └── legacy/                               # Legacy models
│
└── scripts/                                  # Setup and utility scripts
```

## Key Principles

1. **Source Code Separation**: All editable code is in `src/`
2. **Asset Organization**: Generated assets in `assets/`, organized by type
3. **Tool Separation**: Source tools in `src/tools/`, built tools in `build/tools/`
4. **Runtime Data**: All logs, temp files, and cache in `runtime/`
5. **Configuration**: All configs centralized in `config/`

## Import Paths

### Python

All Python imports should use paths relative to `src/`:

```python
from backend.services.tools.tool_registry import registry
from backend.services.objects.object_brain import get_object_brain
from backend.api.models.contracts import ExecuteCommand
```

### TypeScript

TypeScript imports use paths relative to `src/frontend/renderer/`:

```typescript
import SceneViewport from '../components/scene_building_tools/viewport/SceneViewport';
import RadialMenu from '../components/shared/RadialMenu';
```

## Asset Paths

- **3D Models**: `assets/models/generated/`
- **Textures**: `assets/textures/generated/`
- **Audio**: `assets/audio/tts/`, `assets/audio/music/`
- **Video**: `assets/video/clips/`

## Log Paths

All logs go to `runtime/logs/`:
- `runtime/logs/keylogger/`
- `runtime/logs/audio_monitor/`
- `runtime/logs/screenshots/`
- `runtime/logs/youtube_references/`
- `runtime/logs/spotify_clips/`

## Configuration

All configuration files are in `config/`:
- Database: `config/database/`
- Docker: `config/docker/`
- Monitoring: `config/monitoring/`



