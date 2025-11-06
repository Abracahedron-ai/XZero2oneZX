import { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCompositor } from '../lib/compositor';
import type { Transform, MutationRecord } from '../lib/types';
import { nanoid } from 'nanoid';

type DragAxis = 'x' | 'y' | 'z';

type DragState = {
  axis: DragAxis;
  layerId: string;
  startPoint: THREE.Vector3;
  initialTransform: Transform;
};

export default function Gizmo() {
  const gizmoRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const activeLayerId = useCompositor((state) => state.activeLayerId);
  const layers = useCompositor((state) => state.layers);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const activeLayer = layers.find((layer) => layer.id === activeLayerId);

  const cloneTransform = useCallback((transform: Transform): Transform => ({
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: { ...transform.scale },
  }), []);

  const finishDrag = useCallback(() => {
    if (!dragState) return;

    const state = useCompositor.getState();
    const layer = state.getLayerById(dragState.layerId);
    if (!layer) {
      setDragState(null);
      setIsDragging(false);
      return;
    }

    const finalTransform = cloneTransform(layer.transform);
    const delta =
      finalTransform.position[dragState.axis] -
      dragState.initialTransform.position[dragState.axis];

    if (Math.abs(delta) > 1e-5) {
      const mutation: MutationRecord = {
        id: nanoid(),
        ts: Date.now(),
        type: 'transform',
        before: { transform: cloneTransform(dragState.initialTransform) },
        after: { transform: finalTransform },
        selection: [dragState.layerId],
      };
      state.recordMutation(mutation);
    } else {
      // Snap back to initial if no meaningful movement occurred
      state.setLayerTransform(
        dragState.layerId,
        { position: { [dragState.axis]: dragState.initialTransform.position[dragState.axis] } },
        { record: false }
      );
    }

    setDragState(null);
    setIsDragging(false);
  }, [dragState, cloneTransform]);

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerUp = () => finishDrag();
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [isDragging, finishDrag]);

  const axisVector = (axis: DragAxis) => {
    switch (axis) {
      case 'x':
        return new THREE.Vector3(1, 0, 0);
      case 'y':
        return new THREE.Vector3(0, 1, 0);
      case 'z':
      default:
        return new THREE.Vector3(0, 0, 1);
    }
  };

  const handlePointerDown = (axis: DragAxis) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    event.preventDefault();

    const state = useCompositor.getState();
    if (state.gizmoState.axisLock[axis]) return;
    if (state.gizmoState.mode !== 'translate') return;

    const layerId = state.activeLayerId;
    if (!layerId) return;
    const layer = state.getLayerById(layerId);
    if (!layer || layer.locked) return;

    setIsDragging(true);
    setDragState({
      axis,
      layerId,
      startPoint: event.point.clone(),
      initialTransform: cloneTransform(layer.transform),
    });
  };

  const handlePointerMove = (axis: DragAxis) => (event: ThreeEvent<PointerEvent>) => {
    if (!dragState || dragState.axis !== axis) return;
    event.stopPropagation();
    event.preventDefault();

    const state = useCompositor.getState();
    if (state.gizmoState.mode !== 'translate') return;

    const axisVec = axisVector(axis);
    const deltaVec = new THREE.Vector3().subVectors(event.point, dragState.startPoint);
    const displacement = deltaVec.dot(axisVec);
    const nextValue = dragState.initialTransform.position[axis] + displacement;

    state.setLayerTransform(
      dragState.layerId,
      { position: { [axis]: nextValue } },
      { record: false }
    );
  };

  const handlePointerUp = (axis: DragAxis) => (event: ThreeEvent<PointerEvent>) => {
    if (!dragState || dragState.axis !== axis) return;
    event.stopPropagation();
    event.preventDefault();
    finishDrag();
  };

  useFrame(() => {
    if (!gizmoRef.current || !activeLayer) return;

    // Position gizmo at active layer's position
    const { position } = activeLayer.transform;
    gizmoRef.current.position.set(position.x, position.y, position.z);
  });

  if (!activeLayer?.visible) return null;

  return (
    <group ref={gizmoRef}>
      {/* X axis (red) */}
      <mesh
        position={[0.5, 0, 0]}
        onPointerDown={handlePointerDown('x')}
        onPointerMove={handlePointerMove('x')}
        onPointerUp={handlePointerUp('x')}
      >
        <boxGeometry args={[1, 0.05, 0.05]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh position={[1.1, 0, 0]}>
        <coneGeometry args={[0.1, 0.2, 4]} rotation={[0, 0, -Math.PI / 2]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {/* Y axis (green) */}
      <mesh
        position={[0, 0.5, 0]}
        onPointerDown={handlePointerDown('y')}
        onPointerMove={handlePointerMove('y')}
        onPointerUp={handlePointerUp('y')}
      >
        <boxGeometry args={[0.05, 1, 0.05]} />
        <meshBasicMaterial color="green" />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshBasicMaterial color="green" />
      </mesh>

      {/* Z axis (blue) */}
      <mesh
        position={[0, 0, 0.5]}
        onPointerDown={handlePointerDown('z')}
        onPointerMove={handlePointerMove('z')}
        onPointerUp={handlePointerUp('z')}
      >
        <boxGeometry args={[0.05, 0.05, 1]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      <mesh position={[0, 0, 1.1]}>
        <coneGeometry args={[0.1, 0.2, 4]} rotation={[Math.PI / 2, 0, 0]} />
        <meshBasicMaterial color="blue" />
      </mesh>

      {/* Center sphere */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
}
