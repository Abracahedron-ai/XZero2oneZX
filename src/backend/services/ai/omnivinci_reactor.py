"""
OmniVinci Environment Reactor

Integrates OmniVinci with Facebook models for natural scene reactions.
Combines vision, audio, text, and 3D geometry for context-aware emotional responses.
"""

import numpy as np
from typing import Dict, Optional, Any, List, Tuple
from dataclasses import dataclass
from datetime import datetime
import logging
import asyncio

try:
    from Models.core.nvidia.omnivinci_loader import get_omnivinci_model
    from src.backend.services.ai.facebook_swarm.model_swarm import FacebookModelSwarm
    from src.backend.services.ai.emotion_fusion import get_fusion, EmotionState
    from src.backend.services.audio.keylogger_emotion.keylogger import KeyloggerEmotion
    from src.backend.services.ai.vggt_processor import get_vggt_processor
    OMNIVINCI_AVAILABLE = True
except ImportError as e:
    OMNIVINCI_AVAILABLE = False
    logging.warning(f"OmniVinci not available: {e}")

logger = logging.getLogger(__name__)


@dataclass
class EnvironmentContext:
    """Environment context for OmniVinci processing."""
    image: Optional[np.ndarray] = None
    audio: Optional[np.ndarray] = None
    text: Optional[str] = None
    scene_3d: Optional[Dict[str, Any]] = None
    visual_features: Optional[np.ndarray] = None
    sentiment: Optional[Dict[str, float]] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


@dataclass
class OmniVinciResponse:
    """Response from OmniVinci model."""
    emotion: str
    arousal: float
    valence: float
    confidence: float
    context_understanding: str
    reaction_suggestion: str
    sources: Dict[str, float]


