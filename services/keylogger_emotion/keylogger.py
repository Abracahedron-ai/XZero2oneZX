"""
Keylogger with Spell Correction and Sentiment Analysis

Captures keystrokes, performs spell correction, sentiment analysis,
and maps to fish-speech emotion variables.
"""

import keyboard
import time
import json
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import queue
import threading

# Spell correction
try:
    from autocorrect import Speller
    spell_correct = Speller(lang='en')
except ImportError:
    print("Warning: autocorrect not installed. Install with: pip install autocorrect")
    spell_correct = lambda x: x

# Sentiment analysis
try:
    from textblob import TextBlob
except ImportError:
    print("Warning: textblob not installed. Install with: pip install textblob")
    TextBlob = None


class KeyloggerEmotion:
    """Keylogger with emotion mapping."""
    
    def __init__(self, output_dir: Path = Path("logs/keylogger")):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.keystrokes: List[Dict] = []
        self.current_buffer: str = ""
        self.buffer_lock = threading.Lock()
        
        self.running = False
        self.event_queue = queue.Queue()
        
        # Emotion mapping (fish-speech compatible)
        self.emotion_map = {
            'positive': ['happy', 'joyful', 'excited', 'satisfied', 'delighted', 'grateful', 'confident', 'proud'],
            'negative': ['sad', 'angry', 'frustrated', 'depressed', 'worried', 'upset', 'nervous', 'embarrassed'],
            'neutral': ['neutral', 'relaxed', 'interested', 'curious'],
            'high_arousal': ['excited', 'angry', 'frustrated', 'worried', 'nervous'],
            'low_arousal': ['relaxed', 'sad', 'depressed', 'calm'],
            'high_valence': ['happy', 'joyful', 'satisfied', 'delighted', 'grateful', 'confident'],
            'low_valence': ['sad', 'angry', 'frustrated', 'depressed', 'upset']
        }
    
    def analyze_sentiment(self, text: str) -> Dict:
        """Analyze sentiment and map to fish-speech emotions."""
        if TextBlob is None:
            return {"emotion": "neutral", "polarity": 0.0, "subjectivity": 0.0}
        
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity  # -1 to 1
        subjectivity = blob.sentiment.subjectivity  # 0 to 1
        
        # Map to fish-speech emotions
        if polarity > 0.3:
            if subjectivity > 0.5:
                emotion = "excited"
            else:
                emotion = "satisfied"
        elif polarity < -0.3:
            if subjectivity > 0.5:
                emotion = "frustrated"
            else:
                emotion = "sad"
        else:
            emotion = "neutral"
        
        # Calculate arousal and valence
        arousal = abs(polarity) * 0.5 + subjectivity * 0.5
        valence = polarity
        
        return {
            "emotion": emotion,
            "polarity": polarity,
            "subjectivity": subjectivity,
            "arousal": arousal,
            "valence": valence,
            "fish_speech_emotion": emotion
        }
    
    def correct_spelling(self, text: str) -> str:
        """Correct spelling in text."""
        words = text.split()
        corrected = [spell_correct(word) for word in words]
        return ' '.join(corrected)
    
    def on_key_press(self, event):
        """Handle key press event."""
        if not self.running:
            return
        
        key_name = event.name
        
        # Handle special keys
        if key_name == 'space':
            self.current_buffer += ' '
        elif key_name == 'enter':
            self.current_buffer += '\n'
        elif key_name == 'backspace':
            self.current_buffer = self.current_buffer[:-1] if self.current_buffer else ""
        elif len(key_name) == 1:
            self.current_buffer += key_name
        
        # Process buffer every 10 characters or on space/enter
        if len(self.current_buffer) >= 10 or key_name in ['space', 'enter']:
            self.process_buffer()
    
    def process_buffer(self):
        """Process current buffer for sentiment and spelling."""
        if not self.current_buffer.strip():
            return
        
        with self.buffer_lock:
            buffer = self.current_buffer
            self.current_buffer = ""
        
        # Correct spelling
        corrected = self.correct_spelling(buffer)
        
        # Analyze sentiment
        sentiment = self.analyze_sentiment(buffer)
        
        # Create keystroke record
        record = {
            "timestamp": datetime.now().isoformat(),
            "original": buffer,
            "corrected": corrected,
            "sentiment": sentiment,
            "length": len(buffer)
        }
        
        self.keystrokes.append(record)
        self.event_queue.put(record)
        
        # Save to file periodically
        if len(self.keystrokes) % 100 == 0:
            self.save_keystrokes()
    
    def save_keystrokes(self):
        """Save keystrokes to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = self.output_dir / f"keystrokes_{timestamp}.json"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.keystrokes, f, indent=2)
        
        print(f"Saved {len(self.keystrokes)} keystrokes to {file_path}")
    
    def start(self):
        """Start keylogger."""
        self.running = True
        keyboard.on_press(self.on_key_press)
        print("[Keylogger] Started capturing keystrokes...")
    
    def stop(self):
        """Stop keylogger and save final data."""
        self.running = False
        keyboard.unhook_all()
        
        # Process remaining buffer
        if self.current_buffer:
            self.process_buffer()
        
        # Final save
        self.save_keystrokes()
        print("[Keylogger] Stopped and saved keystrokes.")


def main():
    """Main entry point."""
    keylogger = KeyloggerEmotion()
    
    try:
        keylogger.start()
        print("Keylogger running. Press Ctrl+C to stop...")
        
        # Keep running
        while True:
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\nStopping keylogger...")
        keylogger.stop()


if __name__ == "__main__":
    main()

