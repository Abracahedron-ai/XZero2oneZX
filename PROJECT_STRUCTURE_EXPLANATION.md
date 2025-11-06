# Zero2oneZ Project Structure - Complete Explanation

This document explains every folder in the Zero2oneZ project, its purpose, location rationale, and development flow.

---

## ROOT LEVEL - Project Organization

### `src/` - **Source Code (Primary Development Directory)**
**Purpose:** Contains all application source code organized by layer (frontend, backend, agents, tools, shaders)

**Why here:** Root-level `src/` is a standard convention that clearly separates source code from configuration, assets, documentation, and build artifacts. This makes it immediately obvious where to find code vs. other project files.

**Logical placement:** 
- **Top-level** because it's the most frequently accessed directory during development
- **Separated from assets/config/docs** to maintain clean separation of concerns
- **Contains subdirectories by technology stack** (frontend/backend) for clear boundaries

**Development flow:** 
- Developers primarily work in `src/` for all code changes
- Frontend developers work in `src/frontend/`
- Backend developers work in `src/backend/`
- Agent developers work in `src/agents/`

---

### `src/frontend/` - **Frontend Application Layer**

#### `src/frontend/renderer/` - **Next.js React Application**
**Purpose:** Main UI application built with Next.js, React, Three.js, and React Three Fiber

**Why here:** 
- `renderer/` name indicates this renders the UI (distinct from Electron main process)
- Next.js structure requires its own directory with `pages/`, `components/`, `lib/`, etc.
- Separated from Electron code to maintain clear boundaries

**Structure:**
- `components/` - React components organized by feature domain
  - `animation_tools/` - Timeline, keyframe editor components
  - `scene_building_tools/` - Viewport, hierarchy editor, layer managers
  - `shared/` - Reusable components (RadialMenu, FloatingWindow)
  - `ui/` - UI primitives (ChatWindow, etc.)
- `pages/` - Next.js pages (routing)
- `lib/` - Shared utilities and state management
  - `compositor.ts` - Layer compositor state (Zustand store)
  - `config.ts` - API configuration
  - `timeline/tracks.ts` - Timeline state management
- `hooks/` - Custom React hooks
- `styles/` - Global CSS and Tailwind config

**Development flow:**
- Component development: `src/frontend/renderer/components/`
- State management: `src/frontend/renderer/lib/`
- Routing: `src/frontend/renderer/pages/`
- Styling: `src/frontend/renderer/styles/`

#### `src/frontend/electron/` - **Electron Desktop App Wrapper**
**Purpose:** Electron main process that launches the Next.js renderer and Python API sidecar

**Why here:** 
- Separate from renderer because Electron has two processes (main + renderer)
- `electron/` at same level as `renderer/` shows they're both frontend concerns but different layers
- Contains `main.js` (main process) and `preload.js` (IPC bridge)

**Development flow:**
- Electron-specific changes: `src/frontend/electron/`
- Main process logic: `src/frontend/electron/main.js`
- IPC communication: `src/frontend/electron/preload.js`

---

### `src/backend/` - **Backend Services Layer**

#### `src/backend/api/` - **FastAPI REST API**
**Purpose:** Main API server that exposes REST endpoints for tools, agents, and scene management

**Why here:**
- `api/` indicates this is the HTTP API layer (entry point for external requests)
- Contains FastAPI app (`main.py`), routes, models, and API-specific services
- Separated from business logic services to maintain API/business logic separation

**Structure:**
- `main.py` - FastAPI application entry point
- `routes/` - API route handlers
- `models/` - Pydantic models for request/response validation
- `services/` - API-specific services (tool registry, discovery, executor)
- `utils/` - API utilities (port management, logging, metrics)

**Development flow:**
- API endpoints: `src/backend/api/routes/`
- Request/response models: `src/backend/api/models/`
- API services: `src/backend/api/services/`

#### `src/backend/services/` - **Business Logic Services**
**Purpose:** Domain-specific services organized by functionality (AI, audio, video, objects, etc.)

**Why here:**
- `services/` contains reusable business logic that can be used by API, workers, or other services
- Organized by domain (ai/, audio/, video/, objects/) for clear separation of concerns
- Each service is self-contained with its own responsibilities

**Structure:**
- `agents/` - Agent factory, orchestrator, lifecycle management
- `ai/` - AI models (OmniVinci, VGGT, emotion fusion, Facebook swarm)
- `audio/` - Audio processing (TTS, ASR, sound analysis, viseme extraction)
- `video/` - Video processing (YouTube reference, vision screenshots)
- `objects/` - Object tracking, persistence, quality metrics
- `assets/` - Asset management (bus, TRELLIS generator, qpipe adapters)
- `streaming/` - LiveKit director for WebRTC streaming
- `integrations/` - External service wrappers (TTS, ASR, emotion, DSP)
- `tools/` - Tool registry, discovery, capability resolver, executor

