"""
YouTube Audio Detection and Reference Tool

Detects perfect phrases/emotions in YouTube videos and creates MCP tool
for retroactive reference extraction.
"""

import yt_dlp
import json
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import re

# Audio analysis
from services.sound_analysis.waveform_analyzer import WaveformAnalyzer
from services.wrappers.asr.faster_whisper import FasterWhisperWrapper
from services.wrappers.emotion.speech import SERWrapper


class YouTubeReferenceDetector:
    """Detect perfect phrases/emotions in YouTube videos."""
    
    def __init__(self, output_dir: Path = Path("logs/youtube_references")):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.references: List[Dict] = []
        
        # Load analyzers
        self.asr = FasterWhisperWrapper()
        self.ser = SERWrapper()
        self.waveform_analyzer = WaveformAnalyzer()
    
    def download_audio(self, url: str, output_path: Path) -> Optional[Path]:
        """Download audio from YouTube video."""
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': str(output_path / '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'quiet': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                audio_path = output_path / f"{info['title']}.wav"
                return audio_path
        except Exception as e:
            print(f"[YouTubeDetector] Error downloading audio: {e}")
            return None
    
    def analyze_video(self, url: str, emotion_target: Optional[str] = None) -> List[Dict]:
        """Analyze YouTube video for perfect phrases/emotions."""
        # Download audio
        audio_path = self.download_audio(url, self.output_dir)
        if not audio_path:
            return []
        
        # Load audio
        audio, sr = self.waveform_analyzer.load_audio(audio_path)
        
        # Transcribe with ASR (simplified - would need actual integration)
        # For now, use placeholder
        segments = []
        # TODO: Integrate with actual ASR service
        
        # Analyze emotion for each segment
        references = []
        
        for segment in segments:
            # Get emotion (simplified - would need actual audio segment)
            # For now, use placeholder
            emotion_result = {
                'emotion': 'neutral',
                'confidence': 0.5,
                'arousal': 0.0,
                'valence': 0.0
            }
            # TODO: Integrate with actual SER service
            
            # Check if matches target emotion
            if emotion_target and emotion_result['emotion'] != emotion_target:
                continue
            
            # Check if high confidence
            if emotion_result['confidence'] < 0.7:
                continue
            
            # Create reference
            reference = {
                "url": url,
                "timestamp": segment['start_time'],
                "end_time": segment['end_time'],
                "text": segment['text'],
                "emotion": emotion_result['emotion'],
                "confidence": emotion_result['confidence'],
                "arousal": emotion_result.get('arousal', 0.0),
                "valence": emotion_result.get('valence', 0.0),
                "audio_path": str(audio_path),
                "created_at": datetime.now().isoformat()
            }
            
            references.append(reference)
            self.references.append(reference)
        
        # Save references
        self.save_references()
        
        return references
    
    def save_references(self):
        """Save references to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = self.output_dir / f"references_{timestamp}.json"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.references, f, indent=2)
    
    def search_references(
        self,
        emotion: Optional[str] = None,
        min_confidence: float = 0.7,
        text_query: Optional[str] = None
    ) -> List[Dict]:
        """Search saved references."""
        results = self.references
        
        if emotion:
            results = [r for r in results if r['emotion'] == emotion]
        
        results = [r for r in results if r['confidence'] >= min_confidence]
        
        if text_query:
            query_lower = text_query.lower()
            results = [r for r in results if query_lower in r['text'].lower()]
        
        return results


# MCP Tool for YouTube Reference
class YouTubeReferenceMCPTool:
    """MCP tool for YouTube reference extraction."""
    
    def __init__(self):
        self.detector = YouTubeReferenceDetector()
    
    def extract_reference(
        self,
        url: str,
        emotion: Optional[str] = None,
        timestamp: Optional[float] = None
    ) -> Dict:
        """Extract reference from YouTube video."""
        references = self.detector.analyze_video(url, emotion_target=emotion)
        
        if timestamp:
            # Find closest reference to timestamp
            closest = min(
                references,
                key=lambda r: abs(r['timestamp'] - timestamp)
            )
            return closest
        
        # Return best match
        if references:
            return max(references, key=lambda r: r['confidence'])
        
        return {"error": "No references found"}
    
    def search(self, emotion: Optional[str] = None, text: Optional[str] = None) -> List[Dict]:
        """Search saved references."""
        return self.detector.search_references(emotion=emotion, text_query=text)


def main():
    """Test YouTube detector."""
    detector = YouTubeReferenceDetector()
    
    # Example
    url = "https://www.youtube.com/watch?v=example"
    references = detector.analyze_video(url, emotion_target="excited")
    
    print(f"Found {len(references)} references:")
    for ref in references:
        print(f"  {ref['timestamp']}s: {ref['text']} ({ref['emotion']})")


if __name__ == "__main__":
    main()

