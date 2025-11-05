"""
TTS and Emotion Engine Orchestrator

Orchestrates all services: keylogger, audio monitor, vision, sound analysis,
YouTube/Spotify integration, and Facebook model swarm.
"""

import asyncio
import threading
from typing import Dict, Optional
from pathlib import Path
import json
from datetime import datetime

# Import all services
from services.keylogger_emotion.keylogger import KeyloggerEmotion
from services.audio_monitor.audio_classifier import AudioMonitor
from services.vision_screenshots.screenshot_capture import ScreenshotCapture
from services.sound_analysis.waveform_analyzer import WaveformAnalyzer
from services.youtube_reference.youtube_detector import YouTubeReferenceDetector
from services.spotify_integration.spotify_mcp import SpotifyMCPTool
from services.facebook_swarm.model_swarm import FacebookModelSwarm, FACEBOOK_MODELS


class TTSEmotionOrchestrator:
    """Orchestrates all TTS and emotion services."""
    
    def __init__(self):
        self.services: Dict[str, any] = {}
        self.running = False
        
        # Initialize services
        self.keylogger = KeyloggerEmotion()
        self.audio_monitor = AudioMonitor()
        self.screenshot_capture = ScreenshotCapture()
        self.waveform_analyzer = WaveformAnalyzer()
        self.youtube_detector = YouTubeReferenceDetector()
        self.spotify_tool = SpotifyMCPTool()
        self.model_swarm = FacebookModelSwarm(FACEBOOK_MODELS)
        
        # Service registry
        self.services = {
            'keylogger': self.keylogger,
            'audio_monitor': self.audio_monitor,
            'screenshot_capture': self.screenshot_capture,
            'waveform_analyzer': self.waveform_analyzer,
            'youtube_detector': self.youtube_detector,
            'spotify_tool': self.spotify_tool,
            'model_swarm': self.model_swarm
        }
    
    def start_all(self):
        """Start all services."""
        self.running = True
        
        print("[Orchestrator] Starting all services...")
        
        # Start keylogger
        self.keylogger.start()
        
        # Start audio monitor
        self.audio_monitor.start()
        
        # Start screenshot capture
        self.screenshot_capture.start()
        
        print("[Orchestrator] All services started.")
    
    def stop_all(self):
        """Stop all services."""
        self.running = False
        
        print("[Orchestrator] Stopping all services...")
        
        # Stop keylogger
        self.keylogger.stop()
        
        # Stop audio monitor
        self.audio_monitor.stop()
        
        # Stop screenshot capture
        self.screenshot_capture.stop()
        
        print("[Orchestrator] All services stopped.")
    
    def get_status(self) -> Dict:
        """Get status of all services."""
        return {
            "running": self.running,
            "services": {
                "keylogger": {
                    "running": self.keylogger.running,
                    "keystrokes": len(self.keylogger.keystrokes)
                },
                "audio_monitor": {
                    "running": self.audio_monitor.running,
                    "words": len(self.audio_monitor.classified_words)
                },
                "screenshot_capture": {
                    "running": self.screenshot_capture.running,
                    "screenshots": len(self.screenshot_capture.screenshots)
                },
                "model_swarm": self.model_swarm.get_status()
            }
        }
    
    def process_audio_clip(self, audio_path: Path) -> Dict:
        """Process audio clip with all analyzers."""
        # Load audio
        audio, sr = self.waveform_analyzer.load_audio(audio_path)
        
        # Analyze waveform
        features = self.waveform_analyzer.extract_features(audio)
        
        # Process with model swarm
        result = self.model_swarm.process_request(audio, model_type='audio')
        
        return {
            "features": features,
            "model_result": result
        }


def main():
    """Main entry point."""
    orchestrator = TTSEmotionOrchestrator()
    
    try:
        orchestrator.start_all()
        print("Orchestrator running. Press Ctrl+C to stop...")
        
        # Keep running
        while True:
            import time
            time.sleep(1)
            
            # Print status every 10 seconds
            if int(time.time()) % 10 == 0:
                status = orchestrator.get_status()
                print(f"\n[Orchestrator] Status: {json.dumps(status, indent=2)}")
    
    except KeyboardInterrupt:
        print("\nStopping orchestrator...")
        orchestrator.stop_all()


if __name__ == "__main__":
    main()

