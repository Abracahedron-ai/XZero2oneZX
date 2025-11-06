// store/actions.js - Action creators for Redux

// Re-export actions from slices for convenient import
export {
  setTransformMode,
  setViewMode,
  setRenderMode,
  setCameraType,
  setCameraPosition,
  setCameraTarget,
  toggleGrid,
  setGridSettings,
  toggleAxes,
  toggleWireframe,
  toggleSafeFrame,
  setAmbientLight,
  setDirectionalLight,
  resetView,
} from './slices/viewportSlice';

export {
  setSelectedObjects,
  addToSelection,
  removeFromSelection,
  toggleSelection,
  setSelectionMode,
  clearSelection,
  createSelectionSet,
  deleteSelectionSet,
  selectFromSet,
  setHoveredObject,
  isolateObjects,
  clearIsolation,
  undoSelection,
  setSelectionBounds,
} from './slices/selectionSlice';

export {
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
} from './slices/aiAgentSlice';

// Thunk actions for async operations

// Load a scene from a file
export const loadScene = (filePath) => async (dispatch) => {
  dispatch({ type: 'scene/loadStart', payload: filePath });
  
  try {
    // This would be an actual API call in a real application
    const response = await fetch(`/api/scene?path=${encodeURIComponent(filePath)}`);
    const sceneData = await response.json();
    
    dispatch({ type: 'scene/loadSuccess', payload: sceneData });
    return sceneData;
  } catch (error) {
    dispatch({ type: 'scene/loadFailure', payload: error.message });
    throw error;
  }
};

// Save scene to a file
export const saveScene = (filePath, sceneData) => async (dispatch) => {
  dispatch({ type: 'scene/saveStart', payload: filePath });
  
  try {
    // This would be an actual API call in a real application
    const response = await fetch(`/api/scene?path=${encodeURIComponent(filePath)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sceneData),
    });
    
    const result = await response.json();
    
    dispatch({ type: 'scene/saveSuccess', payload: result });
    return result;
  } catch (error) {
    dispatch({ type: 'scene/saveFailure', payload: error.message });
    throw error;
  }
};

// Import asset into the scene
export const importAsset = (assetData) => async (dispatch) => {
  dispatch({ type: 'asset/importStart', payload: assetData });
  
  try {
    // This would be an actual API call in a real application
    const response = await fetch('/api/assets/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData),
    });
    
    const result = await response.json();
    
    dispatch({ type: 'asset/importSuccess', payload: result });
    return result;
  } catch (error) {
    dispatch({ type: 'asset/importFailure', payload: error.message });
    throw error;
  }
};

// Add an object to the scene
export const addObject = (objectType, parameters = {}) => async (dispatch) => {
  dispatch({ type: 'scene/addObjectStart', payload: { objectType, parameters } });
  
  try {
    // This would be an actual API call in a real application
    const response = await fetch('/api/objects/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ objectType, parameters }),
    });
    
    const result = await response.json();
    
    dispatch({ type: 'scene/addObjectSuccess', payload: result });
    dispatch(setSelectedObjects([result.id]));
    return result;
  } catch (error) {
    dispatch({ type: 'scene/addObjectFailure', payload: error.message });
    throw error;
  }
};

// Delete objects from the scene
export const deleteObjects = (objectIds) => async (dispatch) => {
  dispatch({ type: 'scene/deleteObjectsStart', payload: objectIds });
  
  try {
    // This would be an actual API call in a real application
    const response = await fetch('/api/objects/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ objectIds }),
    });
    
    const result = await response.json();
    
    dispatch({ type: 'scene/deleteObjectsSuccess', payload: result });
    dispatch(clearSelection());
    return result;
  } catch (error) {
    dispatch({ type: 'scene/deleteObjectsFailure', payload: error.message });
    throw error;
  }
};

// Create a new AI agent task
export const createAgentTask = (agentId, parameters) => async (dispatch, getState) => {
  const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const state = getState();
  const activeAgentCount = Object.values(state.aiAgent.activeAgents)
    .filter(agent => agent.status === 'running').length;
  const maxConcurrent = state.aiAgent.settings.maxConcurrentAgents;
  
  // Check if we can start immediately or need to queue
  if (activeAgentCount < maxConcurrent) {
    // Start immediately
    dispatch(startAgent({ agentId, taskId, parameters }));
    
    // Simulate agent task (in a real app, this would be handled by a backend service)
    simulateAgentTask(dispatch, agentId, taskId, parameters);
  } else {
    // Queue the task
    dispatch(queueAgentTask({ agentId, taskId, parameters }));
  }
  
  return taskId;
};

// Helper function to simulate an agent task (for demonstration)
const simulateAgentTask = (dispatch, agentId, taskId, parameters) => {
  // Total duration for the simulation (in milliseconds)
  const duration = 5000 + Math.random() * 10000;
  const steps = 10;
  const stepTime = duration / steps;
  
  // Send progress updates
  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      const progress = (i / steps) * 100;
      dispatch(updateAgentProgress({ 
        agentId, 
        progress, 
        message: `Processing step ${i} of ${steps}...` 
      }));
    }, i * stepTime);
  }
  
  // Complete the task
  setTimeout(() => {
    if (Math.random() > 0.9) {
      // Occasionally fail for demonstration
      dispatch(failAgentTask({ 
        agentId, 
        error: 'Random simulated failure' 
      }));
    } else {
      // Generate some fake results
      const results = {
        type: agentId,
        generatedAt: new Date().toISOString(),
        parameters,
        output: {
          success: true,
          data: {
            id: `generated-${Math.floor(Math.random() * 1000)}`,
            name: `Generated ${agentId} result`,
            // Additional fake data would go here
          }
        }
      };
      
      dispatch(completeAgentTask({ agentId, results }));
      
      // Check if there are queued tasks
      setTimeout(() => {
        dispatch({ type: 'aiAgent/processQueue' });
      }, 500);
    }
  }, duration + 100);
};

// Process the agent queue (look for tasks that can be started)
export const processAgentQueue = () => (dispatch, getState) => {
  const state = getState();
  const activeAgentCount = Object.values(state.aiAgent.activeAgents)
    .filter(agent => agent.status === 'running').length;
  const maxConcurrent = state.aiAgent.settings.maxConcurrentAgents;
  const queue = state.aiAgent.agentQueue;
  
  // Check if we can start more agents
  const available = maxConcurrent - activeAgentCount;
  
  if (available > 0 && queue.length > 0) {
    // Start as many tasks as we can
    for (let i = 0; i < Math.min(available, queue.length); i++) {
      const task = queue[i];
      
      // Dequeue the task
      dispatch(dequeueAgentTask({ taskId: task.taskId }));
      
      // Start the agent
      dispatch(startAgent({ 
        agentId: task.agentId, 
        taskId: task.taskId, 
        parameters: task.parameters 
      }));
      
      // Simulate the agent task
      simulateAgentTask(dispatch, task.agentId, task.taskId, task.parameters);
    }
  }
};
