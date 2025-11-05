import { useEffect, useRef, useState } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useCompositor } from '../lib/compositor';
import LiveKitOverlay from './LiveKitOverlay';

export default function CameraLayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [telemetry, setTelemetry] = useState<any>({});
  const [cameraId, setCameraId] = useState<string>('camera1');
  
  const cameraLayer = useCompositor((state) =>
    state.layers.find((layer) => layer.type === 'camera-feed')
  );
  
  // Fetch telemetry from LiveKit director
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/livekit/telemetry/${cameraId}`);
        if (response.ok) {
          const data = await response.json();
          setTelemetry(data);
        }
      } catch (error) {
        console.error('Error fetching telemetry:', error);
      }
    };
    
    const interval = setInterval(fetchTelemetry, 1000); // Update every second
    return () => clearInterval(interval);
  }, [cameraId]);

  useEffect(() => {
    // Request webcam access
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();

          // Create video texture for WebGL
          const texture = new THREE.VideoTexture(videoRef.current);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.format = THREE.RGBAFormat;
          
          setVideoTexture(texture);
          setStream(mediaStream);
        }
      } catch (error) {
        console.error('[CameraLayer] Failed to access camera:', error);
      }
    };

    startCamera();

    return () => {
      // Clean up stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!cameraLayer?.visible || !videoTexture) return null;

  const { position, rotation, scale } = cameraLayer.transform;

  return (
    <>
      {/* Hidden video element */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
        muted
      />

      {/* 3D plane with video texture */}
      <mesh
        position={[position.x, position.y, position.z]}
        rotation={[rotation.x, rotation.y, rotation.z]}
        scale={[scale.x * 4, scale.y * 3, scale.z]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={videoTexture} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// Separate overlay component for 2D overlay (not in 3D scene)
export function CameraLayerOverlay({ cameraId }: { cameraId: string }) {
  const [telemetry, setTelemetry] = useState<any>({});
  
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/livekit/telemetry/${cameraId}`);
        if (response.ok) {
          const data = await response.json();
          setTelemetry(data);
        }
      } catch (error) {
        console.error('Error fetching telemetry:', error);
      }
    };
    
    const interval = setInterval(fetchTelemetry, 1000); // Update every second
    fetchTelemetry(); // Initial fetch
    
    return () => clearInterval(interval);
  }, [cameraId]);
  
  return (
    <LiveKitOverlay
      cameraId={cameraId}
      telemetry={telemetry}
      visible={true}
    />
  );
}
