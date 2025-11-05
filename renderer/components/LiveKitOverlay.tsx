/**
 * LiveKit Overlay Component
 * 
 * Overlays LiveKit camera feed with score telemetry.
 * Shows emotion state, activity scores, and camera selection.
 */

import { useState, useEffect } from 'react';
import { Activity, Camera, TrendingUp } from 'lucide-react';

interface LiveKitOverlayProps {
  cameraId: string;
  telemetry: {
    emotion?: string;
    arousal?: number;
    valence?: number;
    confidence?: number;
    activity_score?: number;
    camera_score?: number;
  };
  visible?: boolean;
}

export default function LiveKitOverlay({
  cameraId,
  telemetry,
  visible = true,
}: LiveKitOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Telemetry Overlay */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-zinc-700">
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-zinc-100">{cameraId}</span>
        </div>
        
        <div className="space-y-2 text-xs">
          {telemetry.emotion && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Emotion</span>
              <span className="text-zinc-200 font-medium">{telemetry.emotion}</span>
            </div>
          )}
          
          {telemetry.arousal !== undefined && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400">Arousal</span>
                <span className="text-zinc-300">{telemetry.arousal.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${((telemetry.arousal + 1) / 2) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {telemetry.activity_score !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-400">Activity</span>
              </div>
              <span className="text-zinc-300">{telemetry.activity_score.toFixed(2)}</span>
            </div>
          )}
          
          {telemetry.camera_score !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-400">Score</span>
              </div>
              <span className="text-zinc-300 font-medium">
                {telemetry.camera_score.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Camera Selection Indicator */}
      <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/50 rounded-full px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-300">Active Camera</span>
        </div>
      </div>
    </div>
  );
}

