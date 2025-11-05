import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  AxisLock,
  GizmoMode,
  GizmoState,
  Layer,
  MutationRecord,
  Pivot,
  PivotMode,
  SelectionSet,
  SnapConfig,
  Transform,
  TransformSpace,
  Vec3,
} from './types';

type PlaybackState = {
  playheadTime: number;
  fps: number;
  duration: number;
  isPlaying: boolean;
};

type CompositorStore = PlaybackState & {
  layers: Layer[];
  activeLayerId: string | null;
  selection: string[];
  selectionSets: SelectionSet[];
  unitScale: number;
  gizmoState: GizmoState;
  undoStack: MutationRecord[];
  redoStack: MutationRecord[];
  telemetry: Array<{
    mutationId: string;
    selectionCount: number;
    transformSpace: TransformSpace;
    snapMode: SnapConfig['mode'];
    undoDepth: number;
    durationMs: number;
  }>;

  // Layer queries
  getLayerById: (id: string) => Layer | undefined;

  // Selection helpers
  setSelection: (ids: string[]) => void;
  setActiveLayer: (id: string | null) => void;

  // Layer operations
  addLayer: (layer: Omit<Layer, 'id'>) => string;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setForwardOpacity: (id: string, opacity: number) => void;
  setWorkareaOpacity: (id: string, opacity: number) => void;
  toggleEditMode: (id: string) => void;
  setEditModeExclusive: (id: string) => void;
  toggleVisibility: (id: string) => void;
  cycleActiveLayer: () => void;
  createGroup: (layerIds: string[], name: string) => void;
  ungroup: (groupId: string) => void;

  // Transform operations
  setLayerTransform: (id: string, updates: Partial<Transform>, options?: { record?: boolean }) => void;
  setTransformSpace: (space: TransformSpace) => void;
  setGizmoMode: (mode: GizmoMode) => void;
  toggleAxisLock: (axis: keyof AxisLock) => void;
  setSnapConfig: (updates: Partial<SnapConfig>) => void;
  toggleGridSnap: (enabled?: boolean) => void;
  setNumericOverride: (value: number | null) => void;
  clearNumericOverride: () => void;

  // Pivot operations
  setPivotToBoundsCenter: (layerId: string) => void;
  setPivotToTargetPivot: (layerId: string, targetLayerId: string) => void;
  setTemporaryPivot: (layerId: string, pivot: Pivot) => void;
  clearTemporaryPivot: (layerId: string) => void;

  // Parenting
  setParent: (childId: string, parentId: string | null, options?: { maintainOffset: boolean }) => void;

  // Undo/redo + mutations
  applyMutation: (mutation: MutationRecord, options?: { pushToUndo?: boolean; emitTelemetry?: boolean }) => void;
  recordMutation: (mutation: MutationRecord) => void;
  undo: () => void;
  redo: () => void;

  // Selection sets
  saveSelectionSet: (name: string) => string;
  deleteSelectionSet: (id: string) => void;
  recallSelectionSet: (id: string) => void;

  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setPlayheadTime: (time: number) => void;
};

const MAX_UNDO_DEPTH = 256;

const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

const defaultGizmoState = (): GizmoState => ({
  mode: 'translate',
  space: 'world',
  axisLock: { x: false, y: false, z: false },
  snap: { mode: 'none', step: 0.1, angle: 15 },
  numericOverride: { active: false, value: null },
});

const clampUndoStack = (stack: MutationRecord[]): MutationRecord[] =>
  stack.length > MAX_UNDO_DEPTH ? stack.slice(stack.length - MAX_UNDO_DEPTH) : stack;

const withPivotMode = (pivot: Pivot, mode: PivotMode): Pivot => ({
  ...pivot,
  mode,
});

const updateTransform = (transform: Transform, updates: Partial<Transform>): Transform => ({
  position: updates.position ? { ...transform.position, ...updates.position } : transform.position,
  rotation: updates.rotation ? { ...transform.rotation, ...updates.rotation } : transform.rotation,
  scale: updates.scale ? { ...transform.scale, ...updates.scale } : transform.scale,
});

