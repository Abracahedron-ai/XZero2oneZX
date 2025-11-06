import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useStateVector } from '../lib/stateVector';
import { useCompositor } from '../lib/compositor';

interface AvatarSceneProps {
  povMode?: boolean;
}

function Avatar() {
  const meshRef = useRef<THREE.Group>(null);
  const { current } = useStateVector();
  
  // Placeholder geometry - replace with actual GLTF model
  const geometry = new THREE.BoxGeometry(1, 2, 0.5);
  const material = new THREE.MeshStandardMaterial({ color: '#4a90e2' });

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Apply state vector to avatar
    const { pose, blend, gaze } = current;

    // Head rotation
    meshRef.current.rotation.x = pose.head.pitch;
    meshRef.current.rotation.y = pose.head.yaw;
    meshRef.current.rotation.z = pose.head.roll;

    // Smooth gaze tracking
    if (gaze.weight > 0) {
      const lookTarget = new THREE.Vector3(...gaze.target);
      meshRef.current.lookAt(lookTarget);
      
      // Blend with current rotation
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        meshRef.current.rotation.x,
        1 - gaze.weight
      );
    }

    // Apply morph targets (blend shapes)
    // This would be applied to actual mesh morphTargetInfluences
    // For now, we'll scale the mesh slightly to show "smile"
    const smileScale = 1 + (blend.smile || 0) * 0.1;
    meshRef.current.scale.set(smileScale, smileScale, smileScale);

    // Idle breathing animation
    const breathe = Math.sin(state.clock.elapsedTime * 2) * 0.02;
    meshRef.current.position.y = breathe;
  });

  return (
    <group ref={meshRef}>
      <mesh geometry={geometry} material={material} castShadow />
      {/* Add lights for the avatar */}
      <pointLight position={[2, 3, 2]} intensity={0.8} />
      <pointLight position={[-2, 3, -2]} intensity={0.4} color="#a0c4ff" />
    </group>
  );
}

export default function AvatarScene({ povMode = false }: AvatarSceneProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { current } = useStateVector();
  const avatarLayer = useCompositor((state) =>
    state.layers.find((layer) => layer.type === 'scene-3d')
  );

  useEffect(() => {
    if (!cameraRef.current || !avatarLayer) return;

    // Update camera based on layer transform
    const { position, rotation } = avatarLayer.transform;
    const positionVec = new THREE.Vector3(position.x, position.y, position.z);
    const rotationEuler = new THREE.Euler(rotation.x, rotation.y, rotation.z);
    
    if (povMode) {
      // POV mode: camera is at avatar's eyes
      cameraRef.current.position.copy(positionVec);
      cameraRef.current.position.y += 1.6; // Eye height
      cameraRef.current.rotation.copy(rotationEuler);
    } else {
      // Normal mode: camera looks at avatar
      cameraRef.current.position.set(0, 1.6, 5);
      cameraRef.current.lookAt(positionVec);
    }
  }, [povMode, avatarLayer]);

  if (!avatarLayer?.visible) return null;

  return (
    <group>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={povMode ? [0, 1.6, 0] : [0, 1.6, 5]}
        fov={50}
      />
      
      {!povMode && <OrbitControls enableDamping dampingFactor={0.05} />}
      
      <Avatar />
      
      {/* Environment */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
      
      {/* Grid helper */}
      <gridHelper args={[20, 20, '#444', '#222']} position={[0, -0.99, 0]} />
    </group>
  );
}
