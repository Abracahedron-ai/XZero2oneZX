// AIAgentManager.js - Component for managing AI agents

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectAgentsByCategory, 
  selectActiveAgents, 
  selectAgentQueue, 
  selectResourceUsage, 
  selectAgentSettings,
  selectAgentLogs
} from '../../store/selectors';
import { 
  startAgent, 
  updateAgentProgress, 
  completeAgentTask, 
  failAgentTask, 
  queueAgentTask, 
  dequeueAgentTask, 
  updateResourceUsage, 
  updateAgentSettings, 
  clearCompletedTasks,
  clearLogs,
  createAgentTask,
  processAgentQueue
} from '../../store/actions';

import './AIAgentManager.css';

// Icons for the agent manager
import { 
  MdPlayArrow, // Start
  MdStop, // Stop
  MdPause, // Pause
  MdSettings, // Settings
  MdRefresh, // Refresh
  MdDelete, // Clear
  MdQueue, // Queue
  MdInfo, // Info
  MdWarning, // Warning
  MdError, // Error
  MdCheck, // Success
  MdHourglassEmpty, // Pending
  MdHourglass, // In Progress
  MdMemory, // CPU
  MdSdStorage, // Memory
  MdSpeed, // GPU
} from 'react-icons/md';

// Status indicator component for agents
const StatusIndicator = ({ status }) => {
  let icon = null;
  let statusClass = '';
  
  switch (status) {
    case 'running':
      icon = <MdHourglass />;
      statusClass = 'running';
      break;
    case 'completed':
      icon = <MdCheck />;
      statusClass = 'completed';
      break;
    case 'failed':
      icon = <MdError />;
      statusClass = 'failed';
      break;
    case 'paused':
      icon = <MdPause />;
      statusClass = 'paused';
      break;
    case 'pending':
    default:
      icon = <MdHourglassEmpty />;
      statusClass = 'pending';
      break;
  }
  
  return (
    <div className={`status-indicator ${statusClass}`}>
      {icon}
      <span>{status}</span>
    </div>
  );
};

