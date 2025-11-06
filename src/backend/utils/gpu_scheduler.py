"""
GPU Scheduler

Manages GPU resource allocation with round-robin and SRPT scheduling.
Tracks ASR, TTS, FER, and LiveKit workloads.
"""

import asyncio
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from collections import deque
import logging

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None


class TaskType(Enum):
    """Task type enumeration."""
    ASR = "asr"
    TTS = "tts"
    FER = "fer"
    SER = "ser"
    LIVEKIT = "livekit"
    OTHER = "other"


@dataclass
class GPUTask:
    """GPU task representation."""
    task_id: str
    task_type: TaskType
    priority: int  # Lower = higher priority
    estimated_duration: float  # Estimated processing time in seconds
    vram_required: int  # VRAM required in MB
    created_at: float
    started_at: Optional[float] = None
    completed_at: Optional[float] = None


class GPUScheduler:
    """
    GPU scheduler with round-robin and SRPT (Shortest Remaining Processing Time).
    
    - Round-robin for ASR, TTS, FER workloads
    - SRPT for LiveKit workloads
    """
    
    def __init__(self, num_gpus: int = 1):
        self.num_gpus = num_gpus
        self.logger = logging.getLogger(__name__)
        
        # Task queues
        self.round_robin_queue: deque = deque()  # For ASR, TTS, FER
        self.srpt_queue: List[GPUTask] = []  # For LiveKit
        self.active_tasks: Dict[int, GPUTask] = {}  # GPU ID -> Task
        self.completed_tasks: List[GPUTask] = []
        
        # Resource tracking
        self.gpu_vram_usage: Dict[int, int] = {i: 0 for i in range(num_gpus)}
        self.gpu_utilization: Dict[int, float] = {i: 0.0 for i in range(num_gpus)}
        
        # Statistics
        self.total_tasks_processed = 0
        self.total_wait_time = 0.0
        
        # Round-robin state
        self.current_gpu_index = 0
        
        # Check GPU availability
        self.gpu_available = self._check_gpu()
        if not self.gpu_available:
            self.logger.warning("GPU not available, scheduler will run in CPU mode")
    
    def _check_gpu(self) -> bool:
        """Check if GPU is available."""
        if not TORCH_AVAILABLE:
            return False
        return torch.cuda.is_available() if torch else False
    
    def get_gpu_info(self) -> Dict:
        """Get GPU information."""
        if not self.gpu_available:
            return {
                "available": False,
                "count": 0,
                "devices": []
            }
        
        devices = []
        for i in range(self.num_gpus):
            if i < torch.cuda.device_count():
                device = torch.cuda.get_device_properties(i)
                devices.append({
                    "id": i,
                    "name": device.name,
                    "total_memory": device.total_memory // (1024 * 1024),  # MB
                    "free_memory": (device.total_memory - torch.cuda.memory_allocated(i)) // (1024 * 1024)
                })
        
        return {
            "available": True,
            "count": torch.cuda.device_count(),
            "devices": devices
        }
    
    def submit_task(
        self,
        task_id: str,
        task_type: TaskType,
        estimated_duration: float,
        vram_required: int,
        priority: int = 5
    ) -> str:
        """
        Submit a task to the scheduler.
        
        Args:
            task_id: Unique task identifier
            task_type: Type of task
            estimated_duration: Estimated processing time in seconds
            vram_required: VRAM required in MB
            priority: Task priority (lower = higher priority)
        
        Returns:
            Task ID
        """
        task = GPUTask(
            task_id=task_id,
            task_type=task_type,
            priority=priority,
            estimated_duration=estimated_duration,
            vram_required=vram_required,
            created_at=time.time()
        )
        
        # Route to appropriate queue
        if task_type == TaskType.LIVEKIT:
            # SRPT queue (sorted by estimated duration)
            self.srpt_queue.append(task)
            self.srpt_queue.sort(key=lambda t: t.estimated_duration)
        else:
            # Round-robin queue
            self.round_robin_queue.append(task)
        
        self.logger.info(
            f"Submitted task {task_id} ({task_type.value}) "
            f"to {'SRPT' if task_type == TaskType.LIVEKIT else 'round-robin'} queue"
        )
        
        return task_id
    
    def get_next_task(self) -> Optional[Tuple[int, GPUTask]]:
        """
        Get next task to schedule and available GPU.
        
        Returns:
            Tuple of (GPU ID, Task) or None if no task available
        """
        # Check for available GPU
        available_gpu = self._find_available_gpu()
        if available_gpu is None:
            return None
        
        # Try SRPT queue first (LiveKit tasks)
        if self.srpt_queue:
            task = self.srpt_queue[0]
            if self._can_allocate(task, available_gpu):
                self.srpt_queue.pop(0)
                return (available_gpu, task)
        
        # Try round-robin queue
        if self.round_robin_queue:
            # Round-robin through queue
            for _ in range(len(self.round_robin_queue)):
                task = self.round_robin_queue.popleft()
                if self._can_allocate(task, available_gpu):
                    return (available_gpu, task)
                # Put back if can't allocate
                self.round_robin_queue.append(task)
        
        return None
    
    def _find_available_gpu(self) -> Optional[int]:
        """Find an available GPU."""
        for i in range(self.num_gpus):
            if i not in self.active_tasks:
                return i
        return None
    
    def _can_allocate(self, task: GPUTask, gpu_id: int) -> bool:
        """Check if task can be allocated to GPU."""
        if not self.gpu_available:
            return True  # CPU mode
        
        # Check VRAM availability
        if gpu_id < torch.cuda.device_count():
            free_memory = (
                torch.cuda.get_device_properties(gpu_id).total_memory -
                torch.cuda.memory_allocated(gpu_id)
            ) // (1024 * 1024)  # MB
            
            return free_memory >= task.vram_required
        
        return False
    
    def start_task(self, gpu_id: int, task: GPUTask):
        """Start a task on a GPU."""
        task.started_at = time.time()
        self.active_tasks[gpu_id] = task
        self.gpu_vram_usage[gpu_id] += task.vram_required
        
        wait_time = task.started_at - task.created_at
        self.total_wait_time += wait_time
        
        self.logger.info(
            f"Started task {task.task_id} on GPU {gpu_id} "
            f"(wait time: {wait_time:.2f}s)"
        )
    
    def complete_task(self, task_id: str):
        """Mark a task as completed."""
        # Find task in active tasks
        gpu_id = None
        for gid, task in self.active_tasks.items():
            if task.task_id == task_id:
                gpu_id = gid
                break
        
        if gpu_id is None:
            self.logger.warning(f"Task {task_id} not found in active tasks")
            return
        
        task = self.active_tasks[gpu_id]
        task.completed_at = time.time()
        
        # Update statistics
        self.total_tasks_processed += 1
        self.gpu_vram_usage[gpu_id] -= task.vram_required
        self.completed_tasks.append(task)
        
        # Remove from active tasks
        del self.active_tasks[gpu_id]
        
        processing_time = task.completed_at - task.started_at
        self.logger.info(
            f"Completed task {task.task_id} on GPU {gpu_id} "
            f"(processing time: {processing_time:.2f}s)"
        )
    
    def get_metrics(self) -> Dict:
        """Get scheduler metrics for Prometheus."""
        return {
            "active_tasks": len(self.active_tasks),
            "queued_tasks": len(self.round_robin_queue) + len(self.srpt_queue),
            "completed_tasks": self.total_tasks_processed,
            "average_wait_time": (
                self.total_wait_time / self.total_tasks_processed
                if self.total_tasks_processed > 0 else 0.0
            ),
            "gpu_vram_usage": self.gpu_vram_usage,
            "gpu_utilization": self.gpu_utilization
        }


# Global scheduler instance
_scheduler_instance: Optional[GPUScheduler] = None


def get_scheduler(num_gpus: int = 1) -> GPUScheduler:
    """Get global GPU scheduler instance."""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = GPUScheduler(num_gpus=num_gpus)
    return _scheduler_instance


def reset_scheduler():
    """Reset global GPU scheduler instance."""
    global _scheduler_instance
    _scheduler_instance = None


