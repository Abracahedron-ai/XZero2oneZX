import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional

from huggingface_hub import snapshot_download


"""
Utility script to download all Hugging Face models required by the project.

Usage:
    python scripts/download_hf_models.py --output Models/cache

If any repository requires authentication, run `huggingface-cli login` first or
pass `--hf-token <token>`.
"""

MODEL_SPECS: List[Dict[str, object]] = [
    {"repo_id": "facebook/metaclip-h14-fullcc2.5b"},
    {"repo_id": "facebook/dinov2-giant"},
    {"repo_id": "facebook/dinov2-small"},
    {"repo_id": "facebook/wav2vec2-large-960h"},
    {"repo_id": "facebook/musicgen-stereo-large"},
    {"repo_id": "facebook/musicgen-stereo-small"},
    {"repo_id": "facebook/MobileLLM-R1-950M"},
    {"repo_id": "facebook/MobileLLM-R1-140M"},
    {"repo_id": "nvidia/omnivinci"},
    {"repo_id": "Qwen/Qwen3-VL-2B-Instruct-GGUF", "allow_patterns": ["*.gguf"]},
    {"repo_id": "deepseek-ai/DeepSeek-OCR"},
]


def download_models(destination: Path, token: Optional[str] = None) -> None:
    destination.mkdir(parents=True, exist_ok=True)

    for spec in MODEL_SPECS:
        repo_id = spec["repo_id"]  # type: ignore[index]
        allow_patterns = spec.get("allow_patterns")
        local_dir = destination / repo_id.replace("/", "__")

        print(f"[download] {repo_id} → {local_dir}")
        snapshot_download(
            repo_id=repo_id,  # type: ignore[arg-type]
            local_dir=str(local_dir),
            local_dir_use_symlinks=False,
            token=token,
            allow_patterns=allow_patterns,
            resume_download=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download required Hugging Face models for the project."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("Models/cache"),
        help="Directory where models should be downloaded.",
    )
    parser.add_argument(
        "--hf-token",
        dest="hf_token",
        default=None,
        help="Optional Hugging Face token (otherwise uses cached credentials).",
    )

    args = parser.parse_args()

    try:
        download_models(destination=args.output, token=args.hf_token)
    except Exception as exc:  # pragma: no cover - surface full trace to caller
        print(f"[error] {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
