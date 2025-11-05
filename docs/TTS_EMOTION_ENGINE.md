# TTS and Emotion Engine System

Complete system for keylogging, audio monitoring, vision, sound analysis, YouTube/Spotify integration, and Facebook model swarm.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TTS & Emotion Engine                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Keylogger   │  │ Audio Monitor│  │  Screenshots │      │
│  │ + Emotion    │  │ + Classifier │  │  + Vision    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Sound Wave  │  │   YouTube    │  │   Spotify    │      │
│  │   Analysis   │  │   Reference  │  │   MCP Tool   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Facebook Models Swarm (Round-Robin)            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Keylogger with Emotion Mapping
**File:** `services/keylogger_emotion/keylogger.py`

**Features:**
- Real-time keystroke capture
- Automatic spell correction (autocorrect)
- Sentiment analysis (TextBlob)
- Fish-speech emotion variable mapping
- JSON output with timestamps

**Emotion Mapping:**
- Polarity → Valence (-1 to 1)
- Subjectivity → Arousal (0 to 1)
- Mapped to fish-speech emotions: excited, satisfied, sad, frustrated, neutral

**Output:**
- `logs/keylogger/keystrokes_*.json`

### 2. Audio Monitor and Classifier
**File:** `services/audio_monitor/audio_classifier.py`

**Features:**
- Real-time computer audio monitoring
- Word classification using faster-whisper ASR
- Timestamped word records
- GPU-aware processing

**Output:**
- `logs/audio_monitor/words_*.json`

### 3. Vision Screenshot Capture
**File:** `services/vision_screenshots/screenshot_capture.py`

**Features:**
- Screenshot capture on major key/mouse events
- CLIP vision model analysis
- Event throttling (0.5s minimum between events)
- Screenshot and metadata storage

**Output:**
- `logs/screenshots/screenshot_*.png`
- `logs/screenshots/records_*.json`

### 4. Sound Wave Analysis
**File:** `services/sound_analysis/waveform_analyzer.py`

**Features:**
- Sound wave separation (frequency-based)
- Waveform analysis (FFT, MFCC, spectral features)
- Silence detection
- Comprehensive audio feature extraction

**Features Extracted:**
- Duration, RMS, Peak
- Dominant frequency
- Spectral centroid
- Zero crossing rate
- MFCC features
- Tempo and beats
- Chroma features

### 5. YouTube Reference Detector
**File:** `services/youtube_reference/youtube_detector.py`

**Features:**
- Download audio from YouTube videos
- ASR transcription
- Emotion analysis per segment
- MCP tool for retroactive reference extraction
- Perfect phrase/emotion detection

**Usage:**
```python
detector = YouTubeReferenceDetector()
references = detector.analyze_video(
    "https://youtube.com/watch?v=...",
    emotion_target="excited"
)
```

**Output:**
- `logs/youtube_references/references_*.json`

### 6. Spotify Integration MCP Tool
**File:** `services/spotify_integration/spotify_mcp.py`

**Features:**
- Search songs on Spotify
- Navigate to songs and start playback
- Extract sound clips at specific timestamps
- Create training data for zero-shot learning
- Audio clip analysis

**Usage:**
```python
tool = SpotifyMCPTool()
results = tool.search_song("song name")
clip = tool.extract_clip(track_id, 0.0, 10.0)
training_data = tool.create_training_data(
    track_id, start_time, end_time, emotion_label="excited"
)
```

**Output:**
- `logs/spotify_clips/*.mp3` (audio clips)
- `logs/spotify_clips/clips_*.json` (metadata)

### 7. Facebook Models Swarm
**File:** `services/facebook_swarm/model_swarm.py`

**Features:**
- Round-robin distribution across multiple models
- Supports wav2vec2, hubert models
- GPU-aware device assignment
- Request tracking and status monitoring
- Automatic load balancing

**Models Included:**
- `facebook/wav2vec2-base-960h`
- `facebook/wav2vec2-large-960h-lv60-self`
- `facebook/hubert-base-ls960`
- `facebook/hubert-large-ls960-ft`

**Usage:**
```python
swarm = FacebookModelSwarm(FACEBOOK_MODELS)
result = swarm.process_request(audio_data, model_type='audio')
status = swarm.get_status()
```

## Orchestrator

**File:** `services/orchestrator.py`

Unified orchestrator that manages all services:

```python
orchestrator = TTSEmotionOrchestrator()
orchestrator.start_all()
# ... all services running ...
orchestrator.stop_all()
```

## Integration with Main System

All services integrate with the existing TTS and emotion system:

1. **Keylogger → Fish-Speech Emotion Mapping**
   - Sentiment analysis results mapped to fish-speech emotion variables
   - Real-time emotion tracking

2. **Audio Monitor → Emotion Fusion**
   - Classified words feed into emotion fusion module
   - Timestamped emotion tracking

3. **YouTube/Spotify → Reference Library**
   - Perfect phrases/emotions extracted and indexed
   - MCP tools for retroactive reference

4. **Model Swarm → Processing**
   - Round-robin distribution for load balancing
   - GPU-aware processing

## Installation

```bash
# Core dependencies
pip install keyboard mouse pillow numpy scipy librosa soundfile pyaudio

# NLP and sentiment
pip install autocorrect textblob

# Audio processing
pip install faster-whisper transformers torch

# YouTube/Spotify
pip install yt-dlp spotipy requests

# Vision
pip install transformers torch torchvision

# Facebook models
pip install transformers torch
```

## Configuration

Set environment variables:
```bash
export SPOTIFY_CLIENT_ID=your_client_id
export SPOTIFY_CLIENT_SECRET=your_client_secret
```

## Usage Example

```python
from services.orchestrator import TTSEmotionOrchestrator

# Start orchestrator
orchestrator = TTSEmotionOrchestrator()
orchestrator.start_all()

# Use system...
# - Keylogger captures keystrokes with emotion mapping
# - Audio monitor classifies words
# - Screenshots captured on events
# - YouTube/Spotify references available via MCP tools

# Stop orchestrator
orchestrator.stop_all()
```

## Output Structure

```
logs/
├── keylogger/
│   └── keystrokes_*.json
├── audio_monitor/
│   └── words_*.json
├── screenshots/
│   ├── screenshot_*.png
│   └── records_*.json
├── youtube_references/
│   └── references_*.json
└── spotify_clips/
    ├── *.mp3
    └── clips_*.json
```

## MCP Tools

### YouTube Reference Tool
- `extract_reference(url, emotion, timestamp)` - Extract reference from YouTube
- `search(emotion, text)` - Search saved references

### Spotify Tool
- `search_song(query)` - Search songs
- `navigate_to_song(track_id)` - Navigate and play
- `extract_clip(track_id, start_time, end_time)` - Extract clip
- `create_training_data(...)` - Create training data

## Status Monitoring

```python
status = orchestrator.get_status()
# Returns status of all services
```

## Future Enhancements

1. Real-time emotion streaming to fish-speech
2. Integration with affect bridge
3. Automated reference library building
4. Zero-shot learning from extracted clips
5. Multi-modal emotion fusion (text + audio + vision)

