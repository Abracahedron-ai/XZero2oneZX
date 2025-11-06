// AssetShelf.js - Component for browsing and selecting assets

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectAssetCategories, 
  selectAssetLibrary, 
  selectFavoriteAssets, 
  selectRecentAssets 
} from '../../store/selectors';
import { importAsset, addObject } from '../../store/actions';

import './AssetShelf.css';

// Icons for different asset types
import { 
  MdModel3D, // 3D models
  MdTexture, // Textures
  MdAnimation, // Animations
  MdPerson, // Characters
  MdLightbulb, // Lights
  MdCamera, // Cameras
  MdTerrain, // Environments
  MdAudiotrack, // Audio
  MdSmartToy, // Props
  MdFavorite, // Favorites
  MdHistory, // Recent
  MdSearch, // Search
  MdFilterList, // Filter
  MdAdd, // Add
  MdMoreVert, // More options
} from 'react-icons/md';

// Asset type icons mapping
const AssetTypeIcon = ({ type }) => {
  switch (type) {
    case 'model':
      return <MdModel3D />;
    case 'texture':
      return <MdTexture />;
    case 'animation':
      return <MdAnimation />;
    case 'character':
      return <MdPerson />;
    case 'light':
      return <MdLightbulb />;
    case 'camera':
      return <MdCamera />;
    case 'environment':
      return <MdTerrain />;
    case 'audio':
      return <MdAudiotrack />;
    case 'prop':
      return <MdSmartToy />;
    default:
      return <MdModel3D />;
  }
};

// Asset Item component
const AssetItem = ({ asset, onSelect, onContextMenu }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetId: asset.id,
      assetType: asset.type,
    }));
  };
  
  return (
    <div 
      className="asset-item"
      onClick={() => onSelect(asset)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, asset);
      }}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="asset-thumbnail">
        {asset.thumbnail ? (
          <img src={asset.thumbnail} alt={asset.name} />
        ) : (
          <div className="asset-icon">
            <AssetTypeIcon type={asset.type} />
          </div>
        )}
      </div>
      <div className="asset-info">
        <div className="asset-name">{asset.name}</div>
        <div className="asset-type">{asset.type}</div>
      </div>
    </div>
  );
};

// Asset category selector
const CategorySelector = ({ categories, activeCategory, onSelectCategory }) => {
  return (
    <div className="category-selector">
      <div 
        className={`category-item ${activeCategory === 'favorites' ? 'active' : ''}`}
        onClick={() => onSelectCategory('favorites')}
      >
        <MdFavorite />
        <span>Favorites</span>
      </div>
      
      <div 
        className={`category-item ${activeCategory === 'recent' ? 'active' : ''}`}
        onClick={() => onSelectCategory('recent')}
      >
        <MdHistory />
        <span>Recent</span>
      </div>
      
      {categories.map(category => (
        <div 
          key={category.id}
          className={`category-item ${activeCategory === category.id ? 'active' : ''}`}
          onClick={() => onSelectCategory(category.id)}
        >
          <AssetTypeIcon type={category.type} />
          <span>{category.name}</span>
        </div>
      ))}
    </div>
  );
};

// Search and filter bar
const SearchBar = ({ searchTerm, onSearchChange, onFilterClick }) => {
  return (
    <div className="search-bar">
      <div className="search-input">
        <MdSearch className="search-icon" />
        <input 
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <button className="filter-button" onClick={onFilterClick}>
        <MdFilterList />
      </button>
    </div>
  );
};

// Context menu for asset items
const AssetContextMenu = ({ 
  isVisible, 
  position, 
  asset, 
  onAddToScene, 
  onAddToFavorites, 
  onDuplicate, 
  onDelete, 
  onClose 
}) => {
  if (!isVisible) return null;
  
  return (
    <div 
      className="asset-context-menu" 
      style={{ 
        top: position.y, 
        left: position.x 
      }}
    >
      <div className="context-menu-item" onClick={() => onAddToScene(asset)}>
        <MdAdd />
        <span>Add to Scene</span>
      </div>
      <div className="context-menu-item" onClick={() => onAddToFavorites(asset)}>
        <MdFavorite />
        <span>Add to Favorites</span>
      </div>
      <div className="context-menu-item" onClick={() => onDuplicate(asset)}>
        <MdAdd />
        <span>Duplicate</span>
      </div>
      <div className="context-menu-item delete" onClick={() => onDelete(asset)}>
        <MdAdd />
        <span>Delete</span>
      </div>
    </div>
  );
};

