# Quick Start Guide

## Starting the GUI

### Option 1: Use the Startup Script (Recommended)
```powershell
.\start-gui.ps1
```

This will:
- ✅ Check and install dependencies automatically
- ✅ Detect port conflicts and use alternative ports
- ✅ Start all services in separate visible windows
- ✅ Show status and access points

### Option 2: Manual Start
```bash
npm run dev
```

This starts all services concurrently (renderer, electron, python).

### Option 3: Start Individual Services

**Python API:**
```bash
npm run dev:python
```

**Next.js Renderer:**
```bash
npm run dev:renderer
```

**Electron:**
```bash
npm run dev:electron
```

## Access Points

Once services are running:
- **GUI**: http://localhost:3000
- **API Docs**: http://localhost:8001/docs
- **API**: http://localhost:8001

## Troubleshooting

### Electron not found
If you see `'electron' is not recognized`, run:
```bash
npm install
```

Then use `npx electron .` directly or the startup script.

### Port 8000 occupied
The startup script automatically uses port 8001 for the Python API.

### Next.js not starting
First build takes 3-5 minutes. Check the renderer window for progress.

