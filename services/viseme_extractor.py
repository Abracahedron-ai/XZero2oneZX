"""
Viseme Extractor

Extracts viseme data from TTS output and streams to avatar rig via WebSocket.
"""

import asyncio
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import numpy as np
from dataclasses import dataclass
from datetime import datetime


@dataclass
class VisemeFrame:
    """Viseme frame data."""
    timestamp: float
    visemes: Dict[str, float]  # Viseme name -> weight (0-1)
    duration: float


class VisemeExtractor:
    """
    Extracts viseme data from TTS audio/text.
    
    Maps phonemes to visemes using a phoneme-to-viseme mapping.
    """
    
    # Phoneme to viseme mapping (simplified)
    PHONEME_TO_VISEME = {
        # Silence
        'sil': 'silence',
        'sp': 'silence',
        
        # Bilabial (lips together)
        'p': 'closed', 'b': 'closed', 'm': 'closed',
        
        # Labiodental (lip-teeth)
        'f': 'f', 'v': 'f',
        
        # Dental/Alveolar
        't': 't', 'd': 't', 's': 't', 'z': 't', 'n': 't', 'l': 't',
        
        # Alveolar fricative
        'th': 'th',
        
        # Palatal
        'ch': 'ch', 'jh': 'ch', 'sh': 'ch', 'zh': 'ch',
        
        # Velar
        'k': 'k', 'g': 'k', 'ng': 'k',
        
        # Vowels (open mouth)
        'aa': 'a', 'ae': 'a', 'ah': 'a', 'ao': 'a', 'aw': 'a', 'ay': 'a',
        'eh': 'e', 'er': 'e', 'ey': 'e',
        'ih': 'i', 'iy': 'i',
        'ow': 'o', 'oy': 'o',
        'uh': 'u', 'uw': 'u',
        
        # Semivowels
        'w': 'w', 'y': 'y', 'r': 'r',
        
        # Default
        'default': 'a'
    }
    
    # Viseme weights for different phonemes (simplified)
    VISEME_WEIGHTS = {
        'silence': {'closed': 1.0},
        'closed': {'closed': 1.0},
        'f': {'f': 1.0},
        'th': {'th': 1.0},
        't': {'t': 1.0},
        'ch': {'ch': 1.0},
        'k': {'k': 1.0},
        'a': {'a': 1.0},
        'e': {'e': 1.0},
        'i': {'i': 1.0},
        'o': {'o': 1.0},
        'u': {'u': 1.0},
        'w': {'w': 1.0},
        'y': {'y': 1.0},
        'r': {'r': 1.0},
    }
    
    def __init__(self):
        self.viseme_frames: List[VisemeFrame] = []
    
    def extract_from_text(
        self,
        text: str,
        phonemes: Optional[List[Tuple[str, float]]] = None,
        duration: float = 1.0
    ) -> List[VisemeFrame]:
        """
        Extract visemes from text or phoneme sequence.
        
        Args:
            text: Input text
            phonemes: List of (phoneme, duration) tuples (if available)
            duration: Total duration in seconds
        
        Returns:
            List of viseme frames
        """
        frames = []
        
        if phonemes:
            # Use provided phonemes
            current_time = 0.0
            for phoneme, phoneme_duration in phonemes:
                viseme = self._phoneme_to_viseme(phoneme.lower())
                weights = self._get_viseme_weights(viseme)
                
                frame = VisemeFrame(
                    timestamp=current_time,
                    visemes=weights,
                    duration=phoneme_duration
                )
                frames.append(frame)
                
                current_time += phoneme_duration
        else:
            # Simple text-based extraction (estimate phonemes)
            # This is a simplified version - would need actual phoneme extraction
            estimated_phonemes = self._estimate_phonemes(text, duration)
            current_time = 0.0
            
            for phoneme, phoneme_duration in estimated_phonemes:
                viseme = self._phoneme_to_viseme(phoneme.lower())
                weights = self._get_viseme_weights(viseme)
                
                frame = VisemeFrame(
                    timestamp=current_time,
                    visemes=weights,
                    duration=phoneme_duration
                )
                frames.append(frame)
                
                current_time += phoneme_duration
        
        self.viseme_frames = frames
        return frames
    
    def _phoneme_to_viseme(self, phoneme: str) -> str:
        """Map phoneme to viseme."""
        return self.PHONEME_TO_VISEME.get(phoneme, 'a')
    
    def _get_viseme_weights(self, viseme: str) -> Dict[str, float]:
        """Get viseme weights for a viseme."""
        weights = self.VISEME_WEIGHTS.get(viseme, {'a': 1.0})
        
        # Normalize to ensure all visemes sum to 1.0
        total = sum(weights.values())
        if total > 0:
            return {k: v / total for k, v in weights.items()}
        
        return {'a': 1.0}
    
    def _estimate_phonemes(self, text: str, duration: float) -> List[Tuple[str, float]]:
        """Estimate phonemes from text (simplified)."""
        # This is a placeholder - would need actual phoneme extraction
        # For now, estimate based on character count
        chars_per_second = len(text) / duration if duration > 0 else 10
        
        phonemes = []
        for char in text.lower():
            if char.isalpha():
                # Simple mapping
                if char in 'aeiou':
                    phonemes.append(('a', 0.1))
                elif char in 'fvw':
                    phonemes.append(('f', 0.1))
                elif char in 'ptk':
                    phonemes.append(('t', 0.1))
                else:
                    phonemes.append(('a', 0.1))
            else:
                phonemes.append(('sil', 0.05))
        
        # Normalize duration
        total_duration = sum(d for _, d in phonemes)
        if total_duration > 0:
            scale = duration / total_duration
            phonemes = [(p, d * scale) for p, d in phonemes]
        
        return phonemes
    
    def stream_to_avatar(self, websocket, frames: List[VisemeFrame]):
        """Stream viseme frames to avatar via WebSocket."""
        async def stream():
            for frame in frames:
                message = {
                    "type": "viseme",
                    "timestamp": frame.timestamp,
                    "visemes": frame.visemes,
                    "duration": frame.duration
                }
                
                try:
                    await websocket.send(json.dumps(message))
                    await asyncio.sleep(frame.duration)
                except Exception as e:
                    print(f"Error streaming viseme: {e}")
                    break
        
        return stream()


# Global extractor instance
_extractor_instance: Optional[VisemeExtractor] = None


def get_extractor() -> VisemeExtractor:
    """Get global viseme extractor instance."""
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = VisemeExtractor()
    return _extractor_instance


def reset_extractor():
    """Reset global viseme extractor instance."""
    global _extractor_instance
    _extractor_instance = None


if __name__ == "__main__":
    # Test extractor
    extractor = get_extractor()
    text = "Hello world"
    frames = extractor.extract_from_text(text, duration=2.0)
    print(f"Extracted {len(frames)} viseme frames")
    for frame in frames[:5]:
        print(f"  {frame.timestamp:.2f}s: {frame.visemes}")

