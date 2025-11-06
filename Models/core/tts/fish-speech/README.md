# Fish-Speech TTS Runtime

This directory hosts the runtime assets and configuration required to use
the **Fish-Speech** zero-shot, emotion-aware TTS engine inside the
Zero2oneZ stack.

The full reference repository still lives at
`EXPERIMENTAL/fish-speech/`.  Keeping the upstream sources there lets us
pull updates or run their training scripts without polluting the core
runtime.  This directory is the stable mount point that the TTS service
binds inside containers.

## Layout

```
Models/core/tts/fish-speech/
├── checkpoints/        # symlink or copy of the inference weights
├── voices/             # consented reference clips (per speaker id)
├── config/             # minimal inference configs used by the wrapper
└── README.md           # this file
```

Populate the folders as follows:

1. **Checkpoints** – copy or symlink the `checkpoints/` folder produced
   by running `bash scripts/download.sh` in `EXPERIMENTAL/fish-speech/`.
   Only the inference weights (e.g. `model.ckpt`, `vocoder.onnx`,
   `clap.pt`) are required at runtime.

2. **Voices** – add a subfolder per consented speaker id.  For example:
   `voices/tom-consented-01/reference.wav`.  The TTS wrapper will expect
   16 kHz mono WAV files.

3. **Config** – optional overrides for decoding (temperature, energy,
   style tags).  The wrapper will fall back to the defaults from the
   upstream repo if no files are present.

## Environment Setup

Fish-Speech relies on PyTorch + CUDA (tested on 3090 Ti) and a few extra
dependencies:

```bash
cd EXPERIMENTAL/fish-speech
python -m venv .venv
source .venv/bin/activate   # or .venv\\Scripts\\activate on Windows
pip install -r requirements.txt

# Download checkpoints
bash scripts/download.sh    # populates checkpoints/
```

Update `Models/core/tts/fish-speech/checkpoints` so it points at the
downloaded weights (copy or symlink).

For Docker usage, mount this directory into the TTS container and set:

```
TTS_ENGINE=fish-speech
FISH_SPEECH_HOME=/workspace/models/core/tts/fish-speech
```

## Wrapper Integration

The backend TTS service (`services/wrappers/tts/fish_speech.py`) reads
from this directory.  See that module for the gRPC/HTTP contract.  The
wrapper takes `text`, `style`, and optional `speaker_id`, then resolves
the correct reference clip under `voices/`.

## Consent & Governance

Only store reference clips that have explicit consent.  The service
checks that the speaker id is whitelisted before using a clip.  To
revoke a voice, remove its folder and purge any cached embeddings.
