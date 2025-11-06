"""
Redis Client Service

Singleton Redis client for fast, ephemeral object tracking.
Provides helper methods for object hash operations, ZSET operations, and queue operations.
"""

import redis
from typing import Optional, Dict, Any, List, Set
from datetime import datetime
import json
import logging
import os

logger = logging.getLogger(__name__)


class RedisClient:
    """
    Singleton Redis client for object brain operations.
    
    Handles:
    - Object hash operations (obj:{id})
    - ZSET operations (obj:{id}:views)
    - Queue operations (queue:triage, queue:recon, queue:quarantine)
    - TTL management for ephemeral data
    """
    
    _instance: Optional['RedisClient'] = None
    _client: Optional[redis.Redis] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._connect()
    
    def _connect(self):
        """Initialize Redis connection pool."""
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        
        try:
            self._client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                health_check_interval=30
            )
            
            # Test connection
            self._client.ping()
            logger.info(f"Redis client connected: {redis_url}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    @property
    def client(self) -> redis.Redis:
        """Get Redis client instance."""
        if self._client is None:
            self._connect()
        return self._client
    
    # === Object Hash Operations ===
    
    def get_object(self, obj_id: str) -> Optional[Dict[str, Any]]:
        """
        Get object data from Redis hash.
        
        Args:
            obj_id: Object identifier
            
        Returns:
            Dictionary of object data or None if not found
        """
        key = f"obj:{obj_id}"
        data = self.client.hgetall(key)
        
        if not data:
            return None
        
        # Parse JSON fields
        parsed_data = {}
        for k, v in data.items():
            if k in ['best_frames']:
                try:
                    parsed_data[k] = json.loads(v) if v else {}
                except:
                    parsed_data[k] = v
            elif k in ['orbit_deg', 'views', 'conf_class', 'scale_conf']:
                try:
                    parsed_data[k] = float(v) if v else 0.0
                except:
                    parsed_data[k] = v
            elif k == 'views':
                try:
                    parsed_data[k] = int(v) if v else 0
                except:
                    parsed_data[k] = v
            else:
                parsed_data[k] = v
        
        return parsed_data
    
    def set_object(self, obj_id: str, data: Dict[str, Any], ttl: Optional[int] = None):
        """
        Set object data in Redis hash.
        
        Args:
            obj_id: Object identifier
            data: Dictionary of object data
            ttl: Optional TTL in seconds
        """
        key = f"obj:{obj_id}"
        
        # Serialize JSON fields
        serialized_data = {}
        for k, v in data.items():
            if k in ['best_frames'] and isinstance(v, dict):
                serialized_data[k] = json.dumps(v)
            else:
                serialized_data[k] = str(v) if v is not None else ''
        
        self.client.hset(key, mapping=serialized_data)
        
        if ttl:
            self.client.expire(key, ttl)
    
    def update_object_field(self, obj_id: str, field: str, value: Any):
        """Update a single field in object hash."""
        key = f"obj:{obj_id}"
        
        if field in ['best_frames'] and isinstance(value, dict):
            value = json.dumps(value)
        else:
            value = str(value) if value is not None else ''
        
        self.client.hset(key, field, value)
    
    def delete_object(self, obj_id: str):
        """Delete object from Redis."""
        key = f"obj:{obj_id}"
        views_key = f"obj:{obj_id}:views"
        metrics_key = f"obj:{obj_id}:metrics"
        
        self.client.delete(key, views_key, metrics_key)
    
    # === ZSET Operations (Views) ===
    
    def add_view(self, obj_id: str, frame_id: str, timestamp: Optional[float] = None):
        """
        Add a view to object's view ZSET.
        
        Args:
            obj_id: Object identifier
            frame_id: Frame identifier
            timestamp: Optional timestamp (defaults to now)
        """
        key = f"obj:{obj_id}:views"
        
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        self.client.zadd(key, {frame_id: timestamp})
    
    def get_views(self, obj_id: str, start: int = 0, end: int = -1) -> List[tuple]:
        """
        Get views from object's view ZSET.
        
        Args:
            obj_id: Object identifier
            start: Start index
            end: End index (-1 for all)
            
        Returns:
            List of (frame_id, timestamp) tuples
        """
        key = f"obj:{obj_id}:views"
        return self.client.zrange(key, start, end, withscores=True)
    
    def get_view_count(self, obj_id: str) -> int:
        """Get count of views for object."""
        key = f"obj:{obj_id}:views"
        return self.client.zcard(key)
    
    def remove_view(self, obj_id: str, frame_id: str):
        """Remove a view from object's view ZSET."""
        key = f"obj:{obj_id}:views"
        self.client.zrem(key, frame_id)
    
    # === Metrics Hash Operations ===
    
    def set_metrics(self, obj_id: str, metrics: Dict[str, float]):
        """
        Set quality metrics for object.
        
        Args:
            obj_id: Object identifier
            metrics: Dictionary of metric values
        """
        key = f"obj:{obj_id}:metrics"
        
        serialized_metrics = {
            k: str(v) if v is not None else '0.0'
            for k, v in metrics.items()
        }
        
        self.client.hset(key, mapping=serialized_metrics)
    
    def get_metrics(self, obj_id: str) -> Dict[str, float]:
        """
        Get quality metrics for object.
        
        Args:
            obj_id: Object identifier
            
        Returns:
            Dictionary of metric values
        """
        key = f"obj:{obj_id}:metrics"
        data = self.client.hgetall(key)
        
        parsed_metrics = {}
        for k, v in data.items():
            try:
                parsed_metrics[k] = float(v) if v else 0.0
            except:
                parsed_metrics[k] = v
        
        return parsed_metrics
    
    # === Queue Operations ===
    
    def push_to_triage(self, obj_id: str):
        """Push object ID to triage queue."""
        self.client.lpush("queue:triage", obj_id)
    
    def pop_from_triage(self, timeout: int = 0) -> Optional[str]:
        """
        Pop object ID from triage queue.
        
        Args:
            timeout: Blocking timeout in seconds (0 for non-blocking)
            
        Returns:
            Object ID or None if empty
        """
        if timeout > 0:
            result = self.client.brpop("queue:triage", timeout=timeout)
            return result[1] if result else None
        else:
            return self.client.rpop("queue:triage")
    
    def push_to_recon(self, obj_id: str):
        """Push object ID to recon queue."""
        self.client.lpush("queue:recon", obj_id)
    
    def pop_from_recon(self, timeout: int = 0) -> Optional[str]:
        """Pop object ID from recon queue."""
        if timeout > 0:
            result = self.client.brpop("queue:recon", timeout=timeout)
            return result[1] if result else None
        else:
            return self.client.rpop("queue:recon")
    
    def push_to_quarantine(self, obj_id: str, reason: str = ""):
        """Push object ID to quarantine queue with reason."""
        data = json.dumps({"obj_id": obj_id, "reason": reason})
        self.client.lpush("queue:quarantine", data)
    
    def pop_from_quarantine(self, timeout: int = 0) -> Optional[Dict[str, Any]]:
        """Pop object ID from quarantine queue."""
        if timeout > 0:
            result = self.client.brpop("queue:quarantine", timeout=timeout)
            if result:
                try:
                    return json.loads(result[1])
                except:
                    return {"obj_id": result[1], "reason": ""}
            return None
        else:
            data = self.client.rpop("queue:quarantine")
            if data:
                try:
                    return json.loads(data)
                except:
                    return {"obj_id": data, "reason": ""}
            return None
    
    def get_queue_length(self, queue_name: str) -> int:
        """Get length of queue."""
        return self.client.llen(queue_name)
    
    # === Utility Methods ===
    
    def exists(self, obj_id: str) -> bool:
        """Check if object exists in Redis."""
        key = f"obj:{obj_id}"
        return self.client.exists(key) > 0
    
    def set_ttl(self, obj_id: str, ttl: int):
        """Set TTL for object and related keys."""
        obj_key = f"obj:{obj_id}"
        views_key = f"obj:{obj_id}:views"
        metrics_key = f"obj:{obj_id}:metrics"
        
        self.client.expire(obj_key, ttl)
        self.client.expire(views_key, ttl)
        self.client.expire(metrics_key, ttl)
    
    def ping(self) -> bool:
        """Test Redis connection."""
        try:
            return self.client.ping()
        except:
            return False


# Global singleton instance
_redis_client: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    """Get global Redis client instance."""
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
    return _redis_client


