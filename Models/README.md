# Hugging Face Model Downloader

A simple, clean tool for downloading Hugging Face models with organized folder structure.

## Features

- 📁 **Organized Structure**: Models are stored as `org/model-name` maintaining the original hierarchy
- 🎨 **Beautiful Output**: Rich terminal UI with progress bars and tree visualization
- 🔄 **Resume Support**: Automatically resumes interrupted downloads
- 📋 **Multiple Input Methods**: Command line, file list, or interactive mode
- ✅ **Smart Caching**: Skips already downloaded models

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or install directly
pip install huggingface_hub rich
```

## Usage

### Download Single Model

```bash
python hf_downloader.py facebook/metaclip-h14-fullcc2.5b
```

### Download Multiple Models

```bash
python hf_downloader.py facebook/metaclip-h14-fullcc2.5b nvidia/omnivinci Qwen/Qwen3-VL-2B-Instruct
```

### Download from File

Create a file `models.txt`:
```
facebook/metaclip-h14-fullcc2.5b
nvidia/omnivinci
Qwen/Qwen3-VL-2B-Instruct
# This is a comment
```

Then run:
```bash
python hf_downloader.py --list models.txt
```

### Interactive Mode

```bash
python hf_downloader.py --interactive
```

### Show Downloaded Models

```bash
python hf_downloader.py --tree
```

### Custom Output Directory

```bash
python hf_downloader.py --output /path/to/models facebook/metaclip-h14-fullcc2.5b
```

### Filter Files

```bash
# Only download .safetensors files
python hf_downloader.py --allow-patterns "*.safetensors" model-id

# Exclude certain files
python hf_downloader.py --ignore-patterns "*.bin" "*.onnx" model-id
```

## Folder Structure

Models are organized in a clean tree structure:

```
huggingface/
├── facebook/
│   ├── metaclip-h14-fullcc2.5b/
│   │   ├── config.json
│   │   ├── model.safetensors
│   │   └── ...
│   └── dinov2-giant/
│       └── ...
├── nvidia/
│   └── omnivinci/
│       └── ...
└── Qwen/
    └── Qwen3-VL-2B-Instruct/
        └── ...
```

## Authentication

If a model requires authentication:

1. Use `huggingface-cli login` (recommended)
2. Set `HF_TOKEN` environment variable
3. Use `--token` flag: `python hf_downloader.py --token YOUR_TOKEN model-id`

## Examples

```bash
# Download a vision model
python hf_downloader.py facebook/metaclip-h14-fullcc2.5b

# Download multiple models
python hf_downloader.py facebook/metaclip-h14-fullcc2.5b nvidia/omnivinci

# Download with custom patterns
python hf_downloader.py --allow-patterns "*.gguf" Qwen/Qwen3-VL-2B-Instruct-GGUF

# View what's downloaded
python hf_downloader.py --tree
```

## Requirements

- Python 3.8+
- `huggingface_hub` >= 0.20.0
- `rich` >= 13.0.0

## Notes

- Models are downloaded to `Models/huggingface/` by default
- Already downloaded models are skipped automatically
- Downloads can be resumed if interrupted
- Progress is shown with beautiful progress bars




