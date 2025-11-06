# TTS and Emotion Engine Services

Comprehensive system for keylogging, audio monitoring, vision, sound analysis, YouTube/Spotify integration, and Facebook model swarm.

## Services

### 1. Keylogger with Emotion Mapping
**Location:** `services/keylogger_emotion/`

- Captures keystrokes with spell correction
- Sentiment analysis mapped to fish-speech emotion variables
- Real-time emotion tracking
- JSON output with timestamps

**Usage:**
```python
from services.keylogger_emotion.keylogger import KeyloggerEmotion

keylogger = KeyloggerEmotion()
keylogger.start()
# ... use system ...
keylogger.stop()
```

### 2. Audio Monitor and Classifier
**Location:** `services/audio_monitor/`

- Monitors computer audio in real-time
- Classifies words using faster-whisper ASR
- Writes words with timestamps
- JSON output for analysis

**Usage:**
```python
from services.audio_monitor.audio_classifier import AudioMonitor

monitor = AudioMonitor()
monitor.start()
# ... monitor audio ...
monitor.stop()
```

### 3. Vision Screenshot Capture
**Location:** `services/vision_screenshots/`

- Tiny CLIP vision model for screenshot analysis
- Captures screenshots on major key/mouse events
- Analyzes content with vision model
- Saves screenshots and metadata

**Usage:**
```python
from services.vision_screenshots.screenshot_capture import ScreenshotCapture

capture = ScreenshotCapture()
capture.start()
# ... capture screenshots ...
capture.stop()
```

### 4. Sound Wave Analysis
**Location:** `services/sound_analysis/`

- Separates sound waves into sources
- Analyzes waveforms (FFT, MFCC, spectral features)
- Detects silence segments
- Comprehensive audio feature extraction

**Usage:**
```python
from services.sound_analysis.waveform_analyzer import WaveformAnalyzer

analyzer = WaveformAnalyzer()
audio, sr = analyzer.load_audio("audio.wav")
features = analyzer.extract_features(audio)
```

### 5. YouTube Reference Detector
**Location:** `services/youtube_reference/`

- Detects perfect phrases/emotions in YouTube videos
- MCP tool for retroactive reference extraction
- Downloads and analyzes audio
- Saves references with timestamps

**Usage:**
```python
from services.youtube_reference.youtube_detector import YouTubeReferenceDetector

detector = YouTubeReferenceDetector()
references = detector.analyze_video(
    "https://youtube.com/watch?v=...",
    emotion_target="excited"
)
```

### 6. Spotify Integration MCP Tool
**Location:** `services/spotify_integration/`

- Search songs on Spotify
- Navigate to songs and start playback
- Extract sound clips at specific timestamps
- Create training data for zero-shot learning

**Usage:**
```python
from services.spotify_integration.spotify_mcp import SpotifyMCPTool

tool = SpotifyMCPTool()
results = tool.search_song("song name")
clip = tool.extract_clip(track_id, start_time, end_time)
```

### 7. Facebook Models Swarm
**Location:** `services/facebook_swarm/`

- Round-robin distribution across models
- Loads multiple Facebook models (wav2vec2, hubert, etc.)
- GPU-aware device assignment
- Request tracking and status monitoring

**Usage:**
```python
from services.facebook_swarm.model_swarm import FacebookModelSwarm, FACEBOOK_MODELS

swarm = FacebookModelSwarm(FACEBOOK_MODELS)
result = swarm.process_request(input_data, model_type='audio')
status = swarm.get_status()
```

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
```

## Configuration

Set environment variables:
```bash
export SPOTIFY_CLIENT_ID=your_client_id
export SPOTIFY_CLIENT_SECRET=your_client_secret
```

## Integration

All services can be integrated with the main orchestrator:

```python
# Start all services
keylogger = KeyloggerEmotion()
audio_monitor = AudioMonitor()
screenshot_capture = ScreenshotCapture()
youtube_detector = YouTubeReferenceDetector()
spotify_tool = SpotifyMCPTool()
model_swarm = FacebookModelSwarm(FACEBOOK_MODELS)

# Run in parallel
keylogger.start()
audio_monitor.start()
screenshot_capture.start()
```

## Output

All services save logs to:
- `logs/keylogger/` - Keystroke records
- `logs/audio_monitor/` - Classified words
- `logs/screenshots/` - Screenshots and analysis
- `logs/youtube_references/` - YouTube references
- `logs/spotify_clips/` - Extracted audio clips


