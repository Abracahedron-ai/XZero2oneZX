-- Tool Registry Schema
-- Run: psql -U postgres -d zero2onez -f schema.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tool Registry: Each tool is an MCP agent or generated script
CREATE TABLE tool_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  context_predicates JSONB DEFAULT '{}', -- e.g., { "selection": "mesh", "mode": "edit" }
  icon VARCHAR(255) DEFAULT 'tool',
  required_perms TEXT[] DEFAULT '{}',  -- e.g., ["fs:read", "gpu:compute"]
  command_schema JSONB NOT NULL,       -- { "type": "script", "path": "...", "args": [...] }
  embedding vector(1536),              -- Semantic search via pgvector
  ttl INTEGER DEFAULT 86400,           -- Time-to-live in seconds (24h default)
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'manual', -- 'mcp', 'generated', 'manual'
  status VARCHAR(20) DEFAULT 'active'  -- 'active', 'deprecated', 'archived'
);

-- Indexes
CREATE INDEX idx_tool_tags ON tool_registry USING GIN(tags);
CREATE INDEX idx_tool_context ON tool_registry USING GIN(context_predicates);
CREATE INDEX idx_tool_embedding ON tool_registry USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_tool_usage ON tool_registry(usage_count DESC, last_used DESC);

-- Usage Telemetry: Track context → tool → result
CREATE TABLE tool_telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID REFERENCES tool_registry(id) ON DELETE CASCADE,
  context JSONB NOT NULL,              -- Scene state when tool was invoked
  intent TEXT,                         -- User's command/query
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  output JSONB,                        -- Generated artifacts
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_telemetry_tool ON tool_telemetry(tool_id, created_at DESC);
CREATE INDEX idx_telemetry_context ON tool_telemetry USING GIN(context);

-- Agent Mutations: Track all changes made by agents for undo
CREATE TABLE agent_mutations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  tool_id UUID REFERENCES tool_registry(id),
  mutation_type VARCHAR(50) NOT NULL,  -- 'file_create', 'file_edit', 'scene_add', etc.
  target_path TEXT,
  before_state JSONB,
  after_state JSONB,
  reversible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mutations_session ON agent_mutations(session_id, created_at DESC);

-- Radial Menu Slots: User-defined radial menu layout
CREATE TABLE radial_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,                        -- Optional: per-user layouts
  category VARCHAR(50) NOT NULL,       -- 'modeling', 'ai', 'rigging', 'recent'
  slot_index INTEGER NOT NULL,
  tool_id UUID REFERENCES tool_registry(id),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category, slot_index)
);

CREATE INDEX idx_slots_category ON radial_slots(category, priority DESC);

-- MCP Endpoints: Discovered MCP servers
CREATE TABLE mcp_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  manifest JSONB NOT NULL,             -- Full MCP manifest
  health_status VARCHAR(20) DEFAULT 'unknown',
  last_ping TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Catalog: Ottomator agents from EXPERIMENTAL/ottomator-agents/
CREATE TABLE agent_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id VARCHAR(255) NOT NULL UNIQUE, -- Directory name/id
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,            -- 'n8n', 'python', 'mcp'
  inputs TEXT[] DEFAULT '{}',
  outputs TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}',
  runtime JSONB DEFAULT '{}',           -- { gpu: bool, memory: str, ports: [] }
  metadata JSONB DEFAULT '{}',          -- { source: str, license: str, yaml_path: str }
  yaml_path TEXT,                      -- Path to agent.yaml
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'deprecated', 'archived'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_catalog_type ON agent_catalog(type);
CREATE INDEX idx_agent_catalog_status ON agent_catalog(status);
CREATE INDEX idx_agent_catalog_tools ON agent_catalog USING GIN(tools);

-- Agent Instances: Running agent instances
CREATE TABLE agent_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  agent_id UUID REFERENCES agent_catalog(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'running', 'stopped', 'error'
  params JSONB DEFAULT '{}',            -- Runtime parameters
  port INTEGER,                         -- Assigned port
  gpu_id INTEGER,                       -- Assigned GPU ID
  resource_usage JSONB DEFAULT '{}',    -- { memory: int, cpu: float, gpu: float }
  started_at TIMESTAMP,
  stopped_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_instances_session ON agent_instances(session_id);
CREATE INDEX idx_agent_instances_agent ON agent_instances(agent_id);
CREATE INDEX idx_agent_instances_status ON agent_instances(status);

-- Agent Tools: Tools spawned by agents (linked to tool_registry)
CREATE TABLE agent_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_instance_id UUID REFERENCES agent_instances(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tool_registry(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agent_instance_id, tool_id)
);

CREATE INDEX idx_agent_tools_instance ON agent_tools(agent_instance_id);
CREATE INDEX idx_agent_tools_tool ON agent_tools(tool_id);

-- Seed data: Example tools
INSERT INTO tool_registry (name, description, tags, context_predicates, command_schema) VALUES
  ('Create Cube', 'Add a cube to the scene', ARRAY['modeling', '3d'], '{"selection": null}', '{"type": "r3f", "component": "BoxGeometry"}'),
  ('Smooth Mesh', 'Apply smooth shading', ARRAY['modeling', 'mesh'], '{"selection": "mesh"}', '{"type": "blender", "op": "shade_smooth"}'),
  ('Generate Rig', 'Create IK rig from mesh', ARRAY['rigging', 'ai'], '{"selection": "mesh"}', '{"type": "script", "path": "agents/rig_generator.py"}');
