// ViewportToolbar.js - Toolbar for viewport controls

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setTransformMode, 
  setViewMode, 
  toggleGrid,
  toggleAxes,
  toggleWireframe
} from '../../store/actions';
import { 
  selectTransformMode, 
  selectViewMode, 
  selectGridVisible,
  selectAxesVisible,
  selectWireframeMode
} from '../../store/selectors';

// Import icons for buttons
import { 
  MdOutlineGpsFixed, // Select
  MdOutlineOpenWith, // Move
  MdOutlineRotateRight, // Rotate
  MdOutlineZoomOutMap, // Scale
  MdGridOn, // Grid
  MdTimeline, // Axes
  Md3DRotation, // Perspective
  MdViewQuilt, // Orthographic
  MdGrid4X4, // Wireframe
  MdLooks, // Shaded
  MdBrush, // Textured
  MdLightbulb, // Rendered
} from 'react-icons/md';

const ViewportToolbar = () => {
  const dispatch = useDispatch();
  
  // Get current states from Redux
  const transformMode = useSelector(selectTransformMode);
  const viewMode = useSelector(selectViewMode);
  const gridVisible = useSelector(selectGridVisible);
  const axesVisible = useSelector(selectAxesVisible);
  const wireframeMode = useSelector(selectWireframeMode);
  
  // Transform mode handlers
  const handleSelectMode = () => dispatch(setTransformMode('select'));
  const handleMoveMode = () => dispatch(setTransformMode('translate'));
  const handleRotateMode = () => dispatch(setTransformMode('rotate'));
  const handleScaleMode = () => dispatch(setTransformMode('scale'));
  
  // View mode handlers
  const handlePerspectiveView = () => dispatch(setViewMode('perspective'));
  const handleOrthographicView = () => dispatch(setViewMode('orthographic'));
  
  // Display option handlers
  const handleToggleGrid = () => dispatch(toggleGrid());
  const handleToggleAxes = () => dispatch(toggleAxes());
  const handleToggleWireframe = () => dispatch(toggleWireframe());
  
  // Shading mode handlers
  const handleWireframeMode = () => dispatch(setViewMode('wireframe'));
  const handleShadedMode = () => dispatch(setViewMode('solid'));
  const handleTexturedMode = () => dispatch(setViewMode('textured'));
  const handleRenderedMode = () => dispatch(setViewMode('rendered'));
  
  return (
    <div className="viewport-toolbar">
      {/* Transform tools */}
      <button 
        className={transformMode === 'select' ? 'active' : ''} 
        onClick={handleSelectMode}
        title="Select (Q)"
      >
        <MdOutlineGpsFixed />
      </button>
      <button 
        className={transformMode === 'translate' ? 'active' : ''} 
        onClick={handleMoveMode}
        title="Move (W)"
      >
        <MdOutlineOpenWith />
      </button>
      <button 
        className={transformMode === 'rotate' ? 'active' : ''} 
        onClick={handleRotateMode}
        title="Rotate (E)"
      >
        <MdOutlineRotateRight />
      </button>
      <button 
        className={transformMode === 'scale' ? 'active' : ''} 
        onClick={handleScaleMode}
        title="Scale (R)"
      >
        <MdOutlineZoomOutMap />
      </button>
      
      <div className="separator"></div>
      
      {/* View modes */}
      <button 
        className={viewMode === 'perspective' ? 'active' : ''} 
        onClick={handlePerspectiveView}
        title="Perspective View"
      >
        <Md3DRotation />
      </button>
      <button 
        className={viewMode === 'orthographic' ? 'active' : ''} 
        onClick={handleOrthographicView}
        title="Orthographic View"
      >
        <MdViewQuilt />
      </button>
      
      <div className="separator"></div>
      
      {/* Display options */}
      <button 
        className={gridVisible ? 'active' : ''} 
        onClick={handleToggleGrid}
        title="Toggle Grid"
      >
        <MdGridOn />
      </button>
      <button 
        className={axesVisible ? 'active' : ''} 
        onClick={handleToggleAxes}
        title="Toggle Axes"
      >
        <MdTimeline />
      </button>
      <button 
        className={wireframeMode ? 'active' : ''} 
        onClick={handleToggleWireframe}
        title="Toggle Wireframe"
      >
        <MdGrid4X4 />
      </button>
      
      <div className="separator"></div>
      
      {/* Shading modes */}
      <button 
        className={viewMode === 'wireframe' ? 'active' : ''} 
        onClick={handleWireframeMode}
        title="Wireframe Mode"
      >
        <MdGrid4X4 />
      </button>
      <button 
        className={viewMode === 'solid' ? 'active' : ''} 
        onClick={handleShadedMode}
        title="Shaded Mode"
      >
        <MdLooks />
      </button>
      <button 
        className={viewMode === 'textured' ? 'active' : ''} 
        onClick={handleTexturedMode}
        title="Textured Mode"
      >
        <MdBrush />
      </button>
      <button 
        className={viewMode === 'rendered' ? 'active' : ''} 
        onClick={handleRenderedMode}
        title="Rendered Mode"
      >
        <MdLightbulb />
      </button>
    </div>
  );
};

export default ViewportToolbar;
