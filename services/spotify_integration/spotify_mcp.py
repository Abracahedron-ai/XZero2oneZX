"""
Spotify Integration MCP Tool

MCP tool for Spotify navigation, timestamp extraction, and sound clip capture.
"""

import spotipy
from spotipy.oauth2 import SpotifyOAuth
import json
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import subprocess
import os

# Audio analysis
from services.sound_analysis.waveform_analyzer import WaveformAnalyzer


class SpotifyMCPTool:
    """MCP tool for Spotify integration."""
    
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        redirect_uri: str = "http://localhost:8888/callback",
        output_dir: Path = Path("logs/spotify_clips")
    ):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Spotify API
        self.client_id = client_id or os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = redirect_uri
        
        if self.client_id and self.client_secret:
            self.sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
                client_id=self.client_id,
                client_secret=self.client_secret,
                redirect_uri=self.redirect_uri,
                scope="user-read-playback-state,user-modify-playback-state"
            ))
        else:
            self.sp = None
            print("[SpotifyMCP] Warning: Spotify credentials not set")
        
        self.waveform_analyzer = WaveformAnalyzer()
        self.clips: List[Dict] = []
    
    def search_song(self, query: str) -> List[Dict]:
        """Search for song on Spotify."""
        if not self.sp:
            return []
        
        try:
            results = self.sp.search(q=query, type='track', limit=10)
            tracks = []
            
            for track in results['tracks']['items']:
                tracks.append({
                    "id": track['id'],
                    "name": track['name'],
                    "artist": ', '.join([a['name'] for a in track['artists']]),
                    "album": track['album']['name'],
                    "duration_ms": track['duration_ms'],
                    "preview_url": track.get('preview_url'),
                    "external_url": track['external_urls']['spotify']
                })
            
            return tracks
        except Exception as e:
            print(f"[SpotifyMCP] Error searching: {e}")
            return []
    
    def navigate_to_song(self, track_id: str) -> bool:
        """Navigate to song and start playback."""
        if not self.sp:
            return False
        
        try:
            devices = self.sp.devices()
            if not devices['devices']:
                print("[SpotifyMCP] No active devices found")
                return False
            
            device_id = devices['devices'][0]['id']
            self.sp.start_playback(device_id=device_id, uris=[f"spotify:track:{track_id}"])
            return True
        except Exception as e:
            print(f"[SpotifyMCP] Error navigating: {e}")
            return False
    
    def extract_clip(
        self,
        track_id: str,
        start_time: float,
        end_time: float,
        output_filename: Optional[str] = None
    ) -> Optional[Path]:
        """Extract sound clip from Spotify track."""
        # Get track info
        if not self.sp:
            return None
        
        try:
            track = self.sp.track(track_id)
            preview_url = track.get('preview_url')
            
            if preview_url:
                # Download preview (usually 30 seconds)
                output_path = self.output_dir / (output_filename or f"{track_id}_{start_time}_{end_time}.mp3")
                
                # Download with curl or requests
                import requests
                response = requests.get(preview_url)
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                # Extract segment if needed
                if start_time > 0 or end_time < 30:
                    # Use ffmpeg to extract segment
                    segment_path = self.output_dir / f"{track_id}_segment_{start_time}_{end_time}.wav"
                    subprocess.run([
                        'ffmpeg', '-i', str(output_path),
                        '-ss', str(start_time),
                        '-t', str(end_time - start_time),
                        '-y', str(segment_path)
                    ], check=True, capture_output=True)
                    
                    return segment_path
                
                return output_path
            else:
                print(f"[SpotifyMCP] No preview URL for track {track_id}")
                return None
        
        except Exception as e:
            print(f"[SpotifyMCP] Error extracting clip: {e}")
            return None
    
    def analyze_clip(self, clip_path: Path) -> Dict:
        """Analyze extracted sound clip."""
        audio, sr = self.waveform_analyzer.load_audio(clip_path)
        features = self.waveform_analyzer.extract_features(audio)
        
        return {
            "path": str(clip_path),
            "features": features,
            "analyzed_at": datetime.now().isoformat()
        }
    
    def create_training_data(
        self,
        track_id: str,
        start_time: float,
        end_time: float,
        emotion_label: Optional[str] = None
    ) -> Dict:
        """Create training data from clip."""
        # Extract clip
        clip_path = self.extract_clip(track_id, start_time, end_time)
        if not clip_path:
            return {"error": "Failed to extract clip"}
        
        # Analyze
        analysis = self.analyze_clip(clip_path)
        
        # Create training record
        training_data = {
            "track_id": track_id,
            "start_time": start_time,
            "end_time": end_time,
            "clip_path": str(clip_path),
            "features": analysis["features"],
            "emotion_label": emotion_label,
            "created_at": datetime.now().isoformat()
        }
        
        self.clips.append(training_data)
        
        # Save
        self.save_clips()
        
        return training_data
    
    def save_clips(self):
        """Save clips metadata."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = self.output_dir / f"clips_{timestamp}.json"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.clips, f, indent=2)


def main():
    """Test Spotify MCP tool."""
    tool = SpotifyMCPTool()
    
    # Example: Search and extract
    results = tool.search_song("example song")
    if results:
        track = results[0]
        print(f"Found: {track['name']} by {track['artist']}")
        
        # Extract clip
        clip = tool.extract_clip(track['id'], 0.0, 10.0)
        if clip:
            print(f"Extracted clip: {clip}")


if __name__ == "__main__":
    main()

