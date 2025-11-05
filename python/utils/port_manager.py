"""
Port Management Utility

Provides port rotation fail-safe functionality for all services.
"""

import socket
from typing import Optional


def is_port_available(port: int, host: str = 'localhost') -> bool:
    """Check if a port is available."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            result = s.bind((host, port))
            return True
    except OSError:
        return False


def find_available_port(start_port: int = 8000, max_attempts: int = 100, host: str = 'localhost') -> int:
    """
    Find an available port starting from start_port.
    
    Args:
        start_port: Starting port number
        max_attempts: Maximum number of ports to try
        host: Host to bind to (default: localhost)
    
    Returns:
        Available port number
    
    Raises:
        RuntimeError: If no available port found
    """
    for i in range(max_attempts):
        port = start_port + i
        if is_port_available(port, host):
            return port
    
    raise RuntimeError(
        f"No available ports found in range {start_port}-{start_port + max_attempts - 1}"
    )


def get_port_or_raise(port: Optional[int] = None, start_port: int = 8000, max_attempts: int = 100) -> int:
    """
    Get a port, using provided port if available, otherwise finding an available one.
    
    Args:
        port: Desired port (None to auto-find)
        start_port: Starting port for auto-find
        max_attempts: Maximum attempts for auto-find
    
    Returns:
        Available port number
    """
    if port is not None:
        if is_port_available(port):
            return port
        # Port not available, try to find alternative
        return find_available_port(start_port=port, max_attempts=max_attempts)
    
    return find_available_port(start_port=start_port, max_attempts=max_attempts)

