#!/usr/bin/env python3
"""
Complete project reorganization script.
Removes duplicates, consolidates directories, and fixes import paths.
"""

import os
import shutil
import re
from pathlib import Path
from typing import List, Tuple, Set

# Project root
ROOT = Path(__file__).parent.parent

# Directories to remove (duplicates/old locations)
DIRECTORIES_TO_REMOVE = [
    "services",  # Root-level services (moved to src/backend/services/)
    "python",  # Root-level python (moved to src/backend/api/)
    "renderer",  # Root-level renderer (moved to src/frontend/renderer/)
    "src/backend/services/services",  # Nested duplicate
    "src/backend/services/integrations/integrations",  # Nested duplicate
    "src/backend/workers/workers",  # Nested duplicate
]

# Files to move/consolidate
FILES_TO_MOVE: List[Tuple[str, str]] = [
    # Models consolidation
    ("Models/cache", "Models/huggingface/cache"),
]

# Import path replacements
IMPORT_REPLACEMENTS = [
    # Old: from services. -> New: from backend.services.
    (r'from\s+services\.', 'from backend.services.'),
    (r'import\s+services\.', 'import backend.services.'),
    # Old: from python. -> New: from backend.api.
    (r'from\s+python\.', 'from backend.api.'),
    (r'import\s+python\.', 'import backend.api.'),
    # Old: from renderer. -> New: from frontend.renderer.
    (r'from\s+renderer\.', 'from frontend.renderer.'),
    (r'import\s+renderer\.', 'import frontend.renderer.'),
]


def remove_directory(path: Path) -> bool:
    """Remove a directory if it exists."""
    if path.exists() and path.is_dir():
        try:
            print(f"[REMOVE] {path}")
            shutil.rmtree(path)
            return True
        except PermissionError:
            print(f"[ERROR] Cannot remove {path} - file may be locked")
            return False
        except Exception as e:
            print(f"[ERROR] Failed to remove {path}: {e}")
            return False
    return False


def move_directory(src: Path, dst: Path) -> bool:
    """Move a directory from src to dst."""
    if not src.exists():
        return False
    
    try:
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            # Merge contents
            print(f"[MERGE] {src} -> {dst}")
            for item in src.iterdir():
                dest_item = dst / item.name
                if item.is_dir():
                    if dest_item.exists():
                        move_directory(item, dest_item)
                    else:
                        shutil.move(str(item), str(dest_item))
                else:
                    if not dest_item.exists():
                        shutil.move(str(item), str(dest_item))
            shutil.rmtree(src)
        else:
            print(f"[MOVE] {src} -> {dst}")
            shutil.move(str(src), str(dst))
        return True
    except Exception as e:
        print(f"[ERROR] Failed to move {src} -> {dst}: {e}")
        return False


def update_imports_in_file(file_path: Path) -> bool:
    """Update import paths in a Python file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for pattern, replacement in IMPORT_REPLACEMENTS:
            content = re.sub(pattern, replacement, content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[UPDATE] {file_path}")
            return True
    except Exception as e:
        print(f"[ERROR] Failed to update {file_path}: {e}")
    return False


def find_python_files(directory: Path) -> List[Path]:
    """Find all Python files in a directory."""
    python_files = []
    for root, dirs, files in os.walk(directory):
        # Skip node_modules, __pycache__, .git, etc.
        dirs[:] = [d for d in dirs if d not in ['node_modules', '__pycache__', '.git', '.next', 'dist', 'build']]
        
        for file in files:
            if file.endswith('.py'):
                python_files.append(Path(root) / file)
    return python_files


def main():
    """Main reorganization function."""
    print("=" * 60)
    print("Zero2oneZ Complete Reorganization")
    print("=" * 60)
    print()
    
    # Step 1: Remove duplicate directories
    print("[STEP 1] Removing duplicate directories...")
    removed_count = 0
    for dir_path in DIRECTORIES_TO_REMOVE:
        full_path = ROOT / dir_path
        if remove_directory(full_path):
            removed_count += 1
    print(f"[STEP 1] Removed {removed_count} directories")
    print()
    
    # Step 2: Consolidate Models directories
    print("[STEP 2] Consolidating Models directories...")
    models_cache = ROOT / "Models" / "cache"
    models_hf = ROOT / "Models" / "huggingface"
    
    if models_cache.exists() and models_hf.exists():
        # Move cache contents to huggingface/cache
        cache_dst = models_hf / "cache"
        if move_directory(models_cache, cache_dst):
            print("[STEP 2] Consolidated Models/cache -> Models/huggingface/cache")
    print()
    
    # Step 3: Update import paths
    print("[STEP 3] Updating import paths...")
    python_files = find_python_files(ROOT / "src")
    updated_count = 0
    for py_file in python_files:
        if update_imports_in_file(py_file):
            updated_count += 1
    print(f"[STEP 3] Updated {updated_count} Python files")
    print()
    
    # Step 4: Summary
    print("=" * 60)
    print("Reorganization Complete!")
    print("=" * 60)
    print()
    print("Summary:")
    print(f"  - Removed {removed_count} duplicate directories")
    print(f"  - Updated {updated_count} Python files")
    print()
    print("Next steps:")
    print("  1. Review changes")
    print("  2. Test imports: python -c 'from backend.services.tools.tool_registry import registry'")
    print("  3. Run tests to verify everything works")
    print()


if __name__ == "__main__":
    main()



