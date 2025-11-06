// HierarchyEditor.js - Component for managing the scene hierarchy

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectSceneGraph, 
  selectSelectedObjects, 
  selectExpandedNodes,
  selectVisibilityStates,
  selectLockStates
} from '../../store/selectors';
import { 
  setSelectedObjects, 
  toggleSelection, 
  clearSelection 
} from '../../store/actions';

import './HierarchyEditor.css';

// Icons for the hierarchy editor
import { 
  MdKeyboardArrowRight, // Collapsed
  MdKeyboardArrowDown, // Expanded
  MdVisibility, // Visible
  MdVisibilityOff, // Hidden
  MdLock, // Locked
  MdLockOpen, // Unlocked
  MdSearch, // Search
  MdFilterList, // Filter
  MdAdd, // Add
  MdContentCopy, // Duplicate
  MdDelete, // Delete
  MdGroup, // Group
  MdContentCut, // Cut
  MdContentCopy as MdCopy, // Copy
  MdContentPaste, // Paste
  MdEdit, // Rename
} from 'react-icons/md';

// Node type icons
import {
  MdCube, // Default / Unknown
  MdAnimation, // Animated object
  MdGroup as MdGroupObject, // Group
  MdLightbulb, // Light
  MdCamera, // Camera
  MdTextFields, // Text
  MdPerson, // Character
  MdImage, // Image/Plane
  MdTerrain, // Terrain/Environment
} from 'react-icons/md';

// Helper function to get icon for node type
const getNodeTypeIcon = (nodeType) => {
  switch (nodeType) {
    case 'group':
      return <MdGroupObject />;
    case 'light':
      return <MdLightbulb />;
    case 'camera':
      return <MdCamera />;
    case 'text':
      return <MdTextFields />;
    case 'character':
      return <MdPerson />;
    case 'image':
    case 'plane':
      return <MdImage />;
    case 'terrain':
    case 'environment':
      return <MdTerrain />;
    case 'animated':
      return <MdAnimation />;
    default:
      return <MdCube />;
  }
};

