import { create } from 'zustand';

export interface StateVector {
  valence: number;      // -1 to 1 (negative to positive emotion)
  arousal: number;      // 0 to 1 (calm to excited)
  gaze: {
    target: [number, number, number];
    weight: number;     // 0 to 1 (tracking strength)
  };
  pose: {
    head: { pitch: number; yaw: number; roll: number };
    body: { lean: number; twist: number };
  };
  blend: {
    [key: string]: number; // Morph target weights (e.g., smile: 0.8)
  };
  emote: string;        // Current emote name (e.g., 'idle', 'wave', 'think')
  timestamp: number;
}

interface StateVectorStore {
  current: StateVector;
  history: StateVector[];
  maxHistory: number;

  updateState: (updates: Partial<StateVector>) => void;
  updateBlend: (key: string, value: number) => void;
  setEmote: (emote: string) => void;
  setGaze: (target: [number, number, number], weight?: number) => void;
  clearHistory: () => void;
  getStateAtTime: (timestamp: number) => StateVector | null;
}

const defaultState: StateVector = {
  valence: 0,
  arousal: 0.3,
  gaze: {
    target: [0, 0, 1],
    weight: 0.5,
  },
  pose: {
    head: { pitch: 0, yaw: 0, roll: 0 },
    body: { lean: 0, twist: 0 },
  },
  blend: {
    smile: 0,
    frown: 0,
    eyesClosed: 0,
    mouthOpen: 0,
  },
  emote: 'idle',
  timestamp: Date.now(),
};

export const useStateVector = create<StateVectorStore>((set, get) => ({
  current: defaultState,
  history: [],
  maxHistory: 1000, // Keep last 1000 states (~16 seconds at 60fps)

  updateState: (updates) => {
    set((state) => {
      const newState = {
        ...state.current,
        ...updates,
        timestamp: Date.now(),
      };

      const newHistory = [...state.history, state.current];
      if (newHistory.length > state.maxHistory) {
        newHistory.shift();
      }

      return {
        current: newState,
        history: newHistory,
      };
    });
  },

  updateBlend: (key, value) => {
    set((state) => ({
      current: {
        ...state.current,
        blend: {
          ...state.current.blend,
          [key]: Math.max(0, Math.min(1, value)),
        },
        timestamp: Date.now(),
      },
    }));
  },

  setEmote: (emote) => {
    set((state) => ({
      current: {
        ...state.current,
        emote,
        timestamp: Date.now(),
      },
    }));
  },

  setGaze: (target, weight = 1) => {
    set((state) => ({
      current: {
        ...state.current,
        gaze: { target, weight },
        timestamp: Date.now(),
      },
    }));
  },

  clearHistory: () => {
    set({ history: [] });
  },

  getStateAtTime: (timestamp) => {
    const { history, current } = get();
    if (timestamp >= current.timestamp) return current;

    // Binary search for closest timestamp
    let left = 0;
    let right = history.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (history[mid].timestamp === timestamp) {
        return history[mid];
      } else if (history[mid].timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return right >= 0 ? history[right] : null;
  },
}));
