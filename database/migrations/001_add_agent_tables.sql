-- Migration: Add Agent Catalog and Instances Tables
-- Run: psql -U postgres -d zero2onez -f 001_add_agent_tables.sql

-- Agent Catalog: Ottomator agents from EXPERIMENTAL/ottomator-agents/
CREATE TABLE IF NOT EXISTS agent_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  inputs TEXT[] DEFAULT '{}',
  outputs TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}',
  runtime JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  yaml_path TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_catalog_type ON agent_catalog(type);
CREATE INDEX IF NOT EXISTS idx_agent_catalog_status ON agent_catalog(status);
CREATE INDEX IF NOT EXISTS idx_agent_catalog_tools ON agent_catalog USING GIN(tools);

-- Agent Instances: Running agent instances
CREATE TABLE IF NOT EXISTS agent_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  agent_id UUID REFERENCES agent_catalog(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  params JSONB DEFAULT '{}',
  port INTEGER,
  gpu_id INTEGER,
  resource_usage JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  stopped_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_instances_session ON agent_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_instances_agent ON agent_instances(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_instances_status ON agent_instances(status);

-- Agent Tools: Tools spawned by agents
CREATE TABLE IF NOT EXISTS agent_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_instance_id UUID REFERENCES agent_instances(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tool_registry(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agent_instance_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tools_instance ON agent_tools(agent_instance_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_tool ON agent_tools(tool_id);

