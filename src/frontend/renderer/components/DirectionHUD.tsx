import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

const BINS = 36;  // 36 bins × 5° = 180°
const BIN_ANGLE = Math.PI / BINS;

interface BinData {
  angle: number;
  coverage: number;    // 0-1: how much is visible on screen
  proximity: number;   // 0-1: closeness (1 = touching, 0 = far)
  hue: number;        // 0-360: green→yellow→red
}

export default function DirectionHUD() {
  const { camera, scene, gl } = useThree();
  const bins = useRef<BinData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Precompute unit vectors for each bin
  const binVectors = useMemo(() => {
    const vectors: THREE.Vector3[] = [];
    for (let i = 0; i < BINS; i++) {
      const angle = -Math.PI / 2 + i * BIN_ANGLE + BIN_ANGLE / 2;
      vectors.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
    }
    return vectors;
  }, []);

  useFrame(() => {
    if (!canvasRef.current) return;

    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const raycaster = new THREE.Raycaster();
    
    // Sample each bin
    const newBins: BinData[] = [];
    
    for (let i = 0; i < BINS; i++) {
      const binDir = binVectors[i].clone().applyQuaternion(camera.quaternion);
      
      // 1. Compute angle from camera forward → hue
      const angle = cameraForward.angleTo(binDir);
      const hue = (angle / Math.PI) * 180;  // 0° = green (0), 180° = red (0 again, via 180)
      
      // 2. Estimate coverage via raycasting
      let visibleCount = 0;
      const sampleCount = 3;
      
      for (let j = 0; j < sampleCount; j++) {
        const offset = (j - sampleCount / 2) * 0.1;
        const sampleDir = binDir.clone().add(new THREE.Vector3(0, offset, 0)).normalize();
        
        raycaster.set(camera.position, sampleDir);
        raycaster.far = 50;
        
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
          // Check if intersection is in viewport
          const hit = intersects[0].point.clone();
          hit.project(camera);
          
          if (Math.abs(hit.x) <= 1 && Math.abs(hit.y) <= 1 && hit.z >= -1 && hit.z <= 1) {
            visibleCount++;
          }
        }
      }
      
      const coverage = visibleCount / sampleCount;
      
      // 3. Compute proximity (distance to nearest hit)
      raycaster.set(camera.position, binDir);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      let proximity = 0;
      if (intersects.length > 0) {
        const distance = intersects[0].distance;
        proximity = 1 / (1 + distance);
      }
      
      newBins.push({
        angle,
        coverage,
        proximity,
        hue,
      });
    }
    
    bins.current = newBins;
    renderHUD();
  });

  const renderHUD = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const binWidth = width / BINS;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw bins
    bins.current.forEach((bin, i) => {
      const x = i * binWidth;
      
      // Map hue to HSL color
      const hue = bin.hue;
      const saturation = bin.coverage * 100;  // High coverage = saturated
      const lightness = bin.proximity * 50 + 25;  // High proximity = brighter
      
      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${bin.coverage})`;
      ctx.fillRect(x, 0, binWidth, height);
      
      // Border for bins
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(x, 0, binWidth, height);
    });

    // Draw camera forward tick (center)
    const centerX = width / 2;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Legend
    ctx.font = '10px monospace';
    ctx.fillStyle = 'white';
    ctx.fillText('← 90°', 5, height - 5);
    ctx.fillText('0°', centerX - 10, height - 5);
    ctx.fillText('90° →', width - 35, height - 5);
  };

  return (
    <Html
      position={[0, -3, 0]}
      center
      style={{
        width: '800px',
        pointerEvents: 'none',
      }}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={40}
          className="rounded border border-zinc-700"
        />
        <div className="absolute -top-6 left-0 right-0 text-center text-xs text-zinc-400">
          Direction & Visibility
        </div>
      </div>
    </Html>
  );
}
