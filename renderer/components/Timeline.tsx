import { useState } from 'react';
import { Play, Pause, Square, Plus, Minus, AlignLeft, TrendingUp } from 'lucide-react';
import { useCompositor } from '../lib/compositor';
import { useTimeline } from '../lib/timeline/tracks';

type TimelineView = 'dope' | 'graph';

export default function Timeline() {
  const {
    layers,
    playheadTime,
    fps,
    duration,
    isPlaying,
    play,
    pause,
    stop,
    seek,
  } = useCompositor();

  const {
    tracks,
    markers,
    loopIn,
    loopOut,
    addKeyframe,
    evaluateAll,
  } = useTimeline();

  const [view, setView] = useState<TimelineView>('dope');
  const [zoom, setZoom] = useState(1);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    seek(time);
  };

  const addKeyframeAtPlayhead = (trackId: string, value: any) => {
    addKeyframe(trackId, {
      time: playheadTime,
      value,
      interpolation: 'linear',
    });
  };

  // Group tracks by layer
  const tracksByLayer = tracks.reduce((acc, track) => {
    if (!acc[track.layerId]) acc[track.layerId] = [];
    acc[track.layerId].push(track);
    return acc;
  }, {} as Record<string, typeof tracks>);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-64 bg-zinc-950 border-t border-zinc-800 flex flex-col">
      {/* Transport Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
        <button
          onClick={isPlaying ? pause : play}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={stop}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          <Square className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-zinc-400">Time:</span>
          <span className="text-sm font-mono text-zinc-200">
            {(playheadTime / fps).toFixed(2)}s
          </span>
          <span className="text-xs text-zinc-500">
            ({Math.floor(playheadTime)}f @ {fps}fps)
          </span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setView('dope')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              view === 'dope'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => setView('graph')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              view === 'graph'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs text-zinc-400 w-12 text-center">{zoom}x</span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Layer List (Left) */}
        <div className="w-64 border-r border-zinc-800 overflow-y-auto">
          <div className="p-2 space-y-1">
            {layers.map(layer => (
              <div key={layer.id} className="bg-zinc-900 rounded">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200">{layer.name}</span>
                  <span className="text-xs text-zinc-500">z:{layer.zIndex}</span>
                </div>
                
                {tracksByLayer[layer.id]?.map(track => (
                  <div
                    key={track.id}
                    className="px-4 py-1 flex items-center justify-between hover:bg-zinc-800/50 cursor-pointer"
                  >
                    <span className="text-xs text-zinc-400">{track.name}</span>
                    <button
                      onClick={() => {
                        const currentValue = evaluateAll(playheadTime)[track.property];
                        addKeyframeAtPlayhead(track.id, currentValue ?? 0);
                      }}
                      className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white transition-colors"
                      title="Add keyframe at playhead"
                    >
                      K
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Grid (Center) */}
        <div className="flex-1 relative overflow-x-auto overflow-y-hidden">
          <div
            className="h-full relative cursor-pointer"
            onClick={handleSeek}
            style={{ minWidth: `${duration * zoom * 2}px` }}
          >
            {/* Ruler */}
            <div className="absolute top-0 left-0 right-0 h-8 border-b border-zinc-800 flex items-center">
              {Array.from({ length: Math.floor(duration / 10) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-xs text-zinc-500"
                  style={{ left: `${(i * 10 * zoom * 2)}px` }}
                >
                  {i * 10}f
                </div>
              ))}
            </div>

            {/* Markers */}
            {markers.map(marker => (
              <div
                key={marker.time}
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/50"
                style={{ left: `${marker.time * zoom * 2}px` }}
                title={marker.label}
              />
            ))}

            {/* Loop region */}
            <div
              className="absolute top-8 bottom-0 bg-blue-500/10 border-l border-r border-blue-500/30"
              style={{
                left: `${loopIn * zoom * 2}px`,
                width: `${(loopOut - loopIn) * zoom * 2}px`,
              }}
            />

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
              style={{ left: `${playheadTime * zoom * 2}px` }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-sm" />
            </div>

            {/* Keyframes */}
            {view === 'dope' && (
              <div className="absolute top-8 left-0 right-0 bottom-0">
                {tracks.map((track, trackIndex) => (
                  <div
                    key={track.id}
                    className="h-8 border-b border-zinc-800/50"
                    style={{ top: `${trackIndex * 32}px` }}
                  >
                    {track.keyframes.map(kf => (
                      <div
                        key={kf.time}
                        className="absolute w-2 h-2 bg-blue-500 rounded-full -translate-x-1 -translate-y-1"
                        style={{
                          left: `${kf.time * zoom * 2}px`,
                          top: '16px',
                        }}
                        title={`${kf.time}f: ${kf.value}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dope Sheet / Graph (Right) */}
        <div className="w-80 border-l border-zinc-800 overflow-y-auto p-2">
          {view === 'dope' ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-400 mb-2">Keyframes</div>
              {tracks.map(track => (
                <div key={track.id} className="bg-zinc-900 rounded p-2">
                  <div className="text-xs text-zinc-300 mb-1">{track.name}</div>
                  <div className="space-y-1">
                    {track.keyframes.map(kf => (
                      <div
                        key={kf.time}
                        className="text-xs text-zinc-500 flex justify-between"
                      >
                        <span>{kf.time}f</span>
                        <span>{String(kf.value).substring(0, 10)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">
              Graph view (curves for selected tracks)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
