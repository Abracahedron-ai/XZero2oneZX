"""
Postgres Persistence Service

Syncs Redis data to Postgres for durable storage.
Provides batch inserts for performance and periodic flush jobs.
Query interface for analytics.
"""

import asyncio
import threading
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import json
import psycopg2
from psycopg2.extras import execute_values
import os

from src.backend.utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)


class ObjectPersistence:
    """
    Postgres persistence service for object tracking data.
    
    Handles:
    - Syncing Redis data to Postgres
    - Batch inserts for performance
    - Periodic flush jobs
    - Query interface for analytics
    """
    
    def __init__(self):
        """Initialize persistence service."""
        self.redis = get_redis_client()
        
        # Database connection - uses ScatterBrain by default
        self.db_url = os.getenv(
            'DATABASE_URL', 
            'postgresql://tomlee3d:%24Pos%24904pine@localhost:5432/ScatterBrain'
        )
        self.conn: Optional[psycopg2.extensions.connection] = None
        
        # Batch buffers
        self.object_buffer: List[Dict[str, Any]] = []
        self.observation_buffer: List[Dict[str, Any]] = []
        self.metric_buffer: List[Dict[str, Any]] = []
        self.asset_buffer: List[Dict[str, Any]] = []
        self.emotion_buffer: List[Dict[str, Any]] = []
        
        # Buffer sizes
        self.buffer_size = 100
        
        # Flush interval (seconds)
        self.flush_interval = 10
        
        # Background flush thread
        self.running = False
        self.flush_thread: Optional[threading.Thread] = None
    
    def connect(self):
        """Connect to Postgres database."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.conn.autocommit = False
            logger.info("Connected to Postgres database")
        except Exception as e:
            logger.error(f"Failed to connect to Postgres: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from Postgres database."""
        if self.conn:
            self.flush_all()  # Flush any remaining data
            self.conn.close()
            self.conn = None
            logger.info("Disconnected from Postgres database")
    
    def start_periodic_flush(self):
        """Start periodic flush thread."""
        if self.running:
            logger.warning("Periodic flush already running")
            return
        
        self.running = True
        self.flush_thread = threading.Thread(target=self._flush_loop, daemon=True)
        self.flush_thread.start()
        logger.info("Periodic flush started")
    
    def stop_periodic_flush(self):
        """Stop periodic flush thread."""
        self.running = False
        if self.flush_thread:
            self.flush_thread.join(timeout=5.0)
        logger.info("Periodic flush stopped")
    
    def _flush_loop(self):
        """Periodic flush loop."""
        while self.running:
            try:
                time.sleep(self.flush_interval)
                self.flush_all()
            except Exception as e:
                logger.error(f"Error in flush loop: {e}")
    
    def sync_object(self, obj_id: str, force: bool = False):
        """
        Sync object data from Redis to Postgres.
        
        Args:
            obj_id: Object identifier
            force: Force immediate sync (bypass buffer)
        """
        obj_data = self.redis.get_object(obj_id)
        if not obj_data:
            return
        
        # Prepare object record
        record = {
            'id': obj_id,
            'class': obj_data.get('class', 'unknown'),
            'status': obj_data.get('status', 'pending'),
            'final_asset_path': None,  # Will be updated when asset is ready
            'notes': json.dumps(obj_data.get('notes', {}))
        }
        
        if force:
            self._insert_object(record)
        else:
            self.object_buffer.append(record)
            if len(self.object_buffer) >= self.buffer_size:
                self.flush_objects()
    
    def sync_observation(
        self,
        obj_id: str,
        frame_id: str,
        camera_id: Optional[str] = None,
        frame_path: Optional[str] = None,
        bbox: Optional[List[float]] = None,
        mask_path: Optional[str] = None,
        pose: Optional[Dict[str, Any]] = None,
        features: Optional[Dict[str, Any]] = None,
        timestamp: Optional[float] = None
    ):
        """
        Sync observation data to Postgres.
        
        Args:
            obj_id: Object identifier
            frame_id: Frame identifier
            camera_id: Optional camera identifier
            frame_path: Optional path to frame file
            bbox: Optional bounding box [x1, y1, x2, y2]
            mask_path: Optional path to mask file
            pose: Optional pose data
            features: Optional feature embeddings
            timestamp: Optional timestamp
        """
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        record = {
            'obj_id': obj_id,
            'ts': datetime.fromtimestamp(timestamp),
            'cam_id': camera_id,
            'frame_path': frame_path,
            'bbox': json.dumps(bbox) if bbox else None,
            'mask_path': mask_path,
            'pose': json.dumps(pose) if pose else None,
            'feats': json.dumps(features) if features else None
        }
        
        self.observation_buffer.append(record)
        if len(self.observation_buffer) >= self.buffer_size:
            self.flush_observations()
    
    def sync_metrics(
        self,
        obj_id: str,
        metrics: Dict[str, float],
        decision: Optional[str] = None,
        timestamp: Optional[float] = None
    ):
        """
        Sync quality metrics to Postgres.
        
        Args:
            obj_id: Object identifier
            metrics: Dictionary of metric values
            decision: Optional decision ('admit', 'observe', 'quarantine')
            timestamp: Optional timestamp
        """
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        record = {
            'obj_id': obj_id,
            'ts': datetime.fromtimestamp(timestamp),
            'orbit_deg': metrics.get('orbit_deg'),
            'mvs_consistency': metrics.get('mvs_consistency'),
            'silhouette_iou': metrics.get('silhouette_iou'),
            'photometric_err': metrics.get('photometric_err'),
            'depth_var': metrics.get('depth_var'),
            'pose_spread_deg': metrics.get('pose_spread_deg'),
            'texture_cov': metrics.get('texture_cov'),
            'scale_conf': metrics.get('scale_conf'),
            'decision': decision
        }
        
        self.metric_buffer.append(record)
        if len(self.metric_buffer) >= self.buffer_size:
            self.flush_metrics()
    
    def sync_asset(
        self,
        obj_id: str,
        stage: str,
        path: str,
        quality_score: Optional[float] = None
    ):
        """
        Sync asset data to Postgres.
        
        Args:
            obj_id: Object identifier
            stage: Asset stage ('proxy', 'mesh', '3dgs', 'nerf')
            path: Path to asset file
            quality_score: Optional quality score (0-1)
        """
        record = {
            'obj_id': obj_id,
            'stage': stage,
            'path': path,
            'quality_score': quality_score
        }
        
        self.asset_buffer.append(record)
        if len(self.asset_buffer) >= self.buffer_size:
            self.flush_assets()
    
    def sync_emotion(
        self,
        obj_id: str,
        tags: List[str],
        valence: float,
        arousal: float,
        confidence: float,
        timestamp: Optional[float] = None
    ):
        """
        Sync emotion data to Postgres.
        
        Args:
            obj_id: Object identifier
            tags: List of emotion tags
            valence: Valence score (-1 to 1)
            arousal: Arousal score (-1 to 1)
            confidence: Confidence score (0-1)
            timestamp: Optional timestamp
        """
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        record = {
            'obj_id': obj_id,
            'ts': datetime.fromtimestamp(timestamp),
            'tags': tags,
            'valence': valence,
            'arousal': arousal,
            'conf': confidence
        }
        
        self.emotion_buffer.append(record)
        if len(self.emotion_buffer) >= self.buffer_size:
            self.flush_emotions()
    
    def flush_all(self):
        """Flush all buffers to Postgres."""
        self.flush_objects()
        self.flush_observations()
        self.flush_metrics()
        self.flush_assets()
        self.flush_emotions()
    
    def flush_objects(self):
        """Flush object buffer to Postgres."""
        if not self.object_buffer:
            return
        
        if not self.conn:
            self.connect()
        
        try:
            cur = self.conn.cursor()
            
            # Use INSERT ... ON CONFLICT UPDATE (UPSERT)
            query = """
                INSERT INTO objects (id, class, status, final_asset_path, notes, updated_at)
                VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    class = EXCLUDED.class,
                    status = EXCLUDED.status,
                    final_asset_path = EXCLUDED.final_asset_path,
                    notes = EXCLUDED.notes,
                    updated_at = EXCLUDED.updated_at
            """
            
            values = [
                (
                    r['id'],
                    r['class'],
                    r['status'],
                    r['final_asset_path'],
                    r['notes'],
                    datetime.now()
                )
                for r in self.object_buffer
            ]
            
            execute_values(cur, query, values)
            self.conn.commit()
            
            logger.info(f"Flushed {len(self.object_buffer)} objects to Postgres")
            self.object_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error flushing objects: {e}")
            if self.conn:
                self.conn.rollback()
    
    def flush_observations(self):
        """Flush observation buffer to Postgres."""
        if not self.observation_buffer:
            return
        
        if not self.conn:
            self.connect()
        
        try:
            cur = self.conn.cursor()
            
            query = """
                INSERT INTO object_observations 
                (obj_id, ts, cam_id, frame_path, bbox, mask_path, pose, feats)
                VALUES %s
            """
            
            values = [
                (
                    r['obj_id'],
                    r['ts'],
                    r['cam_id'],
                    r['frame_path'],
                    r['bbox'],
                    r['mask_path'],
                    r['pose'],
                    r['feats']
                )
                for r in self.observation_buffer
            ]
            
            execute_values(cur, query, values)
            self.conn.commit()
            
            logger.info(f"Flushed {len(self.observation_buffer)} observations to Postgres")
            self.observation_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error flushing observations: {e}")
            if self.conn:
                self.conn.rollback()
    
    def flush_metrics(self):
        """Flush metrics buffer to Postgres."""
        if not self.metric_buffer:
            return
        
        if not self.conn:
            self.connect()
        
        try:
            cur = self.conn.cursor()
            
            query = """
                INSERT INTO object_metrics 
                (obj_id, ts, orbit_deg, mvs_consistency, silhouette_iou, photometric_err, 
                 depth_var, pose_spread_deg, texture_cov, scale_conf, decision)
                VALUES %s
            """
            
            values = [
                (
                    r['obj_id'],
                    r['ts'],
                    r['orbit_deg'],
                    r['mvs_consistency'],
                    r['silhouette_iou'],
                    r['photometric_err'],
                    r['depth_var'],
                    r['pose_spread_deg'],
                    r['texture_cov'],
                    r['scale_conf'],
                    r['decision']
                )
                for r in self.metric_buffer
            ]
            
            execute_values(cur, query, values)
            self.conn.commit()
            
            logger.info(f"Flushed {len(self.metric_buffer)} metrics to Postgres")
            self.metric_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error flushing metrics: {e}")
            if self.conn:
                self.conn.rollback()
    
    def flush_assets(self):
        """Flush asset buffer to Postgres."""
        if not self.asset_buffer:
            return
        
        if not self.conn:
            self.connect()
        
        try:
            cur = self.conn.cursor()
            
            query = """
                INSERT INTO object_assets (obj_id, stage, path, quality_score)
                VALUES %s
            """
            
            values = [
                (
                    r['obj_id'],
                    r['stage'],
                    r['path'],
                    r['quality_score']
                )
                for r in self.asset_buffer
            ]
            
            execute_values(cur, query, values)
            self.conn.commit()
            
            logger.info(f"Flushed {len(self.asset_buffer)} assets to Postgres")
            self.asset_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error flushing assets: {e}")
            if self.conn:
                self.conn.rollback()
    
    def flush_emotions(self):
        """Flush emotion buffer to Postgres."""
        if not self.emotion_buffer:
            return
        
        if not self.conn:
            self.connect()
        
        try:
            cur = self.conn.cursor()
            
            query = """
                INSERT INTO object_emotion (obj_id, ts, tags, valence, arousal, conf)
                VALUES %s
            """
            
            values = [
                (
                    r['obj_id'],
                    r['ts'],
                    r['tags'],
                    r['valence'],
                    r['arousal'],
                    r['conf']
                )
                for r in self.emotion_buffer
            ]
            
            execute_values(cur, query, values)
            self.conn.commit()
            
            logger.info(f"Flushed {len(self.emotion_buffer)} emotions to Postgres")
            self.emotion_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error flushing emotions: {e}")
            if self.conn:
                self.conn.rollback()
    
    def get_object(self, obj_id: str) -> Optional[Dict[str, Any]]:
        """Get object from Postgres."""
        if not self.conn:
            self.connect()
        
        try:
            cur = self.conn.cursor()
            cur.execute("SELECT * FROM objects WHERE id = %s", (obj_id,))
            row = cur.fetchone()
            
            if row:
                return {
                    'id': row[0],
                    'class': row[1],
                    'created_at': row[2],
                    'final_asset_path': row[3],
                    'status': row[4],
                    'notes': json.loads(row[5]) if row[5] else {}
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting object: {e}")
            return None
    
    def get_object_metrics(
        self,
        obj_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get object metrics from Postgres."""
        if not self.conn:
            self.connect()
        
        try:
            cur = self.conn.cursor()
            cur.execute("""
                SELECT * FROM object_metrics 
                WHERE obj_id = %s 
                ORDER BY ts DESC 
                LIMIT %s
            """, (obj_id, limit))
            
            rows = cur.fetchall()
            return [
                {
                    'id': row[0],
                    'obj_id': row[1],
                    'ts': row[2],
                    'orbit_deg': row[3],
                    'mvs_consistency': row[4],
                    'silhouette_iou': row[5],
                    'photometric_err': row[6],
                    'depth_var': row[7],
                    'pose_spread_deg': row[8],
                    'texture_cov': row[9],
                    'scale_conf': row[10],
                    'decision': row[11]
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Error getting object metrics: {e}")
            return []


# Global persistence instance
_persistence_instance: Optional[ObjectPersistence] = None


def get_persistence() -> ObjectPersistence:
    """Get global persistence instance."""
    global _persistence_instance
    if _persistence_instance is None:
        _persistence_instance = ObjectPersistence()
        _persistence_instance.connect()
        _persistence_instance.start_periodic_flush()
    return _persistence_instance


def reset_persistence():
    """Reset global persistence instance."""
    global _persistence_instance
    if _persistence_instance:
        _persistence_instance.stop_periodic_flush()
        _persistence_instance.disconnect()
    _persistence_instance = None


