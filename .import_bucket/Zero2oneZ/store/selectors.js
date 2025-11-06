// store/selectors.js - Selectors for accessing Redux state

// Viewport selectors
export const selectTransformMode = state => state.viewport.transformMode;
export const selectViewMode = state => state.viewport.viewMode;
export const selectRenderMode = state => state.viewport.renderMode;
export const selectCameraType = state => state.viewport.cameraType;
export const selectCameraPosition = state => state.viewport.cameraPosition;
export const selectCameraTarget = state => state.viewport.cameraTarget;
export const selectGridVisible = state => state.viewport.gridVisible;
export const selectGridSettings = state => ({
  size: state.viewport.gridSize,
  divisions: state.viewport.gridDivisions
});
export const selectAxesVisible = state => state.viewport.axesVisible;
export const selectWireframeMode = state => state.viewport.wireframeMode;
export const selectSafeFrameVisible = state => state.viewport.safeFrameVisible;
export const selectLightSettings = state => ({
  ambient: state.viewport.ambientLight,
  directional: state.viewport.directionalLight
});

// Selection selectors
export const selectSelectedObjects = state => state.selection.selectedObjects;
export const selectLastSelectedObject = state => state.selection.lastSelectedObject;
export const selectSelectionMode = state => state.selection.selectionMode;
export const selectSelectionSets = state => state.selection.selectionSets;
export const selectHoveredObject = state => state.selection.hoveredObject;
export const selectIsolatedObjects = state => state.selection.isolatedObjects;
export const selectSelectionBounds = state => state.selection.selectionBounds;

// Hierarchy selectors
export const selectSceneGraph = state => state.hierarchy.sceneGraph;
export const selectExpandedNodes = state => state.hierarchy.expandedNodes;
export const selectVisibilityStates = state => state.hierarchy.visibilityStates;
export const selectLockStates = state => state.hierarchy.lockStates;

// Property selectors
export const selectObjectProperties = state => state.property.objectProperties;
export const selectPropertyPresets = state => state.property.presets;
export const selectLastEditedProperty = state => state.property.lastEditedProperty;

// Asset selectors
export const selectAssetCategories = state => state.asset.categories;
export const selectAssetLibrary = state => state.asset.library;
export const selectFavoriteAssets = state => state.asset.favorites;
export const selectRecentAssets = state => state.asset.recentlyUsed;

// Timeline selectors
export const selectCurrentFrame = state => state.timeline.currentFrame;
export const selectPlaybackRange = state => state.timeline.playbackRange;
export const selectFrameRate = state => state.timeline.frameRate;
export const selectTimeUnit = state => state.timeline.timeUnit;
export const selectTracks = state => state.timeline.tracks;
export const selectMarkers = state => state.timeline.markers;

// Character selectors
export const selectCharacters = state => state.character.characters;
export const selectActiveCharacter = state => 
  state.character.characters[state.character.activeCharacterId];
export const selectPersonalityTraits = state => 
  state.character.activeCharacterId ? 
    state.character.characters[state.character.activeCharacterId].personality : null;
export const selectEmotionalState = state => 
  state.character.activeCharacterId ? 
    state.character.characters[state.character.activeCharacterId].emotionalState : null;
export const selectBehaviorTrees = state => state.character.behaviorTrees;
export const selectDialogueLibrary = state => state.character.dialogueLibrary;

// AI Agent selectors
export const selectActiveAgents = state => state.aiAgent.activeAgents;
export const selectAgentQueue = state => state.aiAgent.agentQueue;
export const selectResourceUsage = state => state.aiAgent.resourceUsage;
export const selectAvailableAgents = state => state.aiAgent.availableAgents;
export const selectAgentSettings = state => state.aiAgent.settings;
export const selectAgentLogs = state => state.aiAgent.logs;

// Complex selectors
export const selectAgentsByCategory = state => {
  const agents = state.aiAgent.availableAgents;
  const categories = {};
  
  Object.keys(agents).forEach(agentId => {
    const agent = agents[agentId];
    if (!categories[agent.category]) {
      categories[agent.category] = [];
    }
    
    categories[agent.category].push({
      id: agentId,
      ...agent
    });
  });
  
  return categories;
};

export const selectActiveAgentCount = state => 
  Object.values(state.aiAgent.activeAgents).filter(
    agent => agent.status === 'running'
  ).length;

export const selectQueuedTaskCount = state => state.aiAgent.agentQueue.length;

export const selectObjectById = (state, objectId) => {
  // This is a simplified version - in a real app, 
  // you'd need to traverse the scene graph to find the object
  const objects = state.hierarchy.sceneGraph.objects;
  return objects ? objects[objectId] : null;
};

export const selectObjectPropertiesById = (state, objectId) => {
  return state.property.objectProperties[objectId] || null;
};

export const selectAnimationKeysForObject = (state, objectId) => {
  const tracks = state.timeline.tracks;
  const objectTracks = {};
  
  Object.keys(tracks).forEach(trackId => {
    if (tracks[trackId].objectId === objectId) {
      objectTracks[trackId] = tracks[trackId];
    }
  });
  
  return objectTracks;
};

export const selectCharacterEmotionsMapped = state => {
  if (!state.character.activeCharacterId) return null;
  
  const character = state.character.characters[state.character.activeCharacterId];
  if (!character) return null;
  
  // Map valence/arousal to discrete emotions
  const { valence, arousal } = character.emotionalState;
  
  // This is a simplified emotion mapping based on the circumplex model
  if (valence > 0.5 && arousal > 0.5) return 'excited';
  if (valence > 0.5 && arousal < -0.5) return 'relaxed';
  if (valence < -0.5 && arousal > 0.5) return 'angry';
  if (valence < -0.5 && arousal < -0.5) return 'sad';
  if (valence > 0.5 && Math.abs(arousal) <= 0.5) return 'happy';
  if (valence < -0.5 && Math.abs(arousal) <= 0.5) return 'unhappy';
  if (Math.abs(valence) <= 0.5 && arousal > 0.5) return 'alert';
  if (Math.abs(valence) <= 0.5 && arousal < -0.5) return 'tired';
  
  return 'neutral';
};
