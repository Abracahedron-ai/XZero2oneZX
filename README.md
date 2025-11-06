# Zero2oneZ - Runtime Agent Launcher with Radial Menu

A **Max-style layered compositor** with **runtime agent launcher**, **self-learning radial menu**, and **MCP tool discovery**. Agents become menu items on-the-fly.

---

## 🎯 New Features (Runtime Agent System)

- **Tool Registry** - Postgres-backed registry with semantic search (pgvector)
- **Discovery Bus** - Hot-register tools from MCP endpoints + file watchers
- **Capability Resolver** - Context-aware tool filtering (selection, mode, scene state)
- **Radial Menu** - Space-triggered menu with categories (Modeling/AI/Rigging/Recent)
- **Agent Executor** - Sandboxed execution with permissions, intent cards, and undo
- **Telemetry** - Usage tracking for learned ranking and "related" suggestions
- **Panic/Undo** - Revert all mutations from the last agent run

---

## 🏗️ Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│                   Tool Registry (Postgres)                   │
│  • Stores tool manifests (id, name, tags, context, perms)   │
│  • Semantic search via pgvector embeddings                   │
│  • TTL for generated tools (auto-cleanup)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │     Discovery Bus          │
         │  • MCP endpoint polling    │
         │  • File system watchers    │
         │  • Hot registration        │
         └──────────┬─────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐   ┌──────▼──────┐   ┌───▼────────┐
│ Capa-  │   │  In-Memory  │   │   Radial   │
│ bility │   │   Cache     │   │   Menu     │
│ Resolver│  │   (LRU)     │   │  (Space)   │
└────────┘   └─────────────┘   └────┬───────┘
                                     │
                            ┌────────▼────────┐
                            │ Agent Executor  │
                            │ • Sandbox       │
                            │ • Intent Card   │
                            │ • Mutation Log  │
                            └─────────────────┘
```

---

## 📦 Database Schema

```sql
-- Tool Registry
tool_registry (
  id, name, description, tags[], context_predicates,
  icon, required_perms[], command_schema, embedding,
  ttl, usage_count, last_used, source, status
)

-- Telemetry
tool_telemetry (
  tool_id, context, intent, execution_time_ms,
  success, error_message, output
)

-- Mutations (for undo)
agent_mutations (
  session_id, tool_id, mutation_type, target_path,
  before_state, after_state, reversible
)

-- Radial Slots
radial_slots (
  user_id, category, slot_index, tool_id, priority
)

-- MCP Endpoints
mcp_endpoints (
  name, url, manifest, health_status, last_ping
)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ with pgvector extension
- GPU with 4GB+ VRAM

### Installation

```bash
# 1. Setup database
createdb zero2onez
psql -U postgres -d zero2onez -f database/schema.sql

# 2. Install dependencies
cd D:\Zero2oneZ
scripts\setup.bat  # Windows

# 3. Configure database URL
# Edit src/backend/services/tools/tool_registry.py:
# DATABASE_URL = "postgresql://postgres:password@localhost:5432/zero2onez"
```

### Launch

```bash
# Start all services
npm run dev

# Access:
# - UI: http://localhost:3000 (auto-opens in Electron)
# - API: http://localhost:8000
# - Docs: http://localhost:8000/docs
```

---

## ⌨️ Hotkeys

| Key         | Action                          |
|-------------|---------------------------------|
| `Space`     | Open radial menu                |
| `1`         | Select Dashboard layer          |
| `2`         | Select Avatar layer             |
| `3`         | Select Camera layer             |
| `Tab`       | Cycle through layers            |
| `H`         | Toggle active layer visibility  |

---

## 🔧 Radial Menu Usage

1. **Press `Space`** to open the radial menu
2. **Search** by typing in the center input
3. **Browse by category** by clicking on the outer ring
4. **Select a tool** from the list
5. **Approve execution** if prompted (intent card)
6. **Undo** via API: `POST /undo` with `session_id`

---