// TreeNode component for rendering a single node in the hierarchy
const TreeNode = ({ 
  node, 
  level, 
  selectedObjects, 
  expandedNodes, 
  visibilityStates, 
  lockStates,
  onSelect, 
  onToggleExpand, 
  onToggleVisibility, 
  onToggleLock, 
  onContextMenu 
}) => {
  // Check if this node is selected
  const isSelected = selectedObjects.includes(node.id);
  
  // Check if this node is expanded (if it has children)
  const isExpanded = node.children && node.children.length > 0 ? 
    expandedNodes.includes(node.id) : false;
  
  // Get visibility and lock states
  const isVisible = visibilityStates[node.id] !== false; // Default to visible
  const isLocked = lockStates[node.id] === true; // Default to unlocked
  
  // Calculate indent based on level
  const indent = level * 20; // 20px per level
  
  // Handle selection click
  const handleSelectClick = (e) => {
    // If Ctrl key is pressed, toggle selection
    if (e.ctrlKey || e.metaKey) {
      onToggleSelect(node.id);
    } else {
      // Otherwise, select only this node
      onSelect(node.id);
    }
    
    // Prevent event from bubbling up
    e.stopPropagation();
  };
  
  // Handle expand toggle click
  const handleExpandToggleClick = (e) => {
    if (node.children && node.children.length > 0) {
      onToggleExpand(node.id);
    }
    
    // Prevent event from bubbling up
    e.stopPropagation();
  };
  
  // Handle visibility toggle click
  const handleVisibilityToggleClick = (e) => {
    onToggleVisibility(node.id);
    
    // Prevent event from bubbling up
    e.stopPropagation();
  };
  
  // Handle lock toggle click
  const handleLockToggleClick = (e) => {
    onToggleLock(node.id);
    
    // Prevent event from bubbling up
    e.stopPropagation();
  };
  
  // Handle right-click context menu
  const handleContextMenuClick = (e) => {
    // If the node is not selected, select it
    if (!isSelected) {
      onSelect(node.id);
    }
    
    onContextMenu(e, node);
    
    // Prevent the default context menu
    e.preventDefault();
  };
  
  return (
    <div className={`hierarchy-node ${isSelected ? 'selected' : ''}`}>
      {/* Node row with indent */}
      <div 
        className="node-row"
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleSelectClick}
        onContextMenu={handleContextMenuClick}
      >
        {/* Expand/collapse button (only for nodes with children) */}
        <div 
          className={`expand-toggle ${node.children && node.children.length > 0 ? '' : 'hidden'}`}
          onClick={handleExpandToggleClick}
        >
          {isExpanded ? <MdKeyboardArrowDown /> : <MdKeyboardArrowRight />}
        </div>
        
        {/* Node type icon */}
        <div className="node-icon">
          {getNodeTypeIcon(node.type)}
        </div>
        
        {/* Node name */}
        <div className="node-name">
          {node.name}
        </div>
        
        {/* Node controls */}
        <div className="node-controls">
          {/* Visibility toggle */}
          <div 
            className={`control-button ${isVisible ? '' : 'active'}`}
            onClick={handleVisibilityToggleClick}
            title={isVisible ? 'Hide' : 'Show'}
          >
            {isVisible ? <MdVisibility /> : <MdVisibilityOff />}
          </div>
          
          {/* Lock toggle */}
          <div 
            className={`control-button ${isLocked ? 'active' : ''}`}
            onClick={handleLockToggleClick}
            title={isLocked ? 'Unlock' : 'Lock'}
          >
            {isLocked ? <MdLock /> : <MdLockOpen />}
          </div>
        </div>
      </div>
      
      {/* Child nodes (if expanded) */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="child-nodes">
          {node.children.map(childId => {
            const childNode = /* Logic to find child node by ID */;
            if (childNode) {
              return (
                <TreeNode 
                  key={childId}
                  node={childNode}
                  level={level + 1}
                  selectedObjects={selectedObjects}
                  expandedNodes={expandedNodes}
                  visibilityStates={visibilityStates}
                  lockStates={lockStates}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  onToggleVisibility={onToggleVisibility}
                  onToggleLock={onToggleLock}
                  onContextMenu={onContextMenu}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

// ContextMenu component for right-click actions
const ContextMenu = ({ 
  isVisible, 
  position, 
  node, 
  onRename, 
  onDuplicate, 
  onDelete, 
  onGroup, 
  onCut, 
  onCopy, 
  onPaste,
  onClose 
}) => {
  if (!isVisible) return null;
  
  return (
    <div 
      className="hierarchy-context-menu" 
      style={{ 
        top: position.y, 
        left: position.x 
      }}
    >
      <div className="context-menu-item" onClick={() => onRename(node)}>
        <MdEdit />
        <span>Rename</span>
      </div>
      <div className="context-menu-item" onClick={() => onDuplicate(node)}>
        <MdContentCopy />
        <span>Duplicate</span>
      </div>
      <div className="context-menu-item" onClick={() => onGroup(node)}>
        <MdGroup />
        <span>Group</span>
      </div>
      <div className="context-menu-separator" />
      <div className="context-menu-item" onClick={() => onCut(node)}>
        <MdContentCut />
        <span>Cut</span>
      </div>
      <div className="context-menu-item" onClick={() => onCopy(node)}>
        <MdCopy />
        <span>Copy</span>
      </div>
      <div className="context-menu-item" onClick={() => onPaste(node)}>
        <MdContentPaste />
        <span>Paste</span>
      </div>
      <div className="context-menu-separator" />
      <div className="context-menu-item delete" onClick={() => onDelete(node)}>
        <MdDelete />
        <span>Delete</span>
      </div>
    </div>
  );
};

// Main HierarchyEditor component
const HierarchyEditor = ({ width = 250, height = '100%' }) => {
  const dispatch = useDispatch();
  
  // Get data from Redux
  const sceneGraph = useSelector(selectSceneGraph);
  const selectedObjects = useSelector(selectSelectedObjects);
  const expandedNodes = useSelector(selectExpandedNodes);
  const visibilityStates = useSelector(selectVisibilityStates);
  const lockStates = useSelector(selectLockStates);
  
  // Component state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    showHidden: false,
    showLocked: true,
  });
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    node: null,
  });
  const [clipboard, setClipboard] = useState({
    type: null, // 'cut' or 'copy'
    nodeIds: [],
  });
  
  // Handle node selection
  const handleNodeSelect = (nodeId) => {
    dispatch(setSelectedObjects([nodeId]));
  };
  
  // Handle node selection toggle
  const handleNodeToggleSelect = (nodeId) => {
    dispatch(toggleSelection(nodeId));
  };
  
  // Handle node expansion toggle
  const handleNodeToggleExpand = (nodeId) => {
    // This would dispatch an action to toggle expansion in a real app
    console.log('Toggle expand', nodeId);
  };
  
  // Handle node visibility toggle
  const handleNodeToggleVisibility = (nodeId) => {
    // This would dispatch an action to toggle visibility in a real app
    console.log('Toggle visibility', nodeId);
  };
  
  // Handle node lock toggle
  const handleNodeToggleLock = (nodeId) => {
    // This would dispatch an action to toggle lock in a real app
    console.log('Toggle lock', nodeId);
  };
  
  // Handle context menu
  const handleContextMenu = (e, node) => {
    e.preventDefault();
    
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      node,
    });
    
    // Add event listener to close context menu when clicking outside
    document.addEventListener('click', handleCloseContextMenu);
  };
  
  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu({
      visible: false,
      position: { x: 0, y: 0 },
      node: null,
    });
    
    document.removeEventListener('click', handleCloseContextMenu);
  };
  
  // Context menu actions
  const handleRename = (node) => {
    // This would dispatch an action to rename the node in a real app
    console.log('Rename', node);
    handleCloseContextMenu();
  };
  
  const handleDuplicate = (node) => {
    // This would dispatch an action to duplicate the node in a real app
    console.log('Duplicate', node);
    handleCloseContextMenu();
  };
  
  const handleDelete = (node) => {
    // This would dispatch an action to delete the node in a real app
    console.log('Delete', node);
    handleCloseContextMenu();
  };
  
  const handleGroup = (node) => {
    // This would dispatch an action to create a group in a real app
    console.log('Group', node);
    handleCloseContextMenu();
  };
  
  const handleCut = (node) => {
    // Set clipboard
    setClipboard({
      type: 'cut',
      nodeIds: selectedObjects.length > 0 ? selectedObjects : [node.id],
    });
    
    console.log('Cut', node);
    handleCloseContextMenu();
  };
  
  const handleCopy = (node) => {
    // Set clipboard
    setClipboard({
      type: 'copy',
      nodeIds: selectedObjects.length > 0 ? selectedObjects : [node.id],
    });
    
    console.log('Copy', node);
    handleCloseContextMenu();
  };
  
  const handlePaste = (node) => {
    if (clipboard.nodeIds.length === 0) return;
    
    // This would dispatch an action to paste nodes in a real app
    console.log('Paste', node, clipboard);
    handleCloseContextMenu();
  };
  
  // Filter nodes based on search term and filter options
  const filterNodes = (nodes) => {
    if (!nodes) return [];
    
    return nodes.filter(node => {
      // Filter by search term
      if (searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by visibility
      if (!filterOptions.showHidden && visibilityStates[node.id] === false) {
        return false;
      }
      
      // Filter by lock state
      if (!filterOptions.showLocked && lockStates[node.id] === true) {
        return false;
      }
      
      return true;
    });
  };
  
  // Get filtered root nodes
  const filteredRootNodes = filterNodes(sceneGraph?.rootNodes);
  
  // Clean up event listeners when unmounting
  useEffect(() => {
    return () => {
      document.removeEventListener('click', handleCloseContextMenu);
    };
  }, []);
  
  // Mock data for demonstration (in a real app, this would come from Redux)
  const mockSceneGraph = {
    rootNodes: [
      {
        id: 'root-1',
        name: 'Scene',
        type: 'group',
        children: ['node-1', 'node-2', 'node-3'],
      },
    ],
    nodes: {
      'root-1': {
        id: 'root-1',
        name: 'Scene',
        type: 'group',
        children: ['node-1', 'node-2', 'node-3'],
      },
      'node-1': {
        id: 'node-1',
        name: 'Camera',
        type: 'camera',
        children: [],
      },
      'node-2': {
        id: 'node-2',
        name: 'Lights',
        type: 'group',
        children: ['node-4', 'node-5'],
      },
      'node-3': {
        id: 'node-3',
        name: 'Character',
        type: 'character',
        children: [],
      },
      'node-4': {
        id: 'node-4',
        name: 'Main Light',
        type: 'light',
        children: [],
      },
      'node-5': {
        id: 'node-5',
        name: 'Fill Light',
        type: 'light',
        children: [],
      },
    },
  };
  
  const mockExpandedNodes = ['root-1', 'node-2'];
  
  return (
    <div className="hierarchy-editor" style={{ width, height }}>
      <div className="hierarchy-header">
        <h2>Hierarchy</h2>
        <div className="header-controls">
          <button className="header-button" title="Add Object">
            <MdAdd />
          </button>
          <button className="header-button" title="Filter Options">
            <MdFilterList />
          </button>
        </div>
      </div>
      
      <div className="search-bar">
        <div className="search-input">
          <MdSearch className="search-icon" />
          <input 
            type="text"
            placeholder="Search objects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="hierarchy-content">
        {mockSceneGraph.rootNodes.map(node => (
          <TreeNode 
            key={node.id}
            node={node}
            level={0}
            selectedObjects={selectedObjects}
            expandedNodes={mockExpandedNodes}
            visibilityStates={visibilityStates || {}}
            lockStates={lockStates || {}}
            onSelect={handleNodeSelect}
            onToggleSelect={handleNodeToggleSelect}
            onToggleExpand={handleNodeToggleExpand}
            onToggleVisibility={handleNodeToggleVisibility}
            onToggleLock={handleNodeToggleLock}
            onContextMenu={handleContextMenu}
          />
        ))}
        
        {/* Show if no nodes or no search results */}
        {(!mockSceneGraph.rootNodes || mockSceneGraph.rootNodes.length === 0 || 
          (searchTerm && filteredRootNodes.length === 0)) && (
          <div className="no-nodes">
            {searchTerm ? 'No matching objects found.' : 'Scene is empty.'}
          </div>
        )}
      </div>
      
      {/* Context menu */}
      <ContextMenu 
        isVisible={contextMenu.visible}
        position={contextMenu.position}
        node={contextMenu.node}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onGroup={handleGroup}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
};

export default HierarchyEditor;
