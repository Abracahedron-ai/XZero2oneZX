// ViewportInfo.js - Information overlay for the viewport

import React from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedObjects, selectViewMode, selectTransformMode } from '../../store/selectors';

const ViewportInfo = ({ stats }) => {
  const selectedObjects = useSelector(selectSelectedObjects);
  const viewMode = useSelector(selectViewMode);
  const transformMode = useSelector(selectTransformMode);
  
  // Format mode names for display
  const formatMode = (mode) => {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };
  
  return (
    <div className="viewport-info">
      <div>
        <span className="label">FPS:</span>
        <span className="value">{stats.fps}</span>
      </div>
      <div>
        <span className="label">Triangles:</span>
        <span className="value">{stats.triangles.toLocaleString()}</span>
      </div>
      <div>
        <span className="label">Draw Calls:</span>
        <span className="value">{stats.drawCalls}</span>
      </div>
      <div>
        <span className="label">View:</span>
        <span className="value">{formatMode(viewMode)}</span>
      </div>
      <div>
        <span className="label">Tool:</span>
        <span className="value">{formatMode(transformMode)}</span>
      </div>
      <div>
        <span className="label">Selected:</span>
        <span className="value">{selectedObjects.length > 0 ? selectedObjects.length : 'None'}</span>
      </div>
    </div>
  );
};

export default ViewportInfo;
