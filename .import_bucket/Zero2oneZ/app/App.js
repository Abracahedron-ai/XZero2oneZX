// App.js - Main application component for Zero2oneZ

import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import store from '../store';

// Import components from various modules
import { Viewport } from '../scene_building_tools/viewport';
import { AssetShelf } from '../scene_building_tools/asset_shelf';
import { HierarchyEditor } from '../scene_building_tools/hierarchy_editor';
import { AIAgentManager } from '../ai_agents';

import './App.css';

// Layout configuration component
const LayoutConfig = ({ onApply }) => {
  const [layout, setLayout] = useState({
    showAssetShelf: true,
    showHierarchy: true,
    showAgentManager: true,
    assetShelfWidth: 300,
    hierarchyWidth: 250,
    agentManagerHeight: 300,
  });

  const handleChange = (key, value) => {
    setLayout({
      ...layout,
      [key]: value,
    });
  };

  return (
    <div className="layout-config">
      <h3>Layout Configuration</h3>

      <div className="layout-option">
        <label>
          <input
            type="checkbox"
            checked={layout.showAssetShelf}
            onChange={(e) => handleChange('showAssetShelf', e.target.checked)}
          />
          Show Asset Shelf
        </label>
        {layout.showAssetShelf && (
          <div className="layout-sub-option">
            <label>Width:</label>
            <input
              type="range"
              min="200"
              max="400"
              value={layout.assetShelfWidth}
              onChange={(e) => handleChange('assetShelfWidth', parseInt(e.target.value, 10))}
            />
            <span>{layout.assetShelfWidth}px</span>
          </div>
        )}
      </div>

      <div className="layout-option">
        <label>
          <input
            type="checkbox"
            checked={layout.showHierarchy}
            onChange={(e) => handleChange('showHierarchy', e.target.checked)}
          />
          Show Hierarchy
        </label>
        {layout.showHierarchy && (
          <div className="layout-sub-option">
            <label>Width:</label>
            <input
              type="range"
              min="200"
              max="400"
              value={layout.hierarchyWidth}
              onChange={(e) => handleChange('hierarchyWidth', parseInt(e.target.value, 10))}
            />
            <span>{layout.hierarchyWidth}px</span>
          </div>
        )}
      </div>

      <div className="layout-option">
        <label>
          <input
            type="checkbox"
            checked={layout.showAgentManager}
            onChange={(e) => handleChange('showAgentManager', e.target.checked)}
          />
          Show AI Agent Manager
        </label>
        {layout.showAgentManager && (
          <div className="layout-sub-option">
            <label>Height:</label>
            <input
              type="range"
              min="200"
              max="500"
              value={layout.agentManagerHeight}
              onChange={(e) => handleChange('agentManagerHeight', parseInt(e.target.value, 10))}
            />
            <span>{layout.agentManagerHeight}px</span>
          </div>
        )}
      </div>

      <button className="apply-button" onClick={() => onApply(layout)}>
        Apply Layout
      </button>
    </div>
  );
};

// Main App component
const App = () => {
  const [layoutConfig, setLayoutConfig] = useState({
    showAssetShelf: true,
    showHierarchy: true,
    showAgentManager: true,
    assetShelfWidth: 300,
    hierarchyWidth: 250,
    agentManagerHeight: 300,
  });

  const [showLayoutConfig, setShowLayoutConfig] = useState(false);

  const handleLayoutChange = (newLayout) => {
    setLayoutConfig(newLayout);
    setShowLayoutConfig(false);
  };

  return (
    <Provider store={store}>
      <div className="app-container">
        <header className="app-header">
          <div className="app-logo">Zero2oneZ</div>
          <div className="app-toolbar">
            <button>File</button>
            <button>Edit</button>
            <button>View</button>
            <button>Tools</button>
            <button>Help</button>
          </div>
          <div className="app-actions">
            <button onClick={() => setShowLayoutConfig(!showLayoutConfig)}>
              Layout
            </button>
          </div>
        </header>

        <main className="app-content">
          {/* Layout configuration panel */}
          {showLayoutConfig && (
            <div className="layout-config-container">
              <LayoutConfig onApply={handleLayoutChange} />
            </div>
          )}

          {/* Main layout */}
          <div className="app-layout">
            {/* Left sidebar - Asset Shelf */}
            {layoutConfig.showAssetShelf && (
              <div
                className="app-sidebar left"
                style={{ width: layoutConfig.assetShelfWidth }}
              >
                <AssetShelf width="100%" height="100%" />
              </div>
            )}

            {/* Main content area */}
            <div className="app-main">
              {/* Top area - Viewport */}
              <div className="app-viewport">
                <Viewport width="100%" height="100%" />
              </div>

              {/* Bottom area - Agent Manager (optional) */}
              {layoutConfig.showAgentManager && (
                <div
                  className="app-agent-manager"
                  style={{ height: layoutConfig.agentManagerHeight }}
                >
                  <AIAgentManager width="100%" height="100%" />
                </div>
              )}
            </div>

            {/* Right sidebar - Hierarchy */}
            {layoutConfig.showHierarchy && (
              <div
                className="app-sidebar right"
                style={{ width: layoutConfig.hierarchyWidth }}
              >
                <HierarchyEditor width="100%" height="100%" />
              </div>
            )}
          </div>
        </main>

        <footer className="app-footer">
          <div className="app-status">Ready</div>
          <div className="app-info">Version 0.1.0</div>
        </footer>
      </div>
    </Provider>
  );
};

export default App;
