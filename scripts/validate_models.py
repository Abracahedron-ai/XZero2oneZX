#!/usr/bin/env python3
"""
Model Manifest Validation Script

Validates Models/manifest.json against the file system:
- Checks that all paths exist
- Verifies model weights exist (if applicable)
- Validates license files
- Generates migration report

Can be integrated into CI/CD pipelines.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse


def find_available_port(start_port: int = 8000, max_attempts: int = 100) -> int:
    """Find an available port (utility function for reference)."""
    import socket
    
    for i in range(max_attempts):
        port = start_port + i
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"No available ports found in range {start_port}-{start_port + max_attempts - 1}")


def is_port_available(port: int) -> bool:
    """Check if a port is available."""
    import socket
    
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', port))
            return True
    except OSError:
        return False


class ModelValidator:
    """Validates model manifest against file system."""
    
    def __init__(self, manifest_path: Path, repo_root: Path):
        self.manifest_path = manifest_path
        self.repo_root = repo_root
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []
        
    def load_manifest(self) -> Dict:
        """Load manifest.json."""
        try:
            with open(self.manifest_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            self.errors.append(f"Manifest file not found: {self.manifest_path}")
            return {}
        except json.JSONDecodeError as e:
            self.errors.append(f"Invalid JSON in manifest: {e}")
            return {}
    
    def validate_path(self, model: Dict) -> bool:
        """Validate that model path exists."""
        path_str = model.get('path', '')
        if not path_str:
            self.errors.append(f"Model {model.get('id', 'unknown')} missing 'path' field")
            return False
        
        model_path = self.repo_root / path_str
        if not model_path.exists():
            self.warnings.append(f"Model path does not exist: {path_str}")
            return False
        
        if not model_path.is_dir():
            self.warnings.append(f"Model path is not a directory: {path_str}")
            return False
        
        self.info.append(f"✓ Path exists: {path_str}")
        return True
    
    def validate_weights(self, model: Dict) -> bool:
        """Validate that model weights exist (if specified)."""
        weights = model.get('weights', {})
        if not weights:
            # Some models download at runtime, so this is OK
            self.info.append(f"  No weights specified (likely runtime download): {model.get('id')}")
            return True
        
        path_str = model.get('path', '')
        if not path_str:
            return False
        
        model_path = self.repo_root / path_str
        
        # Check for checkpoint patterns
        checkpoint_pattern = weights.get('checkpoint_pattern')
        if checkpoint_pattern:
            pattern = checkpoint_pattern.replace('*', '')
            found = list(model_path.glob(f"*{pattern}"))
            if not found:
                self.warnings.append(f"  No checkpoints found matching '{checkpoint_pattern}' in {path_str}")
                return False
            else:
                self.info.append(f"  ✓ Found {len(found)} checkpoint(s) matching '{checkpoint_pattern}'")
        
        # Check for config patterns
        config_pattern = weights.get('config_pattern')
        if config_pattern:
            if config_pattern == '*.yaml':
                found = list(model_path.glob('*.yaml')) + list(model_path.glob('*.yml'))
            elif config_pattern == 'config.json':
                found = list(model_path.glob('config.json'))
            else:
                found = list(model_path.glob(config_pattern))
            
            if not found:
                self.warnings.append(f"  No config files found matching '{config_pattern}' in {path_str}")
            else:
                self.info.append(f"  ✓ Found {len(found)} config file(s) matching '{config_pattern}'")
        
        # Check for .gitkeep (indicates directory is ready for models)
        if (model_path / '.gitkeep').exists():
            self.info.append(f"  ℹ Directory has .gitkeep (models will be downloaded here)")
        
        return True
    
    def validate_license(self, model: Dict) -> bool:
        """Validate that license information is present."""
        license_str = model.get('license', '')
        if not license_str:
            self.warnings.append(f"Model {model.get('id', 'unknown')} missing license information")
            return False
        
        # Check if license is in a known format
        known_licenses = [
            'Apache-2.0', 'MIT', 'MPL-2.0', 'GPL', 'LGPL',
            'NVIDIA Proprietary', 'CC-BY-NC-SA-4.0', 'Tongyi Qianwen'
        ]
        
        if license_str not in known_licenses:
            self.warnings.append(f"Unknown license format: {license_str} for model {model.get('id')}")
        
        self.info.append(f"  ✓ License: {license_str}")
        return True
    
    def validate_wrapper(self, model: Dict) -> bool:
        """Validate that wrapper path exists (if specified)."""
        wrapper = model.get('wrapper', '')
        if not wrapper:
            self.warnings.append(f"Model {model.get('id', 'unknown')} missing wrapper path")
            return False
        
        wrapper_path = self.repo_root / wrapper
        if not wrapper_path.exists():
            self.warnings.append(f"Wrapper not found: {wrapper} (will be created)")
        else:
            self.info.append(f"  ✓ Wrapper exists: {wrapper}")
        
        return True
    
    def validate_model(self, model: Dict) -> Tuple[bool, bool]:
        """Validate a single model entry."""
        model_id = model.get('id', 'unknown')
        self.info.append(f"\nValidating model: {model_id}")
        
        path_ok = self.validate_path(model)
        weights_ok = self.validate_weights(model)
        license_ok = self.validate_license(model)
        wrapper_ok = self.validate_wrapper(model)
        
        has_errors = not path_ok
        has_warnings = not (weights_ok and license_ok and wrapper_ok)
        
        return not has_errors, not has_warnings
    
    def validate_all(self) -> Tuple[int, int]:
        """Validate all models in manifest."""
        manifest = self.load_manifest()
        if not manifest:
            return 1, 0
        
        models = manifest.get('models', [])
        if not models:
            self.errors.append("No models found in manifest")
            return 1, 0
        
        self.info.append(f"Found {len(models)} model(s) in manifest\n")
        
        error_count = 0
        warning_count = 0
        
        for model in models:
            no_errors, no_warnings = self.validate_model(model)
            if not no_errors:
                error_count += 1
            if not no_warnings:
                warning_count += 1
        
        return error_count, warning_count
    
    def print_report(self):
        """Print validation report."""
        print("=" * 70)
        print("MODEL MANIFEST VALIDATION REPORT")
        print("=" * 70)
        
        if self.info:
            print("\n[INFO]")
            for msg in self.info:
                print(f"  {msg}")
        
        if self.warnings:
            print("\n[WARNINGS]")
            for msg in self.warnings:
                print(f"  ⚠ {msg}")
        
        if self.errors:
            print("\n[ERRORS]")
            for msg in self.errors:
                print(f"  ✗ {msg}")
        
        print("\n" + "=" * 70)
        
        if self.errors:
            print("FAILED: Errors found in manifest validation")
            return 1
        elif self.warnings:
            print("PASSED with warnings")
            return 0
        else:
            print("PASSED: All validations successful")
            return 0


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Validate model manifest against file system'
    )
    parser.add_argument(
        '--manifest',
        type=str,
        default='Models/manifest.json',
        help='Path to manifest.json (relative to repo root)'
    )
    parser.add_argument(
        '--repo-root',
        type=str,
        default='.',
        help='Repository root directory'
    )
    parser.add_argument(
        '--ci',
        action='store_true',
        help='CI mode: exit with error code on warnings'
    )
    
    args = parser.parse_args()
    
    repo_root = Path(args.repo_root).resolve()
    manifest_path = repo_root / args.manifest
    
    validator = ModelValidator(manifest_path, repo_root)
    error_count, warning_count = validator.validate_all()
    
    exit_code = validator.print_report()
    
    if args.ci and (error_count > 0 or warning_count > 0):
        sys.exit(1)
    
    sys.exit(exit_code)


if __name__ == '__main__':
    main()

