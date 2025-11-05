import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect } from 'react';
import AvatarScene from '../components/AvatarScene';
import CameraLayer, { CameraLayerOverlay } from '../components/CameraLayer';
import LayerManagerV2 from '../components/LayerManagerV2';
import DirectionHUD from '../components/DirectionHUD';
import RadialMenu from '../components/RadialMenu';
import Timeline from '../components/Timeline';
import { useHotkeys } from '../hooks/useHotkeys';
import { useBehaviorBrain } from '../hooks/useBehaviorBrain';
import { useCompositor } from '../lib/compositor';
import { useTimeline } from '../lib/timeline/tracks';
import { Activity, Camera, User } from 'lucide-react';

export default function Home() {
  const [povMode, setPovMode] = useState(false);
  const [radialMenuOpen, setRadialMenuOpen] = useState(false);
  const { triggerEvent, currentState } = useBehaviorBrain(true);
  const { layers, activeLayerId, playheadTime, isPlaying, setPlayheadTime } = useCompositor();
  const { evaluateAll } = useTimeline();
  
  useHotkeys(true);

  // Listen for Space key (radial menu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.repeat && !e.target?.['tagName']?.match(/INPUT|TEXTAREA/)) {
        e.preventDefault();
        setRadialMenuOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPlayheadTime(playheadTime + 1);
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [isPlaying, playheadTime]);

  // Apply timeline values to State Vector
  useEffect(() => {
    const timelineValues = evaluateAll(playheadTime);
    
    // TODO: Apply to State Vector
    // e.g., if timelineValues['blend.smile'], update currentState.blend.smile
    console.log('[Timeline]', timelineValues);
  }, [playheadTime]);

  const getCurrentContext = () => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    
    return {
      selection: {
        type: activeLayer?.type || null,
        name: activeLayer?.name || null,
      },
      mode: 'object',
      scene: {
        layers: layers.length,
        active: activeLayerId,
      },
      app: 'zero2onez',
    };
  };

  // Get workarea opacity for layers
  const scene3dLayer = layers.find(l => l.type === 'scene-3d');
  const cameraLayer = layers.find(l => l.type === 'camera-feed');

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* 3D Canvas - Full screen compositor */}
      <Canvas
        shadows
        className="absolute inset-0"
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          {/* Apply workarea opacity to layers */}
          <group opacity={scene3dLayer?.workareaOpacity ?? 1}>
            <AvatarScene povMode={povMode} />
          </group>
          
          <group opacity={cameraLayer?.workareaOpacity ?? 1}>
            <CameraLayer />
          </group>
          
          {layers.find(l => l.type === 'hud')?.visible && <DirectionHUD />}
        </Suspense>
      </Canvas>

      {/* Layer Manager Panel */}
      <LayerManagerV2 />

      {/* State Vector Display */}
      <div className="absolute top-4 left-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 w-64">
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">State Vector</h3>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">Valence</span>
              <span className="text-zinc-300">{currentState.valence.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-green-500"
                style={{ width: `${((currentState.valence + 1) / 2) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">Arousal</span>
              <span className="text-zinc-300">{currentState.arousal.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${currentState.arousal * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-400 mb-1">Emote</div>
            <div className="text-sm text-zinc-100 font-medium">{currentState.emote}</div>
          </div>

          <div>
            <div className="text-xs text-zinc-400 mb-1">Blend Shapes</div>
            <div className="space-y-1">
              {Object.entries(currentState.blend).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-zinc-500">{key}</span>
                  <span className="text-zinc-300">{value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="absolute bottom-72 left-4 flex gap-2">
        <button
          onClick={() => setPovMode(!povMode)}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2
            ${povMode 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' 
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }
          `}
        >
          <Camera className="w-4 h-4" />
          {povMode ? 'POV Mode' : 'Normal View'}
        </button>

        <button
          onClick={() => triggerEvent('positive-sentiment')}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Trigger Positive
        </button>

        <button
          onClick={() => triggerEvent('user-message')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          User Event
        </button>
      </div>

      {/* Radial Menu Hint */}
      <div className="absolute bottom-72 right-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg px-4 py-2">
        <div className="text-xs text-zinc-400">
          Press <kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 font-mono">Space</kbd> for tools
        </div>
      </div>

      {/* Radial Menu */}
      <RadialMenu
        isOpen={radialMenuOpen}
        onClose={() => setRadialMenuOpen(false)}
        context={getCurrentContext()}
      />

      {/* Timeline */}
      <Timeline />
      
      {/* LiveKit Camera Overlay */}
      <CameraLayerOverlay cameraId="camera1" />
    </div>
  );
}
