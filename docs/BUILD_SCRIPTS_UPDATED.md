# Build Scripts Updated After Refactor

## Summary

All build scripts and configuration files have been updated to reflect the new `src/` directory structure.

## Files Updated

### 1. Root `package.json`
- ✅ `dev:renderer`: `cd renderer` → `cd src/frontend/renderer`
- ✅ `dev:python`: `cd python` → `cd src/backend/api`
- ✅ `build:renderer`: `cd renderer` → `cd src/frontend/renderer`
- ✅ `main`: `electron/main.js` → `src/frontend/electron/main.js`

### 2. Setup Scripts
- ✅ `scripts/setup.sh`: Updated paths for renderer and Python
- ✅ `scripts/setup.bat`: Updated paths for renderer and Python

### 3. Startup Scripts
- ✅ `start-gui.bat`: Updated paths for Python API and Next.js renderer

### 4. Electron Configuration
- ✅ `src/frontend/electron/main.js`: Updated Python path to `src/backend/api/main.py`

### 5. Configuration Files
- ✅ `.gitignore`: Updated build output paths
- ✅ `docker-compose.yml`: Updated all volume paths
  - `./python` → `./src/backend/api`
  - `./database` → `./config/database`
  - `./monitoring` → `./config/monitoring`
  - `./livekit.yaml` → `./config/livekit.yaml`

### 6. Documentation
- ✅ `README.md`: Updated directory structure documentation

## Path Changes Summary

| Old Path | New Path |
|----------|----------|
| `renderer/` | `src/frontend/renderer/` |
| `python/` | `src/backend/api/` |
| `database/` | `config/database/` |
| `monitoring/` | `config/monitoring/` |
| `livekit.yaml` | `config/livekit.yaml` |
| `electron/main.js` | `src/frontend/electron/main.js` |

## Running the Project

All scripts now work with the new structure:

```bash
# Install dependencies
npm install
cd src/frontend/renderer && npm install && cd ../../..
cd src/backend/api && pip install -r requirements.txt && cd ../../..

# Or use setup script
scripts/setup.sh  # Linux/Mac
scripts/setup.bat  # Windows

# Start development
npm run dev

# Or start components separately
npm run dev:renderer  # Next.js UI (port 3000)
npm run dev:electron  # Electron window
npm run dev:python    # FastAPI API (port 8001)

# Build
npm run build
```

## Verification

All paths have been verified:
- ✅ Build scripts point to correct locations
- ✅ Setup scripts install dependencies in correct locations
- ✅ Electron references correct Python and renderer paths
- ✅ Docker compose references correct config paths
- ✅ Git ignore excludes correct build outputs



