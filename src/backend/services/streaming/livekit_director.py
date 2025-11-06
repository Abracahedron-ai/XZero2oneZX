"""
LiveKit Auto-Director

Overlays LiveKit camera feed with score telemetry and implements auto-director.
Switches cameras based on emotion/activity scores.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import logging

# Add services to path
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from emotion_fusion import get_fusion, EmotionState


@dataclass
class CameraScore:
    """Camera score for auto-director."""
    camera_id: str
    score: float
    factors: Dict[str, float]  # emotion, activity, face_detected, etc.


class LiveKitDirector:
    """Auto-director for LiveKit camera switching."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.fusion = get_fusion()
        self.current_camera: Optional[str] = None
        self.cameras: Dict[str, Dict] = {}
        self.scores: Dict[str, CameraScore] = {}
        self.telemetry_overlay: Dict[str, Any] = {}
    
    def register_camera(self, camera_id: str, metadata: Dict):
        """Register a camera with metadata."""
        self.cameras[camera_id] = metadata
        self.logger.info(f"Registered camera: {camera_id}")
    
    def calculate_camera_score(
        self,
        camera_id: str,
        emotion_state: Optional[EmotionState] = None,
        activity_score: float = 0.0,
        face_detected: bool = False
    ) -> CameraScore:
        """
        Calculate camera score for auto-director.
        
        Args:
            camera_id: Camera identifier
            emotion_state: Current emotion state
            activity_score: Activity score (0-1)
            face_detected: Whether face is detected
        
        Returns:
            Camera score
        """
        if emotion_state is None:
            emotion_state = self.fusion.get_current_state()
        
        score = 0.0
        factors = {}
        
        # Emotion factor (arousal increases score)
        if emotion_state:
            arousal_factor = (emotion_state.arousal + 1) / 2  # Normalize to 0-1
            score += arousal_factor * 0.4
            factors['emotion'] = arousal_factor
        
        # Activity factor
        activity_factor = activity_score
        score += activity_factor * 0.3
        factors['activity'] = activity_factor
        
        # Face detection factor
        face_factor = 1.0 if face_detected else 0.0
        score += face_factor * 0.2
        factors['face_detected'] = face_factor
        
        # Confidence factor (higher confidence = more reliable)
        if emotion_state:
            confidence_factor = emotion_state.confidence
            score += confidence_factor * 0.1
            factors['confidence'] = confidence_factor
        
        camera_score = CameraScore(
            camera_id=camera_id,
            score=score,
            factors=factors
        )
        
        self.scores[camera_id] = camera_score
        return camera_score
    
    def select_camera(self) -> Optional[str]:
        """Select best camera based on scores."""
        if not self.scores:
            return None
        
        # Find camera with highest score
        best_camera = max(self.scores.items(), key=lambda x: x[1].score)
        camera_id, score = best_camera
        
        if self.current_camera != camera_id:
            self.logger.info(
                f"Switching camera: {self.current_camera} -> {camera_id} "
                f"(score: {score.score:.2f})"
            )
            self.current_camera = camera_id
        
        return camera_id
    
    def update_telemetry_overlay(
        self,
        camera_id: str,
        emotion_state: Optional[EmotionState] = None,
        activity_score: float = 0.0
    ):
        """Update telemetry overlay for camera."""
        if emotion_state is None:
            emotion_state = self.fusion.get_current_state()
        
        self.telemetry_overlay[camera_id] = {
            "timestamp": datetime.now().isoformat(),
            "emotion": emotion_state.emotion if emotion_state else "neutral",
            "arousal": emotion_state.arousal if emotion_state else 0.0,
            "valence": emotion_state.valence if emotion_state else 0.0,
            "confidence": emotion_state.confidence if emotion_state else 0.0,
            "activity_score": activity_score,
            "camera_score": self.scores.get(camera_id, CameraScore(camera_id, 0.0, {})).score
        }
    
    def get_telemetry_overlay(self, camera_id: str) -> Dict[str, Any]:
        """Get telemetry overlay for camera."""
        return self.telemetry_overlay.get(camera_id, {})
    
    async def auto_direct(self):
        """Auto-direct camera selection based on scores."""
        # Calculate scores for all cameras
        emotion_state = self.fusion.get_current_state()
        
        for camera_id in self.cameras.keys():
            # TODO: Get activity score and face detection from LiveKit
            activity_score = 0.5  # Placeholder
            face_detected = True  # Placeholder
            
            self.calculate_camera_score(
                camera_id,
                emotion_state=emotion_state,
                activity_score=activity_score,
                face_detected=face_detected
            )
        
        # Select best camera
        selected_camera = self.select_camera()
        
        if selected_camera:
            # Update telemetry overlay
            self.update_telemetry_overlay(selected_camera, emotion_state)
        
        return selected_camera


# Global director instance
_director_instance: Optional[LiveKitDirector] = None


def get_director() -> LiveKitDirector:
    """Get global LiveKit director instance."""
    global _director_instance
    if _director_instance is None:
        _director_instance = LiveKitDirector()
    return _director_instance


def reset_director():
    """Reset global LiveKit director instance."""
    global _director_instance
    _director_instance = None


if __name__ == "__main__":
    # Test director
    director = get_director()
    
    # Register test cameras
    director.register_camera("camera1", {"name": "Front Camera"})
    director.register_camera("camera2", {"name": "Side Camera"})
    
    # Calculate scores
    for camera_id in ["camera1", "camera2"]:
        score = director.calculate_camera_score(
            camera_id,
            activity_score=0.7 if camera_id == "camera1" else 0.3,
            face_detected=True
        )
        print(f"Camera {camera_id}: score={score.score:.2f}, factors={score.factors}")
    
    # Select camera
    selected = director.select_camera()
    print(f"Selected camera: {selected}")


