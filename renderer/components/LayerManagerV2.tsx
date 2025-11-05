import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, Edit3, Sliders } from 'lucide-react';
import { useCompositor } from '../lib/compositor';
import { useState } from 'react';

export default function LayerManagerV2() {
  const {
    layers,
    activeLayerId,
    setActiveLayer,
    updateLayer,
    removeLayer,
    reorderLayers,
    setForwardOpacity,
    setWorkareaOpacity,
    toggleEditMode,
    setEditModeExclusive,
  } = useCompositor();

  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/html'));
    reorderLayers(fromIndex, toIndex);
  };

  return (
    <div className="absolute top-4 right-4 w-96 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-2xl">
      <div className="px-4 py-3 border-b border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-100">Layer Stack (Compositor)</h2>
        <p className="text-xs text-zinc-400 mt-1">Top = front | Drag to reorder</p>
      </div>

      <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
        {[...layers].reverse().map((layer, reversedIndex) => {
          const actualIndex = layers.length - 1 - reversedIndex;
          const isActive = layer.id === activeLayerId;
          const isEditMode = layer.flags?.editMode ?? false;
          const isExpanded = expandedLayerId === layer.id;

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, actualIndex)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, actualIndex)}
              className={`
                group rounded transition-all
                ${isActive 
                  ? 'bg-blue-600/20 border border-blue-500/50' 
                  : 'bg-zinc-800/50 hover:bg-zinc-700/50 border border-transparent'
                }
              `}
            >
              {/* Layer Header */}
              <div
                onClick={() => setActiveLayer(layer.id)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
              >
                <GripVertical className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 cursor-grab" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-blue-300' : 'text-zinc-200'}`}>
                      {layer.name}
                    </span>
                    <span className="text-xs text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">
                      z:{layer.zIndex}
                    </span>
                    {isEditMode && (
                      <span className="text-xs text-green-500 px-1.5 py-0.5 bg-green-900/30 rounded">
                        EDIT
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{layer.type}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !layer.visible });
                    }}
                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  >
                    {layer.visible ? (
                      <Eye className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { locked: !layer.locked });
                    }}
                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  >
                    {layer.locked ? (
                      <Lock className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Unlock className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditModeExclusive(layer.id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      isEditMode
                        ? 'bg-green-900/30 text-green-400'
                        : 'hover:bg-zinc-700 text-zinc-400'
                    }`}
                    title="Toggle edit mode"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedLayerId(isExpanded ? null : layer.id);
                    }}
                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  >
                    <Sliders className="w-4 h-4 text-zinc-400" />
                  </button>

                  {layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${layer.name}"?`)) {
                          removeLayer(layer.id);
                        }
                      }}
                      className="p-1 hover:bg-red-900/30 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Opacity Controls */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-zinc-700 pt-3">
                  {/* Forward Opacity (Camera Output) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-zinc-400">Forward Opacity</label>
                      <span className="text-xs text-zinc-300 font-mono">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layer.opacity * 100}
                      onChange={(e) => setForwardOpacity(layer.id, parseInt(e.target.value) / 100)}
                      className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="text-xs text-zinc-500 mt-1">
                      What viewers see in output
                    </div>
                  </div>

                  {/* Workarea Opacity (Creator View) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-zinc-400">Workarea Opacity</label>
                      <span className="text-xs text-zinc-300 font-mono">
                        {Math.round(layer.workareaOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layer.workareaOpacity * 100}
                      onChange={(e) => setWorkareaOpacity(layer.id, parseInt(e.target.value) / 100)}
                      className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="text-xs text-zinc-500 mt-1">
                      What you see in editor (fade to see behind)
                    </div>
                  </div>

                  {/* Blend Mode */}
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Blend Mode</label>
                    <select
                      value={layer.blendMode}
                      onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value as any })}
                      className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300"
                    >
                      <option value="normal">Normal</option>
                      <option value="add">Add</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                    </select>
                  </div>

                  {/* Capture to Output */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400">Capture to Output</label>
                    <input
                      type="checkbox"
                      checked={layer.captureToOutput}
                      onChange={(e) => updateLayer(layer.id, { captureToOutput: e.target.checked })}
                      className="w-4 h-4 accent-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-zinc-700 text-xs text-zinc-400 space-y-1">
        <div className="flex justify-between">
          <span>Active:</span>
          <span className="text-blue-400 font-medium">
            {layers.find(l => l.id === activeLayerId)?.name || 'None'}
          </span>
        </div>
        <div className="pt-2 border-t border-zinc-800 text-zinc-500">
          Forward = OBS output | Workarea = creator view
        </div>
      </div>
    </div>
  );
}
