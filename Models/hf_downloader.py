#!/usr/bin/env python3
"""
Simple Hugging Face Model Downloader

Downloads Hugging Face models and organizes them in a clean folder tree structure.
Models are organized by organization/model_name for easy navigation.

Usage:
    python hf_downloader.py <model_id> [<model_id> ...]
    python hf_downloader.py --list models.txt
    python hf_downloader.py --interactive

Examples:
    python hf_downloader.py facebook/metaclip-h14-fullcc2.5b
    python hf_downloader.py nvidia/omnivinci Qwen/Qwen3-VL-2B-Instruct
"""

import argparse
import sys
from pathlib import Path
from typing import List, Optional
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, DownloadColumn, TransferSpeedColumn
from rich.tree import Tree
from rich.panel import Panel
from rich import box

try:
    from huggingface_hub import snapshot_download, HfApi
    from huggingface_hub.utils import HfHubHTTPError
except ImportError:
    print("Error: huggingface_hub not installed.")
    print("Install it with: pip install huggingface_hub rich")
    sys.exit(1)


console = Console()


class ModelDownloader:
    """Downloads and organizes Hugging Face models."""
    
    def __init__(self, base_dir: Path, token: Optional[str] = None):
        self.base_dir = base_dir.resolve()
        self.token = token
        self.api = HfApi(token=token)
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
    def get_model_path(self, repo_id: str) -> Path:
        """Get the local path for a model, maintaining org/model structure."""
        return self.base_dir / repo_id
    
    def download_model(
        self, 
        repo_id: str, 
        allow_patterns: Optional[List[str]] = None,
        ignore_patterns: Optional[List[str]] = None
    ) -> Path:
        """Download a model and return its local path."""
        local_dir = self.get_model_path(repo_id)
        
        # Check if model already exists
        if local_dir.exists() and any(local_dir.iterdir()):
            console.print(f"[yellow]⏭  {repo_id}[/yellow] - Already downloaded")
            return local_dir
        
        try:
            # Verify model exists before downloading
            try:
                self.api.model_info(repo_id, token=self.token)
            except HfHubHTTPError as e:
                if e.status_code == 404:
                    console.print(f"[red]❌ {repo_id}[/red] - Model not found on Hugging Face")
                    raise
                raise
            
            console.print(f"[cyan]📥 {repo_id}[/cyan] - Starting download...")
            
            local_dir.mkdir(parents=True, exist_ok=True)
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                DownloadColumn(),
                TransferSpeedColumn(),
                console=console,
                transient=True,
            ) as progress:
                task = progress.add_task(f"Downloading {repo_id}", total=None)
                
                snapshot_download(
                    repo_id=repo_id,
                    local_dir=str(local_dir),
                    local_dir_use_symlinks=False,
                    token=self.token,
                    allow_patterns=allow_patterns,
                    ignore_patterns=ignore_patterns,
                    resume_download=True,
                )
                
                progress.update(task, completed=100)
            
            console.print(f"[green]✅ {repo_id}[/green] - Downloaded successfully")
            return local_dir
            
        except Exception as e:
            console.print(f"[red]❌ {repo_id}[/red] - Error: {str(e)}")
            raise
    
    def show_tree(self):
        """Display a nice tree of downloaded models."""
        if not self.base_dir.exists() or not any(self.base_dir.iterdir()):
            console.print("[yellow]No models downloaded yet[/yellow]")
            return
        
        tree = Tree(f"[bold cyan]{self.base_dir}[/bold cyan]")
        
        for org_dir in sorted(self.base_dir.iterdir()):
            if org_dir.is_dir() and not org_dir.name.startswith('.'):
                org_node = tree.add(f"[bold]{org_dir.name}[/bold]")
                
                for model_dir in sorted(org_dir.iterdir()):
                    if model_dir.is_dir():
                        file_count = sum(1 for _ in model_dir.rglob('*') if _.is_file())
                        size_mb = sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file()) / (1024 * 1024)
                        org_node.add(
                            f"[green]{model_dir.name}[/green] "
                            f"[dim]({file_count} files, {size_mb:.1f} MB)[/dim]"
                        )
        
        console.print(Panel(tree, title="📁 Downloaded Models", border_style="cyan", box=box.ROUNDED))