**Development flow:**
- Service development: `src/backend/services/{domain}/`
- Service integration: Services are imported by API routes or other services
- Testing: Each service can be tested independently

#### `src/backend/utils/` - **Shared Backend Utilities**
**Purpose:** Common utilities used across backend services (Redis client, GPU scheduler)

**Why here:**
- `utils/` at backend level because these are backend-specific utilities
- Shared across all backend services, not API-specific
- Contains infrastructure concerns (Redis, GPU management)

**Development flow:**
- Utility functions: `src/backend/utils/`
- Used by services via imports

#### `src/backend/workers/` - **Background Workers**
**Purpose:** Background task workers (Celery, async processing)

**Why here:**
- `workers/` indicates background processing separate from API
- Can use same services from `src/backend/services/`
- Currently minimal (placeholder for future async workers)

---

### `src/agents/` - **AI Agent Scripts**
**Purpose:** Python scripts that implement AI agents for various tasks (3D modeling, animation, rigging, etc.)

**Why here:**
- `agents/` at `src/` level because agents are first-class citizens, not just backend services
- Organized by category (asset_creators/, behavior_controllers/, etc.) for discoverability
- Each agent has a README explaining its purpose and usage
- Auto-discovered by the discovery bus for tool registration

**Structure:**
- `asset_creators/` - 3D modelers, animators, texture artists, rig generators
- `behavior_controllers/` - Goal planners, interaction handlers, path finders
- `data_processors/` - Analytics aggregators, asset taggers, scene indexers
- `experimental/` - Bleeding-edge agent concepts
- `optimizers/` - LOD generators, render optimizers, resource allocators
- `scene_analyzers/` - Collision checkers, layout planners, object detectors
- `utilities/` - Asset compressors, file converters, format validators

**Development flow:**
- Agent development: `src/agents/{category}/{agent_name}/`
- Agent manifest: Each agent has `# TOOL_MANIFEST:` comment for auto-discovery
- Tool registration: Discovery bus watches `src/agents/` and registers agents as tools

---

### `src/tools/` - **User-Created Tools**
**Purpose:** User-created tools (currently empty, for future user extensions)

**Why here:**
- Separate from `src/agents/` to distinguish between built-in agents and user tools
- Also watched by discovery bus for tool registration
- Allows users to extend the system without modifying core agents

**Development flow:**
- User tools: `src/tools/`
- Auto-discovered like agents

---

### `src/shaders/` - **GLSL Shader Files**
**Purpose:** Fragment shaders for GPU effects (LUT, RVM)

**Why here:**
- `shaders/` at `src/` level because shaders are source code, not assets
- Used by Three.js/React Three Fiber for rendering effects
- Small, focused directory for shader source files

**Development flow:**
- Shader development: `src/shaders/`
- Imported by Three.js components

---

## ASSETS & RUNTIME DATA

### `assets/` - **Project Assets (Generated & Imported)**
**Purpose:** All project assets organized by type (models, textures, audio, video)

**Why here:**
- Root-level `assets/` because assets are project-wide, not code-specific
- Separated from `src/` to distinguish code from data
- Organized by type (models/, textures/, audio/, video/) for easy navigation
- Subdirectories separate generated vs. imported assets

**Structure:**
- `models/` - 3D models (generated/, imported/, proxies/)
- `textures/` - Textures and materials (generated/, imported/)
- `audio/` - Audio files (music/, sound_fx/, tts/)
- `video/` - Video clips and references
- `cache/` - Asset cache (embeddings/, models/)

**Development flow:**
- Asset generation: Services write to `assets/{type}/generated/`
- Asset import: Users place files in `assets/{type}/imported/`
- Asset usage: Frontend/backend reference assets from `assets/`

---

### `runtime/` - **Runtime Data (Logs, Temp, Cache)**
**Purpose:** Runtime-generated data that changes during execution (logs, temp files, cache)

**Why here:**
- Root-level `runtime/` because runtime data is project-wide, not code-specific
- Separated from `src/` and `assets/` to distinguish code/data from runtime state
- Contains ephemeral data (logs, temp files) that can be regenerated

**Structure:**
- `logs/` - Application logs organized by service (audio_monitor/, keylogger/, etc.)

**Development flow:**
- Logging: Services write to `runtime/logs/{service}/`
- Debugging: Developers check logs in `runtime/logs/`
- Cleanup: Logs can be deleted without affecting code/assets

---

## CONFIGURATION

### `config/` - **Configuration Files**
**Purpose:** All configuration files for databases, Docker, monitoring, etc.