const defaultLayers: Layer[] = [
  {
    id: 'camera-feed',
    name: 'Outward Camera',
    parentId: null,
    visible: true,
    locked: false,
    transform: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    pivot: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), mode: 'layer' },
    flags: { editMode: false, selectable: true },
    meta: { unitScale: 1 },
    type: 'camera-feed',
    zIndex: 0,
    captureToOutput: true,
    blendMode: 'normal',
    workareaOpacity: 0.3,
    opacity: 1,
  },
  {
    id: 'html-particles',
    name: 'Particles (Behind 3D)',
    parentId: null,
    visible: true,
    locked: false,
    transform: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    pivot: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), mode: 'layer' },
    flags: { editMode: false, selectable: true },
    meta: { unitScale: 1 },
    type: 'html-behind',
    zIndex: 1,
    captureToOutput: true,
    blendMode: 'add',
    workareaOpacity: 0.5,
    opacity: 0.8,
    htmlSource: '/particles.html',
    renderMode: 'texture',
  },
  {
    id: 'scene-3d',
    name: '3D Scene (Avatar)',
    parentId: null,
    visible: true,
    locked: false,
    transform: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    pivot: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), mode: 'layer' },
    flags: { editMode: true, selectable: true },
    meta: { unitScale: 1 },
    type: 'scene-3d',
    zIndex: 2,
    captureToOutput: true,
    blendMode: 'normal',
    workareaOpacity: 1,
    opacity: 1,
  },
  {
    id: 'html-overlay',
    name: 'UI Overlay',
    parentId: null,
    visible: true,
    locked: false,
    transform: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    pivot: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), mode: 'layer' },
    flags: { editMode: false, selectable: true },
    meta: { unitScale: 1 },
    type: 'html-overlay',
    zIndex: 3,
    captureToOutput: true,
    blendMode: 'normal',
    workareaOpacity: 0.7,
    opacity: 1,
    htmlSource: '/overlay.html',
    renderMode: 'overlay',
  },
  {
    id: 'hud',
    name: 'Direction HUD',
    parentId: null,
    visible: true,
    locked: false,
    transform: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    pivot: { position: vec3(0, 0, 0), rotation: vec3(0, 0, 0), mode: 'layer' },
    flags: { editMode: false, selectable: false },
    meta: { unitScale: 1 },
    type: 'hud',
    zIndex: 4,
    captureToOutput: true,
    blendMode: 'normal',
    workareaOpacity: 1,
    opacity: 1,
  },
];

const initialPlayback: PlaybackState = {
  playheadTime: 0,
  fps: 60,
  duration: 300,
  isPlaying: false,
};

const applyLayerMutation = (layer: Layer, mutation: MutationRecord): Layer => {
  switch (mutation.type) {
    case 'transform':
      return {
        ...layer,
        transform: updateTransform(layer.transform, mutation.after?.transform ?? {}),
      };
    case 'pivot_edit':
      return {
        ...layer,
        pivot: {
          position: mutation.after?.pivot?.position ?? layer.pivot.position,
          rotation: mutation.after?.pivot?.rotation ?? layer.pivot.rotation,
          mode: mutation.after?.pivot?.mode ?? layer.pivot.mode,
        },
      };
    case 'scene_parent':
      return {
        ...layer,
        parentId: mutation.after?.parentId ?? null,
        transform: mutation.after?.transform
          ? updateTransform(layer.transform, mutation.after.transform)
          : layer.transform,
      };
    case 'snap_config':
      return layer;
    default:
      return layer;
  }
};

const invertMutation = (mutation: MutationRecord): MutationRecord => ({
  ...mutation,
  before: mutation.after,
  after: mutation.before,
});

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:8000';