def load_models_from_file(filepath: Path) -> List[str]:
    """Load model IDs from a text file (one per line)."""
    models = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                models.append(line)
    return models


def interactive_mode(downloader: ModelDownloader):
    """Interactive mode for selecting and downloading models."""
    console.print(Panel(
        "[bold cyan]Interactive Mode[/bold cyan]\n"
        "Enter model IDs (one per line). Press Enter twice to start download.\n"
        "Example: facebook/metaclip-h14-fullcc2.5b",
        title="🎯 Hugging Face Model Downloader",
        border_style="cyan"
    ))
    
    models = []
    while True:
        try:
            model_id = input("Model ID (empty to finish): ").strip()
            if not model_id:
                break
            if '/' in model_id:
                models.append(model_id)
                console.print(f"[green]✓[/green] Added: {model_id}")
            else:
                console.print("[yellow]⚠[/yellow] Invalid format. Use: org/model-name")
        except (EOFError, KeyboardInterrupt):
            console.print("\n[yellow]Cancelled[/yellow]")
            return
    
    if not models:
        console.print("[yellow]No models to download[/yellow]")
        return
    
    console.print(f"\n[cyan]Downloading {len(models)} model(s)...[/cyan]\n")
    for model_id in models:
        try:
            downloader.download_model(model_id)
        except Exception:
            continue
    
    console.print("\n")
    downloader.show_tree()


def main():
    parser = argparse.ArgumentParser(
        description="Download Hugging Face models with organized folder structure",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        'models',
        nargs='*',
        help='Model IDs to download (e.g., facebook/metaclip-h14-fullcc2.5b)'
    )
    parser.add_argument(
        '--output', '-o',
        type=Path,
        default=Path(__file__).parent / 'huggingface',
        help='Base directory for downloads (default: Models/huggingface)'
    )
    parser.add_argument(
        '--list', '-l',
        type=Path,
        help='Load model IDs from a text file (one per line)'
    )
    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Interactive mode for entering model IDs'
    )
    parser.add_argument(
        '--token',
        help='Hugging Face token (or use HF_TOKEN env var or huggingface-cli login)'
    )
    parser.add_argument(
        '--tree',
        action='store_true',
        help='Show tree of downloaded models and exit'
    )
    parser.add_argument(
        '--allow-patterns',
        nargs='+',
        help='File patterns to include (e.g., *.safetensors *.bin)'
    )
    parser.add_argument(
        '--ignore-patterns',
        nargs='+',
        help='File patterns to exclude'
    )
    
    args = parser.parse_args()
    
    # Get token from args, env var, or None (will use cached credentials)
    token = args.token or None
    
    downloader = ModelDownloader(args.output, token=token)
    
    # Show tree and exit
    if args.tree:
        downloader.show_tree()
        return
    
    # Interactive mode
    if args.interactive:
        interactive_mode(downloader)
        return
    
    # Load models from file or command line
    models_to_download = []
    
    if args.list:
        models_to_download.extend(load_models_from_file(args.list))
    
    models_to_download.extend(args.models)
    
    if not models_to_download:
        console.print("[yellow]No models specified. Use --help for usage.[/yellow]")
        parser.print_help()
        return
    
    # Download models
    console.print(f"[cyan]📦 Downloading {len(models_to_download)} model(s) to: {downloader.base_dir}[/cyan]\n")
    
    successful = 0
    failed = 0
    
    for model_id in models_to_download:
        try:
            downloader.download_model(
                model_id,
                allow_patterns=args.allow_patterns,
                ignore_patterns=args.ignore_patterns
            )
            successful += 1
        except Exception:
            failed += 1
    
    # Summary
    console.print("\n" + "="*60)
    console.print(f"[green]✅ Successful: {successful}[/green] | [red]❌ Failed: {failed}[/red]")
    console.print("="*60 + "\n")
    
    # Show tree
    downloader.show_tree()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]Fatal error: {e}[/red]")
        sys.exit(1)




