"""
Faster Whisper ASR Wrapper

Wraps faster-whisper for real-time speech recognition.
Emits events on NATS for partial transcriptions.
"""

import os
import sys
import json
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path

# Add base wrapper to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from services.wrappers.base import BaseWrapper, create_error_response
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


class TranscriptionRequest(BaseModel):
    """Transcription request model."""
    audio_data: Optional[bytes] = None
    model_size: str = "base"
    language: Optional[str] = None
    beam_size: int = 5
    vad_filter: bool = True


class TranscriptionResponse(BaseModel):
    """Transcription response model."""
    text: str
    language: Optional[str] = None
    segments: Optional[list] = None


class FasterWhisperWrapper(BaseWrapper):
    """Faster Whisper ASR wrapper."""
    
    def __init__(self):
        super().__init__(
            service_name="Faster Whisper ASR",
            default_port=8001,
            require_gpu=True
        )
        self.model = None
        self.nats_client = None
        self._register_endpoints()
    
    def _register_endpoints(self):
        """Register FastAPI endpoints."""
        
        @self.app.post("/transcribe", response_model=TranscriptionResponse)
        async def transcribe(request: TranscriptionRequest):
            """Transcribe audio."""
            try:
                if not self.model:
                    # Lazy load model
                    self._load_model(request.model_size)
                
                # TODO: Implement actual transcription
                # For now, return placeholder
                result = {
                    "text": "Transcription placeholder",
                    "language": request.language,
                    "segments": []
                }
                
                # Emit to NATS if configured
                if self.nats_client:
                    await self._emit_to_nats("asr.partial", result)
                
                return TranscriptionResponse(**result)
            
            except Exception as e:
                self.logger.error(f"Transcription error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/transcribe/stream")
        async def transcribe_stream(audio: UploadFile = File(...)):
            """Stream transcription with partial results."""
            return StreamingResponse(
                self._stream_transcription(audio),
                media_type="text/event-stream"
            )
        
        @self.app.post("/transcribe/audio-chunk")
        async def transcribe_audio_chunk(audio_chunk: UploadFile = File(...)):
            """Transcribe audio chunk and emit to NATS."""
            try:
                audio_data = await audio_chunk.read()
                
                # Emit raw audio to NATS
                await self._emit_audio_chunk(audio_data)
                
                if not self.model:
                    self._load_model("base")
                
                # TODO: Process audio chunk and transcribe
                # For now, emit placeholder
                result = {
                    "text": "partial transcription",
                    "partial": True,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
                # Emit partial transcription to NATS
                await self._emit_to_nats("asr.partial", result)
                
                return result
            
            except Exception as e:
                self.logger.error(f"Audio chunk transcription error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
    
    def _load_model(self, model_size: str = "base"):
        """Load faster-whisper model."""
        try:
            from faster_whisper import WhisperModel
            
            model_path = Path("Models/core/asr/faster-whisper")
            self.model = WhisperModel(
                model_size,
                device="cuda" if self.gpu_available else "cpu",
                compute_type="float16" if self.gpu_available else "int8"
            )
            self.logger.info(f"Loaded faster-whisper model: {model_size}")
        
        except ImportError:
            self.logger.error("faster-whisper not installed")
            raise
        except Exception as e:
            self.logger.error(f"Error loading model: {e}")
            raise
    
    async def _stream_transcription(self, audio: UploadFile):
        """Stream transcription results with partial updates."""
        try:
            if not self.model:
                self._load_model("base")
            
            # Read audio file
            audio_data = await audio.read()
            
            # Emit raw audio to NATS
            await self._emit_audio_chunk(audio_data)
            
            # TODO: Implement actual streaming transcription with faster-whisper
            # For now, emit placeholder events
            yield f"data: {json.dumps({'type': 'start', 'message': 'Transcription started'})}\n\n"
            
            # Simulate partial results
            yield f"data: {json.dumps({'type': 'partial', 'text': 'Transcription...', 'partial': True})}\n\n"
            
            # Final result
            final_result = {
                "type": "final",
                "text": "Complete transcription",
                "partial": False,
                "segments": []
            }
            
            # Emit final result to NATS
            await self._emit_to_nats("asr.partial", final_result)
            
            yield f"data: {json.dumps(final_result)}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    async def _emit_to_nats(self, subject: str, data: Dict[str, Any]):
        """Emit event to NATS."""
        if not self.nats_client:
            return
        
        try:
            import nats
            await self.nats_client.publish(
                subject,
                json.dumps(data).encode()
            )
            self.logger.debug(f"Published to NATS: {subject}")
        except Exception as e:
            self.logger.error(f"NATS publish error: {e}")
    
    async def _emit_audio_chunk(self, audio_chunk: bytes):
        """Emit raw audio chunk to NATS."""
        if self.nats_client:
            await self._emit_to_nats("audio.raw", {
                "data": audio_chunk.hex(),
                "timestamp": asyncio.get_event_loop().time()
            })
    
    async def connect_nats(self, nats_url: str = "nats://localhost:4222"):
        """Connect to NATS server."""
        try:
            import nats
            self.nats_client = await nats.connect(nats_url)
            self.logger.info(f"Connected to NATS: {nats_url}")
            
            # Subscribe to audio stream if needed
            # await self.nats_client.subscribe("audio.stream", cb=self._handle_audio_stream)
        except ImportError:
            self.logger.warning("NATS client not installed. Install with: pip install nats-py")
            self.nats_client = None
        except Exception as e:
            self.logger.error(f"NATS connection error: {e}")
            self.nats_client = None


def main():
    """Main entry point."""
    wrapper = FasterWhisperWrapper()
    
    # Connect to NATS if available
    nats_url = os.getenv("NATS_URL", "nats://localhost:4222")
    asyncio.run(wrapper.connect_nats(nats_url))
    
    # Run service
    port = int(os.getenv("PORT", "8001"))
    wrapper.run(port=port)


if __name__ == "__main__":
    main()

