import { useMemo, useEffect, useState, useRef } from 'react';
import { useAudioMixer, StemConfig } from '../lib/audio/mixer';
import { Slider } from '@radix-ui/react-slider';

interface AudioMixerPanelProps {
  stems: StemConfig[];
  onRequestLoad?: () => Promise<void>;
  dspEndpoint?: string; // WebSocket endpoint for DSP wrapper (default: ws://localhost:8006/ws)
}

interface DSPEffectUpdate {
  type: 'update_effects';
  effects: {
    reverb: number;
    delay: number;
    eq: {
      low: number;
      mid: number;
      high: number;
    };
  };
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

export default function AudioMixerPanel({
  stems,
  onRequestLoad,
  dspEndpoint = 'ws://localhost:8006/ws',
}: AudioMixerPanelProps) {
  const mixer = useAudioMixer();
  const [dspConnected, setDspConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useMemo(() => {
    if (!stems.length) return;
    void mixer.hydrate(stems);
  }, [stems]);

  // Connect to DSP wrapper WebSocket
  useEffect(() => {
    const connectDSP = () => {
      try {
        const ws = new WebSocket(dspEndpoint);
        
        ws.onopen = () => {
          setDspConnected(true);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };
        
        ws.onclose = () => {
          setDspConnected(false);
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectDSP, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('DSP WebSocket error:', error);
          setDspConnected(false);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'effects_updated') {
              // DSP confirmed effect update
              console.log('DSP effects updated:', data.effects);
            }
          } catch (e) {
            console.error('Error parsing DSP message:', e);
          }
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('Error connecting to DSP:', error);
        setDspConnected(false);
      }
    };

    connectDSP();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [dspEndpoint]);

  // Send effect updates to DSP wrapper
  const sendEffectUpdate = (effects: {
    reverb: number;
    delay: number;
    eq: { low: number; mid: number; high: number };
  }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const update: DSPEffectUpdate = {
        type: 'update_effects',
        effects,
      };
      wsRef.current.send(JSON.stringify(update));
    }
  };

  return (
    <div className="w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900/80 p-4 shadow-2xl">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Audio Mixer</h2>
          <p className="text-xs text-zinc-500">
            Multi-stem playback with real-time effects.
            {dspConnected && (
              <span className="ml-2 text-green-400">● DSP Connected</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mixer.setPlaying(!mixer.playing)}
            className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-400"
          >
            {mixer.playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => mixer.seek(0)}
            className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Stop
          </button>
          {onRequestLoad && (
            <button
              onClick={onRequestLoad}
              className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Reload
            </button>
          )}
        </div>
      </header>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <Slider
            value={[
              mixer.duration ? mixer.position / mixer.duration : 0,
            ]}
            onValueChange={([value]) => mixer.seek(value)}
            max={1}
            min={0}
            step={0.001}
            className="relative h-2 w-full rounded bg-zinc-800"
          >
            <span
              className="pointer-events-none absolute top-0 h-full rounded bg-blue-500"
              style={{
                width: `${
                  mixer.duration ? (mixer.position / mixer.duration) * 100 : 0
                }%`,
              }}
            />
          </Slider>
          <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
            <span>{formatTime(mixer.position)}</span>
            <span>{formatTime(mixer.duration)}</span>
          </div>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {mixer.order.map((id) => {
          const stem = mixer.stems[id];
          if (!stem) return null;
          return (
            <div
              key={stem.id}
              className="rounded-lg border border-zinc-700 bg-zinc-800/70 p-3"
            >
              <header className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">
                  {stem.label}
                </span>
                <button
                  onClick={() => mixer.toggleStemMute(stem.id)}
                  className={`rounded px-2 py-0.5 text-xs ${
                    stem.muted
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-zinc-700 text-zinc-200'
                  }`}
                >
                  {stem.muted ? 'Muted' : 'Mute'}
                </button>
              </header>
              <div className="mt-2">
                <Slider
                  value={[stem.volume]}
                  max={1}
                  min={0}
                  step={0.01}
                  onValueChange={([value]) => mixer.setStemVolume(stem.id, value)}
                  className="h-16 w-full"
                  orientation="vertical"
                />
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-zinc-700 bg-zinc-800/60 p-4">
        <h3 className="text-sm font-semibold text-zinc-200">Effects</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-zinc-400">Reverb</label>
            <Slider
              value={[mixer.effects.reverb]}
              max={1}
              min={0}
              step={0.01}
              onValueChange={([value]) => {
                mixer.setEffects({ reverb: value });
                sendEffectUpdate({
                  reverb: value,
                  delay: mixer.effects.delay,
                  eq: mixer.effects.eq,
                });
              }}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Delay</label>
            <Slider
              value={[mixer.effects.delay]}
              max={1}
              min={0}
              step={0.01}
              onValueChange={([value]) => {
                mixer.setEffects({ delay: value });
                sendEffectUpdate({
                  reverb: mixer.effects.reverb,
                  delay: value,
                  eq: mixer.effects.eq,
                });
              }}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">EQ - Low</label>
            <Slider
              value={[mixer.effects.eq.low]}
              max={2}
              min={0}
              step={0.01}
              onValueChange={([value]) => {
                const newEq = { ...mixer.effects.eq, low: value };
                mixer.setEffects({ eq: newEq });
                sendEffectUpdate({
                  reverb: mixer.effects.reverb,
                  delay: mixer.effects.delay,
                  eq: newEq,
                });
              }}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">EQ - Mid</label>
            <Slider
              value={[mixer.effects.eq.mid]}
              max={2}
              min={0}
              step={0.01}
              onValueChange={([value]) => {
                const newEq = { ...mixer.effects.eq, mid: value };
                mixer.setEffects({ eq: newEq });
                sendEffectUpdate({
                  reverb: mixer.effects.reverb,
                  delay: mixer.effects.delay,
                  eq: newEq,
                });
              }}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">EQ - High</label>
            <Slider
              value={[mixer.effects.eq.high]}
              max={2}
              min={0}
              step={0.01}
              onValueChange={([value]) => {
                const newEq = { ...mixer.effects.eq, high: value };
                mixer.setEffects({ eq: newEq });
                sendEffectUpdate({
                  reverb: mixer.effects.reverb,
                  delay: mixer.effects.delay,
                  eq: newEq,
                });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
