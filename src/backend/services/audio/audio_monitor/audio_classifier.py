"""
Audio Monitor and Classifier

Monitors computer audio, classifies words, and writes them with timestamps.
"""

import pyaudio
import wave
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import json
import queue
import threading
import time

# ASR for word classification
try:
    from faster_whisper import WhisperModel
    asr_available = True
except ImportError:
    print("Warning: faster-whisper not installed. Install with: pip install faster-whisper")
    asr_available = False


class AudioMonitor:
    """Monitor computer audio and classify words."""
    
    def __init__(
        self,
        output_dir: Path = Path("runtime/logs/audio_monitor"),
        chunk_size: int = 1024,
        sample_rate: int = 16000,
        channels: int = 1,
        format: int = pyaudio.paInt16
    ):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.chunk_size = chunk_size
        self.sample_rate = sample_rate
        self.channels = channels
        self.format = format
        
        self.audio = pyaudio.PyAudio()
        self.stream = None
        
        self.audio_buffer: List[bytes] = []
        self.buffer_size = 50  # 50 chunks = ~3 seconds at 16kHz
        self.classified_words: List[Dict] = []
        
        self.running = False
        self.event_queue = queue.Queue()
        
        # ASR model (lazy load)
        self.asr_model = None
        self.model_lock = threading.Lock()
    
    def load_asr_model(self):
        """Load ASR model for word classification."""
        if not asr_available:
            return None
        
        if self.asr_model is None:
            with self.model_lock:
                if self.asr_model is None:
                    print("[AudioMonitor] Loading ASR model...")
                    self.asr_model = WhisperModel(
                        "base",
                        device="cuda" if self._check_gpu() else "cpu",
                        compute_type="float16" if self._check_gpu() else "int8"
                    )
                    print("[AudioMonitor] ASR model loaded.")
        
        return self.asr_model
    
    def _check_gpu(self) -> bool:
        """Check if GPU is available."""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False
    
    def classify_audio(self, audio_data: np.ndarray) -> List[Dict]:
        """Classify words in audio data."""
        model = self.load_asr_model()
        if model is None:
            return []
        
        try:
            # Transcribe audio
            segments, info = model.transcribe(
                audio_data,
                beam_size=5,
                language="en",
                vad_filter=True
            )
            
            words = []
            for segment in segments:
                start_time = segment.start
                end_time = segment.end
                text = segment.text.strip()
                
                if text:
                    word_record = {
                        "timestamp": datetime.now().isoformat(),
                        "start_time": start_time,
                        "end_time": end_time,
                        "text": text,
                        "confidence": getattr(segment, 'confidence', 1.0)
                    }
                    words.append(word_record)
            
            return words
        
        except Exception as e:
            print(f"[AudioMonitor] Error classifying audio: {e}")
            return []
    
    def audio_callback(self, in_data, frame_count, time_info, status):
        """Audio stream callback."""
        if not self.running:
            return (None, pyaudio.paComplete)
        
        # Add to buffer
        self.audio_buffer.append(in_data)
        
        # Keep buffer size manageable
        if len(self.audio_buffer) > self.buffer_size:
            # Process buffer
            audio_chunk = b''.join(self.audio_buffer)
            
            # Convert to numpy array
            audio_array = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Classify in separate thread
            threading.Thread(
                target=self._process_audio_chunk,
                args=(audio_array,),
                daemon=True
            ).start()
            
            # Clear buffer
            self.audio_buffer = []
        
        return (None, pyaudio.paContinue)
    
    def _process_audio_chunk(self, audio_array: np.ndarray):
        """Process audio chunk in background thread."""
        words = self.classify_audio(audio_array)
        
        for word in words:
            self.classified_words.append(word)
            self.event_queue.put(word)
            
            # Save periodically
            if len(self.classified_words) % 50 == 0:
                self.save_words()
    
    def save_words(self):
        """Save classified words to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = self.output_dir / f"words_{timestamp}.json"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.classified_words, f, indent=2)
        
        print(f"[AudioMonitor] Saved {len(self.classified_words)} words to {file_path}")
    
    def start(self):
        """Start audio monitoring."""
        self.running = True
        
        # Open audio stream
        self.stream = self.audio.open(
            format=self.format,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=self.chunk_size,
            stream_callback=self.audio_callback
        )
        
        self.stream.start_stream()
        print("[AudioMonitor] Started monitoring audio...")
    
    def stop(self):
        """Stop audio monitoring."""
        self.running = False
        
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        
        self.audio.terminate()
        
        # Final save
        self.save_words()
        print("[AudioMonitor] Stopped and saved audio data.")


def main():
    """Main entry point."""
    monitor = AudioMonitor()
    
    try:
        monitor.start()
        print("Audio monitor running. Press Ctrl+C to stop...")
        
        # Keep running
        while True:
            import time
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\nStopping audio monitor...")
        monitor.stop()


if __name__ == "__main__":
    main()

