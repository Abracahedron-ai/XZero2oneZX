import { create } from 'zustand';

interface Layer {
  id: string;
  name: string;
  parentId: string | null;
  visible: boolean;
  locked: boolean;
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  pivot: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    mode: 'layer' | 'world';
  };
  flags: {
    editMode: boolean;
    selectable: boolean;
  };
  meta: {
    unitScale: number;
    description?: string;
  };
  type?: string;
  zIndex: number;
  captureToOutput: boolean;
  blendMode: string;
  workareaOpacity?: number;
  opacity?: number;
}

interface CompositorStore {
  layers: Layer[];
  activeLayerId: string | null;
  setActiveLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setForwardOpacity: (id: string, opacity: number) => void;
  setWorkareaOpacity: (id: string, opacity: number) => void;
  toggleEditMode: (id: string) => void;
  setEditModeExclusive: (id: string) => void;
  // Playback state
  playheadTime: number;
  fps: number;
  duration: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
}

export const useCompositor = create<CompositorStore>((set) => ({
  layers: [],
  activeLayerId: null,
  setActiveLayer: (id) => set({ activeLayerId: id }),
  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer)),
    })),
  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    })),
  reorderLayers: (fromIndex, toIndex) =>
    set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return { layers: newLayers };
    }),
  setForwardOpacity: (id, opacity) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, opacity: opacity ?? 1 } : layer
      ),
    })),
  setWorkareaOpacity: (id, opacity) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, workareaOpacity: opacity ?? 1 } : layer
      ),
    })),
  toggleEditMode: (id) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id
          ? { ...layer, flags: { ...layer.flags, editMode: !layer.flags.editMode } }
          : layer
      ),
    })),
  setEditModeExclusive: (id) =>
    set((state) => ({
      layers: state.layers.map((layer) => ({
        ...layer,
        flags: { ...layer.flags, editMode: layer.id === id },
      })),
    })),
  // Playback state
  playheadTime: 0,
  fps: 60,
  duration: 300, // 5 seconds at 60fps
  isPlaying: false,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, playheadTime: 0 }),
  seek: (time) => set((state) => ({ playheadTime: Math.max(0, Math.min(time, state.duration)) })),
}));

