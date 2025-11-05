import { create } from 'zustand';
import * as THREE from 'three';

export interface Layer {
  id: string;
  type: 'dashboard' | 'avatar' | 'camera' | 'custom';
  name: string;
  visible: boolean;
  zIndex: number;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';
  transform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
  locked: boolean;
}

interface LayerStore {
  layers: Layer[];
  activeLayerId: string | null;
  
  addLayer: (layer: Omit<Layer, 'id'>) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setActiveLayer: (id: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  toggleVisibility: (id: string) => void;
  cycleActiveLayer: () => void;
}

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: [
    {
      id: 'dashboard',
      type: 'dashboard',
      name: 'Dashboard',
      visible: true,
      zIndex: 0,
      opacity: 1,
      blendMode: 'normal',
      transform: {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      },
      locked: false,
    },
    {
      id: 'avatar',
      type: 'avatar',
      name: '3D Avatar',
      visible: true,
      zIndex: 1,
      opacity: 1,
      blendMode: 'normal',
      transform: {
        position: new THREE.Vector3(0, 0, -2),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      },
      locked: false,
    },
    {
      id: 'camera',
      type: 'camera',
      name: 'Outward Camera',
      visible: true,
      zIndex: 2,
      opacity: 1,
      blendMode: 'normal',
      transform: {
        position: new THREE.Vector3(0, 0, -5),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      },
      locked: false,
    },
  ],
  activeLayerId: 'avatar',

  addLayer: (layer) => {
    const newLayer: Layer = {
      ...layer,
      id: `layer-${Date.now()}`,
    };
    set((state) => ({ layers: [...state.layers, newLayer] }));
  },

  removeLayer: (id) => {
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    }));
  },

  updateLayer: (id, updates) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    }));
  },

  setActiveLayer: (id) => {
    set({ activeLayerId: id });
  },

  reorderLayers: (fromIndex, toIndex) => {
    set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      
      // Update z-indices
      return {
        layers: newLayers.map((layer, index) => ({
          ...layer,
          zIndex: index,
        })),
      };
    });
  },

  toggleVisibility: (id) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    }));
  },

  cycleActiveLayer: () => {
    const { layers, activeLayerId } = get();
    const currentIndex = layers.findIndex((l) => l.id === activeLayerId);
    const nextIndex = (currentIndex + 1) % layers.length;
    set({ activeLayerId: layers[nextIndex].id });
  },
}));
