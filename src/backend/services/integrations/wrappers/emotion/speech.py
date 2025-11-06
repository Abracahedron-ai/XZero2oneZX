"""
Speech Emotion Recognition (SER) Wrapper

Wraps SpeechBrain or similar models for speech emotion recognition.
Emits events on NATS for emotion results.
"""

import os
import sys
from typing import Optional, Dict, Any
from pathlib import Path

# Add base wrapper to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from src.backend.services.integrations.wrappers.base import BaseWrapper
from fastapi import FastAPI, HTTPException, File, UploadFile
from pydantic import BaseModel


class EmotionRequest(BaseModel):
    """Emotion recognition request."""
    audio_data: Optional[bytes] = None
    model_name: str = "speechbrain/emotion-recognition-wav2vec2-IEMOCAP"


class EmotionResponse(BaseModel):
    """Emotion recognition response."""
    emotion: str
    confidence: float
    arousal: Optional[float] = None
    valence: Optional[float] = None


class SERWrapper(BaseWrapper):
    """Speech Emotion Recognition wrapper."""
    
    def __init__(self):
        super().__init__(
            service_name="Speech Emotion Recognition",
            default_port=8004,
            require_gpu=True
        )
        self.model = None
        self.nats_client = None
        self.nats_url = os.getenv("NATS_URL", "nats://localhost:4222")
        self._register_endpoints()
    
    def _register_endpoints(self):
        """Register FastAPI endpoints."""
        
        @self.app.post("/recognize", response_model=EmotionResponse)
        async def recognize_emotion(request: EmotionRequest):
            """Recognize emotion from speech."""
            try:
                if not self.model:
                    self._load_model(request.model_name)
                
                # TODO: Implement actual emotion recognition
                result = {
                    "emotion": "neutral",
                    "confidence": 0.5,
                    "arousal": 0.0,
                    "valence": 0.0
                }
                
                # Emit to NATS
                if self.nats_client:
                    await self._emit_to_nats("emotion.speech", result)
                
                return EmotionResponse(**result)
            
            except Exception as e:
                self.logger.error(f"Emotion recognition error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
    
    def _load_model(self, model_name: str):
        """Load SER model."""
        try:
            # TODO: Import and load SpeechBrain model
            model_path = Path("Models/core/emotion/speech")
            self.logger.info(f"Loading SER model: {model_name} from {model_path}")
            # self.model = load_ser_model(model_name, model_path)
        
        except Exception as e:
            self.logger.error(f"Error loading model: {e}")
            raise
    
    async def connect_nats(self, nats_url: str = None):
        """Connect to NATS server."""
        if nats_url:
            self.nats_url = nats_url
        
        try:
            import nats
            self.nats_client = await nats.connect(self.nats_url)
            self.logger.info(f"Connected to NATS: {self.nats_url}")
            
            # Subscribe to audio stream for emotion recognition
            async def handle_audio_stream(msg):
                try:
                    data = json.loads(msg.data.decode())
                    audio_data = bytes.fromhex(data.get("data", ""))
                    
                    # Process audio for emotion
                    if self.model:
                        # TODO: Process audio with SER model
                        emotion_result = {
                            "emotion": "neutral",
                            "confidence": 0.5,
                            "arousal": 0.0,
                            "valence": 0.0,
                            "timestamp": data.get("timestamp", 0)
                        }
                        
                        # Emit emotion result
                        await self._emit_to_nats("emotion.speech", emotion_result)
                except Exception as e:
                    self.logger.error(f"Error processing audio stream: {e}")
            
            # Subscribe to audio.raw for real-time emotion recognition
            await self.nats_client.subscribe("audio.raw", cb=handle_audio_stream)
            
        except ImportError:
            self.logger.warning("NATS client not installed. Install with: pip install nats-py")
            self.nats_client = None
        except Exception as e:
            self.logger.error(f"NATS connection error: {e}")
            self.nats_client = None
    
    async def _emit_to_nats(self, subject: str, data: Dict[str, Any]):
        """Emit event to NATS."""
        if not self.nats_client:
            return
        
        try:
            import nats
            import json
            await self.nats_client.publish(
                subject,
                json.dumps(data).encode()
            )
            self.logger.debug(f"Published to NATS: {subject}")
        except Exception as e:
            self.logger.error(f"NATS publish error: {e}")


def main():
    """Main entry point."""
    import asyncio
    
    wrapper = SERWrapper()
    
    # Connect to NATS
    asyncio.run(wrapper.connect_nats())
    
    # Run service
    port = int(os.getenv("PORT", "8004"))
    wrapper.run(port=port)


if __name__ == "__main__":
    main()

