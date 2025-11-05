"""
Prometheus Metrics Utility

Provides Prometheus metrics for all services.
"""

from prometheus_client import Counter, Histogram, Gauge, start_http_server
from typing import Optional
import time


# Request metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

# GPU metrics
gpu_utilization = Gauge(
    'gpu_utilization_percent',
    'GPU utilization percentage',
    ['gpu_id']
)

gpu_memory_used = Gauge(
    'gpu_memory_used_mb',
    'GPU memory used in MB',
    ['gpu_id']
)

# Agent metrics
agent_instances = Gauge(
    'agent_instances_total',
    'Total agent instances',
    ['status']
)

agent_spawn_duration = Histogram(
    'agent_spawn_duration_seconds',
    'Agent spawn duration',
    ['agent_type']
)

# Tool execution metrics
tool_executions = Counter(
    'tool_executions_total',
    'Total tool executions',
    ['tool_id', 'status']
)

tool_execution_duration = Histogram(
    'tool_execution_duration_seconds',
    'Tool execution duration',
    ['tool_id']
)

# Emotion fusion metrics
emotion_updates = Counter(
    'emotion_updates_total',
    'Total emotion updates',
    ['emotion_type']
)

# Error metrics
error_count = Counter(
    'errors_total',
    'Total errors',
    ['error_type', 'service']
)


def start_metrics_server(port: int = 9091):
    """Start Prometheus metrics server."""
    start_http_server(port)
    print(f"Prometheus metrics server started on port {port}")


def record_request(method: str, endpoint: str, status: int, duration: float):
    """Record HTTP request metrics."""
    request_count.labels(method=method, endpoint=endpoint, status=status).inc()
    request_duration.labels(method=method, endpoint=endpoint).observe(duration)


def record_gpu_usage(gpu_id: int, utilization: float, memory_mb: int):
    """Record GPU usage metrics."""
    gpu_utilization.labels(gpu_id=gpu_id).set(utilization)
    gpu_memory_used.labels(gpu_id=gpu_id).set(memory_mb)


def record_agent_spawn(agent_type: str, duration: float, success: bool):
    """Record agent spawn metrics."""
    agent_spawn_duration.labels(agent_type=agent_type).observe(duration)
    agent_instances.labels(status='running' if success else 'error').inc()


def record_tool_execution(tool_id: str, duration: float, success: bool):
    """Record tool execution metrics."""
    tool_executions.labels(tool_id=tool_id, status='success' if success else 'error').inc()
    tool_execution_duration.labels(tool_id=tool_id).observe(duration)


def record_emotion_update(emotion_type: str):
    """Record emotion update metrics."""
    emotion_updates.labels(emotion_type=emotion_type).inc()


def record_error(error_type: str, service: str):
    """Record error metrics."""
    error_count.labels(error_type=error_type, service=service).inc()

