"""
Viseme Streamer

Streams viseme data to avatar rig via WebSocket.
"""

import asyncio
import json
import websockets
from typing import List, Dict, Optional
from services.viseme_extractor import VisemeFrame, get_extractor


class VisemeStreamer:
    """Streams viseme frames to avatar rig."""
    
    def __init__(self, websocket_url: str = "ws://localhost:8080/avatar/visemes"):
        self.websocket_url = websocket_url
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.extractor = get_extractor()
        self.connected = False
    
    async def connect(self):
        """Connect to avatar WebSocket."""
        try:
            self.websocket = await websockets.connect(self.websocket_url)
            self.connected = True
            print(f"Connected to avatar WebSocket: {self.websocket_url}")
        except Exception as e:
            print(f"Error connecting to avatar WebSocket: {e}")
            self.connected = False
    
    async def disconnect(self):
        """Disconnect from avatar WebSocket."""
        if self.websocket:
            await self.websocket.close()
            self.connected = False
    
    async def stream_visemes(self, frames: List[VisemeFrame]):
        """Stream viseme frames to avatar."""
        if not self.connected:
            await self.connect()
        
        if not self.connected:
            print("Cannot stream visemes: not connected to avatar WebSocket")
            return
        
        try:
            for frame in frames:
                message = {
                    "type": "viseme",
                    "timestamp": frame.timestamp,
                    "visemes": frame.visemes,
                    "duration": frame.duration
                }
                
                await self.websocket.send(json.dumps(message))
                await asyncio.sleep(frame.duration)
            
            print(f"Streamed {len(frames)} viseme frames to avatar")
        except Exception as e:
            print(f"Error streaming visemes: {e}")
            self.connected = False
    
    async def stream_from_tts(self, text: str, duration: float):
        """Extract and stream visemes from TTS text."""
        frames = self.extractor.extract_from_text(text, duration=duration)
        await self.stream_visemes(frames)


# Global streamer instance
_streamer_instance: Optional[VisemeStreamer] = None


async def get_streamer(websocket_url: str = "ws://localhost:8080/avatar/visemes") -> VisemeStreamer:
    """Get global viseme streamer instance."""
    global _streamer_instance
    if _streamer_instance is None:
        _streamer_instance = VisemeStreamer(websocket_url)
        await _streamer_instance.connect()
    return _streamer_instance


async def close_streamer():
    """Close global viseme streamer instance."""
    global _streamer_instance
    if _streamer_instance:
        await _streamer_instance.disconnect()
    _streamer_instance = None


if __name__ == "__main__":
    # Test streamer
    async def test():
        streamer = await get_streamer()
        text = "Hello world"
        await streamer.stream_from_tts(text, duration=2.0)
        await close_streamer()
    
    asyncio.run(test())