## 🧠 Tool Manifest Format

Tools advertise themselves via JSON manifests:

```json
{
  "name": "Create Cube",
  "description": "Add a cube to the scene",
  "tags": ["modeling", "3d"],
  "context_predicates": {
    "selection": null
  },
  "icon": "box",
  "required_perms": ["scene:add"],
  "command_schema": {
    "type": "r3f",
    "component": "BoxGeometry"
  }
}
```

For Python scripts, embed as a comment:

```python
# TOOL_MANIFEST: {"name": "...", "tags": [...], ...}
```

---

## 🧱 Manipulation Runtime (Stage 1)

- **Layer Contracts** – Every layer now carries serialized transforms, pivots, flags, and unit metadata; mutations are applied atomically with undo/redo stacks capped at 256 entries.
- **Gizmo & Modes** – Hotkeys switch gizmo modes (W/E/R/`), transform spaces (1–5), axis locks (X/Y/Z), pivot editing, grid snapping (Ctrl+G), and record numeric overrides.
- **Pivot & Parenting Ops** – Runtime commands support bounds-center pivots, targeted pivot matching, temporary pivots, and parent changes with maintain-offset toggles.
- **Telemetry & Mutations** – Each mutation logs selection metrics, space, snap mode, and undo depth, and the renderer emits them to `/mutations/ingest` for server-side tracking.
- **API Contracts** – FastAPI exposes typed contracts for execute commands, manifests, and mutation ingest so agents/gateways can register capabilities and stream manipulation logs.

---

## 📥 Download Required Hugging Face Models

Use the helper script to pull every model referenced across the project (vision, audio, and multimodal):

```bash
# Authenticate if any repositories require it
huggingface-cli login

# Download into Models/cache (or choose another directory)
python scripts/download_hf_models.py --output Models/cache
```

You can supply `--hf-token <token>` instead of logging in interactively. The script fetches:

- `facebook/metaclip-h14-fullcc2.5b`
- `facebook/dinov2-giant`, `facebook/dinov2-small`
- `facebook/wav2vec2-large-960h`
- `facebook/musicgen-stereo-large`, `facebook/musicgen-stereo-small`
- `facebook/MobileLLM-R1-950M`, `facebook/MobileLLM-R1-140M`
- `nvidia/omnivinci`
- `Qwen/Qwen3-VL-2B-Instruct-GGUF` (GGUF weights only)
- `deepseek-ai/DeepSeek-OCR`

---

## 📁 Directory Structure

```
D:\Zero2oneZ\
├── config/
│   └── database/
│       └── schema.sql       # Postgres schema + seed data
├── src/
│   ├── backend/
│   │   └── api/
│   │       ├── main.py      # FastAPI server (updated)
│   │       └── routes/      # API routes
│   ├── frontend/
│   │   └── renderer/
│   │       ├── components/
│   │       │   └── RadialMenu.tsx   # Space-triggered radial menu
│   │       └── pages/
│   │           └── index.tsx        # Dashboard (updated)
│   ├── agents/
│   │   └── rig_generator.py     # Example agent script
│   └── tools/                   # User-added tools (watched)
└── services/
    ├── tool_registry.py       # Tool CRUD + search
    ├── discovery_bus.py       # MCP + file watchers
    ├── capability_resolver.py # Context filtering
    └── agent_executor.py      # Sandboxed execution
```

---

## 🪟 GUI Toolkit Layout

The repository root now contains a dedicated hierarchy documenting floating GUI panes:

- `animation_tools/` – Keyframe editor, master timeline, and pose library modules.
- `scene_building_tools/` – Asset shelf, hierarchy inspector, property editor, and viewport surfaces.
- `character_tools/` – Personality, emotion, behaviour tree, and dialogue authoring panes.
- `vfx_tools/`, `audio_tools/`, `project_management/`, `streaming/`, `video_production/`, `game_dev/`, `avatar_creation/`, `architectural_viz/`, `product_design/` – Domain clusters that map to specialised operator workflows.
- `ai_agents/` – Background agent manifests grouped by creators, analyzers, controllers, processors, optimizers, utilities, and experimental workers.

Each directory ships with a README outlining scope, data dependencies, and runtime integration points. Cross-cutting patterns live in `docs/GUI_GUIDE.md`.

### Prototype Reference

The imported reference GUI (legacy Redux-based layout, standalone CRA scaffold) now lives under `prototypes/gui_reference/`. Use it as a design baseline without impacting the Next.js renderer:

```bash
cd prototypes/gui_reference
npm install
npm start
```

---

## 🔌 API Endpoints (New)

### Tool Registry

- `POST /tools/register` - Register a new tool
- `GET /tools/{tool_id}` - Get tool by ID
- `POST /tools/search` - Search tools (query, tags, context)
- `GET /tools/recent` - Get recently used tools

### Capability Resolver

- `POST /resolve` - Resolve tools for context
- `GET /category/{category}` - Get tools by category

### Agent Executor

- `POST /execute` - Execute a tool (with sandbox)
- `POST /undo` - Undo session mutations

### Discovery

- `POST /discovery/trigger` - Manual discovery scan
- `GET /discovery/status` - Discovery bus status

---

## 🎨 Adding a New Tool

### Method 1: File Drop (Auto-Discovery)

1. Create a Python script in `D:\Zero2oneZ\agents\`
2. Add manifest comment at the top:
   ```python
   # TOOL_MANIFEST: {"name": "My Tool", "tags": ["ai"], ...}
   ```
3. Discovery bus auto-registers it within 30 seconds

### Method 2: MCP Endpoint

1. Stand up an MCP server at `http://localhost:3001`
2. Expose `/mcp/manifest` with tool definitions
3. Discovery bus polls every 30 seconds

### Method 3: Manual Registration

```python
import requests

requests.post("http://localhost:8000/tools/register", json={
    "name": "Custom Tool",
    "tags": ["custom"],
    "command_schema": {"type": "script", "path": "..."},
})
```

---

## 🛡️ Permissions

Tools declare required permissions:

- `fs:read` - Read file system
- `fs:write` - Write file system
- `gpu:compute` - Use GPU compute
- `network` - Network access
- `scene:add` - Add objects to scene
- `scene:modify` - Modify scene objects

Users must approve tools with `fs:write`, `network`, or `gpu:compute`.

---

## 🔄 Telemetry & Learning

The system tracks:

- **Context** when tool was invoked (selection, mode, scene state)
- **Execution time** and **success rate**
- **Usage count** and **last used timestamp**

This data powers:

- **Smart ranking** (popular + recent tools rank higher)
- **Related suggestions** (tools used in similar contexts)
- **Auto-cleanup** (unused generated tools expire after TTL)

---

## 🎯 Roadmap

### Phase 1: Runtime Agent System ✅
- [x] Tool Registry (Postgres + pgvector)
- [x] Discovery Bus (MCP + file watchers)
- [x] Capability Resolver (context filtering)
- [x] Radial Menu (Space-triggered)
- [x] Agent Executor (sandbox + permissions)
- [x] Telemetry + usage tracking
- [x] Panic/undo system

### Phase 2: Advanced Features
- [ ] Semantic search via embeddings (OpenAI/local)
- [ ] Intent cards with risk assessment
- [ ] Agent plan streaming (show step-by-step)
- [ ] Auto-injection of generated code into registry
- [ ] GPU budget tokens (NVML integration)
- [ ] Multi-user radial layouts
- [ ] MCP server discovery via DNS-SD

### Phase 3: Avatar + Scene
- [ ] Load GLTF avatars with blend shapes
- [ ] IK rig generator agent
- [ ] Viseme lip-sync from audio
- [ ] RVM segmentation shader
- [ ] OBS Virtual Camera output

---

## 📜 License

MIT

---

**Zero2oneZ** - *Agents that become menu items.*