class OmniVinciReactor:
    """
    OmniVinci Environment Reactor
    
    Processes environment stimuli (vision, audio, text, 3D) and generates
    natural emotional responses using OmniVinci multimodal understanding.
    """
    
    def __init__(
        self,
        facebook_model_configs: Optional[List[Dict]] = None,
        emotion_fusion: Optional[Any] = None,
        sentiment_analyzer: Optional[Any] = None
    ):
        """
        Initialize OmniVinci reactor.
        
        Args:
            facebook_model_configs: Configurations for Facebook models
            emotion_fusion: Emotion fusion instance (uses global if None)
            sentiment_analyzer: Sentiment analyzer instance
        """
        if not OMNIVINCI_AVAILABLE:
            raise ImportError("OmniVinci dependencies not available")
        
        # Load OmniVinci model
        logger.info("Loading OmniVinci model...")
        self.omnivinci_model = get_omnivinci_model()
        logger.info("OmniVinci model loaded")
        
        # Initialize Facebook model swarm for environment mapping
        if facebook_model_configs:
            self.facebook_swarm = FacebookModelSwarm(facebook_model_configs)
        else:
            # Default Facebook models for environment mapping
            default_configs = [
                {
                    "model_id": "metaclip",
                    "model_path": "facebook/metaclip-h14-fullcc2.5b"
                },
                {
                    "model_id": "dinov2",
                    "model_path": "facebook/dinov2-giant"
                }
            ]
            self.facebook_swarm = FacebookModelSwarm(default_configs)
        
        # Emotion fusion (existing system)
        self.emotion_fusion = emotion_fusion or get_fusion()
        
        # Sentiment analyzer (existing system)
        if sentiment_analyzer is None:
            try:
                from src.backend.services.audio.keylogger_emotion.keylogger import KeyloggerEmotion
                self.sentiment_analyzer = KeyloggerEmotion()
            except ImportError:
                logger.warning("KeyloggerEmotion not available, using simple sentiment")
                self.sentiment_analyzer = None
        
        # VGGT processor for accurate 3D geometry extraction
        try:
            self.vggt_processor = get_vggt_processor()
            logger.info("VGGT processor initialized")
        except Exception as e:
            logger.warning(f"VGGT processor not available: {e}")
            self.vggt_processor = None
        
        # State tracking
        self.last_response: Optional[OmniVinciResponse] = None
        self.context_history: List[EnvironmentContext] = []
        
    def process_environment(
        self,
        image: Optional[np.ndarray] = None,
        audio: Optional[np.ndarray] = None,
        text: Optional[str] = None,
        scene_3d: Optional[Dict[str, Any]] = None
    ) -> OmniVinciResponse:
        """
        Process environment and generate emotional response.
        
        Args:
            image: Camera frame (numpy array)
            audio: Audio stream (numpy array)
            text: Text input (from keylogger or user input)
            scene_3d: Pre-computed 3D geometry (optional)
            
        Returns:
            OmniVinciResponse with emotion and reaction suggestions
        """
        # 1. Create environment context
        context = EnvironmentContext(
            image=image,
            audio=audio,
            text=text,
            scene_3d=scene_3d
        )
        
        # 2. Facebook models map environment (if image provided)
        if image is not None:
            context.visual_features = self._extract_visual_features(image)
            if scene_3d is None:
                # Use VGGT for accurate 3D geometry extraction if available
                if self.vggt_processor is not None:
                    context.scene_3d = self._extract_3d_geometry_vggt(image)
                else:
                    # Fallback to Facebook models
                    context.scene_3d = self._extract_3d_geometry(image)
        
        # 3. Sentiment analysis (if text provided)
        if text and self.sentiment_analyzer:
            sentiment = self.sentiment_analyzer.analyze_sentiment(text)
            context.sentiment = sentiment
        
        # 4. Process with OmniVinci
        response = self._process_with_omnivinci(context)
        
        # 5. Update emotion fusion
        self._update_emotion_fusion(response)
        
        # 6. Store context and response
        self.context_history.append(context)
        if len(self.context_history) > 100:  # Keep last 100 contexts
            self.context_history.pop(0)
        
        self.last_response = response
        
        return response
    
    def _extract_visual_features(self, image: np.ndarray) -> np.ndarray:
        """Extract visual features using Facebook models."""
        try:
            # Use MetaCLIP for semantic embeddings
            result = self.facebook_swarm.process_request(
                image,
                model_type="vision"
            )
            return result if isinstance(result, np.ndarray) else np.array(result)
        except Exception as e:
            logger.error(f"Error extracting visual features: {e}")
            return np.zeros((768,))  # Default embedding size
    
    def _extract_3d_geometry_vggt(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract 3D geometry using VGGT for accurate reconstruction."""
        try:
            # Use VGGT for accurate 3D reconstruction
            reconstruction = self.vggt_processor.process_numpy_image(image)
            
            # Extract geometry features formatted for OmniVinci
            geometry_features = self.vggt_processor.extract_geometry_features(reconstruction)
            
            logger.info(f"VGGT extracted {geometry_features['num_points']} 3D points")
            
            return geometry_features
            
        except Exception as e:
            logger.error(f"Error extracting 3D geometry with VGGT: {e}")
            # Fallback to Facebook models
            return self._extract_3d_geometry(image)
    
    def _extract_3d_geometry(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract 3D geometry using DINOv2 (fallback)."""
        try:
            # Use DINOv2 for 3D understanding
            result = self.facebook_swarm.process_request(
                image,
                model_type="vision"
            )
            
            # Format as 3D geometry representation
            return {
                "features": result,
                "spatial_understanding": "extracted",
                "geometry_type": "point_cloud_features"
            }
        except Exception as e:
            logger.error(f"Error extracting 3D geometry: {e}")
            return {
                "features": np.zeros((768,)),
                "spatial_understanding": "none",
                "geometry_type": "unknown"
            }
    
    def _process_with_omnivinci(self, context: EnvironmentContext) -> OmniVinciResponse:
        """
        Process environment context with OmniVinci model.
        
        Args:
            context: Environment context with all modalities
            
        Returns:
            OmniVinciResponse with emotion and reaction
        """
        try:
            # Prepare multimodal input for OmniVinci
            inputs = {}
            
            if context.visual_features is not None:
                inputs["vision"] = context.visual_features
            
            if context.audio is not None:
                inputs["audio"] = context.audio
            
            if context.text:
                inputs["text"] = context.text
            
            if context.scene_3d:
                inputs["scene_3d"] = context.scene_3d
            
            # Create prompt for OmniVinci
            prompt = self._create_omnivinci_prompt(context)
            
            # Generate response with OmniVinci
            # Note: Actual API depends on OmniVinci implementation
            # This is a placeholder for the actual model call
            response_text = self._generate_with_omnivinci(prompt, inputs)
            
            # Extract emotion from response
            emotion_state = self._extract_emotion_from_response(
                response_text,
                context
            )
            
            return OmniVinciResponse(
                emotion=emotion_state["emotion"],
                arousal=emotion_state["arousal"],
                valence=emotion_state["valence"],
                confidence=emotion_state["confidence"],
                context_understanding=response_text,
                reaction_suggestion=emotion_state.get("reaction", ""),
                sources={"omnivinci": emotion_state["confidence"]}
            )
            
        except Exception as e:
            logger.error(f"Error processing with OmniVinci: {e}")
            # Fallback to default neutral response
            return OmniVinciResponse(
                emotion="neutral",
                arousal=0.0,
                valence=0.0,
                confidence=0.0,
                context_understanding="Error processing environment",
                reaction_suggestion="",
                sources={}
            )
    
    def _create_omnivinci_prompt(self, context: EnvironmentContext) -> str:
        """Create prompt for OmniVinci based on environment context."""
        prompt_parts = []
        
        prompt_parts.append("React to the environment based on multimodal input:")
        
        if context.text:
            prompt_parts.append(f"Text: {context.text}")
            if context.sentiment:
                prompt_parts.append(
                    f"Sentiment: {context.sentiment.get('emotion', 'neutral')} "
                    f"(polarity: {context.sentiment.get('polarity', 0):.2f})"
                )
        
        if context.scene_3d:
            prompt_parts.append("3D Scene: Detected spatial geometry and objects")
        
        if context.visual_features is not None:
            prompt_parts.append("Visual: Processed image features available")
        
        if context.audio is not None:
            prompt_parts.append("Audio: Audio stream available")
        
        prompt_parts.append(
            "Generate an appropriate emotional response and reaction suggestion "
            "based on the combined context. Consider how the environment affects "
            "the emotional state."
        )
        
        return "\n".join(prompt_parts)
    
    def _generate_with_omnivinci(self, prompt: str, inputs: Dict) -> str:
        """
        Generate response using OmniVinci model.
        
        Note: This is a placeholder. Actual implementation depends on
        OmniVinci's API. The model may support direct multimodal generation.
        """
        # TODO: Implement actual OmniVinci generation
        # This will depend on the actual model API
        # For now, return a placeholder response
        
        # Check if model has generate method
        if hasattr(self.omnivinci_model, 'generate'):
            try:
                # Try to generate with multimodal inputs
                response = self.omnivinci_model.generate(
                    prompt=prompt,
                    **inputs
                )
                return response if isinstance(response, str) else str(response)
            except Exception as e:
                logger.warning(f"OmniVinci generate failed: {e}, using fallback")
        
        # Fallback: Return prompt-based response
        return f"Processing environment: {prompt[:100]}..."
    
    def _extract_emotion_from_response(
        self,
        response_text: str,
        context: EnvironmentContext
    ) -> Dict[str, Any]:
        """
        Extract emotion state from OmniVinci response.
        
        Args:
            response_text: Generated response from OmniVinci
            context: Environment context
            
        Returns:
            Emotion state dictionary
        """
        # Default emotion state
        emotion_state = {
            "emotion": "neutral",
            "arousal": 0.0,
            "valence": 0.0,
            "confidence": 0.5,
            "reaction": ""
        }
        
        # Use sentiment if available
        if context.sentiment:
            emotion_state["emotion"] = context.sentiment.get("emotion", "neutral")
            emotion_state["arousal"] = context.sentiment.get("arousal", 0.0)
            emotion_state["valence"] = context.sentiment.get("valence", 0.0)
            emotion_state["confidence"] = 0.7
        
        # Try to extract emotion from response text
        response_lower = response_text.lower()
        
        # Simple keyword-based emotion extraction
        emotion_keywords = {
            "happy": ("happy", "joyful", "excited", "positive"),
            "sad": ("sad", "depressed", "unhappy", "negative"),
            "angry": ("angry", "frustrated", "annoyed"),
            "fear": ("fear", "scared", "worried", "anxious"),
            "surprise": ("surprise", "surprised", "shocked"),
            "neutral": ("neutral", "calm", "relaxed")
        }
        
        for emotion, keywords in emotion_keywords.items():
            if any(keyword in response_lower for keyword in keywords):
                emotion_state["emotion"] = emotion
                break
        
        # Adjust arousal/valence based on detected emotion
        if emotion_state["emotion"] == "happy":
            emotion_state["arousal"] = max(emotion_state["arousal"], 0.5)
            emotion_state["valence"] = max(emotion_state["valence"], 0.7)
        elif emotion_state["emotion"] == "sad":
            emotion_state["arousal"] = min(emotion_state["arousal"], -0.5)
            emotion_state["valence"] = min(emotion_state["valence"], -0.7)
        elif emotion_state["emotion"] == "angry":
            emotion_state["arousal"] = max(emotion_state["arousal"], 0.7)
            emotion_state["valence"] = min(emotion_state["valence"], -0.5)
        
        # Extract reaction suggestion
        if "reaction" in response_lower or "suggest" in response_lower:
            # Try to extract reaction text
            reaction_start = response_lower.find("reaction")
            if reaction_start > 0:
                reaction_text = response_text[reaction_start:reaction_start+100]
                emotion_state["reaction"] = reaction_text.strip()
        
        return emotion_state
    
    def _update_emotion_fusion(self, response: OmniVinciResponse):
        """Update emotion fusion with OmniVinci response."""
        if self.emotion_fusion:
            # Add OmniVinci result to fusion
            # Note: This requires extending EmotionFusion to support OmniVinci
            # For now, we'll add it as a new source
            try:
                # Check if fusion has add_omnivinci_result method
                if hasattr(self.emotion_fusion, 'add_omnivinci_result'):
                    self.emotion_fusion.add_omnivinci_result(
                        emotion=response.emotion,
                        confidence=response.confidence,
                        arousal=response.arousal,
                        valence=response.valence
                    )
                else:
                    # Fallback: Add as SER-like result
                    self.emotion_fusion.add_ser_result(
                        emotion=response.emotion,
                        confidence=response.confidence,
                        arousal=response.arousal,
                        valence=response.valence
                    )
            except Exception as e:
                logger.error(f"Error updating emotion fusion: {e}")
    
    async def process_environment_async(
        self,
        image: Optional[np.ndarray] = None,
        audio: Optional[np.ndarray] = None,
        text: Optional[str] = None,
        scene_3d: Optional[Dict[str, Any]] = None
    ) -> OmniVinciResponse:
        """Async version of process_environment."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.process_environment,
            image,
            audio,
            text,
            scene_3d
        )
    
    def get_last_response(self) -> Optional[OmniVinciResponse]:
        """Get last OmniVinci response."""
        return self.last_response
    
    def get_context_history(self, limit: int = 10) -> List[EnvironmentContext]:
        """Get recent context history."""
        return self.context_history[-limit:]
    
    def log_object_emotion(
        self,
        obj_id: str,
        response: Optional[OmniVinciResponse] = None,
        tags: Optional[List[str]] = None
    ):
        """
        Log emotion tags to object_emotion table.
        
        Args:
            obj_id: Object identifier
            response: Optional OmniVinci response (if None, uses last response)
            tags: Optional list of emotion tags (if None, uses response emotion)
        """
        if response is None:
            response = self.last_response
        
        if response is None:
            logger.warning(f"No emotion response available for object {obj_id}")
            return
        
        try:
            from src.backend.services.objects.object_persistence import get_persistence
            
            persistence = get_persistence()
            
            if tags is None:
                tags = [response.emotion]
            
            persistence.sync_emotion(
                obj_id=obj_id,
                tags=tags,
                valence=response.valence,
                arousal=response.arousal,
                confidence=response.confidence
            )
            
            logger.info(f"Logged emotion for object {obj_id}: {tags}")
            
        except Exception as e:
            logger.error(f"Error logging object emotion: {e}")


# Global reactor instance
_reactor_instance: Optional[OmniVinciReactor] = None


def get_omnivinci_reactor() -> OmniVinciReactor:
    """Get global OmniVinci reactor instance."""
    global _reactor_instance
    if _reactor_instance is None:
        _reactor_instance = OmniVinciReactor()
    return _reactor_instance


def reset_reactor():
    """Reset global reactor instance."""
    global _reactor_instance
    _reactor_instance = None

