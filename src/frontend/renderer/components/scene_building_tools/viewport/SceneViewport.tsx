import { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stats } from '@react-three/drei';

interface SceneViewportProps {
  showStats?: boolean;
  showGrid?: boolean;
}

export default function SceneViewport({ showStats = true, showGrid = true }: SceneViewportProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [5, 5, 5], fov: 75 }}>
        {showGrid && <Grid args={[10, 10]} cellColor="#6b7280" sectionColor="#4b5563" />}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </Canvas>
      {showStats && (
        <div className="absolute top-4 left-4">
          <Stats />
        </div>
      )}
    </div>
  );
}

