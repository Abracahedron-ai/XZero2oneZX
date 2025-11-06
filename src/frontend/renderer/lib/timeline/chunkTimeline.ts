// Chunk-based Timeline Data Model
// Based on spec: AE layer stack + mobile NLE with touch-first chunk editing

export type TrackKind = 'keyGrip' | 'overlayFront' | 'overlayBack' | 'scene';
export type ClipType = 'clip' | 'gap' | 'group';
export type RippleMode = 'none' | 'auto' | 'force';

export interface ZAnimKeyframe {
  t: number; // ms
  z: number;
}

export interface Transform {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
}

export interface ClipParams {
  zAnim?: ZAnimKeyframe[];
  transform?: Transform;
  blend?: 'screen' | 'multiply' | 'add' | 'normal';
  easing?: string;
  [key: string]: any;
}

export interface Clip {
  id: string;
  trackId: string;
  type: ClipType;
  start: number; // ms on master clock
  end: number; // ms on master clock
  payloadRef: string; // asset://... or rig, mesh, video, KG helper
  params?: ClipParams;
  labels?: string[];
  locks?: { time: boolean; content: boolean };
  mute?: boolean;
  solo?: boolean;
  groupId?: string; // if part of a group
}

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  visible: boolean;
  locked: boolean;
  clips: string[]; // clip IDs, order defines left→right
  zStack: number; // base zIndex within its family
}

export interface KGAnchor {
  id: string;
  kind: 'anchor' | 'marker' | 'socket';
  T_w: {
    pos: [number, number, number];
    rot: [number, number, number];
  };
  tags?: string[];
  timeMs?: number; // for time-based anchors
}

export interface TimelineState {
  timeMs: number;
  fpsNominal: number;
  snap: {
    gridMs: number;
    enable: boolean;
  };
  selection: {
    clips: string[];
  };
  rippleMode: RippleMode;
  playheadShuttle: number; // playback rate; can be negative for reverse
}

export interface TimelineData {
  tracks: Track[];
  clips: Record<string, Clip>;
  kgAnchors: KGAnchor[];
  state: TimelineState;
}

// Operations
export interface TimelineOperations {
  // Clip operations
  insertClip: (
    trackId: string,
    payloadRef: string,
    startMs: number,
    durMs: number,
    params?: ClipParams
  ) => string; // returns clip ID
  
  deleteSelection: (ripple?: boolean) => void;
  
  moveChunk: (
    clipIds: string[],
    deltaMs: number,
    targetTrackId?: string
  ) => void;
  
  trimEdge: (
    clipId: string,
    edge: 'in' | 'out',
    toMs: number,
    rippleMode?: RippleMode
  ) => void;
  
  splitAtPlayhead: (trackId: string) => void;
  
  promoteOverlayToScenePlane: (clipId: string) => string; // returns new clip ID
  
  setClipParam: (
    clipId: string,
    path: string,
    value: any
  ) => void;
  
  group: (clipIds: string[]) => string; // returns group ID
  
  ungroup: (groupId: string) => void;
  
  // Track operations
  addTrack: (kind: TrackKind, name: string) => string;
  
  removeTrack: (trackId: string) => void;
  
  // KG operations
  addKGAnchor: (anchor: Omit<KGAnchor, 'id'>) => string;
  
  removeKGAnchor: (anchorId: string) => void;
  
  // State operations
  seek: (timeMs: number) => void;
  
  setSelection: (clipIds: string[]) => void;
  
  toggleSnap: () => void;
  
  setRippleMode: (mode: RippleMode) => void;
}

// Helper functions
export function getClipDuration(clip: Clip): number {
  return clip.end - clip.start;
}

export function getClipAtTime(track: Track, clips: Record<string, Clip>, timeMs: number): Clip | null {
  for (const clipId of track.clips) {
    const clip = clips[clipId];
    if (clip && clip.start <= timeMs && clip.end >= timeMs) {
      return clip;
    }
  }
  return null;
}

export function getClipsInRange(
  track: Track,
  clips: Record<string, Clip>,
  startMs: number,
  endMs: number
): Clip[] {
  return track.clips
    .map(id => clips[id])
    .filter(clip => clip && !(clip.end < startMs || clip.start > endMs));
}

export function snapToGrid(timeMs: number, gridMs: number): number {
  return Math.round(timeMs / gridMs) * gridMs;
}

export function snapToKGAnchor(timeMs: number, anchors: KGAnchor[], threshold: number = 100): number | null {
  const timeAnchors = anchors.filter(a => a.timeMs !== undefined);
  if (timeAnchors.length === 0) return null;
  
  let closest: KGAnchor | null = null;
  let minDist = Infinity;
  
  for (const anchor of timeAnchors) {
    if (anchor.timeMs === undefined) continue;
    const dist = Math.abs(timeMs - anchor.timeMs);
    if (dist < threshold && dist < minDist) {
      minDist = dist;
      closest = anchor;
    }
  }
  
  return closest?.timeMs ?? null;
}

// Render order evaluation
export function evaluateRenderOrder(
  data: TimelineData,
  timeMs: number
): {
  backOverlays: Clip[];
  sceneClips: Clip[];
  frontOverlays: Clip[];
} {
  const backOverlays: Clip[] = [];
  const sceneClips: Clip[] = [];
  const frontOverlays: Clip[] = [];
  
  for (const track of data.tracks) {
    if (!track.visible) continue;
    
    const clip = getClipAtTime(track, data.clips, timeMs);
    if (!clip || clip.mute) continue;
    
    switch (track.kind) {
      case 'overlayBack':
        backOverlays.push(clip);
        break;
      case 'scene':
        sceneClips.push(clip);
        break;
      case 'overlayFront':
        frontOverlays.push(clip);
        break;
      case 'keyGrip':
        // KG not rendered, but can be used for evaluation
        break;
    }
  }
  
  // Sort by zStack, then by zAnim if present
  const sortByZ = (a: Clip, b: Clip) => {
    const aTrack = data.tracks.find(t => t.id === a.trackId);
    const bTrack = data.tracks.find(t => t.id === b.trackId);
    const aZ = aTrack?.zStack ?? 0;
    const bZ = bTrack?.zStack ?? 0;
    
    if (aZ !== bZ) return aZ - bZ;
    
    // If both have zAnim, evaluate at current time
    const aZAnim = a.params?.zAnim?.find(kf => kf.t <= timeMs)?.z ?? 0;
    const bZAnim = b.params?.zAnim?.find(kf => kf.t <= timeMs)?.z ?? 0;
    
    return aZAnim - bZAnim;
  };
  
  backOverlays.sort(sortByZ);
  sceneClips.sort(sortByZ);
  frontOverlays.sort(sortByZ);
  
  return { backOverlays, sceneClips, frontOverlays };
}

