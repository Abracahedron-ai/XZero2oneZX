// store/index.js - Redux store configuration

import { configureStore } from '@reduxjs/toolkit';
import viewportReducer from './slices/viewportSlice';
import selectionReducer from './slices/selectionSlice';
import hierarchyReducer from './slices/hierarchySlice';
import propertyReducer from './slices/propertySlice';
import assetReducer from './slices/assetSlice';
import timelineReducer from './slices/timelineSlice';
import characterReducer from './slices/characterSlice';
import aiAgentReducer from './slices/aiAgentSlice';

const store = configureStore({
  reducer: {
    viewport: viewportReducer,
    selection: selectionReducer,
    hierarchy: hierarchyReducer,
    property: propertyReducer,
    asset: assetReducer,
    timeline: timelineReducer,
    character: characterReducer,
    aiAgent: aiAgentReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false, // Allows non-serializable values in state
      immutableCheck: { warnAfter: 128 }, // Performance optimization for large states
    }),
});

export default store;

// Type definitions for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