**Why here:**
- Root-level `config/` because configuration is project-wide
- Separated from code to allow environment-specific configs
- Organized by system (database/, docker/, monitoring/)

**Structure:**
- `database/` - Database schema and migrations
- `docker/` - Docker configuration files
- `monitoring/` - Prometheus/Grafana configs
- `livekit.yaml` - LiveKit WebRTC server config

**Development flow:**
- Database changes: `config/database/migrations/`
- Docker changes: `config/docker/`
- Monitoring setup: `config/monitoring/`

---

## DOCUMENTATION

### `docs/` - **Project Documentation**
**Purpose:** All project documentation organized by category

**Why here:**
- Root-level `docs/` because documentation is project-wide
- Separated from code for easy access
- Organized by category (architecture/, api/, guides/, git/)

**Structure:**
- `architecture/` - System architecture documentation
- `api/` - API documentation (experimental/, main/)
- `guides/` - User guides and tutorials
- `git/` - Git workflow documentation

**Development flow:**
- Architecture docs: `docs/architecture/`
- API docs: `docs/api/`
- User guides: `docs/guides/`

---

## SCRIPTS & TOOLING

### `scripts/` - **Development & Maintenance Scripts**
**Purpose:** Utility scripts for setup, migration, validation, etc.

**Why here:**
- Root-level `scripts/` because scripts are project-wide utilities
- Separated from code to distinguish utilities from application code
- Contains setup, migration, and maintenance scripts

**Structure:**
- `setup.bat` / `setup.sh` - Environment setup
- `migrate_agents.py` - Agent migration scripts
- `download_hf_models.py` - Model download utilities
- `validate_models.py` - Model validation

**Development flow:**
- Setup: Run `scripts/setup.sh` or `scripts/setup.bat`
- Migrations: Run `scripts/migrate_agents.py`
- Maintenance: Run utility scripts as needed

---

## EXTERNAL DEPENDENCIES & INTEGRATIONS

### `Models/` - **ML Models & SDKs**
**Purpose:** Large ML models and SDKs (Audio2Face, HuggingFace models, etc.)

**Why here:**
- Root-level `Models/` (capitalized) to distinguish from `assets/models/` (project assets)
- Contains large binary files (models, SDKs) that are not source code
- Separated from `assets/` because models are dependencies, not project assets

**Structure:**
- `Audio2Face-3D/` - NVIDIA Audio2Face SDK
- `huggingface/` - HuggingFace model cache
- `core/` - Core model utilities

**Development flow:**
- Model downloads: Scripts download to `Models/`
- Model usage: Services load models from `Models/`

---

### `blender-mcp/` - **Blender MCP Integration**
**Purpose:** Blender MCP (Model Context Protocol) server for Blender integration

**Why here:**
- Root-level because it's a separate integration project
- Contains its own Python package structure
- Used by discovery bus to discover Blender tools

**Development flow:**
- Blender integration: `blender-mcp/`
- MCP endpoint: Discovery bus polls Blender MCP server

---

### `Deep-Live-Cam/` - **Deep Live Cam Integration**
**Purpose:** Deep Live Cam face animation library

**Why here:**
- Root-level because it's an external library integration
- Contains its own Python package and models
- Used by avatar services for face animation

**Development flow:**
- Face animation: Services use `Deep-Live-Cam/` library
- Model loading: Models loaded from `Deep-Live-Cam/models/`

---

### `adobe_tools/` - **Adobe Scripts & Templates**
**Purpose:** Adobe After Effects/Photoshop scripts and template generators

**Why here:**
- Root-level because it's a separate toolset for Adobe integration
- Contains ExtendScript (.jsx) files for Adobe apps
- Generates templates for compositor

**Development flow:**
- Template generation: Run scripts in `adobe_tools/tools/`
- Template usage: Templates used by compositor

---

### `fabric-video-editor/` - **Video Editor Integration**
**Purpose:** Fabric.js-based video editor (separate project)

**Why here:**
- Root-level because it's a separate Next.js project
- May be integrated into main renderer in future
- Currently separate for independent development

---

### `tsparticles/` - **Particle System Library**
**Purpose:** TypeScript particle system library (dependency)

**Why here:**
- Root-level because it's a large dependency
- May be moved to `node_modules/` in future
- Used for particle effects in renderer

---

## EXPERIMENTAL & LEGACY

### `EXPERIMENTAL/` - **Experimental Features**
**Purpose:** Experimental features and prototypes (BettaFish, etc.)

**Why here:**
- Root-level to clearly mark as experimental
- Separated from `src/` to indicate not production-ready
- Allows experimentation without affecting main codebase

**Development flow:**
- Experiments: `EXPERIMENTAL/`
- When ready: Move to `src/` or `src/agents/experimental/`

---

