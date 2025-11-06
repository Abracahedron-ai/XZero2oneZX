// store/slices/viewportSlice.js - Redux slice for viewport state

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  transformMode: 'select', // select, translate, rotate, scale
  viewMode: 'perspective', // perspective, orthographic
  renderMode: 'textured', // wireframe, solid, textured, rendered
  cameraType: 'perspective', // perspective, orthographic, user
  cameraPosition: { x: 5, y: 5, z: 5 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  gridVisible: true,
  gridSize: 20,
  gridDivisions: 20,
  axesVisible: true,
  wireframeMode: false,
  safeFrameVisible: false,
  ambientLight: { color: 0xffffff, intensity: 0.5 },
  directionalLight: { 
    color: 0xffffff, 
    intensity: 0.8,
    position: { x: 10, y: 10, z: 10 },
    castShadow: true
  },
};

export const viewportSlice = createSlice({
  name: 'viewport',
  initialState,
  reducers: {
    setTransformMode: (state, action) => {
      state.transformMode = action.payload;
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    setRenderMode: (state, action) => {
      state.renderMode = action.payload;
    },
    setCameraType: (state, action) => {
      state.cameraType = action.payload;
    },
    setCameraPosition: (state, action) => {
      state.cameraPosition = action.payload;
    },
    setCameraTarget: (state, action) => {
      state.cameraTarget = action.payload;
    },
    toggleGrid: (state) => {
      state.gridVisible = !state.gridVisible;
    },
    setGridSettings: (state, action) => {
      const { size, divisions } = action.payload;
      state.gridSize = size || state.gridSize;
      state.gridDivisions = divisions || state.gridDivisions;
    },
    toggleAxes: (state) => {
      state.axesVisible = !state.axesVisible;
    },
    toggleWireframe: (state) => {
      state.wireframeMode = !state.wireframeMode;
    },
    toggleSafeFrame: (state) => {
      state.safeFrameVisible = !state.safeFrameVisible;
    },
    setAmbientLight: (state, action) => {
      state.ambientLight = { ...state.ambientLight, ...action.payload };
    },
    setDirectionalLight: (state, action) => {
      state.directionalLight = { ...state.directionalLight, ...action.payload };
    },
    resetView: (state) => {
      state.cameraPosition = initialState.cameraPosition;
      state.cameraTarget = initialState.cameraTarget;
    },
  },
});

export const {
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
} = viewportSlice.actions;

export default viewportSlice.reducer;
