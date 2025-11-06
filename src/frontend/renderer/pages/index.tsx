import { useState, useEffect, useRef } from 'react';
import SceneViewport from '../components/scene_building_tools/viewport/SceneViewport';
import LayerManagerV2 from '../components/scene_building_tools/hierarchy/LayerManagerV2';
import RadialMenu from '../components/RadialMenu';
import RadialMenuNested from '../components/RadialMenuNested';
import ChatWindow from '../components/ui/ChatWindow';
import Timeline from '../components/Timeline';
import ChunkTimeline from '../components/animation_tools/timeline/ChunkTimeline';
import { useHotkeys } from '../hooks/useHotkeys';

export default function Home() {
  const [radialMenuOpen, setRadialMenuOpen] = useState(false);
  const [chatWindowOpen, setChatWindowOpen] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  }));
  const [chatAnchor, setChatAnchor] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  }));
  const [showStats, setShowStats] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [layerManagerVisible, setLayerManagerVisible] = useState(true);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [useNestedRadial, setUseNestedRadial] = useState(false); // Toggle between old and new radial - using old for now
  
  useHotkeys(true);

  // Track pointer position so we can anchor the radial hotbox at the cursor
  const lastPointerRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener('mousemove', handlePointerMove);
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, []);

  // Listen for Space key (radial menu) - Maya-style: hold to show, release to hide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.repeat && !(e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA/)) {
        e.preventDefault();
        setSpaceHeld(true);
        setMenuAnchor(lastPointerRef.current);
        setRadialMenuOpen(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpaceHeld(false);
        setRadialMenuOpen(false); // Close immediately when Spacebar is released
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleChatOpen = () => {
    setChatAnchor(lastPointerRef.current);
    setChatWindowOpen(true);
  };

  const getCurrentContext = () => ({
    selection: { type: null, name: null },
    mode: 'object',
    scene: { layers: 0, active: null },
    app: 'zero2onez',
  });

  return (
    <div className="w-screen h-screen bg-zinc-950 relative overflow-hidden">
      {/* Main 3D Viewport - Traditional CAD style */}
      <div className="absolute inset-0">
        <SceneViewport showStats={showStats} showGrid={showGrid} />
      </div>

      {/* Viewport Controls */}
      <div className="absolute top-4 right-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg p-2 flex gap-2">
        <button
          onClick={() => setShowStats(!showStats)}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            showStats ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Stats
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            showGrid ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Grid
        </button>
      </div>

      {/* Navigation Hint */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg px-4 py-2">
          <div className="text-xs text-zinc-400 space-y-1">
          <div><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 font-mono">Left Click + Drag</kbd> Orbit</div>
          <div><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 font-mono">Right Click + Drag</kbd> Pan</div>
          <div><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 font-mono">Scroll</kbd> Zoom</div>
          <div className="mt-2"><kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 font-mono">Space</kbd> Menu</div>
        </div>
      </div>

      {/* Radial Menu */}
      <RadialMenu
        isOpen={radialMenuOpen}
        onClose={() => setRadialMenuOpen(false)}
        context={getCurrentContext()}
        onChatOpen={handleChatOpen}
      />

      {/* Chat Window */}
      <ChatWindow
        isOpen={chatWindowOpen}
        onClose={() => setChatWindowOpen(false)}
        anchor={chatAnchor}
        context={getCurrentContext()}
      />

      {/* Layer Manager Panel - Floating Window */}
      {layerManagerVisible && (
        <LayerManagerV2 />
      )}

      {/* Timeline - Fixed at bottom */}
      {timelineVisible && (
        <>
          <Timeline />
          {/* Chunk-based timeline (new system) */}
          {/* <ChunkTimeline isOpen={timelineVisible} /> */}
        </>
      )}

      {/* Timeline Toggle Button */}
      <button
        onClick={() => setTimelineVisible(!timelineVisible)}
        className={`fixed bottom-4 right-4 z-40 px-4 py-2 rounded-lg transition-all ${
          timelineVisible
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } shadow-lg flex items-center gap-2`}
        title={timelineVisible ? 'Hide Timeline' : 'Show Timeline'}
      >
        {timelineVisible ? 'Hide Timeline' : 'Show Timeline'}
      </button>
    </div>
  );
}
