"""
Fish Speech TTS Wrapper

Wraps fish-speech for emotion-aware TTS with consent checks and speaker vault.
"""

import os
import sys
import json
import tempfile
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime

# Add base wrapper to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from src.backend.services.integrations.wrappers.base import BaseWrapper
from fastapi import FastAPI, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel


class SpeakerVault:
    """Manages consented speaker voices."""
    
    def __init__(self, vault_path: Path, logger=None):
        self.vault_path = vault_path
        self.vault_path.mkdir(parents=True, exist_ok=True)
        self.vault_file = vault_path / "speakers.json"
        self.speakers: Dict[str, Dict] = {}
        self.logger = logger
        self._load_vault()
    
    def _load_vault(self):
        """Load speaker vault from disk."""
        if self.vault_file.exists():
            try:
                with open(self.vault_file, 'r', encoding='utf-8') as f:
                    self.speakers = json.load(f)
                self.logger.info(f"Loaded {len(self.speakers)} speakers from vault")
            except Exception as e:
                self.logger.warning(f"Error loading vault: {e}")
                self.speakers = {}
        else:
            self.speakers = {}
    
    def _save_vault(self):
        """Save speaker vault to disk."""
        try:
            with open(self.vault_file, 'w', encoding='utf-8') as f:
                json.dump(self.speakers, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving vault: {e}")
    
    def add_speaker(
        self,
        speaker_id: str,
        consent_file: str,
        reference_audio_path: str,
        metadata: Dict
    ):
        """Add a consented speaker to the vault."""
        # Validate consent file exists
        consent_path = Path(consent_file)
        if not consent_path.exists():
            raise ValueError(f"Consent file not found: {consent_file}")
        
        # Validate reference audio exists
        audio_path = Path(reference_audio_path)
        if not audio_path.exists():
            raise ValueError(f"Reference audio not found: {reference_audio_path}")
        
        # Store speaker data
        self.speakers[speaker_id] = {
            "consent_file": str(consent_path.absolute()),
            "reference_audio": str(audio_path.absolute()),
            "metadata": metadata,
            "added_at": datetime.now().isoformat()
        }
        
        self._save_vault()
        self.logger.info(f"Added speaker {speaker_id} to vault")
    
    def get_speaker(self, speaker_id: str) -> Optional[Dict]:
        """Get speaker from vault."""
        return self.speakers.get(speaker_id)
    
    def has_consent(self, speaker_id: str) -> bool:
        """Check if speaker has consent."""
        return speaker_id in self.speakers
    
    def list_speakers(self) -> List[str]:
        """List all consented speakers."""
        return list(self.speakers.keys())


class TTSRequest(BaseModel):
    """TTS synthesis request."""
    text: str
    speaker_id: Optional[str] = None
    reference_audio: Optional[str] = None
    emotion: Optional[str] = None  # angry, sad, excited, surprised, satisfied, etc.
    language: str = "en"
    speed: float = 1.0  # Speech speed multiplier
    temperature: float = 0.7  # Sampling temperature


class TTSResponse(BaseModel):
    """TTS synthesis response."""
    audio_url: str
    duration: float
    speaker_id: Optional[str] = None
    visemes: Optional[List[Dict]] = None  # Viseme frames for avatar animation


class FishSpeechWrapper(BaseWrapper):
    """Fish Speech TTS wrapper."""
    
    def __init__(self):
        super().__init__(
            service_name="Fish Speech TTS",
            default_port=8002,
            require_gpu=True
        )
        self.model = None
        self.model_manager = None
        self.speaker_vault = SpeakerVault(
            Path("Models/core/tts/fish-speech/speaker_vault"),
            logger=self.logger
        )
        self.audio_output_dir = Path("assets/audio/tts/fish-speech")
        self.audio_output_dir.mkdir(parents=True, exist_ok=True)
        self._register_endpoints()
    
    def _register_endpoints(self):
        """Register FastAPI endpoints."""
        
        @self.app.post("/synthesize", response_model=TTSResponse)
        async def synthesize(request: TTSRequest):
            """Synthesize speech from text with emotion-aware synthesis."""
            try:
                # Check consent if speaker_id provided
                reference_audio = None
                if request.speaker_id:
                    if not self.speaker_vault.has_consent(request.speaker_id):
                        raise HTTPException(
                            status_code=403,
                            detail=f"Speaker {request.speaker_id} not in consent vault. Please add speaker to vault first."
                        )
                    
                    speaker = self.speaker_vault.get_speaker(request.speaker_id)
                    reference_audio = speaker.get("reference_audio")
                elif request.reference_audio:
                    reference_audio = request.reference_audio
                
                if not self.model_manager:
                    self._load_model()
                
                # Prepare text with emotion markers if provided
                text = request.text
                if request.emotion:
                    # Fish-speech supports emotion markers like (angry), (sad), etc.
                    # Valid emotions: angry, sad, excited, surprised, satisfied, delighted,
                    # scared, worried, upset, nervous, frustrated, depressed, empathetic,
                    # embarrassed, disgusted, moved, proud, relaxed, grateful, confident,
                    # interested, curious, confused, joyful
                    text = f"({request.emotion}) {text}"
                
                # Generate audio using fish-speech
                audio_path = await self._synthesize_audio(
                    text=text,
                    reference_audio=reference_audio,
                    language=request.language,
                    speed=request.speed,
                    temperature=request.temperature
                )
                
                # Calculate duration (simplified - would need actual audio analysis)
                duration = self._estimate_duration(text)
                
                # Extract visemes for avatar animation
                visemes = await self._extract_visemes(text, duration)
                
                result = {
                    "audio_url": f"/audio/{audio_path.name}",
                    "duration": duration,
                    "speaker_id": request.speaker_id,
                    "visemes": visemes  # Include viseme data
                }
                
                return TTSResponse(**result)
            
            except HTTPException:
                raise
            except Exception as e:
                self.logger.error(f"Synthesis error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/audio/{filename}")
        async def get_audio(filename: str):
            """Get generated audio file."""
            audio_path = self.audio_output_dir / filename
            if audio_path.exists():
                return FileResponse(audio_path, media_type="audio/wav")
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        @self.app.post("/speaker/vault")
        async def add_speaker(
            speaker_id: str,
            consent_file: UploadFile = File(...),
            reference_audio: UploadFile = File(...),
            metadata: Optional[str] = None
        ):
            """Add speaker to consent vault with consent validation."""
            # Save uploaded files
            consent_path = self.speaker_vault.vault_path / f"{speaker_id}_consent.pdf"
            audio_path = self.speaker_vault.vault_path / f"{speaker_id}_reference.wav"
            
            # Save consent file
            with open(consent_path, 'wb') as f:
                content = await consent_file.read()
                f.write(content)
            
            # Save reference audio
            with open(audio_path, 'wb') as f:
                content = await reference_audio.read()
                f.write(content)
            
            # Validate consent file (basic check - should be PDF)
            if not consent_file.filename.lower().endswith('.pdf'):
                raise HTTPException(
                    status_code=400,
                    detail="Consent file must be a PDF"
                )
            
            # Parse metadata
            meta = json.loads(metadata) if metadata else {}
            
            # Add to vault
            self.speaker_vault.add_speaker(
                speaker_id,
                str(consent_path),
                str(audio_path),
                meta
            )
            
            return {"status": "added", "speaker_id": speaker_id}
        
        @self.app.get("/speaker/vault")
        async def list_speakers():
            """List all consented speakers."""
            speakers = self.speaker_vault.list_speakers()
            speaker_data = [
                {
                    "id": sid,
                    "metadata": self.speaker_vault.get_speaker(sid).get("metadata", {})
                }
                for sid in speakers
            ]
            return {"speakers": speaker_data}
    
    def _load_model(self):
        """Load fish-speech model."""
        try:
            # Add fish-speech to path
            fish_speech_path = Path("EXPERIMENTAL/fish-speech")
            if fish_speech_path.exists():
                sys.path.insert(0, str(fish_speech_path))
            
            try:
                from tools.server.model_manager import ModelManager
                
                model_path = Path("Models/core/tts/fish-speech")
                llama_checkpoint = model_path / "llama" / "model.pt"
                decoder_checkpoint = model_path / "decoder" / "model.pt"
                
                # Use default paths if specific checkpoints not found
                if not llama_checkpoint.exists():
                    llama_checkpoint = None
                if not decoder_checkpoint.exists():
                    decoder_checkpoint = None
                
                self.model_manager = ModelManager(
                    mode="inference",
                    device="cuda" if self.gpu_available else "cpu",
                    half=True,
                    compile=False,
                    llama_checkpoint_path=str(llama_checkpoint) if llama_checkpoint else None,
                    decoder_checkpoint_path=str(decoder_checkpoint) if decoder_checkpoint else None,
                    decoder_config_name="fish-speech-1.5"
                )
                
                self.logger.info("Loaded fish-speech model")
            except ImportError:
                self.logger.warning(
                    "Fish-speech not available. Using placeholder mode. "
                    "Install fish-speech dependencies to enable full functionality."
                )
                self.model_manager = None
        
        except Exception as e:
            self.logger.error(f"Error loading model: {e}")
            raise
    
    async def _synthesize_audio(
        self,
        text: str,
        reference_audio: Optional[str],
        language: str,
        speed: float,
        temperature: float
    ) -> Path:
        """Synthesize audio using fish-speech."""
        if self.model_manager is None:
            # Placeholder mode - generate empty audio file
            output_file = self.audio_output_dir / f"output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
            output_file.touch()
            return output_file
        
        try:
            # Import fish-speech inference
            from tools.server.views import synthesize_text
            
            # Generate audio (this would call the actual fish-speech API)
            # For now, create placeholder
            output_file = self.audio_output_dir / f"output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
            
            # TODO: Call actual fish-speech synthesis
            # audio_data = self.model_manager.synthesize(
            #     text=text,
            #     reference_audio=reference_audio,
            #     language=language,
            #     speed=speed,
            #     temperature=temperature
            # )
            # Save audio_data to output_file
            
            return output_file
        
        except Exception as e:
            self.logger.error(f"Error synthesizing audio: {e}")
            raise
    
    def _estimate_duration(self, text: str) -> float:
        """Estimate audio duration from text (simplified)."""
        # Rough estimate: ~150 words per minute, ~5 characters per word
        words = len(text.split())
        duration = (words / 150) * 60  # seconds
        return max(0.5, duration)  # Minimum 0.5 seconds
    
    async def _extract_visemes(self, text: str, duration: float) -> List[Dict]:
        """Extract visemes from TTS output."""
        try:
            # Add viseme extractor to path
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))
            from src.backend.services.audio.viseme_extractor import get_extractor
            
            extractor = get_extractor()
            frames = extractor.extract_from_text(text, duration=duration)
            
            # Convert to JSON-serializable format
            return [
                {
                    "timestamp": frame.timestamp,
                    "visemes": frame.visemes,
                    "duration": frame.duration
                }
                for frame in frames
            ]
        except Exception as e:
            self.logger.warning(f"Error extracting visemes: {e}")
            return []


def main():
    """Main entry point."""
    wrapper = FishSpeechWrapper()
    port = int(os.getenv("PORT", "8002"))
    wrapper.run(port=port)


if __name__ == "__main__":
    main()

