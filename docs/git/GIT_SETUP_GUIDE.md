# Git Setup Guide for Zero2oneZ

## Quick Summary

This guide explains what should and shouldn't be in git, and how to properly set up the repository for rebuilding.

## ✅ What's Been Configured

### 1. Updated `.gitignore`
- Excludes all large model files (`.safetensors`, `.pt`, `.pth`, `.ckpt`)
- Excludes all dependencies (`node_modules/`, `venv/`)
- Excludes all build artifacts (`.next/`, `dist/`, `build/`)
- Excludes `EXPERIMENTAL/` directory (third-party repos)
- Excludes logs, cache, and temporary files
- Excludes environment files and secrets

### 2. Created Documentation
- `docs/GIT_STRUCTURE.md` - Detailed guide on what should/shouldn't be in git
- `docs/GIT_SETUP_GUIDE.md` - This quick setup guide

## 🔍 Current Status

### Files That Should NOT Be Committed (But Currently Are)

Based on `git status`, these directories are currently untracked but may contain items that shouldn't be committed:

1. **EXPERIMENTAL/** - Contains many third-party repositories
   - Should be excluded entirely (already in `.gitignore`)
   - Or converted to git submodules if you need to track them

2. **Models/** - May contain large model files
   - Model files (`.safetensors`, `.pt`, etc.) are now excluded
   - Only schemas and configs should be tracked

3. **FBmap/model.safetensors** - 2.1 GB file
   - Now excluded via `.gitignore`
   - Should be downloaded via script instead

4. **blender-mcp-main.zip** - Archive file
   - Now excluded via `.gitignore`
   - Extract if needed, but don't commit the zip

5. **logs/** - Runtime logs
   - Now excluded via `.gitignore`

## 🚀 How to Rebuild This Project

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd Zero2oneZ
```

### Step 2: Install Dependencies

**Windows:**
```bash
scripts\setup.bat
```

**Linux/Mac:**
```bash
scripts/setup.sh
```

**Manual:**
```bash
# Root dependencies
npm install

# Renderer dependencies
cd renderer && npm install && cd ..

# Python dependencies
cd python
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

### Step 3: Download Models (If Needed)
```bash
# Authenticate with Hugging Face if needed
huggingface-cli login

# Download all referenced models
python scripts/download_hf_models.py --output Models/cache
```

### Step 4: Start Infrastructure Services
```bash
# Start database, Redis, NATS, etc.
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Step 5: Start Development
```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:renderer  # Next.js UI (port 3000)
npm run dev:electron  # Electron window
npm run dev:python    # FastAPI API (port 8000)
```

## 📋 What Makes This Rebuildable

The project is rebuildable because these essential files ARE tracked in git:

✅ **Source Code**
- `python/` - All Python services
- `renderer/` - Next.js renderer
- `services/` - Core services
- `agents/` - Agent scripts
- `electron/` - Electron main process

✅ **Configuration**
- `docker-compose.yml` - Docker services
- `package.json` - Node.js dependencies
- `requirements.txt` - Python dependencies
- `livekit.yaml` - LiveKit config
- `monitoring/` - Prometheus/Grafana configs

✅ **Database Schema**
- `database/schema.sql` - Database structure
- `database/migrations/` - Migration files

✅ **Setup Scripts**
- `scripts/setup.bat` / `scripts/setup.sh`
- `scripts/download_hf_models.py`

✅ **Documentation**
- `README.md`
- `docs/` - All documentation

## ❌ What's NOT Needed for Rebuild

These are excluded and can be regenerated:

❌ **Dependencies** - Can be installed via package managers
❌ **Model Files** - Can be downloaded via scripts
❌ **Build Artifacts** - Can be regenerated
❌ **Runtime Data** - Created on first run
❌ **Third-Party Repos** - In `EXPERIMENTAL/` (reference only)

## 🔧 Handling Nested Git Repos

If you find nested `.git` directories in subdirectories:

### Option 1: Remove Nested Repos (Recommended)
If you don't need to track those repos separately:
```bash
# Find nested .git directories
Get-ChildItem -Path . -Filter ".git" -Directory -Recurse | Where-Object { $_.FullName -ne ".\.git" }

# Remove them (be careful!)
# This will make those directories part of the main repo
```

### Option 2: Convert to Git Submodules
If you need to track third-party repos:
```bash
# Remove the directory from git
git rm -r --cached EXPERIMENTAL/some-repo

# Add as submodule
git submodule add <repo-url> EXPERIMENTAL/some-repo
```

### Option 3: Keep Excluded
If they're just for reference, keep them in `.gitignore` (already done).

## ⚠️ Important Notes

1. **Large Files**: Never commit files > 100MB. Use Git LFS if necessary.
2. **Secrets**: Never commit `.env` files or API keys.
3. **Dependencies**: Always commit `package.json` and `requirements.txt`, but never `node_modules/` or `venv/`.
4. **Models**: Download models via scripts, don't commit them.
5. **EXPERIMENTAL/**: Keep excluded unless you need specific code from there.

## 🧪 Testing the Setup

After setting up, verify everything works:

```bash
# Check services are up
curl http://localhost:8000/docs  # FastAPI docs
curl http://localhost:3000       # Next.js UI

# Check database
docker exec zero2onez-postgres psql -U postgres -d zero2onez -c "\dt"

# Check Python environment
cd python
venv\Scripts\activate  # Windows
python -c "import fastapi; print('FastAPI OK')"
```

## 📊 Repository Health

To check if your repository is healthy:

```bash
# Check repository size
du -sh .git

# Check for large files in history
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print substr($0,6)}' | sort -k2 -n | tail -10

# Check ignored files
git status --ignored
```

## 🎯 Next Steps

1. Review what's currently untracked: `git status`
2. Add only essential files: `git add <files>`
3. Commit: `git commit -m "Initial commit with proper .gitignore"`
4. Test rebuild on a fresh clone to ensure it works

## 📚 Additional Resources

- See `docs/GIT_STRUCTURE.md` for detailed explanations
- See `README.md` for project overview
- See `scripts/setup.bat` or `scripts/setup.sh` for setup process

