import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, Target, Link2, Layers, Users, Gamepad2, Sparkles,
  MessageSquare, X
} from 'lucide-react';

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  context?: any;
  onChatOpen?: () => void;
}

// Primary categories
const PRIMARY_CATEGORIES = [
  { id: 'animation', label: 'Animation', angle: -90, icon: Wand2, color: '#ef4444' },
  { id: 'rigging', label: 'Rigging', angle: 0, icon: Target, color: '#3b82f6' },
  { id: 'compositing', label: 'Compositing', angle: 90, icon: Layers, color: '#22c55e' },
  { id: 'agents', label: 'Agents', angle: 180, icon: Users, color: '#eab308' },
];

// Secondary categories
const SECONDARY_CATEGORIES = [
  { id: 'linking', label: 'Linking', angle: -45, icon: Link2, color: '#f59e0b' },
  { id: 'controls', label: 'Controls', angle: 45, icon: Gamepad2, color: '#8b5cf6' },
  { id: 'personality', label: 'Personality', angle: 135, icon: Sparkles, color: '#ec4899' },
];

// Sub-categories
const SUB_CATEGORIES: Record<string, Array<{ id: string; label: string; angle: number }>> = {
  animation: [
    { id: 'motion-mixer', label: 'Motion Mixer', angle: -90 },
    { id: 'pose-sequencer', label: 'Pose Sequencer', angle: 0 },
    { id: 'performance-recorder', label: 'Performance Recorder', angle: 90 },
  ],
  rigging: [
    { id: 'auto-rig', label: 'Auto-Rig', angle: -90 },
    { id: 'constraints', label: 'Constraints', angle: 0 },
    { id: 'drivers', label: 'Drivers', angle: 90 },
  ],
  compositing: [
    { id: 'layer-mixer', label: 'Layer Mixer', angle: -90 },
    { id: 'keyer', label: 'Keyer', angle: 0 },
    { id: 'fx-triggers', label: 'FX Triggers', angle: 90 },
    { id: 'magic-tricks', label: 'Magic Tricks', angle: 180 },
  ],
  agents: [
    { id: 'spawner', label: 'Spawner', angle: -90 },
    { id: 'behavior-editor', label: 'Behavior Editor', angle: 0 },
    { id: 'intent-router', label: 'Intent Router', angle: 90 },
  ],
  linking: [
    { id: 'event-graph', label: 'Event Graph', angle: -90 },
    { id: 'hot-triggers', label: 'Hot-Triggers', angle: 0 },
    { id: 'smart-linker', label: 'Smart Linker', angle: 90 },
  ],
  controls: [
    { id: 'camera', label: 'Camera', angle: -90 },
    { id: 'physics', label: 'Physics', angle: 0 },
    { id: 'prop-spawner', label: 'Prop Spawner', angle: 90 },
    { id: 'gamification', label: 'Gamification', angle: 180 },
  ],
  personality: [
    { id: 'persona-builder', label: 'Persona Builder', angle: -90 },
    { id: 'xp-system', label: 'XP System', angle: 0 },
    { id: 'challenges', label: 'Challenges', angle: 90 },
  ],
};

export default function RadialMenu({ isOpen, onClose, context, onChatOpen }: RadialMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Reset when menu closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
      setHoveredItem(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSubCategories = selectedCategory ? SUB_CATEGORIES[selectedCategory] || [] : [];
  const displayCategories = selectedCategory ? currentSubCategories : [...PRIMARY_CATEGORIES, ...SECONDARY_CATEGORIES];

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === null) {
      setSelectedCategory(categoryId);
    } else {
      console.log(`[RadialMenu] Execute: ${selectedCategory}/${categoryId}`);
      onClose();
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setHoveredItem(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="radial-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-zinc-800/95 border-2 border-zinc-600 shadow-xl flex flex-col items-center justify-center gap-1">
              {onChatOpen && (
                <button
                  onClick={() => {
                    onChatOpen();
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all"
                  title="Chat"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                </button>
              )}
            </div>

            {/* Back Button */}
            {selectedCategory && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleBack}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -ml-28 w-10 h-10 rounded-full bg-zinc-800/95 border border-zinc-600 hover:border-zinc-400 flex items-center justify-center transition-all"
                title="Back"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </motion.button>
            )}

            {/* Category Buttons */}
            {displayCategories.map((item, index) => {
              // Convert angle from degrees to radians, adjusting for 0° = right, 90° = down
              const angleRad = ((item.angle - 90) * Math.PI) / 180;
              const radius = selectedCategory ? 180 : 140;
              const x = Math.cos(angleRad) * radius;
              const y = Math.sin(angleRad) * radius;
              
              const isHovered = hoveredItem === item.id;
              const color = 'color' in item ? (item.color as string) : '#6366f1';
              const IconComponent = 'icon' in item ? (item.icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>) : Target;

              return (
                <motion.button
                  key={item.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.15 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => handleCategoryClick(item.id)}
                  className="absolute rounded-lg flex flex-col items-center justify-center gap-1 transition-all shadow-lg z-10"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: '5rem',
                    height: '5rem',
                    background: isHovered 
                      ? `linear-gradient(135deg, ${color}30, ${color}15)`
                      : 'rgba(39, 39, 42, 0.95)',
                    border: `2px solid ${isHovered ? color : '#52525b'}`,
                  }}
                  title={item.label}
                >
                  <IconComponent className="w-6 h-6" style={{ color: isHovered ? color : '#a1a1aa' }} />
                  <span 
                    className="text-xs font-medium text-center px-1 leading-tight"
                    style={{ color: isHovered ? color : '#a1a1aa' }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* Connection Line */}
            {hoveredItem && (() => {
              const item = displayCategories.find(c => c.id === hoveredItem);
              if (!item) return null;
              const angleRad = ((item.angle - 90) * Math.PI) / 180;
              const radius = selectedCategory ? 180 : 140;
              const x = Math.cos(angleRad) * radius;
              const y = Math.sin(angleRad) * radius;
              const color = 'color' in item ? (item.color as string) : '#6366f1';
              
              return (
                <svg
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
                  style={{ width: '360px', height: '360px' }}
                >
                  <line
                    x1="180"
                    y1="180"
                    x2={180 + x}
                    y2={180 + y}
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    opacity="0.4"
                  />
                </svg>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

