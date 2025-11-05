"""
Emotion Fusion Module

Provides multi-modal emotion fusion with EMA smoothing and confidence weighting.
Combines SER (Speech Emotion Recognition) and FER (Face Emotion Recognition) outputs.
"""

import asyncio
from typing import Dict, List, Optional, Tuple
from collections import deque
import numpy as np
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class EmotionState:
    """Unified emotion state."""
    emotion: str
    confidence: float
    arousal: float  # -1 to 1
    valence: float  # -1 to 1
    timestamp: datetime
    sources: Dict[str, float]  # Source confidence scores


class EmotionFusion:
    """
    Multi-modal emotion fusion with EMA smoothing.
    
    Combines SER and FER outputs with confidence weighting.
    """
    
    def __init__(
        self,
        alpha: float = 0.7,  # EMA smoothing factor (0-1, higher = less smoothing)
        ser_weight: float = 0.6,  # Weight for speech emotion
        fer_weight: float = 0.4,  # Weight for face emotion
        window_size: int = 10  # Window size for smoothing
    ):
        self.alpha = alpha
        self.ser_weight = ser_weight
        self.fer_weight = fer_weight
        self.window_size = window_size
        
        # State tracking
        self.ser_history: deque = deque(maxlen=window_size)
        self.fer_history: deque = deque(maxlen=window_size)
        self.fused_state: Optional[EmotionState] = None
        
        # Emotion mapping (from arousal/valence to emotion labels)
        self.emotion_map = {
            "happy": (0.5, 0.7),
            "sad": (-0.5, -0.7),
            "angry": (0.7, -0.5),
            "fear": (-0.7, -0.5),
            "surprise": (0.7, 0.3),
            "disgust": (-0.3, -0.7),
            "neutral": (0.0, 0.0),
        }
    
    def add_ser_result(self, emotion: str, confidence: float, arousal: float, valence: float):
        """Add SER (Speech Emotion Recognition) result."""
        self.ser_history.append({
            "emotion": emotion,
            "confidence": confidence,
            "arousal": arousal,
            "valence": valence,
            "timestamp": datetime.now()
        })
    
    def add_fer_result(self, emotion: str, confidence: float):
        """Add FER (Face Emotion Recognition) result."""
        # Map emotion to arousal/valence (simplified)
        arousal, valence = self._emotion_to_av(emotion)
        
        self.fer_history.append({
            "emotion": emotion,
            "confidence": confidence,
            "arousal": arousal,
            "valence": valence,
            "timestamp": datetime.now()
        })
    
    def _emotion_to_av(self, emotion: str) -> Tuple[float, float]:
        """Map emotion label to arousal/valence coordinates."""
        return self.emotion_map.get(emotion.lower(), (0.0, 0.0))
    
    def fuse(self) -> Optional[EmotionState]:
        """
        Fuse SER and FER results with EMA smoothing and confidence weighting.
        
        Returns:
            Unified emotion state or None if no data available
        """
        if not self.ser_history and not self.fer_history:
            return None
        
        # Get latest results
        ser_latest = self.ser_history[-1] if self.ser_history else None
        fer_latest = self.fer_history[-1] if self.fer_history else None
        
        # Calculate weighted arousal/valence
        arousal = 0.0
        valence = 0.0
        total_weight = 0.0
        sources = {}
        
        if ser_latest:
            weight = self.ser_weight * ser_latest["confidence"]
            arousal += ser_latest["arousal"] * weight
            valence += ser_latest["valence"] * weight
            total_weight += weight
            sources["ser"] = ser_latest["confidence"]
        
        if fer_latest:
            weight = self.fer_weight * fer_latest["confidence"]
            arousal += fer_latest["arousal"] * weight
            valence += fer_latest["valence"] * weight
            total_weight += weight
            sources["fer"] = fer_latest["confidence"]
        
        if total_weight == 0:
            return None
        
        # Normalize
        arousal /= total_weight
        valence /= total_weight
        
        # Apply EMA smoothing if we have previous state
        if self.fused_state:
            arousal = self.alpha * arousal + (1 - self.alpha) * self.fused_state.arousal
            valence = self.alpha * valence + (1 - self.alpha) * self.fused_state.valence
        
        # Map to emotion label
        emotion = self._av_to_emotion(arousal, valence)
        
        # Calculate overall confidence
        confidence = (
            (sources.get("ser", 0.0) * self.ser_weight) +
            (sources.get("fer", 0.0) * self.fer_weight)
        ) / (self.ser_weight + self.fer_weight) if sources else 0.0
        
        # Create fused state
        fused_state = EmotionState(
            emotion=emotion,
            confidence=confidence,
            arousal=arousal,
            valence=valence,
            timestamp=datetime.now(),
            sources=sources
        )
        
        # Update state
        self.fused_state = fused_state
        
        return fused_state
    
    def _av_to_emotion(self, arousal: float, valence: float) -> str:
        """Map arousal/valence coordinates to emotion label."""
        # Find closest emotion in A-V space
        min_dist = float('inf')
        closest_emotion = "neutral"
        
        for emotion, (target_arousal, target_valence) in self.emotion_map.items():
            dist = np.sqrt(
                (arousal - target_arousal) ** 2 +
                (valence - target_valence) ** 2
            )
            if dist < min_dist:
                min_dist = dist
                closest_emotion = emotion
        
        return closest_emotion
    
    def get_current_state(self) -> Optional[EmotionState]:
        """Get current fused emotion state."""
        return self.fused_state
    
    def reset(self):
        """Reset fusion state."""
        self.ser_history.clear()
        self.fer_history.clear()
        self.fused_state = None


# Global fusion instance
_fusion_instance: Optional[EmotionFusion] = None


def get_fusion() -> EmotionFusion:
    """Get global emotion fusion instance."""
    global _fusion_instance
    if _fusion_instance is None:
        _fusion_instance = EmotionFusion()
    return _fusion_instance


def reset_fusion():
    """Reset global emotion fusion instance."""
    global _fusion_instance
    if _fusion_instance:
        _fusion_instance.reset()
    _fusion_instance = None

