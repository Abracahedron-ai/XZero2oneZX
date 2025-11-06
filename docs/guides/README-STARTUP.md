# Zero2oneZ GUI Startup Guide

## Quick Start

### Option 1: PowerShell Script (Recommended)
```powershell
.\start-gui.ps1
```

### Option 2: Batch Script
```batch
start-gui.bat
```

### Option 3: Manual Start
```bash
npm run dev
```

## Services

The GUI consists of three main services:

1. **Next.js Renderer** - Port 3000
   - Web UI: http://localhost:3000
   - React-based frontend with Three.js for 3D rendering

2. **Python FastAPI Backend** - Port 8001
   - API: http://localhost:8001
   - API Docs: http://localhost:8001/docs
   - Tool registry and agent execution

3. **Electron Window** - Opens automatically
   - Desktop application wrapper
   - Loads the Next.js renderer

## Port Configuration

- **Port 8000**: May be occupied by Apache (httpd). If so, Python API uses port 8001.
- **Port 3000**: Next.js renderer (default)
- **Port 8001**: Python API (fallback if 8000 is occupied)

## Troubleshooting

### Port 8000 is occupied
The startup script automatically detects this and uses port 8001 for the Python API.

### Next.js not starting
- First build can take 3-5 minutes
- Check the renderer window for compilation errors
- Ensure Node.js dependencies are installed: `cd renderer && npm install`

### Python API not starting
- Check Python is installed: `python --version`
- Install dependencies: `cd python && pip install -r requirements.txt`
- Check the Python API window for errors

### Electron not opening
- Check if Electron is installed: `npm list electron`
- Install if needed: `npm install`
- Check the Electron window for errors

## Service Status

After starting, check service status:

```powershell
# Check ports
netstat -ano | Select-String ":3000|:8001"

# Check API
Invoke-WebRequest -Uri "http://localhost:8001"

# Check Renderer
Invoke-WebRequest -Uri "http://localhost:3000"
```

## Access Points

- **Browser (Renderer)**: http://localhost:3000
- **API Documentation**: http://localhost:8001/docs
- **API Root**: http://localhost:8001

## Notes

- First Next.js build may take several minutes
- Services start in separate windows so you can see logs
- All services support hot-reload during development
- Check the opened windows for detailed error messages