const postMutationTelemetry = (payload: Record<string, any>) => {
  if (typeof fetch === 'undefined') {
    return;
  }
  try {
    fetch(`${API_BASE}/mutations/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  } catch (error) {
    console.warn('[Telemetry] Failed to emit mutation telemetry', error);
  }
};

export const useCompositor = create<CompositorStore>((set, get) => ({
  ...initialPlayback,
  layers: defaultLayers,
  activeLayerId: 'scene-3d',
  selection: ['scene-3d'],
  selectionSets: [],
  unitScale: 1,
  gizmoState: defaultGizmoState(),
  undoStack: [],
  redoStack: [],
  telemetry: [],

  getLayerById: (id) => get().layers.find((layer) => layer.id === id),

  setSelection: (ids) => {
    set({
      selection: ids,
      activeLayerId: ids.length > 0 ? ids[ids.length - 1] : null,
    });
  },

  setActiveLayer: (id) => {
    if (!id) {
      set({ activeLayerId: null, selection: [] });
      return;
    }
    const selection = new Set(get().selection);
    selection.add(id);
    set({ activeLayerId: id, selection: Array.from(selection) });
  },

  addLayer: (layer) => {
    const id = layer.id ?? nanoid();
    const nextLayer: Layer = {
      ...layer,
      id,
      transform: layer.transform ?? { position: vec3(), rotation: vec3(), scale: vec3(1, 1, 1) },
      pivot: layer.pivot ?? { position: vec3(), rotation: vec3(), mode: 'layer' },
      flags: layer.flags ?? { editMode: false, selectable: true },
      meta: layer.meta ?? { unitScale: get().unitScale },
    };

    set((state) => ({
      layers: [...state.layers, nextLayer].map((l, index) => ({ ...l, zIndex: index })),
    }));

    return id;
  },

  updateLayer: (id, updates) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              ...updates,
              transform: updates.transform
                ? updateTransform(layer.transform, updates.transform)
                : layer.transform,
              pivot: updates.pivot ? { ...layer.pivot, ...updates.pivot } : layer.pivot,
              flags: updates.flags ? { ...layer.flags, ...updates.flags } : layer.flags,
              meta: updates.meta ? { ...layer.meta, ...updates.meta } : layer.meta,
            }
          : layer
      ),
    }));
  },

  removeLayer: (id) => {
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
      selection: state.selection.filter((layerId) => layerId !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    }));
  },

  reorderLayers: (fromIndex, toIndex) => {
    set((state) => {
      const layers = [...state.layers];
      const [moved] = layers.splice(fromIndex, 1);
      layers.splice(toIndex, 0, moved);
      return {
        layers: layers.map((layer, index) => ({ ...layer, zIndex: index })),
      };
    });
  },

  setForwardOpacity: (id, opacity) => {
    const value = Math.max(0, Math.min(1, opacity));
    get().updateLayer(id, { opacity: value });
  },

  setWorkareaOpacity: (id, opacity) => {
    const value = Math.max(0, Math.min(1, opacity));
    get().updateLayer(id, { workareaOpacity: value });
  },

  toggleEditMode: (id) => {
    const layer = get().getLayerById(id);
    if (!layer) return;
    get().updateLayer(id, { flags: { ...layer.flags, editMode: !layer.flags.editMode } });
  },

  setEditModeExclusive: (id) => {
    set((state) => ({
      layers: state.layers.map((layer) => ({
        ...layer,
        flags: {
          ...layer.flags,
          editMode: layer.id === id,
        },
      })),
      activeLayerId: id,
      selection: [id],
    }));
  },

  toggleVisibility: (id) => {
    const layer = get().getLayerById(id);
    if (!layer) return;
    get().updateLayer(id, { visible: !layer.visible });
  },

  cycleActiveLayer: () => {
    const { layers, activeLayerId } = get();
    if (!layers.length) return;
    const currentIndex = layers.findIndex((layer) => layer.id === activeLayerId);
    const nextIndex = (currentIndex + 1) % layers.length;
    const nextLayer = layers[nextIndex];
    get().setSelection([nextLayer.id]);
  },

  createGroup: (layerIds, name) => {
    console.log('[Compositor] Create group:', name, layerIds);
  },

  ungroup: (groupId) => {
    console.log('[Compositor] Ungroup:', groupId);
  },

  setLayerTransform: (id, updates, options = {}) => {
    const layer = get().getLayerById(id);
    if (!layer) return;

    const before = { transform: layer.transform };
    const after = { transform: updateTransform(layer.transform, updates) };
    const mutation: MutationRecord = {
      id: nanoid(),
      ts: Date.now(),
      type: 'transform',
      before,
      after,
      selection: get().selection,
    };

    if (options.record === false) {
      set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? { ...l, transform: after.transform } : l)),
      }));
      return;
    }

    get().recordMutation(mutation);
  },

  setTransformSpace: (space) => {
    set((state) => ({
      gizmoState: {
        ...state.gizmoState,
        space,
      },
    }));
  },

  setGizmoMode: (mode) => {
    set((state) => ({
      gizmoState: {
        ...state.gizmoState,
        mode,
      },
    }));
  },

  toggleAxisLock: (axis) => {
    set((state) => ({
      gizmoState: {
        ...state.gizmoState,
        axisLock: {
          ...state.gizmoState.axisLock,
          [axis]: !state.gizmoState.axisLock[axis],
        },
      },
    }));
  },

  setSnapConfig: (updates) => {
    const mutation: MutationRecord = {
      id: nanoid(),
      ts: Date.now(),
      type: 'snap_config',
      before: { snap: get().gizmoState.snap },
      after: { snap: { ...get().gizmoState.snap, ...updates } },
      selection: get().selection,
    };
    get().recordMutation(mutation);
    set((state) => ({
      gizmoState: {
        ...state.gizmoState,
        snap: { ...state.gizmoState.snap, ...updates },
      },
    }));
  },

  toggleGridSnap: (enabled) => {
    const currentMode = get().gizmoState.snap.mode;
    const nextMode = enabled ?? currentMode !== 'grid';
    get().setSnapConfig({ mode: nextMode ? 'grid' : 'none' });
  },

  setNumericOverride: (value) => {
    set((state) => ({
      gizmoState: {
        ...state.gizmoState,
        numericOverride: { active: value !== null, value },
      },
    }));
  },

  clearNumericOverride: () => {
    set((state) => ({
      gizmoState: {
        ...state.gizmoState,
        numericOverride: { active: false, value: null },
      },
    }));
  },

  setPivotToBoundsCenter: (layerId) => {
    const layer = get().getLayerById(layerId);
    if (!layer) return;

    // Placeholder: using current transform as bounds center.
    const boundsCenter = layer.transform.position;
    const before = { pivot: layer.pivot };
    const after = {
      pivot: {
        position: { ...boundsCenter },
        rotation: { ...layer.pivot.rotation },
        mode: 'bounds_center' as PivotMode,
      },
    };
    const mutation: MutationRecord = {
      id: nanoid(),
      ts: Date.now(),
      type: 'pivot_edit',
      before,
      after,
      selection: [layerId],
    };
    get().recordMutation(mutation);
  },

  setPivotToTargetPivot: (layerId, targetLayerId) => {
    const layer = get().getLayerById(layerId);
    const target = get().getLayerById(targetLayerId);
    if (!layer || !target) return;

    const before = { pivot: layer.pivot };
    const after = {
      pivot: {
        position: { ...target.pivot.position },
        rotation: { ...target.pivot.rotation },
        mode: 'target_pivot' as PivotMode,
      },
    };
    const mutation: MutationRecord = {
      id: nanoid(),
      ts: Date.now(),
      type: 'pivot_edit',
      before,
      after,
      selection: [layerId],
    };
    get().recordMutation(mutation);
  },

  setTemporaryPivot: (layerId, pivot) => {
    const layer = get().getLayerById(layerId);
    if (!layer) return;

    const before = { pivot: layer.pivot };
    const after = { pivot: withPivotMode(pivot, 'temporary') };
    const mutation: MutationRecord = {
      id: nanoid(),
      ts: Date.now(),
      type: 'pivot_edit',
      before,
      after,
      selection: [layerId],
    };
    get().recordMutation(mutation);
  },

  clearTemporaryPivot: (layerId) => {
    const layer = get().getLayerById(layerId);
    if (!layer) return;
    const before = { pivot: layer.pivot };
    const after = {
      pivot: { position: vec3(), rotation: vec3(), mode: 'layer' as PivotMode },
    };
    const mutation: MutationRecord = {
      id: nanoid(),
      ts: Date.now(),
      type: 'pivot_edit',
      before,
      after,
      selection: [layerId],
    };
    get().recordMutation(mutation);
  },

  setParent: (childId, parentId, options = { maintainOffset: true }) => {
    const child = get().getLayerById(childId);
    if (!child) return;

    const before = { parentId: child.parentId, transform: child.transform };
    let afterTransform = child.transform;

    if (!options.maintainOffset && parentId) {
      afterTransform = {
        position: vec3(),
        rotation: vec3(),
        scale: { ...child.transform.scale },
      };
    }

    const after = { parentId, transform: afterTransform };
    const mutation: MutationRecord = {
      id: nanoid(),
      ts: Date.now(),
      type: 'scene_parent',
      before,
      after,
      selection: [childId],
    };

    get().recordMutation(mutation);
  },

  applyMutation: (mutation, options = { pushToUndo: false, emitTelemetry: false }) => {
    const { pushToUndo = false, emitTelemetry = false } = options;
    const preState = get();
    const contextBase = {
      mutationId: mutation.id,
      selectionCount: mutation.selection.length,
      transformSpace: preState.gizmoState.space,
      snapMode: preState.gizmoState.snap.mode,
      undoDepth: preState.undoStack.length,
      durationMs: 0,
    };
    const start = now();
    set((state) => ({
      layers: state.layers.map((layer) =>
        mutation.selection.includes(layer.id) ? applyLayerMutation(layer, mutation) : layer
      ),
      undoStack: pushToUndo ? clampUndoStack([...state.undoStack, mutation]) : state.undoStack,
    }));

    if (emitTelemetry) {
      const durationMs = now() - start;
      const currentState = get();
      const telemetryEntry = {
        ...contextBase,
        undoDepth: currentState.undoStack.length,
        durationMs,
      };
      set((state) => ({
        telemetry: [...state.telemetry, telemetryEntry],
      }));

      postMutationTelemetry({
        mutation: {
          ...mutation,
          meta: mutation.meta ?? {},
        },
        context: {
          selection_count: telemetryEntry.selectionCount,
          transform_space: telemetryEntry.transformSpace,
          snap_mode: telemetryEntry.snapMode,
          undo_depth: telemetryEntry.undoDepth,
          duration_ms: telemetryEntry.durationMs,
        },
      });
    }
  },

  recordMutation: (mutation) => {
    get().applyMutation(mutation, { pushToUndo: true, emitTelemetry: true });
    set({ redoStack: [] });
  },

  undo: () => {
    const stack = [...get().undoStack];
    if (!stack.length) return;
    const mutation = stack.pop()!;
    const inverted = invertMutation(mutation);
    get().applyMutation(inverted, { pushToUndo: false, emitTelemetry: true });
    set((state) => ({
      undoStack: stack,
      redoStack: [...state.redoStack, mutation],
    }));
  },

  redo: () => {
    const stack = [...get().redoStack];
    if (!stack.length) return;
    const mutation = stack.pop()!;
    get().applyMutation(mutation, { pushToUndo: true, emitTelemetry: true });
    set((state) => ({
      redoStack: stack,
    }));
  },

  saveSelectionSet: (name) => {
    const id = nanoid();
    const selection = get().selection;
    set((state) => ({
      selectionSets: [...state.selectionSets, { id, name, layerIds: selection }],
    }));
    return id;
  },

  deleteSelectionSet: (id) => {
    set((state) => ({
      selectionSets: state.selectionSets.filter((set) => set.id !== id),
    }));
  },

  recallSelectionSet: (id) => {
    const setDef = get().selectionSets.find((set) => set.id === id);
    if (!setDef) return;
    get().setSelection(setDef.layerIds);
  },

  play: () => {
    set({ isPlaying: true });
  },

  pause: () => {
    set({ isPlaying: false });
  },

  stop: () => {
    set({ isPlaying: false, playheadTime: 0 });
  },

  seek: (time) => {
    set({ playheadTime: Math.max(0, Math.min(time, get().duration)) });
  },

  setPlayheadTime: (time) => {
    set({ playheadTime: time });
  },
}));
