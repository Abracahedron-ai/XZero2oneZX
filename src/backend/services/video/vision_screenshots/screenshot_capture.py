"""
Vision Screenshot Capture

Tiny vision model taking screenshots on major key/mouse events.
"""

import keyboard
import mouse
from PIL import ImageGrab
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import json
import queue
import threading
import time

# Tiny vision model for analysis
try:
    import torch
    from transformers import CLIPProcessor, CLIPModel
    vision_available = True
except ImportError:
    print("Warning: transformers not installed. Install with: pip install transformers")
    vision_available = False


class ScreenshotCapture:
    """Capture screenshots on key/mouse events with vision model analysis."""
    
    def __init__(
        self,
        output_dir: Path = Path("runtime/logs/screenshots"),
        analyze_with_vision: bool = True
    ):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.screenshots: List[Dict] = []
        self.running = False
        self.event_queue = queue.Queue()
        
        # Vision model (lazy load)
        self.vision_model = None
        self.processor = None
        self.analyze_with_vision = analyze_with_vision and vision_available
        self.model_lock = threading.Lock()
        
        # Track events
        self.last_event_time = {}
        self.event_threshold = 0.5  # Minimum seconds between events
    
    def load_vision_model(self):
        """Load CLIP vision model for screenshot analysis."""
        if not self.analyze_with_vision:
            return None
        
        if self.vision_model is None:
            with self.model_lock:
                if self.vision_model is None:
                    print("[ScreenshotCapture] Loading vision model...")
                    self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
                    self.vision_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
                    if torch.cuda.is_available():
                        self.vision_model = self.vision_model.cuda()
                    print("[ScreenshotCapture] Vision model loaded.")
        
        return self.vision_model
    
    def analyze_screenshot(self, image: ImageGrab.Image) -> Dict:
        """Analyze screenshot with vision model."""
        if not self.analyze_with_vision:
            return {"description": "No vision model available"}
        
        model = self.load_vision_model()
        if model is None:
            return {"description": "Vision model not loaded"}
        
        try:
            # Convert PIL to numpy
            image_array = np.array(image)
            
            # Process with CLIP
            inputs = self.processor(
                images=image,
                return_tensors="pt",
                padding=True
            )
            
            if torch.cuda.is_available():
                inputs = {k: v.cuda() for k, v in inputs.items()}
            
            # Get image features
            with torch.no_grad():
                image_features = model.get_image_features(**inputs)
            
            # Simple description based on features
            # In production, you'd use text prompts to generate descriptions
            description = "Screenshot captured and analyzed"
            
            return {
                "description": description,
                "features_shape": list(image_features.shape),
                "has_content": True
            }
        
        except Exception as e:
            print(f"[ScreenshotCapture] Error analyzing screenshot: {e}")
            return {"description": f"Analysis error: {e}"}
    
    def capture_screenshot(self, event_type: str, event_data: Dict):
        """Capture screenshot on event."""
        current_time = time.time()
        
        # Throttle events
        if event_type in self.last_event_time:
            if current_time - self.last_event_time[event_type] < self.event_threshold:
                return
        
        self.last_event_time[event_type] = current_time
        
        # Capture screenshot
        screenshot = ImageGrab.grab()
        
        # Analyze with vision model
        analysis = self.analyze_screenshot(screenshot)
        
        # Save screenshot
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        screenshot_path = self.output_dir / f"screenshot_{timestamp}.png"
        screenshot.save(screenshot_path)
        
        # Create record
        record = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "event_data": event_data,
            "screenshot_path": str(screenshot_path),
            "analysis": analysis
        }
        
        self.screenshots.append(record)
        self.event_queue.put(record)
        
        print(f"[ScreenshotCapture] Captured screenshot: {event_type} at {timestamp}")
    
    def on_key_event(self, event):
        """Handle key event."""
        if not self.running:
            return
        
        # Major keys only
        major_keys = ['enter', 'space', 'tab', 'ctrl', 'alt', 'shift', 'esc']
        
        if event.name in major_keys or event.event_type == 'down':
            self.capture_screenshot("key_press", {
                "key": event.name,
                "event_type": event.event_type
            })
    
    def on_mouse_event(self, event):
        """Handle mouse event."""
        if not self.running:
            return
        
        # Major mouse events
        if isinstance(event, mouse.ButtonEvent):
            self.capture_screenshot("mouse_click", {
                "button": event.button,
                "action": event.action
            })
        elif isinstance(event, mouse.MoveEvent):
            # Only capture on significant movement
            if hasattr(event, 'delta') and abs(event.delta) > 100:
                self.capture_screenshot("mouse_move", {
                    "position": (event.x, event.y)
                })
    
    def start(self):
        """Start screenshot capture."""
        self.running = True
        
        # Hook keyboard events
        keyboard.hook(self.on_key_event)
        
        # Hook mouse events
        mouse.on_click(self.on_mouse_event)
        mouse.on_move(self.on_mouse_event)
        
        print("[ScreenshotCapture] Started capturing screenshots...")
    
    def stop(self):
        """Stop screenshot capture."""
        self.running = False
        
        keyboard.unhook_all()
        mouse.unhook_all()
        
        # Save records
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        records_path = self.output_dir / f"records_{timestamp}.json"
        
        with open(records_path, 'w', encoding='utf-8') as f:
            json.dump(self.screenshots, f, indent=2)
        
        print(f"[ScreenshotCapture] Stopped and saved {len(self.screenshots)} screenshots.")


def main():
    """Main entry point."""
    import time
    
    capture = ScreenshotCapture()
    
    try:
        capture.start()
        print("Screenshot capture running. Press Ctrl+C to stop...")
        
        # Keep running
        while True:
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\nStopping screenshot capture...")
        capture.stop()


if __name__ == "__main__":
    main()

