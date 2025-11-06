// store/slices/aiAgentSlice.js - Redux slice for AI agent state

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeAgents: {}, // Mapping of agent IDs to their status
  agentQueue: [], // Queue of pending agent tasks
  resourceUsage: {
    cpu: 0,
    memory: 0,
    gpu: 0,
  },
  availableAgents: {
    // Asset creators
    '3d_modeler': {
      name: '3D Modeler',
      category: 'asset_creators',
      status: 'idle', // idle, running, paused, stopped
      progress: 0,
    },
    'texture_artist': {
      name: 'Texture Artist',
      category: 'asset_creators',
      status: 'idle',
      progress: 0,
    },
    'animator': {
      name: 'Animator',
      category: 'asset_creators',
      status: 'idle',
      progress: 0,
    },
    // Scene analyzers
    'object_detector': {
      name: 'Object Detector',
      category: 'scene_analyzers',
      status: 'idle',
      progress: 0,
    },
    'layout_planner': {
      name: 'Layout Planner',
      category: 'scene_analyzers',
      status: 'idle',
      progress: 0,
    },
    'collision_checker': {
      name: 'Collision Checker',
      category: 'scene_analyzers',
      status: 'idle',
      progress: 0,
    },
    // Behavior controllers
    'goal_planner': {
      name: 'Goal Planner',
      category: 'behavior_controllers',
      status: 'idle',
      progress: 0,
    },
    'path_finder': {
      name: 'Path Finder',
      category: 'behavior_controllers',
      status: 'idle',
      progress: 0,
    },
    'interaction_handler': {
      name: 'Interaction Handler',
      category: 'behavior_controllers',
      status: 'idle',
      progress: 0,
    },
  },
  settings: {
    maxConcurrentAgents: 3,
    priorityMode: 'fifo', // fifo, priority, deadline
    resourceAllocation: {
      cpu: 50, // percent
      memory: 50, // percent
      gpu: 80, // percent
    },
    autoStart: true,
  },
  logs: [], // Agent activity logs
};

export const aiAgentSlice = createSlice({
  name: 'aiAgent',
  initialState,
  reducers: {
    startAgent: (state, action) => {
      const { agentId, taskId, parameters } = action.payload;
      
      // Create a new active agent entry
      state.activeAgents[agentId] = {
        taskId,
        startTime: Date.now(),
        parameters: parameters || {},
        status: 'running',
        progress: 0,
        results: null,
        error: null,
      };
      
      // Update the agent status in availableAgents
      if (state.availableAgents[agentId]) {
        state.availableAgents[agentId].status = 'running';
        state.availableAgents[agentId].progress = 0;
      }
      
      // Log the agent start
      state.logs.push({
        timestamp: Date.now(),
        type: 'agent_start',
        agentId,
        taskId,
        message: `Started ${state.availableAgents[agentId]?.name || agentId} agent`,
      });
    },
    updateAgentProgress: (state, action) => {
      const { agentId, progress, status, message } = action.payload;
      
      if (state.activeAgents[agentId]) {
        state.activeAgents[agentId].progress = progress;
        
        if (status) {
          state.activeAgents[agentId].status = status;
        }
        
        // Update the agent progress in availableAgents
        if (state.availableAgents[agentId]) {
          state.availableAgents[agentId].progress = progress;
          if (status) {
            state.availableAgents[agentId].status = status;
          }
        }
        
        // Log the progress update
        if (message) {
          state.logs.push({
            timestamp: Date.now(),
            type: 'agent_progress',
            agentId,
            taskId: state.activeAgents[agentId].taskId,
            message,
          });
        }
      }
    },
    completeAgentTask: (state, action) => {
      const { agentId, results } = action.payload;
      
      if (state.activeAgents[agentId]) {
        state.activeAgents[agentId].status = 'completed';
        state.activeAgents[agentId].progress = 100;
        state.activeAgents[agentId].results = results;
        state.activeAgents[agentId].endTime = Date.now();
        
        // Update the agent status in availableAgents
        if (state.availableAgents[agentId]) {
          state.availableAgents[agentId].status = 'idle';
          state.availableAgents[agentId].progress = 0;
        }
        
        // Log the completion
        state.logs.push({
          timestamp: Date.now(),
          type: 'agent_complete',
          agentId,
          taskId: state.activeAgents[agentId].taskId,
          message: `Completed ${state.availableAgents[agentId]?.name || agentId} agent task`,
        });
      }
    },
    failAgentTask: (state, action) => {
      const { agentId, error } = action.payload;
      
      if (state.activeAgents[agentId]) {
        state.activeAgents[agentId].status = 'failed';
        state.activeAgents[agentId].error = error;
        state.activeAgents[agentId].endTime = Date.now();
        
        // Update the agent status in availableAgents
        if (state.availableAgents[agentId]) {
          state.availableAgents[agentId].status = 'idle';
          state.availableAgents[agentId].progress = 0;
        }
        
        // Log the failure
        state.logs.push({
          timestamp: Date.now(),
          type: 'agent_fail',
          agentId,
          taskId: state.activeAgents[agentId].taskId,
          message: `Failed ${state.availableAgents[agentId]?.name || agentId} agent task: ${error}`,
        });
      }
    },
    queueAgentTask: (state, action) => {
      const { agentId, taskId, parameters, priority } = action.payload;
      
      state.agentQueue.push({
        agentId,
        taskId,
        parameters: parameters || {},
        priority: priority || 0,
        queuedAt: Date.now(),
      });
      
      // Sort the queue by priority (higher priority first)
      state.agentQueue.sort((a, b) => b.priority - a.priority);
      
      // Log the queue addition
      state.logs.push({
        timestamp: Date.now(),
        type: 'task_queued',
        agentId,
        taskId,
        message: `Queued task for ${state.availableAgents[agentId]?.name || agentId} agent`,
      });
    },
    dequeueAgentTask: (state, action) => {
      const { taskId } = action.payload;
      
      const taskIndex = state.agentQueue.findIndex(task => task.taskId === taskId);
      
      if (taskIndex >= 0) {
        // Remove the task from the queue
        const [task] = state.agentQueue.splice(taskIndex, 1);
        
        // Log the dequeue
        state.logs.push({
          timestamp: Date.now(),
          type: 'task_dequeued',
          agentId: task.agentId,
          taskId,
          message: `Dequeued task for ${state.availableAgents[task.agentId]?.name || task.agentId} agent`,
        });
      }
    },
    updateResourceUsage: (state, action) => {
      state.resourceUsage = {
        ...state.resourceUsage,
        ...action.payload,
      };
    },
    updateAgentSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    clearCompletedTasks: (state) => {
      // Remove completed tasks from activeAgents
      Object.keys(state.activeAgents).forEach(agentId => {
        if (['completed', 'failed'].includes(state.activeAgents[agentId].status)) {
          delete state.activeAgents[agentId];
        }
      });
    },
    clearLogs: (state) => {
      state.logs = [];
    },
  },
});

export const {
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
} = aiAgentSlice.actions;

export default aiAgentSlice.reducer;