// Progress bar component
const ProgressBar = ({ progress, status }) => {
  let statusClass = '';
  
  switch (status) {
    case 'running':
      statusClass = 'running';
      break;
    case 'completed':
      statusClass = 'completed';
      break;
    case 'failed':
      statusClass = 'failed';
      break;
    case 'paused':
      statusClass = 'paused';
      break;
    default:
      statusClass = '';
      break;
  }
  
  return (
    <div className="progress-container">
      <div 
        className={`progress-bar ${statusClass}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// Agent category section
const AgentCategory = ({ category, agents, onStartAgent }) => {
  return (
    <div className="agent-category">
      <h3>{category}</h3>
      <div className="agent-list">
        {agents.map(agent => (
          <div key={agent.id} className="agent-item">
            <div className="agent-info">
              <div className="agent-name">{agent.name}</div>
              <StatusIndicator status={agent.status} />
            </div>
            <div className="agent-actions">
              <button 
                className="agent-action-button"
                onClick={() => onStartAgent(agent.id)}
                disabled={agent.status === 'running'}
              >
                <MdPlayArrow />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Active tasks section
const ActiveTasks = ({ activeTasks, onCancelTask }) => {
  return (
    <div className="active-tasks">
      <h3>Active Tasks</h3>
      {Object.keys(activeTasks).length > 0 ? (
        <div className="task-list">
          {Object.keys(activeTasks).map(agentId => {
            const task = activeTasks[agentId];
            
            return (
              <div key={task.taskId} className="task-item">
                <div className="task-header">
                  <div className="task-name">{task.taskId}</div>
                  <div className="task-actions">
                    <button 
                      className="task-action-button"
                      onClick={() => onCancelTask(agentId, task.taskId)}
                      disabled={['completed', 'failed'].includes(task.status)}
                    >
                      <MdStop />
                    </button>
                  </div>
                </div>
                <div className="task-agent">Agent: {agentId}</div>
                <div className="task-status">
                  <StatusIndicator status={task.status} />
                </div>
                <ProgressBar progress={task.progress} status={task.status} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-tasks">No active tasks</div>
      )}
    </div>
  );
};

// Queue section
const TaskQueue = ({ queuedTasks, onDequeueTask, onProcessQueue }) => {
  return (
    <div className="task-queue">
      <div className="queue-header">
        <h3>Task Queue ({queuedTasks.length})</h3>
        <button 
          className="queue-action-button"
          onClick={onProcessQueue}
          disabled={queuedTasks.length === 0}
        >
          <MdRefresh />
          <span>Process Queue</span>
        </button>
      </div>
      
      {queuedTasks.length > 0 ? (
        <div className="queued-task-list">
          {queuedTasks.map(task => (
            <div key={task.taskId} className="queued-task-item">
              <div className="queued-task-info">
                <div className="queued-task-id">{task.taskId}</div>
                <div className="queued-task-agent">Agent: {task.agentId}</div>
              </div>
              <div className="queued-task-actions">
                <button 
                  className="queued-task-action-button"
                  onClick={() => onDequeueTask(task.taskId)}
                >
                  <MdDelete />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-tasks">No queued tasks</div>
      )}
    </div>
  );
};

// Resource usage component
const ResourceUsage = ({ resources }) => {
  const { cpu, memory, gpu } = resources;
  
  return (
    <div className="resource-usage">
      <h3>Resource Usage</h3>
      <div className="resource-metrics">
        <div className="resource-metric">
          <div className="resource-icon">
            <MdMemory />
          </div>
          <div className="resource-label">CPU</div>
          <div className="resource-value">{cpu}%</div>
        </div>
        
        <div className="resource-metric">
          <div className="resource-icon">
            <MdSdStorage />
          </div>
          <div className="resource-label">Memory</div>
          <div className="resource-value">{memory}%</div>
        </div>
        
        <div className="resource-metric">
          <div className="resource-icon">
            <MdSpeed />
          </div>
          <div className="resource-label">GPU</div>
          <div className="resource-value">{gpu}%</div>
        </div>
      </div>
    </div>
  );
};

// Log view component
const LogView = ({ logs, onClearLogs }) => {
  return (
    <div className="log-view">
      <div className="log-header">
        <h3>Agent Logs</h3>
        <button 
          className="log-action-button"
          onClick={onClearLogs}
          disabled={logs.length === 0}
        >
          <MdDelete />
          <span>Clear Logs</span>
        </button>
      </div>
      
      <div className="log-content">
        {logs.length > 0 ? (
          <div className="log-list">
            {logs.map((log, index) => {
              // Determine log level icon
              let icon = <MdInfo />;
              let logClass = '';
              
              switch (log.type) {
                case 'agent_fail':
                  icon = <MdError />;
                  logClass = 'error';
                  break;
                case 'task_queued':
                case 'task_dequeued':
                  icon = <MdQueue />;
                  logClass = 'info';
                  break;
                case 'agent_start':
                  icon = <MdPlayArrow />;
                  logClass = 'info';
                  break;
                case 'agent_progress':
                  icon = <MdHourglass />;
                  logClass = 'info';
                  break;
                case 'agent_complete':
                  icon = <MdCheck />;
                  logClass = 'success';
                  break;
                default:
                  break;
              }
              
              // Format timestamp
              const timestamp = new Date(log.timestamp).toLocaleTimeString();
              
              return (
                <div key={index} className={`log-item ${logClass}`}>
                  <div className="log-timestamp">{timestamp}</div>
                  <div className="log-icon">{icon}</div>
                  <div className="log-message">{log.message}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-logs">No logs</div>
        )}
      </div>
    </div>
  );
};

// Settings panel component
const SettingsPanel = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  
  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  // Handle settings change
  const handleSettingsChange = (key, value) => {
    setLocalSettings({
      ...localSettings,
      [key]: value,
    });
  };
  
  // Handle resource allocation change
  const handleResourceChange = (resource, value) => {
    setLocalSettings({
      ...localSettings,
      resourceAllocation: {
        ...localSettings.resourceAllocation,
        [resource]: value,
      },
    });
  };
  
  // Handle save settings
  const handleSaveSettings = () => {
    onUpdateSettings(localSettings);
  };
  
  return (
    <div className="settings-panel">
      <h3>Agent Settings</h3>
      
      <div className="settings-group">
        <div className="setting-item">
          <label>Max Concurrent Agents</label>
          <input 
            type="number"
            min="1"
            max="10"
            value={localSettings.maxConcurrentAgents}
            onChange={(e) => handleSettingsChange('maxConcurrentAgents', parseInt(e.target.value, 10))}
          />
        </div>
        
        <div className="setting-item">
          <label>Priority Mode</label>
          <select 
            value={localSettings.priorityMode}
            onChange={(e) => handleSettingsChange('priorityMode', e.target.value)}
          >
            <option value="fifo">First In, First Out</option>
            <option value="priority">Priority Based</option>
            <option value="deadline">Deadline Based</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Auto-Start Queued Tasks</label>
          <input 
            type="checkbox"
            checked={localSettings.autoStart}
            onChange={(e) => handleSettingsChange('autoStart', e.target.checked)}
          />
        </div>
      </div>
      
      <div className="settings-group">
        <h4>Resource Allocation</h4>
        
        <div className="setting-item">
          <label>CPU Usage (%)</label>
          <input 
            type="range"
            min="10"
            max="100"
            value={localSettings.resourceAllocation.cpu}
            onChange={(e) => handleResourceChange('cpu', parseInt(e.target.value, 10))}
          />
          <span>{localSettings.resourceAllocation.cpu}%</span>
        </div>
        
        <div className="setting-item">
          <label>Memory Usage (%)</label>
          <input 
            type="range"
            min="10"
            max="100"
            value={localSettings.resourceAllocation.memory}
            onChange={(e) => handleResourceChange('memory', parseInt(e.target.value, 10))}
          />
          <span>{localSettings.resourceAllocation.memory}%</span>
        </div>
        
        <div className="setting-item">
          <label>GPU Usage (%)</label>
          <input 
            type="range"
            min="10"
            max="100"
            value={localSettings.resourceAllocation.gpu}
            onChange={(e) => handleResourceChange('gpu', parseInt(e.target.value, 10))}
          />
          <span>{localSettings.resourceAllocation.gpu}%</span>
        </div>
      </div>
      
      <div className="settings-actions">
        <button 
          className="settings-action-button"
          onClick={handleSaveSettings}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

// Main AIAgentManager component
const AIAgentManager = ({ width = '100%', height = '100%' }) => {
  const dispatch = useDispatch();
  
  // Get data from Redux
  const agentsByCategory = useSelector(selectAgentsByCategory);
  const activeAgents = useSelector(selectActiveAgents);
  const agentQueue = useSelector(selectAgentQueue);
  const resourceUsage = useSelector(selectResourceUsage);
  const agentSettings = useSelector(selectAgentSettings);
  const agentLogs = useSelector(selectAgentLogs);
  
  // Component state
  const [activeTab, setActiveTab] = useState('agents'); // agents, queue, logs, settings
  
  // Handle start agent
  const handleStartAgent = (agentId) => {
    dispatch(createAgentTask(agentId, {}));
  };
  
  // Handle cancel task
  const handleCancelTask = (agentId, taskId) => {
    dispatch(failAgentTask({ agentId, error: 'Canceled by user' }));
  };
  
  // Handle dequeue task
  const handleDequeueTask = (taskId) => {
    dispatch(dequeueAgentTask({ taskId }));
  };
  
  // Handle process queue
  const handleProcessQueue = () => {
    dispatch(processAgentQueue());
  };
  
  // Handle clear completed tasks
  const handleClearCompletedTasks = () => {
    dispatch(clearCompletedTasks());
  };
  
  // Handle clear logs
  const handleClearLogs = () => {
    dispatch(clearLogs());
  };
  
  // Handle update settings
  const handleUpdateSettings = (settings) => {
    dispatch(updateAgentSettings(settings));
  };
  
  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'agents':
        return (
          <div className="tab-content">
            {Object.keys(agentsByCategory).map(category => (
              <AgentCategory 
                key={category}
                category={category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                agents={agentsByCategory[category]}
                onStartAgent={handleStartAgent}
              />
            ))}
          </div>
        );
      case 'tasks':
        return (
          <div className="tab-content">
            <ActiveTasks 
              activeTasks={activeAgents}
              onCancelTask={handleCancelTask}
            />
            <TaskQueue 
              queuedTasks={agentQueue}
              onDequeueTask={handleDequeueTask}
              onProcessQueue={handleProcessQueue}
            />
            <div className="tasks-actions">
              <button 
                className="tasks-action-button"
                onClick={handleClearCompletedTasks}
                disabled={Object.values(activeAgents).filter(agent => ['completed', 'failed'].includes(agent.status)).length === 0}
              >
                <MdDelete />
                <span>Clear Completed</span>
              </button>
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="tab-content">
            <ResourceUsage resources={resourceUsage} />
          </div>
        );
      case 'logs':
        return (
          <div className="tab-content">
            <LogView 
              logs={agentLogs}
              onClearLogs={handleClearLogs}
            />
          </div>
        );
      case 'settings':
        return (
          <div className="tab-content">
            <SettingsPanel 
              settings={agentSettings}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="ai-agent-manager" style={{ width, height }}>
      <div className="agent-manager-header">
        <h2>AI Agents</h2>
      </div>
      
      <div className="agent-manager-tabs">
        <div 
          className={`agent-tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          Agents
        </div>
        <div 
          className={`agent-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </div>
        <div 
          className={`agent-tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </div>
        <div 
          className={`agent-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </div>
        <div 
          className={`agent-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </div>
      </div>
      
      <div className="agent-manager-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AIAgentManager;
