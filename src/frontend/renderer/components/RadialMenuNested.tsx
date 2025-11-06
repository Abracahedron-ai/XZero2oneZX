import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import {
  Target, Wand2, Link2, Globe, Search, X, MessageSquare,
  Settings, Monitor, Zap, Pin
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/config';
import FloatingWindow from './shared/FloatingWindow';

// Color scheme: Rig=Blue, Animate=Red, Link=Gold, World=Green
const MODE_COLORS = {
  rig: { primary: '#3b82f6', secondary: '#60a5fa', bg: 'rgba(59, 130, 246, 0.1)' },
  animate: { primary: '#ef4444', secondary: '#f87171', bg: 'rgba(239, 68, 68, 0.1)' },
  link: { primary: '#eab308', secondary: '#facc15', bg: 'rgba(234, 179, 8, 0.1)' },
  world: { primary: '#22c55e', secondary: '#4ade80', bg: 'rgba(34, 197, 94, 0.1)' },
};

// Base Ring - World Modes
const BASE_MODES = [
  { id: 'animate', label: 'ANIMATE', angle: -90, icon: Wand2, color: MODE_COLORS.animate },
  { id: 'rig', label: 'RIG', angle: 0, icon: Target, color: MODE_COLORS.rig },
  { id: 'world', label: 'WORLD', angle: 90, icon: Globe, color: MODE_COLORS.world },
  { id: 'link', label: 'LINK', angle: 180, icon: Link2, color: MODE_COLORS.link },
];

// Second Ring - Category Expansion
const CATEGORY_MAP: Record<string, Array<{ id: string; label: string; angle: number; icon: any }>> = {
  rig: [
    { id: 'auto-rig', label: 'Auto-Rig', angle: -90, icon: Target },
    { id: 'constraint', label: 'Constraint', angle: 0, icon: Target },
    { id: 'drivers', label: 'Drivers', angle: 90, icon: Zap },
    { id: 'weights', label: 'Weights', angle: 180, icon: Target },
  ],
  animate: [
    { id: 'timeline', label: 'Timeline', angle: -90, icon: Wand2 },
    { id: 'motion-mixer', label: 'Motion Mixer', angle: 0, icon: Wand2 },
    { id: 'performance', label: 'Performance', angle: 90, icon: Wand2 },
    { id: 'ik-fk', label: 'IK/FK', angle: 180, icon: Wand2 },
  ],
  link: [
    { id: 'event-graph', label: 'Event Graph', angle: -90, icon: Link2 },
    { id: 'hot-triggers', label: 'Hot Triggers', angle: 0, icon: Link2 },
    { id: 'signal-bus', label: 'Signal Bus', angle: 90, icon: Link2 },
    { id: 'smart-linker', label: 'Smart Linker', angle: 180, icon: Link2 },
  ],
  world: [
    { id: 'cameras', label: 'Cameras', angle: -90, icon: Globe },
    { id: 'physics', label: 'Physics', angle: 0, icon: Globe },
    { id: 'compositing', label: 'Compositing', angle: 90, icon: Globe },
    { id: 'props', label: 'Props', angle: 180, icon: Globe },
  ],
};

// Third Ring - Tool Depth
const TOOL_MAP: Record<string, Array<{ id: string; label: string; angle: number; window?: string }>> = {
  'rig:drivers': [
    { id: 'add-driver', label: 'Add Driver', angle: -90, window: 'DriverEditor' },
    { id: 'map-variable', label: 'Map Variable', angle: 0, window: 'VariableMapper' },
    { id: 'test-transform', label: 'Test Transform', angle: 90, window: 'TransformTester' },
  ],
  'link:event-graph': [
    { id: 'when', label: 'When', angle: -90, window: 'WhenNode' },
    { id: 'do', label: 'Do', angle: 0, window: 'DoNode' },
    { id: 'if', label: 'If', angle: 90, window: 'IfNode' },
  ],
  // Add more tool mappings as needed
};

// Meta Command Ring (Ctrl+Space)
const META_COMMANDS = [
  { id: 'project', label: 'Project', angle: -90, icon: Settings },
  { id: 'agent-console', label: 'Agent Console', angle: 0, icon: Monitor },
  { id: 'performance-mode', label: 'Performance Mode', angle: 90, icon: Zap },
  { id: 'settings', label: 'Settings', angle: 180, icon: Settings },
];

interface RadialMenuNestedProps {
  isOpen: boolean;
  onClose: () => void;
  context: any;
  onChatOpen?: () => void;
  anchor?: { x: number; y: number };
}

interface FloatingWindowState {
  id: string;
  title: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isOpen: boolean;
}

export default function RadialMenuNested({ 
  isOpen, 
  onClose, 
  context, 
  onChatOpen,
  anchor = { x: 0, y: 0 }
}: RadialMenuNestedProps) {
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isMetaMode, setIsMetaMode] = useState(false);
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindowState[]>([]);
  const [dragDirection, setDragDirection] = useState<{ x: number; y: number } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Handle drag-based selection
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentX = e.clientX - centerX;
      const currentY = e.clientY - centerY;
      
      const distance = Math.sqrt(currentX * currentX + currentY * currentY);
      
      if (distance > 30) { // Dead zone
        const angle = Math.atan2(currentY, currentX) * (180 / Math.PI);
        const normalizedAngle = (angle + 90 + 360) % 360; // Normalize to 0-360, with 0 = up
        setDragDirection({ x: currentX, y: currentY });
        
        // Detect which ring/item is being dragged toward
        if (!activeMode) {
          // Base ring selection
          const mode = BASE_MODES.find(m => {
            const modeAngle = (m.angle + 90 + 360) % 360;
            const angleDiff = Math.abs(normalizedAngle - modeAngle);
            return angleDiff < 45 || angleDiff > 315;
          });
          if (mode) {
            setHoveredItem(mode.id);
          }
        } else if (!activeCategory) {
          // Category ring selection
          const categories = CATEGORY_MAP[activeMode] || [];
          const category = categories.find(c => {
            const catAngle = (c.angle + 90 + 360) % 360;
            const angleDiff = Math.abs(normalizedAngle - catAngle);
            return angleDiff < 45 || angleDiff > 315;
          });
          if (category) {
            setHoveredItem(`${activeMode}:${category.id}`);
          }
        } else {
          // Tool ring selection
          const toolKey = `${activeMode}:${activeCategory}`;
          const tools = TOOL_MAP[toolKey] || [];
          const tool = tools.find(t => {
            const toolAngle = (t.angle + 90 + 360) % 360;
            const angleDiff = Math.abs(normalizedAngle - toolAngle);
            return angleDiff < 45 || angleDiff > 315;
          });
          if (tool) {
            setHoveredItem(`${toolKey}:${tool.id}`);
          }
        }
      } else {
        setHoveredItem(null);
        setDragDirection(null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentX = e.clientX - centerX;
      const currentY = e.clientY - centerY;
      
      const distance = Math.sqrt(currentX * currentX + currentY * currentY);
      
      if (distance > 30 && hoveredItem) {
        // Commit selection
        if (!activeMode && BASE_MODES.find(m => m.id === hoveredItem)) {
          setActiveMode(hoveredItem);
        } else if (!activeCategory && hoveredItem.includes(':')) {
          const [, categoryId] = hoveredItem.split(':');
          setActiveCategory(categoryId);
        } else if (!activeTool && hoveredItem.includes(':')) {
          const parts = hoveredItem.split(':');
          if (parts.length === 3) {
            const [, , toolId] = parts;
            setActiveTool(toolId);
            const tool = TOOL_MAP[`${activeMode}:${activeCategory}`]?.find(t => t.id === toolId);
            if (tool?.window) {
              spawnFloatingWindow(tool.window, tool.label);
            }
          }
        }
      }
      
      setDragDirection(null);
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isOpen, activeMode, activeCategory, activeTool, hoveredItem]);

  // Handle Ctrl+Space for meta ring
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.ctrlKey && isOpen) {
        e.preventDefault();
        setIsMetaMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.ctrlKey) {
        setIsMetaMode(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isOpen]);

  const spawnFloatingWindow = (type: string, title: string) => {
    const newWindow: FloatingWindowState = {
      id: `${type}-${Date.now()}`,
      title,
      type,
      position: { x: anchor.x + 50, y: anchor.y + 50 },
      size: { width: 400, height: 300 },
      isOpen: true,
    };
    setFloatingWindows(prev => [...prev, newWindow]);
  };

  const closeFloatingWindow = (id: string) => {
    setFloatingWindows(prev => prev.filter(w => w.id !== id));
  };

  const resetMenu = () => {
    setActiveMode(null);
    setActiveCategory(null);
    setActiveTool(null);
    setHoveredItem(null);
    setDragDirection(null);
  };

  if (!isOpen) return null;

  const currentMode = activeMode ? BASE_MODES.find(m => m.id === activeMode) : null;
  const currentCategories = activeMode ? CATEGORY_MAP[activeMode] || [] : [];
  const currentTools = activeMode && activeCategory ? TOOL_MAP[`${activeMode}:${activeCategory}`] || [] : [];
  const displayItems = isMetaMode ? META_COMMANDS : 
                       activeTool ? currentTools :
                       activeCategory ? currentCategories :
                       activeMode ? currentCategories :
                       BASE_MODES;

  return (
    <>
      <AnimatePresence>
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          style={{ pointerEvents: 'auto' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
            style={{
              left: anchor.x,
              top: anchor.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-600 shadow-2xl flex flex-col items-center justify-center gap-2">
              <Search className="w-5 h-5 text-zinc-400" />
              {onChatOpen && (
                <button
                  onClick={() => {
                    onChatOpen();
                    onClose();
                  }}
                  className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all"
                  title="Chat"
                >
                  <MessageSquare className="w-3 h-3 text-white" />
                </button>
              )}
            </div>

            {/* Render appropriate ring */}
            {displayItems.map((item, index) => {
              const angle = (item.angle * Math.PI) / 180;
              const radius = isMetaMode ? 200 :
                           activeTool ? 280 :
                           activeCategory ? 240 :
                           activeMode ? 200 :
                           160;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              const isHovered = hoveredItem === (item.id || `${activeMode}:${item.id}` || `${activeMode}:${activeCategory}:${item.id}`);
              const modeColor = currentMode?.color || MODE_COLORS.rig;
              
              const Icon = item.icon || Target;
              
              return (
                <motion.button
                  key={item.id || index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => setHoveredItem(item.id || `${activeMode}:${item.id}`)}
                  onClick={() => {
                    if (isMetaMode) {
                      // Handle meta command
                      console.log('Meta command:', item.id);
                      onClose();
                    } else if (!activeMode) {
                      setActiveMode(item.id);
                    } else if (!activeCategory) {
                      setActiveCategory(item.id);
                    } else if (!activeTool) {
                      setActiveTool(item.id);
                      if ('window' in item && item.window) {
                        spawnFloatingWindow(item.window, item.label);
                      }
                    }
                  }}
                  className={`
                    absolute top-1/2 left-1/2 rounded-full
                    flex flex-col items-center justify-center gap-1
                    transition-all shadow-xl z-10
                    ${isHovered 
                      ? `border-3 text-white shadow-lg` 
                      : 'border-2 text-zinc-300 hover:border-opacity-80'
                    }
                  `}
                  style={{
                    width: activeTool ? '4rem' : activeCategory ? '5rem' : '6rem',
                    height: activeTool ? '4rem' : activeCategory ? '5rem' : '6rem',
                    backgroundColor: isHovered ? modeColor.primary : 'rgba(39, 39, 42, 0.9)',
                    borderColor: isHovered ? modeColor.secondary : 'rgb(82, 82, 91)',
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  }}
                >
                  <Icon className={activeTool ? "w-4 h-4" : activeCategory ? "w-5 h-5" : "w-6 h-6"} />
                  <span className={`font-medium ${activeTool ? 'text-[9px]' : activeCategory ? 'text-[10px]' : 'text-xs'}`}>
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* Connection line from center to hovered item */}
            {hoveredItem && dragDirection && (() => {
              const item = displayItems.find(i => 
                i.id === hoveredItem || 
                `${activeMode}:${i.id}` === hoveredItem ||
                `${activeMode}:${activeCategory}:${i.id}` === hoveredItem
              );
              if (!item) return null;
              
              const angle = (item.angle * Math.PI) / 180;
              const radius = isMetaMode ? 200 :
                           activeTool ? 280 :
                           activeCategory ? 240 :
                           activeMode ? 200 :
                           160;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const modeColor = currentMode?.color || MODE_COLORS.rig;
              
              return (
                <svg
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
                  style={{ width: '600px', height: '600px' }}
                >
                  <line
                    x1="300"
                    y1="300"
                    x2={300 + x}
                    y2={300 + y}
                    stroke={modeColor.primary}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                </svg>
              );
            })()}

            {/* Back button */}
            {(activeMode || activeCategory || activeTool) && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={resetMenu}
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 hover:border-zinc-400 flex items-center justify-center transition-all"
                title="Back"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </motion.button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 hover:border-red-500 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-zinc-400 hover:text-red-400" />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Windows */}
      {floatingWindows.map(window => (
        <FloatingWindow
          key={window.id}
          title={window.title}
          isOpen={window.isOpen}
          onClose={() => closeFloatingWindow(window.id)}
          initialPosition={window.position}
          initialSize={window.size}
        >
          <div className="p-4">
            {window.type === 'DriverEditor' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Source</label>
                  <input
                    type="text"
                    placeholder="e.g., microphone.volume"
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Target</label>
                  <input
                    type="text"
                    placeholder="e.g., bone.head.rotateZ"
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Curve</label>
                  <select className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300">
                    <option>easeOutCubic</option>
                    <option>linear</option>
                    <option>easeInOut</option>
                  </select>
                </div>
                <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white">
                  Apply
                </button>
              </div>
            )}
            {window.type === 'VariableMapper' && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">Map any variable to bone transform</p>
                <div className="p-3 bg-zinc-800 rounded border border-zinc-700">
                  <p className="text-xs text-zinc-400">Drag variables here</p>
                </div>
              </div>
            )}
            {!window.type.includes('Driver') && !window.type.includes('Variable') && (
              <p className="text-sm text-zinc-300">Window content for {window.type}</p>
            )}
          </div>
        </FloatingWindow>
      ))}
    </>
  );
}

