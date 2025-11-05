import { useCallback, useEffect, useRef } from 'react';
import { useCompositor } from '../lib/compositor';
import type { GizmoMode, TransformSpace } from '../lib/types';
import { useTimeline } from '../lib/timeline/tracks';

interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

const spaceByKey: Record<string, TransformSpace> = {
  '1': 'world',
  '2': 'local',
  '3': 'parent',
  '4': 'view',
  '5': 'custom',
};

export const useHotkeys = (enabled = true) => {
  const {
    setSelection,
    cycleActiveLayer,
    toggleVisibility,
    setGizmoMode,
    setTransformSpace,
    toggleAxisLock,
    toggleGridSnap,
  } = useCompositor();

  const previousGizmoMode = useRef<GizmoMode>('translate');

  const resolveLayerProperty = useCallback((layer: any, propertyPath: string) => {
    if (!propertyPath) return undefined;
    return propertyPath.split('.').reduce((acc: any, key: string) => {
      if (acc === undefined || acc === null) return undefined;
      return acc[key];
    }, layer);
  }, []);

  const commitKeyframes = useCallback(() => {
    const { selection, layers, playheadTime } = useCompositor.getState();
    if (!selection.length) return;

    const timeline = useTimeline.getState();
    const tracksSnapshot = [...timeline.tracks];

    selection.forEach((layerId) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      tracksSnapshot
        .filter((track) => track.layerId === layerId && !track.locked)
        .forEach((track) => {
          const evaluated = timeline.evaluateTrack(track.id, playheadTime);
          const fallback = resolveLayerProperty(layer, track.property);
          const value = evaluated ?? fallback ?? 0;

          timeline.addKeyframe(track.id, {
            time: playheadTime,
            value,
            interpolation: 'linear',
          });
        });
    });
  }, [resolveLayerProperty]);

  const hotkeys: HotkeyConfig[] = [
    {
      key: '1',
      action: () => setTransformSpace(spaceByKey['1']),
      description: 'Transform space: World',
    },
    {
      key: '2',
      action: () => setTransformSpace(spaceByKey['2']),
      description: 'Transform space: Local',
    },
    {
      key: '3',
      action: () => setTransformSpace(spaceByKey['3']),
      description: 'Transform space: Parent',
    },
    {
      key: '4',
      action: () => setTransformSpace(spaceByKey['4']),
      description: 'Transform space: View',
    },
    {
      key: '5',
      action: () => setTransformSpace(spaceByKey['5']),
      description: 'Transform space: Custom',
    },
    {
      key: 'Tab',
      action: () => cycleActiveLayer(),
      description: 'Cycle through layers',
    },
    {
      key: 'w',
      action: () => setGizmoMode('translate'),
      description: 'Activate Move tool',
    },
    {
      key: 'e',
      action: () => setGizmoMode('rotate'),
      description: 'Activate Rotate tool',
    },
    {
      key: 'r',
      action: () => setGizmoMode('scale'),
      description: 'Activate Scale tool',
    },
    {
      key: '`',
      action: () => {
        const currentMode = useCompositor.getState().gizmoState.mode;
        if (currentMode === 'pivot') {
          setGizmoMode(previousGizmoMode.current);
        } else {
          previousGizmoMode.current = currentMode;
          setGizmoMode('pivot');
        }
      },
      description: 'Toggle pivot edit mode',
    },
    {
      key: 'x',
      action: () => toggleAxisLock('x'),
      description: 'Toggle X axis lock',
    },
    {
      key: 'y',
      action: () => toggleAxisLock('y'),
      description: 'Toggle Y axis lock',
    },
    {
      key: 'z',
      action: () => toggleAxisLock('z'),
      description: 'Toggle Z axis lock',
    },
    {
      key: 'g',
      ctrl: true,
      action: () => toggleGridSnap(),
      description: 'Toggle grid snap',
    },
    {
      key: 'k',
      ctrl: true,
      action: commitKeyframes,
      description: 'Keyframe selection',
    },
    {
      key: 'h',
      action: () => {
        const activeLayerId = useCompositor.getState().activeLayerId;
        if (!activeLayerId) return;
        toggleVisibility(activeLayerId);
      },
      description: 'Toggle active layer visibility',
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const hotkey = hotkeys.find(
        (h) =>
          h.key.toLowerCase() === event.key.toLowerCase() &&
          !!h.ctrl === event.ctrlKey &&
          !!h.alt === event.altKey &&
          !!h.shift === event.shiftKey
      );

      if (hotkey) {
        event.preventDefault();
        hotkey.action();
        return;
      }

      if (event.key === 'Escape') {
        useCompositor.getState().clearNumericOverride();
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        const { layers } = useCompositor.getState();
        setSelection(layers.map((layer) => layer.id));
        return;
      }

      if (event.altKey && /\d/.test(event.key)) {
        const index = parseInt(event.key, 10) - 1;
        const setDef = useCompositor.getState().selectionSets[index];
        if (setDef) {
          event.preventDefault();
          setSelection(setDef.layerIds);
        }
      }
    },
    [enabled, hotkeys, setSelection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { hotkeys };
};
