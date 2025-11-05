import { create } from 'zustand';

export type InterpolationType = 'linear' | 'step' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Keyframe {
  time: number;        // Frame number or seconds
  value: any;         // Value at this keyframe
  interpolation: InterpolationType;
  easeIn?: number;    // Bezier handle (0-1)
  easeOut?: number;   // Bezier handle (0-1)
}

export interface Track {
  id: string;
  layerId: string;
  name: string;       // e.g., 'Position X', 'Blend.smile', 'Valence'
  property: string;   // e.g., 'transform.position.x', 'blend.smile', 'valence'
  keyframes: Keyframe[];
  muted: boolean;
  locked: boolean;
  color?: string;     // Track color in timeline
}

export interface Marker {
  time: number;
  label: string;
  color?: string;
}

export interface TimelineStore {
  tracks: Track[];
  markers: Marker[];
  loopIn: number;
  loopOut: number;
  snapToFrames: boolean;
  snapToBeats: boolean;
  bpm: number;
  
  // Track operations
  addTrack: (track: Omit<Track, 'id'>) => string;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  
  // Keyframe operations
  addKeyframe: (trackId: string, keyframe: Keyframe) => void;
  removeKeyframe: (trackId: string, time: number) => void;
  updateKeyframe: (trackId: string, time: number, updates: Partial<Keyframe>) => void;
  moveKeyframe: (trackId: string, oldTime: number, newTime: number) => void;
  
  // Block operations (pose snapshots)
  addBlockKeys: (layerId: string, time: number, snapshot: any) => void;
  
  // Markers
  addMarker: (marker: Marker) => void;
  removeMarker: (time: number) => void;
  
  // Evaluation
  evaluateTrack: (trackId: string, time: number) => any;
  evaluateAll: (time: number) => Record<string, any>;
}

export const useTimeline = create<TimelineStore>((set, get) => ({
  tracks: [],
  markers: [],
  loopIn: 0,
  loopOut: 300,
  snapToFrames: true,
  snapToBeats: false,
  bpm: 120,

  addTrack: (track) => {
    const id = `track-${Date.now()}`;
    const newTrack: Track = {
      ...track,
      id,
      keyframes: track.keyframes || [],
      muted: track.muted ?? false,
      locked: track.locked ?? false,
    };
    
    set((state) => ({ tracks: [...state.tracks, newTrack] }));
    return id;
  },

  removeTrack: (id) => {
    set((state) => ({
      tracks: state.tracks.filter(t => t.id !== id),
    }));
  },

  updateTrack: (id, updates) => {
    set((state) => ({
      tracks: state.tracks.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  },

  addKeyframe: (trackId, keyframe) => {
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          const newKeyframes = [...t.keyframes, keyframe].sort((a, b) => a.time - b.time);
          return { ...t, keyframes: newKeyframes };
        }
        return t;
      }),
    }));
  },

  removeKeyframe: (trackId, time) => {
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            keyframes: t.keyframes.filter(k => k.time !== time),
          };
        }
        return t;
      }),
    }));
  },

  updateKeyframe: (trackId, time, updates) => {
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            keyframes: t.keyframes.map(k =>
              k.time === time ? { ...k, ...updates } : k
            ),
          };
        }
        return t;
      }),
    }));
  },

  moveKeyframe: (trackId, oldTime, newTime) => {
    set((state) => ({
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          const keyframes = t.keyframes.map(k =>
            k.time === oldTime ? { ...k, time: newTime } : k
          ).sort((a, b) => a.time - b.time);
          
          return { ...t, keyframes };
        }
        return t;
      }),
    }));
  },

  addBlockKeys: (layerId, time, snapshot) => {
    // Create keyframes for all properties in snapshot
    const { tracks } = get();
    
    Object.entries(snapshot).forEach(([property, value]) => {
      const trackId = tracks.find(t => t.layerId === layerId && t.property === property)?.id;
      
      if (trackId) {
        get().addKeyframe(trackId, {
          time,
          value,
          interpolation: 'linear',
        });
      }
    });
  },

  addMarker: (marker) => {
    set((state) => ({
      markers: [...state.markers, marker].sort((a, b) => a.time - b.time),
    }));
  },

  removeMarker: (time) => {
    set((state) => ({
      markers: state.markers.filter(m => m.time !== time),
    }));
  },

  evaluateTrack: (trackId, time) => {
    const track = get().tracks.find(t => t.id === trackId);
    if (!track || track.muted) return null;

    const { keyframes } = track;
    if (keyframes.length === 0) return null;

    // Find surrounding keyframes
    let before: Keyframe | null = null;
    let after: Keyframe | null = null;

    for (const kf of keyframes) {
      if (kf.time <= time) before = kf;
      if (kf.time >= time && !after) after = kf;
    }

    if (!before) return after?.value ?? null;
    if (!after) return before.value;
    if (before === after) return before.value;

    // Interpolate
    const t = (time - before.time) / (after.time - before.time);
    
    switch (before.interpolation) {
      case 'step':
        return before.value;
      
      case 'linear':
        if (typeof before.value === 'number' && typeof after.value === 'number') {
          return before.value + (after.value - before.value) * t;
        }
        return before.value;
      
      case 'bezier':
        // TODO: Implement bezier interpolation
        return before.value + (after.value - before.value) * t;
      
      default:
        return before.value;
    }
  },

  evaluateAll: (time) => {
    const { tracks } = get();
    const result: Record<string, any> = {};

    tracks.forEach(track => {
      if (!track.muted) {
        const value = get().evaluateTrack(track.id, time);
        if (value !== null) {
          result[track.property] = value;
        }
      }
    });

    return result;
  },
}));