// Main AssetShelf component
const AssetShelf = ({ width = 300, height = '100%' }) => {
  const dispatch = useDispatch();
  
  // Get asset data from Redux
  const categories = useSelector(selectAssetCategories);
  const assetLibrary = useSelector(selectAssetLibrary);
  const favoriteAssets = useSelector(selectFavoriteAssets);
  const recentAssets = useSelector(selectRecentAssets);
  
  // Component state
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortOrder, setSortOrder] = useState('name'); // name, type, date
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    asset: null,
  });
  
  // Filter assets based on active category and search term
  const getFilteredAssets = () => {
    let filteredAssets = [];
    
    if (activeCategory === 'favorites') {
      filteredAssets = favoriteAssets.map(id => assetLibrary[id]).filter(Boolean);
    } else if (activeCategory === 'recent') {
      filteredAssets = recentAssets.map(id => assetLibrary[id]).filter(Boolean);
    } else if (activeCategory === 'all') {
      filteredAssets = Object.values(assetLibrary);
    } else {
      // Filter by category
      filteredAssets = Object.values(assetLibrary).filter(
        asset => asset.category === activeCategory
      );
    }
    
    // Apply search filter if there's a search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filteredAssets = filteredAssets.filter(asset => 
        asset.name.toLowerCase().includes(term) || 
        asset.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Apply sorting
    filteredAssets.sort((a, b) => {
      if (sortOrder === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortOrder === 'type') {
        return a.type.localeCompare(b.type);
      } else if (sortOrder === 'date') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });
    
    return filteredAssets;
  };
  
  // Get assets to display
  const displayedAssets = getFilteredAssets();
  
  // Event handlers
  const handleAssetSelect = (asset) => {
    // Add the asset to the scene
    if (asset.type === 'model' || asset.type === 'character' || asset.type === 'prop') {
      dispatch(addObject(asset.type, { assetId: asset.id }));
    } else if (asset.type === 'texture' || asset.type === 'material') {
      // Apply to selected object(s)
      console.log('Apply texture/material to selected objects', asset);
    } else {
      // Import the asset
      dispatch(importAsset(asset));
    }
  };
  
  const handleContextMenu = (e, asset) => {
    e.preventDefault();
    
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      asset,
    });
    
    // Add event listener to close context menu when clicking outside
    document.addEventListener('click', handleCloseContextMenu);
  };
  
  const handleCloseContextMenu = () => {
    setContextMenu({
      visible: false,
      position: { x: 0, y: 0 },
      asset: null,
    });
    
    document.removeEventListener('click', handleCloseContextMenu);
  };
  
  const handleAddToScene = (asset) => {
    handleAssetSelect(asset);
    handleCloseContextMenu();
  };
  
  const handleAddToFavorites = (asset) => {
    // This would dispatch an action to add to favorites in a real app
    console.log('Add to favorites', asset);
    handleCloseContextMenu();
  };
  
  const handleDuplicate = (asset) => {
    // This would dispatch an action to duplicate the asset in a real app
    console.log('Duplicate asset', asset);
    handleCloseContextMenu();
  };
  
  const handleDelete = (asset) => {
    // This would dispatch an action to delete the asset in a real app
    console.log('Delete asset', asset);
    handleCloseContextMenu();
  };
  
  // Clean up event listeners when unmounting
  useEffect(() => {
    return () => {
      document.removeEventListener('click', handleCloseContextMenu);
    };
  }, []);
  
  return (
    <div className="asset-shelf" style={{ width, height }}>
      <div className="asset-shelf-header">
        <h2>Assets</h2>
        <div className="view-options">
          <button 
            className={`view-option ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            Grid
          </button>
          <button 
            className={`view-option ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            List
          </button>
        </div>
      </div>
      
      <SearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterClick={() => console.log('Open filter dialog')}
      />
      
      <div className="asset-shelf-content">
        <CategorySelector 
          categories={categories || []}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />
        
        <div className={`asset-grid ${viewMode}`}>
          {displayedAssets.length > 0 ? (
            displayedAssets.map(asset => (
              <AssetItem 
                key={asset.id}
                asset={asset}
                onSelect={handleAssetSelect}
                onContextMenu={handleContextMenu}
              />
            ))
          ) : (
            <div className="no-assets">
              <p>No assets found.</p>
              {searchTerm ? (
                <button onClick={() => setSearchTerm('')}>Clear search</button>
              ) : null}
            </div>
          )}
        </div>
      </div>
      
      {/* Context menu */}
      <AssetContextMenu 
        isVisible={contextMenu.visible}
        position={contextMenu.position}
        asset={contextMenu.asset}
        onAddToScene={handleAddToScene}
        onAddToFavorites={handleAddToFavorites}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
};

export default AssetShelf;
