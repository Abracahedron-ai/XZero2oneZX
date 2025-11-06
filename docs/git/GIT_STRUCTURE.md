# Git Repository Structure Guide

This document explains what should and should NOT be committed to git for the Zero2oneZ project.

## ✅ What SHOULD be in Git

### Core Source Code
- `python/` - Python services and utilities (excluding venv)
- `renderer/` - Next.js renderer application (excluding node_modules and .next)
- `services/` - Core service implementations
- `agents/` - Agent scripts and tools
- `electron/` - Electron main process code
- `database/` - Database schema and migrations
- `scripts/` - Setup and utility scripts
- `docker/` - Dockerfiles and Docker configs
- `monitoring/` - Prometheus and Grafana configs
- `docs/` - Documentation files
- `shaders/` - Shader files

### Configuration Files
- `docker-compose.yml` - Docker Compose configuration
- `package.json` - Root package.json
- `package-lock.json` - Lock files (if you want reproducible builds)
- `requirements.txt` - Python dependencies
- `livekit.yaml` - LiveKit configuration
- `README.md` - Project documentation

### Project-Specific Code
- `blender-mcp/` - Blender MCP addon (if it's your code)
- `fabric-video-editor/` - Fabric video editor (if it's your code)
- `tsparticles/` - TSParticles library (if modified, otherwise use submodule)

## ❌ What should NOT be in Git

### Large Model Files
- `FBmap/model.safetensors` (2.1 GB) - **MUST be excluded**
- Any `.safetensors`, `.pt`, `.pth`, `.ckpt` files
- Model checkpoints in `Models/` directory
- These should be downloaded via scripts or stored separately

### Dependencies
- `node_modules/` - All Node.js dependencies
- `venv/` - All Python virtual environments
- `**/node_modules/` - Any nested node_modules
- `**/venv/` - Any nested Python venvs

### Build Artifacts
- `renderer/.next/` - Next.js build output
- `renderer/out/` - Next.js export output
- `dist/` - Distribution builds
- `build/` - Build directories
- `*.tsbuildinfo` - TypeScript build info

### Runtime Data
- `logs/` - All log files
- `*.log` - Any log files
- Database files (`.db`, `.sqlite`, `.sqlite3`)
- Docker volume data

### Third-Party Repositories
- `EXPERIMENTAL/` - Contains cloned third-party repos
  - These should be git submodules if you need to track them
  - Or excluded entirely if they're just for reference

### Cache and Temporary Files
- `__pycache__/` - Python cache
- `*.pyc` - Compiled Python files
- `.cache/` - Cache directories
- `temp/` and `tmp/` - Temporary files

### Environment and Secrets
- `.env` files
- `*.key`, `*.pem`, `*.cert` - Security keys
- `credentials/` - Credential directories

### Large Archives
- `blender-mcp-main.zip` - Should be excluded
- Any `.zip`, `.tar.gz` archives

## 🔧 Recommended Setup

### For Model Files
Create a script to download models after cloning:
```bash
python scripts/download_hf_models.py --output Models/cache
```

### For Third-Party Code in EXPERIMENTAL/
If you need to track specific experimental code:

**Option 1: Git Submodules**
```bash
git submodule add <repo-url> EXPERIMENTAL/project-name
```

**Option 2: Exclude Everything**
Keep `EXPERIMENTAL/` in `.gitignore` and manually copy only what you need into the main repo.

### For Dependencies
All dependencies should be installed via:
- `npm install` for Node.js
- `pip install -r requirements.txt` for Python
- Setup scripts handle this automatically

## 📝 Current Git Status

To check what's currently tracked:
```bash
git status
```

To see what would be ignored:
```bash
git status --ignored
```

## 🚀 Rebuild Process

After cloning, the project can be rebuilt using:

1. **Windows:**
   ```bash
   scripts\setup.bat
   ```

2. **Linux/Mac:**
   ```bash
   scripts/setup.sh
   ```

3. **Manual:**
   ```bash
   npm install
   cd renderer && npm install && cd ..
   cd python && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
   ```

4. **Download Models:**
   ```bash
   python scripts/download_hf_models.py --output Models/cache
   ```

5. **Start Services:**
   ```bash
   docker-compose up -d  # For database and infrastructure
   npm run dev  # For development
   ```

## 🔍 Checking Repository Size

To check if large files are accidentally tracked:
```bash
# Find large files in git history
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print substr($0,6)}' | sort -k2 -n | tail -10

# Check current repository size
du -sh .git
```

## ⚠️ Important Notes

1. **Never commit large model files** - They bloat the repository and slow down clones
2. **Never commit secrets** - Use environment variables and `.env` files (gitignored)
3. **Never commit dependencies** - They can be reinstalled from package managers
4. **Use Git LFS for large assets** - If you must track large files, use Git LFS
5. **Keep EXPERIMENTAL/ excluded** - Unless you specifically need to track something

## 📦 What Makes This Rebuildable?

The project is rebuildable because:
- ✅ All source code is tracked
- ✅ All configuration files are tracked
- ✅ Dependency lists are tracked (`package.json`, `requirements.txt`)
- ✅ Setup scripts are tracked
- ✅ Database schema is tracked
- ✅ Docker configs are tracked

What's NOT needed for rebuild:
- ❌ Pre-built dependencies (can be reinstalled)
- ❌ Model files (can be downloaded)
- ❌ Build artifacts (can be regenerated)
- ❌ Runtime data (will be created on first run)

