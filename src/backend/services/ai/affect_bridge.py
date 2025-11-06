"""
Affect Bridge

Pipes emotion fusion output into:
- LLM prompts (context-aware responses)
- AudioMix panel (visual feedback)
- Avatar expressions (if supported)
"""

import asyncio
import json
from typing import Dict, Optional, Any
from datetime import datetime
import logging

# Add services to path
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from emotion_fusion import get_fusion, EmotionState


class AffectBridge:
    """Bridge between emotion fusion and downstream consumers."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.fusion = get_fusion()
        self.llm_client = None
        self.audiomix_client = None
        self.avatar_client = None
        self.subscribers: Dict[str, Any] = {}
    
    def subscribe(self, subscriber_id: str, callback: callable):
        """Subscribe to affect updates."""
        self.subscribers[subscriber_id] = callback
        self.logger.info(f"Subscribed {subscriber_id} to affect updates")
    
    def unsubscribe(self, subscriber_id: str):
        """Unsubscribe from affect updates."""
        if subscriber_id in self.subscribers:
            del self.subscribers[subscriber_id]
            self.logger.info(f"Unsubscribed {subscriber_id} from affect updates")
    
    async def broadcast_affect(self, emotion_state: EmotionState):
        """Broadcast affect state to all subscribers."""
        for subscriber_id, callback in self.subscribers.items():
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(emotion_state)
                else:
                    callback(emotion_state)
            except Exception as e:
                self.logger.error(f"Error broadcasting to {subscriber_id}: {e}")
    
    def enhance_llm_prompt(self, base_prompt: str, emotion_state: Optional[EmotionState] = None) -> str:
        """
        Enhance LLM prompt with emotion context.
        
        Args:
            base_prompt: Base prompt text
            emotion_state: Current emotion state (None to use current fusion state)
        
        Returns:
            Enhanced prompt with emotion context
        """
        if emotion_state is None:
            emotion_state = self.fusion.get_current_state()
        
        if emotion_state is None:
            return base_prompt
        
        # Add emotion context to prompt
        emotion_context = f"""
[Emotion Context]
Current emotion: {emotion_state.emotion}
Confidence: {emotion_state.confidence:.2f}
Arousal: {emotion_state.arousal:.2f}
Valence: {emotion_state.valence:.2f}
Sources: {emotion_state.sources}
"""
        
        return f"{base_prompt}\n\n{emotion_context}"
    
    async def update_audiomix_panel(self, emotion_state: Optional[EmotionState] = None):
        """Update AudioMix panel with visual feedback."""
        if emotion_state is None:
            emotion_state = self.fusion.get_current_state()
        
        if emotion_state is None:
            return
        
        # Map emotion to visual feedback
        visual_config = self._emotion_to_visual(emotion_state)
        
        # Send to AudioMix panel via WebSocket or HTTP
        if self.audiomix_client:
            try:
                await self.audiomix_client.send(json.dumps({
                    "type": "affect_update",
                    "emotion": emotion_state.emotion,
                    "confidence": emotion_state.confidence,
                    "visual": visual_config
                }))
            except Exception as e:
                self.logger.error(f"Error updating AudioMix panel: {e}")
    
    async def update_avatar_expressions(self, emotion_state: Optional[EmotionState] = None):
        """Update avatar expressions based on emotion."""
        if emotion_state is None:
            emotion_state = self.fusion.get_current_state()
        
        if emotion_state is None:
            return
        
        # Map emotion to avatar expression
        expression_config = self._emotion_to_expression(emotion_state)
        
        # Send to avatar via WebSocket
        if self.avatar_client:
            try:
                await self.avatar_client.send(json.dumps({
                    "type": "expression_update",
                    "emotion": emotion_state.emotion,
                    "arousal": emotion_state.arousal,
                    "valence": emotion_state.valence,
                    "expression": expression_config
                }))
            except Exception as e:
                self.logger.error(f"Error updating avatar expressions: {e}")
    
    def _emotion_to_visual(self, emotion_state: EmotionState) -> Dict[str, Any]:
        """Map emotion to visual feedback configuration."""
        # Map emotion to color/intensity for AudioMix panel
        color_map = {
            "happy": {"color": "#00ff00", "intensity": emotion_state.confidence},
            "sad": {"color": "#0000ff", "intensity": emotion_state.confidence},
            "angry": {"color": "#ff0000", "intensity": emotion_state.confidence},
            "fear": {"color": "#ff00ff", "intensity": emotion_state.confidence},
            "surprise": {"color": "#ffff00", "intensity": emotion_state.confidence},
            "disgust": {"color": "#ff8800", "intensity": emotion_state.confidence},
            "neutral": {"color": "#888888", "intensity": 0.5}
        }
        
        return color_map.get(emotion_state.emotion, color_map["neutral"])
    
    def _emotion_to_expression(self, emotion_state: EmotionState) -> Dict[str, Any]:
        """Map emotion to avatar expression configuration."""
        # Map emotion to facial expression parameters
        expression_map = {
            "happy": {
                "mouth_smile": emotion_state.confidence,
                "eyes_happy": emotion_state.confidence,
                "eyebrows_neutral": 0.5
            },
            "sad": {
                "mouth_frown": emotion_state.confidence,
                "eyes_sad": emotion_state.confidence,
                "eyebrows_down": emotion_state.confidence
            },
            "angry": {
                "mouth_angry": emotion_state.confidence,
                "eyes_angry": emotion_state.confidence,
                "eyebrows_angry": emotion_state.confidence
            },
            "fear": {
                "mouth_open": emotion_state.confidence * 0.5,
                "eyes_wide": emotion_state.confidence,
                "eyebrows_up": emotion_state.confidence
            },
            "surprise": {
                "mouth_open": emotion_state.confidence,
                "eyes_wide": emotion_state.confidence,
                "eyebrows_up": emotion_state.confidence
            },
            "disgust": {
                "mouth_nose_wrinkle": emotion_state.confidence,
                "eyes_squint": emotion_state.confidence * 0.5
            },
            "neutral": {
                "mouth_neutral": 0.5,
                "eyes_neutral": 0.5,
                "eyebrows_neutral": 0.5
            }
        }
        
        return expression_map.get(emotion_state.emotion, expression_map["neutral"])
    
    async def process_affect_update(self):
        """Process affect updates and broadcast to subscribers."""
        # Get current fused state
        emotion_state = self.fusion.fuse()
        
        if emotion_state:
            # Broadcast to all subscribers
            await self.broadcast_affect(emotion_state)
            
            # Update downstream systems
            await self.update_audiomix_panel(emotion_state)
            await self.update_avatar_expressions(emotion_state)


# Global bridge instance
_bridge_instance: Optional[AffectBridge] = None


def get_bridge() -> AffectBridge:
    """Get global affect bridge instance."""
    global _bridge_instance
    if _bridge_instance is None:
        _bridge_instance = AffectBridge()
    return _bridge_instance


def reset_bridge():
    """Reset global affect bridge instance."""
    global _bridge_instance
    _bridge_instance = None


if __name__ == "__main__":
    # Test bridge
    async def test():
        bridge = get_bridge()
        
        # Test LLM prompt enhancement
        prompt = "Generate a response to the user's question."
        enhanced = bridge.enhance_llm_prompt(prompt)
        print("Enhanced prompt:", enhanced)
    
    asyncio.run(test())


