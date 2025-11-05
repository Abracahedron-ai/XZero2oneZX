# Git Quick Reference - Zero2oneZ

## 🎯 Quick Answer: What Should Be in Git?

### ✅ INCLUDE (Source Code & Configs)
```
✓ python/                    # Python services
✓ renderer/                  # Next.js app (no node_modules)
✓ services/                  # Core services
✓ agents/                    # Agent scripts
✓ electron/                  # Electron main
✓ database/                  # Schema & migrations
✓ scripts/                   # Setup scripts
✓ docker/                    # Dockerfiles
✓ monitoring/                # Prometheus/Grafana configs
✓ docs/                      # Documentation
✓ shaders/                   # Shader files
✓ *.json, *.yml, *.yaml      # Config files
✓ *.md                       # Documentation
✓ *.sql                      # Database schema
✓ *.py, *.ts, *.tsx, *.js    # Source code
```

### ❌ EXCLUDE (Dependencies & Artifacts)
```
✗ node_modules/              # All Node.js deps
✗ venv/                      # All Python venvs
✗ __pycache__/               # Python cache
✗ *.pyc, *.pyo               # Compiled Python
✗ .next/, dist/, build/      # Build outputs
✗ *.log, logs/               # Log files
✗ .env, *.key, *.pem         # Secrets
✗ *.db, *.sqlite             # Database files
✗ EXPERIMENTAL/              # Third-party repos
✗ Models/*.safetensors        # Large model files
✗ Models/*.pt, *.pth, *.ckpt # Model checkpoints
✗ FBmap/*.safetensors        # Large models
✗ blender-mcp-main.zip       # Archives
✗ *.zip, *.tar.gz            # Large archives
```

## 📊 Current Status Summary

Based on `git status`, these are currently untracked:

### Should Be Added:
- ✅ Core source code (`python/`, `renderer/`, `services/`, `agents/`)
- ✅ Configuration files (`docker-compose.yml`, `package.json`, `livekit.yaml`)
- ✅ Database schema (`database/schema.sql`)
- ✅ Setup scripts (`scripts/`)
- ✅ Documentation (`README.md`, `docs/`)

### Should NOT Be Added:
- ❌ `EXPERIMENTAL/` - Third-party repos (already in `.gitignore`)
- ❌ `Models/` - Large model files (now excluded)
- ❌ `FBmap/model.safetensors` - 2.1 GB file (now excluded)
- ❌ `blender-mcp-main.zip` - Archive (now excluded)
- ❌ `logs/` - Runtime logs (now excluded)
- ❌ Any `node_modules/` or `venv/` directories

## 🚀 Quick Setup Commands

### Initial Setup
```bash
# 1. Install dependencies
scripts\setup.bat  # Windows
# or
scripts/setup.sh   # Linux/Mac

# 2. Download models (if needed)
python scripts/download_hf_models.py --output Models/cache

# 3. Start infrastructure
docker-compose up -d

# 4. Start development
npm run dev
```

### What to Add to Git
```bash
# Add core files
git add .gitignore
git add README.md
git add package.json
git add docker-compose.yml
git add python/
git add renderer/  # (excluding node_modules)
git add services/
git add agents/
git add database/
git add scripts/
git add docs/
git add monitoring/
git add electron/
git add shaders/
git add livekit.yaml

# Check what will be added
git status
```

### What to Verify Before Committing
```bash
# Check for large files
git status | Select-String "EXPERIMENTAL|Models|FBmap|\.zip|\.safetensors|\.pt|\.pth"

# Should show nothing (these should be ignored)

# Check for secrets
git status | Select-String "\.env|\.key|\.pem|secrets"

# Should show nothing

# Check for dependencies
git status | Select-String "node_modules|venv|__pycache__"

# Should show nothing
```

## 📝 File Size Guidelines

- **< 1 MB**: ✅ Usually fine to commit
- **1-10 MB**: ⚠️ Consider if necessary
- **10-100 MB**: ❌ Use Git LFS or exclude
- **> 100 MB**: ❌ Must exclude (GitHub limit)

## 🔍 Verification Checklist

Before committing, verify:

- [ ] No files > 100 MB
- [ ] No `node_modules/` or `venv/` directories
- [ ] No `.env` or secret files
- [ ] No large model files (`.safetensors`, `.pt`, `.pth`)
- [ ] No `EXPERIMENTAL/` directory contents
- [ ] No `logs/` directory
- [ ] No build artifacts (`.next/`, `dist/`, `build/`)
- [ ] All source code is included
- [ ] All config files are included
- [ ] Setup scripts are included

## 📚 More Information

- Detailed guide: `docs/GIT_STRUCTURE.md`
- Setup guide: `docs/GIT_SETUP_GUIDE.md`
- This quick reference: `docs/GIT_QUICK_REFERENCE.md`

