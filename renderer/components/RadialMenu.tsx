import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Zap, Box, Target, Wand2, Grid3x3, 
  Clock, Search, X, Check
} from 'lucide-react';
import axios from 'axios';

interface Tool {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  icon: string;
  usage_count: number;
}

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  context: any;
}

const ICON_MAP: Record<string, any> = {
  cpu: Cpu,
  zap: Zap,
  box: Box,
  target: Target,
  wand: Wand2,
  grid: Grid3x3,
  clock: Clock,
  tool: Target,
};

const CATEGORIES = [
  { id: 'modeling', label: 'Modeling', angle: 0 },
  { id: 'ai', label: 'AI', angle: 45 },
  { id: 'rigging', label: 'Rigging', angle: 90 },
  { id: 'animation', label: 'Animation', angle: 135 },
  { id: 'rendering', label: 'Rendering', angle: 180 },
  { id: 'avatar', label: 'Avatar', angle: 225 },
  { id: 'recent', label: 'Recent', angle: 270 },
];

export default function RadialMenu({ isOpen, onClose, context }: RadialMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTools, setRecentTools] = useState<Tool[]>([]);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [avatarEngine, setAvatarEngine] = useState<'audio2face' | 'deep-live-cam' | 'none'>('none');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRecentTools();
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryTools(selectedCategory);
    }
  }, [selectedCategory, context]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchTools(searchQuery);
    } else if (searchQuery.length === 0) {
      setTools([]);
    }
  }, [searchQuery]);

  const fetchRecentTools = async () => {
    try {
      const response = await axios.get('http://localhost:8000/tools/recent?limit=5');
      setRecentTools(response.data);
    } catch (error) {
      console.error('[RadialMenu] Failed to fetch recent tools:', error);
    }
  };

  const fetchCategoryTools = async (category: string) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/category/${category}`,
        { params: { context } }
      );
      setTools(response.data);
    } catch (error) {
      console.error('[RadialMenu] Failed to fetch category tools:', error);
    }
  };

  const searchTools = async (query: string) => {
    try {
      const response = await axios.post('http://localhost:8000/tools/search', {
        query,
        context,
        limit: 10,
      });
      setTools(response.data);
    } catch (error) {
      console.error('[RadialMenu] Search failed:', error);
    }
  };

  const executeTool = async (tool: Tool) => {
    try {
      const response = await axios.post('http://localhost:8000/execute', {
        tool_id: tool.id,
        intent: searchQuery || `Execute ${tool.name}`,
        context,
        params: {},
        user_approved: false,
      });

      if (response.data.requires_approval) {
        // Show intent card
        console.log('[RadialMenu] Requires approval:', response.data.intent_card);
        // TODO: Show approval modal
      } else if (response.data.success) {
        console.log('[RadialMenu] Tool executed successfully:', response.data);
        onClose();
      } else {
        console.error('[RadialMenu] Execution failed:', response.data.error);
      }
    } catch (error) {
      console.error('[RadialMenu] Execution error:', error);
    }
  };

  const toggleAvatarEngine = async (engine: 'audio2face' | 'deep-live-cam' | 'none') => {
    try {
      setAvatarEngine(engine);
      
      // Call API to switch avatar engine
      const endpoint = engine === 'audio2face' 
        ? 'http://localhost:8007/status'
        : engine === 'deep-live-cam'
        ? 'http://localhost:8008/status'
        : null;
      
      if (endpoint) {
        const response = await axios.get(endpoint);
        console.log(`[RadialMenu] Avatar engine switched to ${engine}:`, response.data);
      }
      
      // Emit event to update avatar scene
      window.dispatchEvent(new CustomEvent('avatar-engine-change', {
        detail: { engine }
      }));
    } catch (error) {
      console.error('[RadialMenu] Error switching avatar engine:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative"
        >
          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-600 shadow-2xl flex flex-col items-center justify-center">
            <Search className="w-8 h-8 text-zinc-400 mb-2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-24 text-center text-xs bg-transparent border-none outline-none text-zinc-300 placeholder-zinc-500"
            />
          </div>

          {/* Category Buttons */}
          {CATEGORIES.map((category, index) => {
            const angle = (category.angle * Math.PI) / 180;
            const radius = 200;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const isActive = selectedCategory === category.id;
            const Icon = ICON_MAP[category.id] || Target;

            return (
              <motion.button
                key={category.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(isActive ? null : category.id)}
                className={`
                  absolute top-1/2 left-1/2 w-20 h-20 rounded-full
                  flex flex-col items-center justify-center gap-1
                  transition-all shadow-lg
                  ${isActive 
                    ? 'bg-blue-600 border-2 border-blue-400 text-white' 
                    : 'bg-zinc-800 border-2 border-zinc-600 text-zinc-300 hover:border-zinc-400'
                  }
                `}
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{category.label}</span>
              </motion.button>
            );
          })}

          {/* Avatar Engine Toggles (when avatar category selected) */}
          {selectedCategory === 'avatar' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-8 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-2xl p-4"
            >
              <h3 className="text-sm font-semibold text-zinc-200 mb-3">Avatar Engine</h3>
              <div className="space-y-2">
                <button
                  onClick={() => toggleAvatarEngine('audio2face')}
                  className={`w-full px-3 py-2 rounded border transition-all ${
                    avatarEngine === 'audio2face'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audio2Face</span>
                    {avatarEngine === 'audio2face' && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">NVIDIA Audio2Face 3D SDK</div>
                </button>
                
                <button
                  onClick={() => toggleAvatarEngine('deep-live-cam')}
                  className={`w-full px-3 py-2 rounded border transition-all ${
                    avatarEngine === 'deep-live-cam'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Deep-Live-Cam</span>
                    {avatarEngine === 'deep-live-cam' && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">Real-time face animation</div>
                </button>
                
                <button
                  onClick={() => toggleAvatarEngine('none')}
                  className={`w-full px-3 py-2 rounded border transition-all ${
                    avatarEngine === 'none'
                      ? 'bg-red-600 border-red-400 text-white'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disable</span>
                    {avatarEngine === 'none' && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">Use default avatar rendering</div>
                </button>
              </div>
            </motion.div>
          )}

          {/* Tool List (when category selected or searching) */}
          {(tools.length > 0 || searchQuery) && selectedCategory !== 'avatar' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-8 w-96 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto"
            >
              <div className="p-2 space-y-1">
                {tools.map((tool) => {
                  const Icon = ICON_MAP[tool.icon] || Target;
                  
                  return (
                    <motion.button
                      key={tool.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHoveredTool(tool.id)}
                      onMouseLeave={() => setHoveredTool(null)}
                      onClick={() => executeTool(tool)}
                      className="w-full px-3 py-2 rounded bg-zinc-800/50 hover:bg-zinc-700/70 border border-zinc-700 hover:border-zinc-600 transition-all text-left flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-zinc-300" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-100">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs text-zinc-400 truncate">{tool.description}</div>
                        )}
                        <div className="flex gap-1 mt-1">
                          {tool.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-zinc-500">
                        {tool.usage_count > 0 && `${tool.usage_count}×`}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Recent Tools (bottom) */}
          {!searchQuery && recentTools.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-8 flex gap-2"
            >
              {recentTools.map((tool, index) => {
                const Icon = ICON_MAP[tool.icon] || Clock;
                
                return (
                  <motion.button
                    key={tool.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => executeTool(tool)}
                    className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-600 hover:border-zinc-400 flex items-center justify-center transition-all shadow-lg"
                    title={tool.name}
                  >
                    <Icon className="w-5 h-5 text-zinc-300" />
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 hover:border-red-500 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-zinc-400 hover:text-red-400" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
