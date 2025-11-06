// store/slices/selectionSlice.js - Redux slice for selection state

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedObjects: [], // Array of selected object IDs
  lastSelectedObject: null, // ID of the last selected object
  selectionMode: 'single', // single, additive, toggle
  selectionSets: {}, // Named selection sets { "set1": ["obj1", "obj2"] }
  selectionHistory: [], // History of selections for undo/redo
  hoveredObject: null, // Currently hovered object ID
  isolatedObjects: [], // Objects that are isolated (only visible ones)
  selectionBounds: null, // Bounding box of selected objects
};

export const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    setSelectedObjects: (state, action) => {
      // Save the current selection to history if it's different
      if (state.selectedObjects.length > 0 && 
          JSON.stringify(state.selectedObjects) !== JSON.stringify(action.payload)) {
        state.selectionHistory.push([...state.selectedObjects]);
        // Limit history size
        if (state.selectionHistory.length > 20) {
          state.selectionHistory.shift();
        }
      }
      
      state.selectedObjects = action.payload;
      if (action.payload.length > 0) {
        state.lastSelectedObject = action.payload[action.payload.length - 1];
      } else {
        state.lastSelectedObject = null;
      }
    },
    addToSelection: (state, action) => {
      // Add to selection if not already selected
      if (!state.selectedObjects.includes(action.payload)) {
        // Save the current selection to history
        state.selectionHistory.push([...state.selectedObjects]);
        
        state.selectedObjects.push(action.payload);
        state.lastSelectedObject = action.payload;
      }
    },
    removeFromSelection: (state, action) => {
      if (state.selectedObjects.includes(action.payload)) {
        // Save the current selection to history
        state.selectionHistory.push([...state.selectedObjects]);
        
        state.selectedObjects = state.selectedObjects.filter(id => id !== action.payload);
        if (state.lastSelectedObject === action.payload) {
          state.lastSelectedObject = state.selectedObjects.length > 0 ? 
            state.selectedObjects[state.selectedObjects.length - 1] : null;
        }
      }
    },
    toggleSelection: (state, action) => {
      // Save the current selection to history
      state.selectionHistory.push([...state.selectedObjects]);
      
      // Toggle the selection state of the object
      if (state.selectedObjects.includes(action.payload)) {
        state.selectedObjects = state.selectedObjects.filter(id => id !== action.payload);
        if (state.lastSelectedObject === action.payload) {
          state.lastSelectedObject = state.selectedObjects.length > 0 ? 
            state.selectedObjects[state.selectedObjects.length - 1] : null;
        }
      } else {
        state.selectedObjects.push(action.payload);
        state.lastSelectedObject = action.payload;
      }
    },
    setSelectionMode: (state, action) => {
      state.selectionMode = action.payload;
    },
    clearSelection: (state) => {
      // Save the current selection to history if not empty
      if (state.selectedObjects.length > 0) {
        state.selectionHistory.push([...state.selectedObjects]);
      }
      
      state.selectedObjects = [];
      state.lastSelectedObject = null;
    },
    createSelectionSet: (state, action) => {
      const { name, objects } = action.payload;
      state.selectionSets[name] = objects || [...state.selectedObjects];
    },
    deleteSelectionSet: (state, action) => {
      const setName = action.payload;
      if (state.selectionSets[setName]) {
        delete state.selectionSets[setName];
      }
    },
    selectFromSet: (state, action) => {
      const setName = action.payload;
      if (state.selectionSets[setName]) {
        // Save the current selection to history
        state.selectionHistory.push([...state.selectedObjects]);
        
        state.selectedObjects = [...state.selectionSets[setName]];
        state.lastSelectedObject = state.selectedObjects.length > 0 ? 
          state.selectedObjects[state.selectedObjects.length - 1] : null;
      }
    },
    setHoveredObject: (state, action) => {
      state.hoveredObject = action.payload;
    },
    isolateObjects: (state, action) => {
      state.isolatedObjects = action.payload || [...state.selectedObjects];
    },
    clearIsolation: (state) => {
      state.isolatedObjects = [];
    },
    undoSelection: (state) => {
      if (state.selectionHistory.length > 0) {
        const previousSelection = state.selectionHistory.pop();
        state.selectedObjects = previousSelection;
        state.lastSelectedObject = previousSelection.length > 0 ? 
          previousSelection[previousSelection.length - 1] : null;
      }
    },
    setSelectionBounds: (state, action) => {
      state.selectionBounds = action.payload;
    },
  },
});

export const {
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
} = selectionSlice.actions;

export default selectionSlice.reducer;
