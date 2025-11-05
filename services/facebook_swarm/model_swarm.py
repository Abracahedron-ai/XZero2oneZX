"""
Facebook Models Swarm with Round-Robin

Arrange Facebook models in a swarm with round-robin distribution.
"""

import asyncio
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import threading
from collections import deque
import torch


@dataclass
class ModelNode:
    """Model node in swarm."""
    model_id: str
    model_path: str
    device: str
    model: Any
    load_time: float
    status: str  # 'idle', 'busy', 'error'
    request_count: int = 0


class FacebookModelSwarm:
    """Swarm of Facebook models with round-robin distribution."""
    
    def __init__(
        self,
        model_configs: List[Dict],
        devices: Optional[List[str]] = None
    ):
        self.model_configs = model_configs
        self.devices = devices or self._get_available_devices()
        
        self.nodes: List[ModelNode] = []
        self.current_index = 0
        self.round_robin_lock = threading.Lock()
        
        # Load models
        self._load_models()
    
    def _get_available_devices(self) -> List[str]:
        """Get available devices."""
        devices = ['cpu']
        
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                devices.append(f'cuda:{i}')
        
        return devices
    
    def _load_facebook_model(self, model_path: str, device: str):
        """Load Facebook model (e.g., wav2vec2, hubert, etc.)."""
        try:
            from transformers import AutoModel, AutoProcessor
            
            processor = AutoProcessor.from_pretrained(model_path)
            model = AutoModel.from_pretrained(model_path)
            
            if device.startswith('cuda'):
                model = model.to(device)
            
            return {
                "model": model,
                "processor": processor,
                "device": device
            }
        except Exception as e:
            print(f"[ModelSwarm] Error loading model {model_path}: {e}")
            return None
    
    def _load_models(self):
        """Load all models in swarm."""
        device_index = 0
        
        for config in self.model_configs:
            model_path = config['model_path']
            model_id = config.get('model_id', f"model_{len(self.nodes)}")
            
            # Round-robin device assignment
            device = self.devices[device_index % len(self.devices)]
            device_index += 1
            
            # Load model
            start_time = datetime.now().timestamp()
            model_data = self._load_facebook_model(model_path, device)
            
            if model_data:
                load_time = datetime.now().timestamp() - start_time
                
                node = ModelNode(
                    model_id=model_id,
                    model_path=model_path,
                    device=device,
                    model=model_data,
                    load_time=load_time,
                    status='idle'
                )
                
                self.nodes.append(node)
                print(f"[ModelSwarm] Loaded {model_id} on {device} (took {load_time:.2f}s)")
    
    def get_next_node(self) -> Optional[ModelNode]:
        """Get next model node using round-robin."""
        if not self.nodes:
            return None
        
        with self.round_robin_lock:
            # Find next idle node
            attempts = 0
            while attempts < len(self.nodes):
                node = self.nodes[self.current_index]
                self.current_index = (self.current_index + 1) % len(self.nodes)
                
                if node.status == 'idle':
                    return node
                
                attempts += 1
            
            # All nodes busy, return first one
            return self.nodes[0]
    
    def process_request(self, input_data: Any, model_type: Optional[str] = None) -> Dict:
        """Process request with round-robin model selection."""
        node = self.get_next_node()
        
        if not node:
            return {"error": "No available models"}
        
        # Mark node as busy
        node.status = 'busy'
        node.request_count += 1
        
        try:
            # Process with model
            result = self._process_with_model(node, input_data, model_type)
            
            # Mark node as idle
            node.status = 'idle'
            
            return {
                "success": True,
                "model_id": node.model_id,
                "device": node.device,
                "result": result
            }
        
        except Exception as e:
            node.status = 'error'
            print(f"[ModelSwarm] Error processing with {node.model_id}: {e}")
            
            # Try to recover
            node.status = 'idle'
            
            return {
                "success": False,
                "error": str(e),
                "model_id": node.model_id
            }
    
    def _process_with_model(self, node: ModelNode, input_data: Any, model_type: Optional[str]) -> Any:
        """Process input with specific model."""
        model = node.model['model']
        processor = node.model['processor']
        device = node.model['device']
        
        # Process input based on model type
        if model_type == 'audio':
            # Audio processing (wav2vec2, hubert, etc.)
            inputs = processor(input_data, return_tensors="pt", sampling_rate=16000)
            
            if device.startswith('cuda'):
                inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = model(**inputs)
            
            return outputs.last_hidden_state.cpu().numpy()
        
        elif model_type == 'text':
            # Text processing
            inputs = processor(input_data, return_tensors="pt", padding=True)
            
            if device.startswith('cuda'):
                inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = model(**inputs)
            
            return outputs.last_hidden_state.cpu().numpy()
        
        else:
            # Generic processing
            inputs = processor(input_data, return_tensors="pt")
            
            if device.startswith('cuda'):
                inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = model(**inputs)
            
            return outputs
    
    def get_status(self) -> Dict:
        """Get swarm status."""
        return {
            "total_nodes": len(self.nodes),
            "idle_nodes": sum(1 for n in self.nodes if n.status == 'idle'),
            "busy_nodes": sum(1 for n in self.nodes if n.status == 'busy'),
            "error_nodes": sum(1 for n in self.nodes if n.status == 'error'),
            "total_requests": sum(n.request_count for n in self.nodes),
            "nodes": [
                {
                    "model_id": n.model_id,
                    "device": n.device,
                    "status": n.status,
                    "request_count": n.request_count
                }
                for n in self.nodes
            ]
        }


# Example Facebook models configuration
FACEBOOK_MODELS = [
    {
        "model_id": "wav2vec2-base",
        "model_path": "facebook/wav2vec2-base-960h"
    },
    {
        "model_id": "wav2vec2-large",
        "model_path": "facebook/wav2vec2-large-960h-lv60-self"
    },
    {
        "model_id": "hubert-base",
        "model_path": "facebook/hubert-base-ls960"
    },
    {
        "model_id": "hubert-large",
        "model_path": "facebook/hubert-large-ls960-ft"
    }
]


def main():
    """Test model swarm."""
    swarm = FacebookModelSwarm(FACEBOOK_MODELS)
    
    # Test processing
    test_input = "test audio data"
    result = swarm.process_request(test_input, model_type='audio')
    print(f"Result: {result}")
    
    # Get status
    status = swarm.get_status()
    print(f"\nSwarm Status:")
    print(json.dumps(status, indent=2))


if __name__ == "__main__":
    import json
    main()

