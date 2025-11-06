import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Scissors, Pin, Grid, Ripple } from 'lucide-react';
import { useChunkTimeline } from '../../../lib/timeline/useChunkTimeline';
import { TrackKind, Clip } from '../../../lib/timeline/chunkTimeline';

const TRACK_COLORS: Record<TrackKind, { bg: string; border: string; text: string }> = {
  keyGrip: { bg: 'bg-purple-900/20', border: 'border-purple-600', text: 'text-purple-300' },
  overlayBack: { bg: 'bg-green-900/20', border: 'border-green-600', text: 'text-green-300' },
  scene: { bg: 'bg-blue-900/20', border: 'border-blue-600', text: 'text-blue-300' },
  overlayFront: { bg: 'bg-yellow-900/20', border: 'border-yellow-600', text: 'text-yellow-300' },
};

const TRACK_LABELS: Record<TrackKind, string> = {
  keyGrip: 'KG',
  overlayBack: 'Back',
  scene: 'Scene',
  overlayFront: 'Front',
};

interface ChunkTimelineProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function ChunkTimeline({ isOpen, onClose }: ChunkTimelineProps) {
  const { data, operations, undo, redo } = useChunkTimeline();
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [draggingClip, setDraggingClip] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; time: number } | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<{ id: string; edge: 'in' | 'out' } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      operations.seek(data.state.timeMs + (1000 / data.state.fpsNominal) * data.state.playheadShuttle);
    }, 1000 / data.state.fpsNominal);
    
    return () => clearInterval(interval);
  }, [isPlaying, data.state.timeMs, data.state.fpsNominal, data.state.playheadShuttle, operations]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeMs = (x / (rect.width * zoom)) * 10000; // 10 second viewport
    operations.seek(timeMs);
  }, [zoom, operations]);

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    if (e.button === 0) { // Left click
      setDraggingClip(clip.id);
      setDragStart({ x: e.clientX, time: clip.start });
      
      if (!data.state.selection.clips.includes(clip.id)) {
        if (e.ctrlKey || e.metaKey) {
          operations.setSelection([...data.state.selection.clips, clip.id]);
        } else {
          operations.setSelection([clip.id]);
        }
      }
    }
  }, [data.state.selection.clips, operations]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingClip && dragStart && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStart.x;
      const deltaMs = (deltaX / (rect.width * zoom)) * 10000;
      const newStart = dragStart.time + deltaMs;
      
      operations.moveChunk([draggingClip], deltaMs);
    }
  }, [draggingClip, dragStart, zoom, operations]);

  const handleMouseUp = useCallback(() => {
    setDraggingClip(null);
    setDragStart(null);
    setTrimmingClip(null);
  }, []);

  useEffect(() => {
    if (draggingClip || trimmingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingClip, trimmingClip, handleMouseMove, handleMouseUp]);

  const handleSplit = useCallback(() => {
    const activeTrack = data.tracks.find(t => 
      t.clips.some(id => {
        const clip = data.clips[id];
        return clip && clip.start < data.state.timeMs && clip.end > data.state.timeMs;
      })
    );
    if (activeTrack) {
      operations.splitAtPlayhead(activeTrack.id);
    }
  }, [data, operations]);

  // Group tracks by kind
  const tracksByKind = data.tracks.reduce((acc, track) => {
    if (!acc[track.kind]) acc[track.kind] = [];
    acc[track.kind].push(track);
    return acc;
  }, {} as Record<TrackKind, typeof data.tracks>);

  const trackOrder: TrackKind[] = ['keyGrip', 'overlayBack', 'scene', 'overlayFront'];

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-80 bg-zinc-950 border-t border-zinc-800 flex flex-col z-50">
      {/* Transport Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            operations.seek(0);
          }}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={handleSplit}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          title="Split at playhead (Blade)"
        >
          <Scissors className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-zinc-400">Time:</span>
          <span className="text-sm font-mono text-zinc-200">
            {(data.state.timeMs / 1000).toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={operations.toggleSnap}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              data.state.snap.enable
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Snap to grid/KG anchors"
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={() => operations.setRippleMode(
              data.state.rippleMode === 'auto' ? 'none' : 'auto'
            )}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              data.state.rippleMode !== 'none'
                ? 'bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Ripple mode"
          >
            <Ripple className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={undo}
            className="px-3 py-1 rounded text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          >
            Undo
          </button>
          <button
            onClick={redo}
            className="px-3 py-1 rounded text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          >
            Redo
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          >
            Close
          </button>
        )}
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track List (Left) */}
        <div className="w-48 border-r border-zinc-800 overflow-y-auto bg-zinc-900">
          <div className="p-2 space-y-2">
            {trackOrder.map(kind => {
              const tracks = tracksByKind[kind] || [];
              if (tracks.length === 0) return null;
              
              const color = TRACK_COLORS[kind];
              
              return (
                <div key={kind} className="space-y-1">
                  <div className={`px-2 py-1 text-xs font-semibold ${color.text} uppercase`}>
                    {TRACK_LABELS[kind]}
                  </div>
                  {tracks.map(track => (
                    <div
                      key={track.id}
                      className={`px-2 py-1 text-xs rounded border ${color.bg} ${color.border} ${
                        track.visible ? 'opacity-100' : 'opacity-50'
                      }`}
                    >
                      {track.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Grid (Center) */}
        <div className="flex-1 relative overflow-x-auto overflow-y-auto" ref={timelineRef}>
          <div
            className="h-full relative cursor-pointer"
            onClick={handleSeek}
            style={{ minWidth: `${10000 * zoom}px` }}
          >
            {/* Ruler */}
            <div className="sticky top-0 h-8 border-b border-zinc-800 bg-zinc-900 flex items-center z-10">
              {Array.from({ length: Math.floor(10000 / 1000) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-xs text-zinc-500"
                  style={{ left: `${(i * 1000 * zoom)}px` }}
                >
                  {i}s
                </div>
              ))}
            </div>

            {/* KG Anchors on ruler */}
            {data.kgAnchors
              .filter(a => a.timeMs !== undefined)
              .map(anchor => (
                <div
                  key={anchor.id}
                  className="absolute top-0 h-8 w-0.5 bg-purple-500"
                  style={{ left: `${(anchor.timeMs! * zoom)}px` }}
                  title={anchor.tags?.join(', ')}
                />
              ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              style={{ left: `${data.state.timeMs * zoom}px` }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-sm" />
            </div>

            {/* Tracks */}
            <div className="relative">
              {trackOrder.map((kind, kindIndex) => {
                const tracks = tracksByKind[kind] || [];
                return tracks.map((track, trackIndex) => {
                  const color = TRACK_COLORS[track.kind];
                  const top = (kindIndex * 100) + (trackIndex * 40) + 40;
                  
                  return (
                    <div
                      key={track.id}
                      className="absolute left-0 right-0 h-8 border-b border-zinc-800/50"
                      style={{ top: `${top}px` }}
                    >
                      {/* Clips */}
                      {track.clips.map(clipId => {
                        const clip = data.clips[clipId];
                        if (!clip) return null;
                        
                        const left = clip.start * zoom;
                        const width = (clip.end - clip.start) * zoom;
                        const isSelected = data.state.selection.clips.includes(clipId);
                        
                        return (
                          <motion.div
                            key={clipId}
                            initial={false}
                            animate={{
                              left: `${left}px`,
                              width: `${width}px`,
                            }}
                            className={`absolute top-1 bottom-1 rounded border-2 cursor-move ${
                              isSelected
                                ? `${color.border} ${color.bg} border-2`
                                : `${color.border} ${color.bg} border`
                            }`}
                            style={{
                              left: `${left}px`,
                              width: `${width}px`,
                            }}
                            onMouseDown={(e) => handleClipMouseDown(e, clip)}
                            title={clip.payloadRef}
                          >
                            <div className="px-2 py-1 text-xs text-zinc-300 truncate">
                              {clip.payloadRef.split('/').pop()}
                            </div>
                            
                            {/* Trim handles */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setTrimmingClip({ id: clipId, edge: 'in' });
                              }}
                            />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setTrimmingClip({ id: clipId, edge: 'out' });
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

