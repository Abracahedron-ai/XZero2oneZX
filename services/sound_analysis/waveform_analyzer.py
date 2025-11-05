"""
Sound Wave Analysis

Python service for separating sound waves and analyzing waveforms.
"""

import numpy as np
import scipy.signal
from scipy import fft
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import librosa
import soundfile as sf


class WaveformAnalyzer:
    """Analyze and separate sound waves."""
    
    def __init__(self, sample_rate: int = 44100):
        self.sample_rate = sample_rate
    
    def load_audio(self, file_path: Path) -> Tuple[np.ndarray, int]:
        """Load audio file."""
        audio, sr = librosa.load(str(file_path), sr=self.sample_rate)
        return audio, sr
    
    def separate_sources(self, audio: np.ndarray, n_sources: int = 2) -> List[np.ndarray]:
        """
        Separate audio into multiple sources using spectral analysis.
        
        Uses source separation techniques (simplified - in production use Spleeter or similar).
        """
        # STFT
        stft = librosa.stft(audio, n_fft=2048, hop_length=512)
        magnitude = np.abs(stft)
        phase = np.angle(stft)
        
        # Simple frequency-based separation
        # In production, use proper source separation (Spleeter, Demucs, etc.)
        separated = []
        
        for i in range(n_sources):
            # Create mask for different frequency ranges
            freq_range = (i * len(magnitude) // n_sources, 
                         (i + 1) * len(magnitude) // n_sources)
            
            mask = np.zeros_like(magnitude)
            mask[freq_range[0]:freq_range[1]] = magnitude[freq_range[0]:freq_range[1]]
            
            # Reconstruct
            separated_stft = mask * np.exp(1j * phase)
            separated_audio = librosa.istft(separated_stft, hop_length=512)
            separated.append(separated_audio)
        
        return separated
    
    def analyze_waveform(self, audio: np.ndarray) -> Dict:
        """Analyze waveform characteristics."""
        # Basic statistics
        duration = len(audio) / self.sample_rate
        rms = np.sqrt(np.mean(audio**2))
        peak = np.max(np.abs(audio))
        
        # Spectral analysis
        fft_vals = np.fft.rfft(audio)
        fft_freq = np.fft.rfftfreq(len(audio), 1/self.sample_rate)
        
        # Find dominant frequencies
        magnitude = np.abs(fft_vals)
        dominant_freq_idx = np.argmax(magnitude)
        dominant_freq = fft_freq[dominant_freq_idx]
        
        # Spectral centroid
        spectral_centroid = np.sum(fft_freq * magnitude) / np.sum(magnitude)
        
        # Zero crossing rate
        zero_crossings = librosa.zero_crossings(audio, pad=False)
        zcr = np.sum(zero_crossings) / len(audio)
        
        # MFCC features
        mfccs = librosa.feature.mfcc(y=audio, sr=self.sample_rate, n_mfcc=13)
        mfcc_mean = np.mean(mfccs, axis=1)
        
        return {
            "duration": duration,
            "rms": float(rms),
            "peak": float(peak),
            "dominant_frequency": float(dominant_freq),
            "spectral_centroid": float(spectral_centroid),
            "zero_crossing_rate": float(zcr),
            "mfcc_mean": mfcc_mean.tolist(),
            "sample_rate": self.sample_rate
        }
    
    def detect_silence(self, audio: np.ndarray, threshold: float = 0.01) -> List[Tuple[float, float]]:
        """Detect silence segments in audio."""
        frame_length = int(self.sample_rate * 0.025)  # 25ms frames
        hop_length = frame_length // 2
        
        rms = librosa.feature.rms(
            y=audio,
            frame_length=frame_length,
            hop_length=hop_length
        )[0]
        
        # Find silence segments
        silence_mask = rms < threshold
        silence_segments = []
        
        in_silence = False
        start_time = 0
        
        for i, is_silent in enumerate(silence_mask):
            time = i * hop_length / self.sample_rate
            
            if is_silent and not in_silence:
                start_time = time
                in_silence = True
            elif not is_silent and in_silence:
                silence_segments.append((start_time, time))
                in_silence = False
        
        if in_silence:
            silence_segments.append((start_time, len(audio) / self.sample_rate))
        
        return silence_segments
    
    def extract_features(self, audio: np.ndarray) -> Dict:
        """Extract comprehensive audio features."""
        waveform_analysis = self.analyze_waveform(audio)
        
        # Additional features
        tempo, beats = librosa.beat.beat_track(y=audio, sr=self.sample_rate)
        chroma = librosa.feature.chroma_stft(y=audio, sr=self.sample_rate)
        chroma_mean = np.mean(chroma, axis=1)
        
        return {
            **waveform_analysis,
            "tempo": float(tempo),
            "beat_count": len(beats),
            "chroma_mean": chroma_mean.tolist()
        }


def main():
    """Test waveform analyzer."""
    analyzer = WaveformAnalyzer()
    
    # Example usage
    test_audio = np.random.randn(44100)  # 1 second of noise
    
    # Analyze
    features = analyzer.extract_features(test_audio)
    print("Waveform Features:")
    for key, value in features.items():
        print(f"  {key}: {value}")
    
    # Detect silence
    silence = analyzer.detect_silence(test_audio)
    print(f"\nSilence segments: {silence}")


if __name__ == "__main__":
    main()