### `python/` - **Legacy Python Code (Empty)**
**Purpose:** Legacy directory (should be removed, code moved to `src/backend/`)

**Why here:**
- Legacy from before reorganization
- Should be cleaned up

---

### `agents/` - **Legacy Agents Directory (Empty)**
**Purpose:** Legacy directory (should be removed, code moved to `src/agents/`)

**Why here:**
- Legacy from before reorganization
- Should be cleaned up

---

### `tools/` - **Legacy Tools Directory (Empty)**
**Purpose:** Legacy directory (should be removed, code moved to `src/tools/`)

**Why here:**
- Legacy from before reorganization
- Should be cleaned up

---

## BUILD & DEPENDENCIES

### `node_modules/` - **Node.js Dependencies**
**Purpose:** NPM package dependencies (auto-generated)

**Why here:**
- Standard Node.js convention
- Auto-generated by `npm install`
- Git-ignored

---

### `venv/` - **Python Virtual Environment**
**Purpose:** Python virtual environment (auto-generated)

**Why here:**
- Standard Python convention
- Auto-generated by `python -m venv venv`
- Git-ignored

---

## ROOT FILES

### `package.json` - **Root Package Configuration**
**Purpose:** Root-level NPM package for orchestrating all services

**Why here:**
- Root-level because it orchestrates the entire project
- Contains scripts to run frontend, backend, and Electron together
- Uses `concurrently` to run multiple services

**Development flow:**
- Run all services: `npm run dev`
- Run individual services: `npm run dev:renderer`, `npm run dev:python`, etc.

---

### `docker-compose.yml` - **Docker Services**
**Purpose:** Docker Compose configuration for PostgreSQL, Redis, NATS, LiveKit, etc.

**Why here:**
- Root-level because it defines project-wide infrastructure
- Contains all external services needed by the application

**Development flow:**
- Start services: `docker-compose up`
- Stop services: `docker-compose down`

---

### `README.md` - **Project Documentation**
**Purpose:** Main project README with quick start and architecture overview

**Why here:**
- Standard convention (root-level README)
- First file developers see

---

### `start-gui.ps1` / `start-gui.bat` - **Startup Scripts**
**Purpose:** Windows scripts to start all services (Python API, Next.js, Electron)

**Why here:**
- Root-level for easy access
- Convenience scripts for Windows users

**Development flow:**
- Start project: Run `start-gui.ps1` or `start-gui.bat`

---

## DEVELOPMENT FLOW SUMMARY

### **Code Organization Philosophy:**
1. **Separation of Concerns:** Code (`src/`), Assets (`assets/`), Config (`config/`), Docs (`docs/`)
2. **Layer Separation:** Frontend (`src/frontend/`), Backend (`src/backend/`), Agents (`src/agents/`)
3. **Domain Organization:** Services organized by domain (ai/, audio/, video/, etc.)
4. **Feature Co-location:** Components and their READMEs in same directory

### **Typical Development Workflow:**

1. **Frontend Development:**
   - Component: `src/frontend/renderer/components/{feature}/`
   - State: `src/frontend/renderer/lib/{feature}.ts`
   - Page: `src/frontend/renderer/pages/`

2. **Backend Development:**
   - API Endpoint: `src/backend/api/routes/{feature}.py`
   - Service: `src/backend/services/{domain}/{service}.py`
   - Model: `src/backend/api/models/{feature}.py`

3. **Agent Development:**
   - Agent Script: `src/agents/{category}/{agent_name}/{agent_name}.py`
   - Manifest: `# TOOL_MANIFEST:` comment in agent file
   - Auto-discovery: Discovery bus registers agent as tool

4. **Asset Management:**
   - Generated: Services write to `assets/{type}/generated/`
   - Imported: Users place in `assets/{type}/imported/`
   - Usage: Code references `assets/` paths

5. **Configuration:**
   - Database: `config/database/schema.sql` and `migrations/`
   - Docker: `config/docker/`
   - Monitoring: `config/monitoring/`

### **Logical Placement Rationale:**

- **`src/` at root:** Most frequently accessed, standard convention
- **Frontend/Backend separation:** Different tech stacks, different teams
- **Services by domain:** Clear boundaries, easy to find related code
- **Assets separate from code:** Different lifecycle, different tools
- **Config separate from code:** Environment-specific, version-controlled separately
- **Docs separate from code:** Easier to maintain, can be versioned independently
- **External integrations at root:** Large dependencies, may be moved to submodules later

This structure supports:
- **Scalability:** Clear boundaries make it easy to add new features
- **Maintainability:** Related code is co-located
- **Discoverability:** Intuitive folder names and organization
- **Team collaboration:** Different teams can work in different directories
- **Build optimization:** Clear separation allows for optimized build processes

