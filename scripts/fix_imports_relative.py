#!/usr/bin/env python3
"""
Fix import paths to use relative imports from src/ directory.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

def fix_file_imports(file_path: Path):
    """Fix imports in a single file using relative paths."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Calculate relative depth from src/
        relative_path = file_path.relative_to(BASE_DIR / "src")
        depth = len(relative_path.parts) - 1
        
        # Replace src.backend. with relative imports
        if 'src.backend.' in content:
            # For files in src/backend/api/, use relative imports
            if 'backend/api' in str(file_path):
                content = re.sub(r'from src\.backend\.services\.', 'from ...services.', content)
                content = re.sub(r'from src\.backend\.utils\.', 'from ...utils.', content)
                content = re.sub(r'from src\.backend\.api\.models\.', 'from ..models.', content)
            # For files in src/backend/services/, use relative imports
            elif 'backend/services' in str(file_path):
                content = re.sub(r'from src\.backend\.services\.', 'from backend.services.', content)
                content = re.sub(r'from src\.backend\.utils\.', 'from backend.utils.', content)
                content = re.sub(r'from src\.backend\.workers\.', 'from backend.workers.', content)
            else:
                # Use absolute imports from src/
                content = re.sub(r'from src\.backend\.', 'from backend.', content)
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Main function."""
    python_files = list((BASE_DIR / "src" / "backend").rglob("*.py"))
    
    updated = 0
    for file_path in python_files:
        if '__pycache__' in str(file_path):
            continue
        if fix_file_imports(file_path):
            print(f"Fixed: {file_path.relative_to(BASE_DIR)}")
            updated += 1
    
    print(f"\nUpdated {updated} files")

if __name__ == "__main__":
    main()



