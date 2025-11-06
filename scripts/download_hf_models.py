import argparse
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

from huggingface_hub import snapshot_download


"""
Utility script to download all Hugging Face models required by the project.

Usage:
    python scripts/download_hf_models.py --output Models/huggingface

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


def download_models(destination: Path, token: Optional[str] = None, max_retries: int = 3) -> None:
    """Download all models and organize them properly with retry logic."""
    destination.mkdir(parents=True, exist_ok=True)

    for spec in MODEL_SPECS:
        repo_id = spec["repo_id"]  # type: ignore[index]
        allow_patterns = spec.get("allow_patterns")
        
        # Organize as org/model-name structure
        org, model_name = repo_id.split("/", 1)
        org_dir = destination / org
        org_dir.mkdir(exist_ok=True)
        local_dir = org_dir / model_name

        print(f"[download] {repo_id} → {local_dir}")
        
        # Retry logic for network failures
        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                snapshot_download(
                    repo_id=repo_id,  # type: ignore[arg-type]
                    local_dir=str(local_dir),
                    token=token,
                    allow_patterns=allow_patterns,
                    # Downloads automatically resume if interrupted
                    # No need for deprecated resume_download parameter
                )
                print(f"[OK] {repo_id} downloaded successfully")
                break  # Success, exit retry loop
            except Exception as e:
                last_error = e
                error_msg = str(e)
                
                # Check if it's a network/connection error
                is_network_error = any(keyword in error_msg.lower() for keyword in [
                    'connection', 'reset', 'timeout', 'network', '10054', 
                    'cas service error', 'connectionreset'
                ])
                
                if attempt < max_retries and is_network_error:
                    wait_time = attempt * 5  # Exponential backoff: 5s, 10s, 15s
                    print(f"[RETRY {attempt}/{max_retries}] Network error, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    if attempt >= max_retries:
                        print(f"[ERROR] Failed to download {repo_id} after {max_retries} attempts: {last_error}")
                    else:
                        print(f"[ERROR] Failed to download {repo_id}: {e}")
                    break  # Exit retry loop


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download required Hugging Face models for the project."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("Models/huggingface"),
        help="Directory where models should be downloaded (default: Models/huggingface).",
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
