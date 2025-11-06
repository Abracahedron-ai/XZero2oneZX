import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical } from 'lucide-react';
import { useCompositor } from '../lib/compositor';

export default function LayerManager() {
  const {
    layers,
    activeLayerId,
    setActiveLayer,
    toggleVisibility,
    updateLayer,
    removeLayer,
    reorderLayers,
  } = useCompositor();

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
    <div className="absolute top-4 right-4 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-2xl">
      <div className="px-4 py-3 border-b border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-100">Layer Manager</h2>
        <p className="text-xs text-zinc-400 mt-1">Z-order (top = front)</p>
      </div>

      <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
        {[...layers].reverse().map((layer, reversedIndex) => {
          const actualIndex = layers.length - 1 - reversedIndex;
          const isActive = layer.id === activeLayerId;

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, actualIndex)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, actualIndex)}
              onClick={() => setActiveLayer(layer.id)}
              className={`
                group flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all
                ${isActive 
                  ? 'bg-blue-600/20 border border-blue-500/50' 
                  : 'bg-zinc-800/50 hover:bg-zinc-700/50 border border-transparent'
                }
              `}
            >
              <GripVertical className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 cursor-grab" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`
                    text-sm font-medium truncate
                    ${isActive ? 'text-blue-300' : 'text-zinc-200'}
                  `}>
                    {layer.name}
                  </span>
                  <span className="text-xs text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">
                    z:{layer.zIndex}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {layer.type} • {Math.round((layer.opacity ?? 1) * 100)}%
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(layer.id);
                  }}
                  className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
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
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-zinc-400" />
                  )}
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
                    title="Delete layer"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                  </button>
                )}
              </div>
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
        <div className="pt-2 border-t border-zinc-800">
          <span className="text-zinc-500">Hotkeys: 1-3 select, Tab cycle, H hide</span>
        </div>
      </div>
    </div>
  );
}
