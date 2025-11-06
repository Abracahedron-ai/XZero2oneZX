import { useState, useCallback } from 'react';

export interface Keyframe {
  time: number;
  value: any;
  interpolation?: 'linear' | 'bezier' | 'step';
}

export interface Track {
  id: string;
  name: string;
  layerId: string;
  property: string;
  keyframes: Keyframe[];
}

export interface Marker {
  time: number;
  label: string;
}

export function useTimeline() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loopIn, setLoopIn] = useState(0);
  const [loopOut, setLoopOut] = useState(300);

  const addKeyframe = useCallback((trackId: string, keyframe: Keyframe) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        const newKeyframes = [...track.keyframes, keyframe].sort((a, b) => a.time - b.time);
        return { ...track, keyframes: newKeyframes };
      }
      return track;
    }));
  }, []);

  const removeKeyframe = useCallback((trackId: string, time: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        return { ...track, keyframes: track.keyframes.filter(kf => kf.time !== time) };
      }
      return track;
    }));
  }, []);

  const evaluateAll = useCallback((time: number): Record<string, any> => {
    const result: Record<string, any> = {};
    
    tracks.forEach(track => {
      if (track.keyframes.length === 0) return;
      
      // Find surrounding keyframes
      const before = track.keyframes.filter(kf => kf.time <= time).pop();
      const after = track.keyframes.find(kf => kf.time > time);
      
      if (!before && !after) return;
      if (!after) {
        result[track.property] = before!.value;
        return;
      }
      if (!before) {
        result[track.property] = after.value;
        return;
      }
      
      // Linear interpolation
      const t = (time - before.time) / (after.time - before.time);
      if (typeof before.value === 'number' && typeof after.value === 'number') {
        result[track.property] = before.value + (after.value - before.value) * t;
      } else {
        result[track.property] = before.value;
      }
    });
    
    return result;
  }, [tracks]);

  const addTrack = useCallback((track: Omit<Track, 'id'>) => {
    const newTrack: Track = {
      ...track,
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setTracks(prev => [...prev, newTrack]);
    return newTrack.id;
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
  }, []);

  const addMarker = useCallback((marker: Marker) => {
    setMarkers(prev => [...prev, marker].sort((a, b) => a.time - b.time));
  }, []);

  const removeMarker = useCallback((time: number) => {
    setMarkers(prev => prev.filter(m => m.time !== time));
  }, []);

  return {
    tracks,
    markers,
    loopIn,
    loopOut,
    setLoopIn,
    setLoopOut,
    addKeyframe,
    removeKeyframe,
    evaluateAll,
    addTrack,
    removeTrack,
    addMarker,
    removeMarker,
  };
}

