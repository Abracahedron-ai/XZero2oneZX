#!/usr/bin/env python3
"""
Update all file paths in code to match new directory structure.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

# Path replacements
PATH_REPLACEMENTS = [
    # Log paths
    (r'Path\("logs/', 'Path("runtime/logs/'),
    (r'Path\(.*"logs/', 'Path("runtime/logs/'),
    (r'"logs/', '"runtime/logs/'),
    
    # Asset paths (generated assets)
    (r'Path\("Models/generated_assets"', 'Path("assets/models/generated"'),
    (r'"Models/generated_assets"', '"assets/models/generated"'),
    
    # TTS output paths
    (r'Path\("Models/core/tts/fish-speech/output"', 'Path("assets/audio/tts/fish-speech"'),
    (r'"Models/core/tts/fish-speech/output"', '"assets/audio/tts/fish-speech"'),
]

def update_file_paths(file_path: Path):
    """Update paths in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Apply all replacements
        for pattern, replacement in PATH_REPLACEMENTS:
            content = re.sub(pattern, replacement, content)
        
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
        if update_file_paths(file_path):
            print(f"Updated: {file_path.relative_to(BASE_DIR)}")
            updated += 1
    
    print(f"\nUpdated {updated} files")

if __name__ == "__main__":
    main()



