// Viewport.js - Main 3D viewport component for Zero2oneZ

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { useSelector, useDispatch } from 'react-redux';
import { selectSelectedObjects, selectViewMode, selectGridSettings } from '../../store/selectors';
import { setSelectedObjects } from '../../store/actions';
import ViewportToolbar from './ViewportToolbar';
import ViewportInfo from './ViewportInfo';

import './Viewport.css';

const Viewport = ({ width, height }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const selectedObjects = useSelector(selectSelectedObjects);
  const viewMode = useSelector(selectViewMode);
  const gridSettings = useSelector(selectGridSettings);
  const dispatch = useDispatch();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewportStats, setViewportStats] = useState({
    fps: 0,
    triangles: 0,
    drawCalls: 0
  });
  
  // Initialize Three.js scene
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        containerRef.current.clientWidth / containerRef.current.clientHeight, 
        0.1, 
        1000
      );
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Add orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.2;
      controlsRef.current = controls;
      
      // Add transform controls
      const transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
      });
      scene.add(transformControls);
      transformControlsRef.current = transformControls;
      
      // Add grid
      const grid = new THREE.GridHelper(20, 20);
      grid.material.opacity = 0.5;
      grid.material.transparent = true;
      scene.add(grid);
      
      // Add axes helper
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);
      
      // Example object (placeholder)
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x3080ff });
      const cube = new THREE.Mesh(geometry, material);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.userData.id = 'cube-1';
      cube.userData.name = 'Example Cube';
      scene.add(cube);
      
      // Example ground plane
      const groundGeometry = new THREE.PlaneGeometry(20, 20);
      const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x999999, 
        side: THREE.DoubleSide 
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = Math.PI / 2;
      ground.position.y = -1;
      ground.receiveShadow = true;
      ground.userData.id = 'ground';
      ground.userData.name = 'Ground Plane';
      scene.add(ground);
      
      // Animation loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);
        
        // Update controls
        controlsRef.current.update();
        
        // Update statistics
        setViewportStats({
          fps: Math.round(1 / renderer.info.render.frame),
          triangles: renderer.info.render.triangles,
          drawCalls: renderer.info.render.calls
        });
        
        // Render
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      };
      
      animate();
      setIsInitialized(true);
      
      // Handle resize
      const handleResize = () => {
        if (!containerRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameRef.current);
        
        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
      };
    }
  }, [containerRef, isInitialized]);
  
  // Update transform controls when selection changes
  useEffect(() => {
    if (!transformControlsRef.current || !sceneRef.current) return;
    
    transformControlsRef.current.detach();
    
    if (selectedObjects.length === 1) {
      const selectedObject = sceneRef.current.getObjectByProperty('userData.id', selectedObjects[0]);
      if (selectedObject) {
        transformControlsRef.current.attach(selectedObject);
      }
    }
  }, [selectedObjects]);
  
  // Handle object selection
  const handleObjectSelection = (event) => {
    if (!sceneRef.current || !cameraRef.current) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Calculate mouse position in normalized device coordinates
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Set raycaster
    raycaster.setFromCamera(mouse, cameraRef.current);
    
    // Find intersections
    const selectableObjects = sceneRef.current.children.filter(
      obj => obj.userData && obj.userData.id && obj.userData.id !== 'ground'
    );
    const intersects = raycaster.intersectObjects(selectableObjects);
    
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      dispatch(setSelectedObjects([selectedObject.userData.id]));
    } else {
      dispatch(setSelectedObjects([]));
    }
  };
  
  return (
    <div className="viewport-container" style={{ width, height }}>
      <div 
        ref={containerRef} 
        className="viewport-canvas"
        onClick={handleObjectSelection}
      />
      <ViewportToolbar />
      <ViewportInfo stats={viewportStats} />
    </div>
  );
};

export default Viewport;
