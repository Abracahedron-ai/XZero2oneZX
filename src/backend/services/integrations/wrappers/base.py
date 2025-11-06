"""
Base Wrapper Class

Provides common functionality for all service wrappers:
- Port rotation fail-safe
- Health checks
- GPU detection
- Consistent API contracts
- Error handling and logging
"""

import os
import sys
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import from correct location
from src.backend.api.utils.port_manager import get_port_or_raise, is_port_available


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    service: str
    gpu_available: bool
    port: int


class BaseWrapper:
    """Base class for all service wrappers."""
    
    def __init__(
        self,
        service_name: str,
        default_port: int = 8000,
        require_gpu: bool = False
    ):
        self.service_name = service_name
        self.default_port = default_port
        self.require_gpu = require_gpu
        self.port: Optional[int] = None
        self.app = FastAPI(title=f"{service_name} Wrapper")
        self.gpu_available = self._check_gpu()
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(service_name)
        
        # Register health endpoint
        self._register_health_endpoint()
        
        # Validate GPU requirement
        if self.require_gpu and not self.gpu_available:
            self.logger.warning(
                f"GPU required for {service_name} but not available. "
                "Service may not function correctly."
            )
    
    def _check_gpu(self) -> bool:
        """Check if GPU is available."""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False
    
    def _register_health_endpoint(self):
        """Register health check endpoint."""
        
        @self.app.get("/health", response_model=HealthResponse)
        async def health_check():
            """Health check endpoint."""
            return HealthResponse(
                status="healthy" if self._is_healthy() else "unhealthy",
                service=self.service_name,
                gpu_available=self.gpu_available,
                port=self.port or self.default_port
            )
        
        @self.app.get("/")
        async def root():
            """Root endpoint."""
            return {
                "service": self.service_name,
                "status": "running",
                "gpu_available": self.gpu_available,
                "port": self.port or self.default_port
            }
    
    def _is_healthy(self) -> bool:
        """Check if service is healthy. Override in subclasses."""
        return True
    
    def find_port(self, preferred_port: Optional[int] = None) -> int:
        """
        Find an available port with fail-safe rotation.
        
        Args:
            preferred_port: Preferred port number (None to use default)
        
        Returns:
            Available port number
        """
        port = preferred_port or self.default_port
        self.port = get_port_or_raise(port, start_port=self.default_port)
        self.logger.info(f"Service {self.service_name} will use port {self.port}")
        return self.port
    
    def run(
        self,
        host: str = "0.0.0.0",
        port: Optional[int] = None,
        **uvicorn_kwargs
    ):
        """
        Run the FastAPI service.
        
        Args:
            host: Host to bind to
            port: Port to use (None to auto-find)
            **uvicorn_kwargs: Additional uvicorn arguments
        """
        import uvicorn
        
        if port is None:
            port = self.find_port()
        else:
            self.port = port
        
        self.logger.info(f"Starting {self.service_name} on {host}:{self.port}")
        
        uvicorn.run(
            self.app,
            host=host,
            port=self.port,
            **uvicorn_kwargs
        )


def create_error_response(
    status_code: int,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Create a standardized error response."""
    error_data = {
        "error": message,
        "status_code": status_code
    }
    if details:
        error_data["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=error_data
    )


