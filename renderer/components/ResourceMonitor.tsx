import { useEffect, useState } from 'react';
import { Activity, Cpu, MemoryStick, HardDrive } from 'lucide-react';

interface ResourceStats {
  fps: number;
  vram: number;
  vramTotal: number;
  cpu: number;
  ram: number;
  ramTotal: number;
}

export default function ResourceMonitor() {
  const [stats, setStats] = useState<ResourceStats>({
    fps: 60,
    vram: 2048,
    vramTotal: 8192,
    cpu: 45,
    ram: 4096,
    ramTotal: 16384,
  });

  useEffect(() => {
    // Simulate resource monitoring
    // In production, this would query NVML for GPU stats
    const interval = setInterval(() => {
      setStats({
        fps: 55 + Math.random() * 10,
        vram: 2000 + Math.random() * 1000,
        vramTotal: 8192,
        cpu: 40 + Math.random() * 20,
        ram: 4000 + Math.random() * 1000,
        ramTotal: 16384,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const vramPercent = (stats.vram / stats.vramTotal) * 100;
  const ramPercent = (stats.ram / stats.ramTotal) * 100;

  return (
    <div className="absolute bottom-4 right-4 w-72 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Resource Monitor
      </h3>

      <div className="space-y-3">
        {/* FPS */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">FPS</span>
            <span className="text-zinc-300 font-mono">{Math.round(stats.fps)}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.fps > 50 ? 'bg-green-500' : stats.fps > 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${(stats.fps / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* VRAM */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">VRAM</span>
            </div>
            <span className="text-zinc-300 font-mono">
              {Math.round(stats.vram)} / {stats.vramTotal} MB
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                vramPercent < 70 ? 'bg-blue-500' : vramPercent < 85 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${vramPercent}%` }}
            />
          </div>
        </div>

        {/* CPU */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <div className="flex items-center gap-1">
              <MemoryStick className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">CPU</span>
            </div>
            <span className="text-zinc-300 font-mono">{Math.round(stats.cpu)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${stats.cpu}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">RAM</span>
            </div>
            <span className="text-zinc-300 font-mono">
              {Math.round(stats.ram)} / {stats.ramTotal} MB
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${ramPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Auto-scaling status */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Auto-scaling</span>
          <span className={`font-medium ${stats.fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
            {stats.fps < 50 ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>
    </div>
  );
}
