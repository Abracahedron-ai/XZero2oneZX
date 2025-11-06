-- Migration: Add Object Tracking Tables
-- Run: psql -U postgres -d zero2onez -f 002_add_object_tracking.sql

-- Create ENUM types for status and stage
DO $$ BEGIN
    CREATE TYPE object_status AS ENUM ('pending', 'observing', 'ready', 'quarantine');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE asset_stage AS ENUM ('proxy', 'mesh', '3dgs', 'nerf');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Objects table: Core object information
CREATE TABLE IF NOT EXISTS objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    final_asset_path TEXT,
    status object_status DEFAULT 'pending',
    notes JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objects_status ON objects(status);
CREATE INDEX IF NOT EXISTS idx_objects_class ON objects(class);
CREATE INDEX IF NOT EXISTS idx_objects_created_at ON objects(created_at DESC);

-- Object observations: Frame-level observations of objects
CREATE TABLE IF NOT EXISTS object_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obj_id UUID REFERENCES objects(id) ON DELETE CASCADE,
    ts TIMESTAMP DEFAULT NOW(),
    cam_id VARCHAR(255),
    frame_path TEXT,
    bbox JSONB,  -- {x, y, width, height} or {x1, y1, x2, y2}
    mask_path TEXT,
    pose JSONB,  -- {extrinsic: [...], intrinsic: [...], quaternion: [...], translation: [...]}
    feats JSONB,  -- Feature embeddings, DINOv2/MetaCLIP embeddings
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_object_observations_obj_id ON object_observations(obj_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_object_observations_cam_id ON object_observations(cam_id);
CREATE INDEX IF NOT EXISTS idx_object_observations_ts ON object_observations(ts DESC);

-- Object metrics: Quality metrics tracked over time
CREATE TABLE IF NOT EXISTS object_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obj_id UUID REFERENCES objects(id) ON DELETE CASCADE,
    ts TIMESTAMP DEFAULT NOW(),
    orbit_deg FLOAT,  -- Orbit coverage in degrees (0-360)
    mvs_consistency FLOAT,  -- Multi-view stereo consistency score (lower is better)
    silhouette_iou FLOAT,  -- Silhouette Intersection over Union (0-1, higher is better)
    photometric_err FLOAT,  -- Photometric error (lower is better)
    depth_var FLOAT,  -- Depth variance (lower is better)
    pose_spread_deg FLOAT,  -- Pose spread in degrees (higher is better for coverage)
    texture_cov FLOAT,  -- Texture coverage percentage (0-1, higher is better)
    scale_conf FLOAT,  -- Scale confidence (0-1, higher is better)
    decision VARCHAR(50),  -- Decision made: 'admit', 'observe', 'quarantine'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_object_metrics_obj_id ON object_metrics(obj_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_object_metrics_ts ON object_metrics(ts DESC);
CREATE INDEX IF NOT EXISTS idx_object_metrics_decision ON object_metrics(decision);

-- Object assets: Generated 3D assets at different stages
CREATE TABLE IF NOT EXISTS object_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obj_id UUID REFERENCES objects(id) ON DELETE CASCADE,
    stage asset_stage NOT NULL,
    path TEXT NOT NULL,
    quality_score FLOAT,  -- Overall quality score (0-1)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_object_assets_obj_id ON object_assets(obj_id);
CREATE INDEX IF NOT EXISTS idx_object_assets_stage ON object_assets(stage);
CREATE INDEX IF NOT EXISTS idx_object_assets_quality ON object_assets(quality_score DESC);

-- Object emotion: Emotion tags associated with objects
CREATE TABLE IF NOT EXISTS object_emotion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obj_id UUID REFERENCES objects(id) ON DELETE CASCADE,
    ts TIMESTAMP DEFAULT NOW(),
    tags TEXT[],  -- Array of emotion tags
    valence FLOAT,  -- Valence score (-1 to 1)
    arousal FLOAT,  -- Arousal score (-1 to 1)
    conf FLOAT,  -- Confidence score (0-1)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_object_emotion_obj_id ON object_emotion(obj_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_object_emotion_ts ON object_emotion(ts DESC);
CREATE INDEX IF NOT EXISTS idx_object_emotion_tags ON object_emotion USING GIN(tags);

-- Update trigger for objects.updated_at
CREATE OR REPLACE FUNCTION update_objects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_objects_updated_at
    BEFORE UPDATE ON objects
    FOR EACH ROW
    EXECUTE FUNCTION update_objects_updated_at();

-- Update trigger for object_assets.updated_at
CREATE OR REPLACE FUNCTION update_object_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_object_assets_updated_at
    BEFORE UPDATE ON object_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_object_assets_updated_at();


