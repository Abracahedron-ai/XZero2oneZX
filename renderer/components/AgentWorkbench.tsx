/**
 * Agent Workbench Component
 * 
 * UI for agent selection, parameterization, and monitoring.
 * Integrates with RadialMenu for quick spawn.
 */

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: 'n8n' | 'python' | 'mcp';
  inputs: string[];
  outputs: string[];
  tools: string[];
  dependencies: string[];
  runtime: {
    gpu: boolean;
    memory: string;
    ports: number[];
  };
  metadata: {
    source: string;
    license: string;
  };
}

interface AgentInstance {
  id: string;
  agent_id: string;
  status: 'pending' | 'running' | 'stopped' | 'error';
  port?: number;
  started_at?: string;
  error_message?: string;
}

export default function AgentWorkbench() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchInstances();
    // Poll for instance updates
    const interval = setInterval(fetchInstances, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/agents');
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchInstances = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/agent-instances');
      const data = await response.json();
      setInstances(data);
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  const spawnAgent = async (agentId: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/agents/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          session_id: 'default',
          params: params
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchInstances();
        setParams({});
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error('Error spawning agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopAgent = async (instanceId: string) => {
    try {
      await fetch(`http://localhost:8000/api/agent-instances/${instanceId}/stop`, {
        method: 'POST'
      });
      await fetchInstances();
    } catch (error) {
      console.error('Error stopping agent:', error);
    }
  };

  return (
    <div className="w-full max-w-6xl rounded-xl border border-zinc-700 bg-zinc-900/80 p-6 shadow-2xl">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">Agent Workbench</h2>
        <p className="text-sm text-zinc-500">
          Select and spawn agents from the Ottomator catalog
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Agent Catalog */}
        <section className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Agent Catalog</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`cursor-pointer rounded border p-3 transition ${
                  selectedAgent?.id === agent.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-600 bg-zinc-700/30 hover:border-zinc-500'
                }`}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-zinc-100">{agent.name}</div>
                    <div className="text-xs text-zinc-400">{agent.type}</div>
                  </div>
                  {agent.runtime.gpu && (
                    <span className="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
                      GPU
                    </span>
                  )}
                </div>
                {agent.description && (
                  <p className="mt-1 text-xs text-zinc-500">{agent.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Agent Details & Controls */}
        <section className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4">
          {selectedAgent ? (
            <>
              <h3 className="mb-4 text-sm font-semibold text-zinc-200">
                {selectedAgent.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Parameters</label>
                  <textarea
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2 text-sm text-zinc-100"
                    rows={4}
                    placeholder='{"param1": "value1"}'
                    value={JSON.stringify(params, null, 2)}
                    onChange={(e) => {
                      try {
                        setParams(JSON.parse(e.target.value));
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => spawnAgent(selectedAgent.id)}
                  disabled={loading}
                  className="w-full rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-50"
                >
                  {loading ? 'Spawning...' : 'Spawn Agent'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-zinc-500">
              Select an agent from the catalog
            </div>
          )}
        </section>
      </div>

      {/* Running Instances */}
      <section className="mt-6 rounded-lg border border-zinc-700 bg-zinc-800/60 p-4">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Running Instances</h3>
        <div className="space-y-2">
          {instances.map((instance) => {
            const agent = agents.find((a) => a.id === instance.agent_id);
            return (
              <div
                key={instance.id}
                className="flex items-center justify-between rounded border border-zinc-600 bg-zinc-700/30 p-3"
              >
                <div>
                  <div className="font-medium text-zinc-100">
                    {agent?.name || instance.agent_id}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Status: {instance.status} {instance.port && `| Port: ${instance.port}`}
                  </div>
                </div>
                <button
                  onClick={() => stopAgent(instance.id)}
                  className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-300 hover:bg-red-500/30"
                >
                  Stop
                </button>
              </div>
            );
          })}
          {instances.length === 0 && (
            <div className="text-center text-sm text-zinc-500">No running instances</div>
          )}
        </div>
      </section>
    </div>
  );
}

