import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationScene } from './components/SimulationScene';
import { UIControls } from './components/UIControls';
import { HandTracking, HandData } from './components/HandTracking';

export default function App() {
  // Physics Parameters
  const [stiffness, setStiffness] = useState(0.5);
  // Friction is now hard-set to 100% (no sliders)
  const [clothFriction] = useState(1.0);
  const [sphereFriction] = useState(1.0);
  
  // Geometry Parameters
  const [resolution, setResolution] = useState(40); // Higher default polygon count
  const [clothSize, setClothSize] = useState(6);    // Default fabric size set to 1m
  const [sphereRadius, setSphereRadius] = useState(1); // Default sphere radius set to 3m

  // Visualization Parameters
  const [showSkeletonHands, setShowSkeletonHands] = useState(true);

  const [resetKey, setResetKey] = useState(0);
  
  // Hand tracking state - using refs to avoid re-renders
  const leftHandRef = useRef<HandData>({ landmarks: null, handedness: null });
  const rightHandRef = useRef<HandData>({ landmarks: null, handedness: null });

  const handleReset = useCallback(() => {
    setResetKey(prev => prev + 1);
  }, []);
  
  const handleHandsUpdate = useCallback((left: HandData, right: HandData) => {
    leftHandRef.current = left;
    rightHandRef.current = right;
  }, []);

  // Set page title
  useEffect(() => {
    document.title = 'Fabric Drape Simulation';
  }, []);

  // FPS Number (renderer) - simple rAF counter
  const [fpsNumber, setFpsNumber] = useState(0);
  useEffect(() => {
    let last = performance.now();
    let frames = 0;
    let rafId = 0;
    const loop = (t: number) => {
      frames++;
      const delta = t - last;
      if (delta >= 500) {
        setFpsNumber(Math.round((frames * 1000) / delta));
        frames = 0;
        last = t;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-900 text-white font-sans">
      {/* FPS number bottom-right */}
      <div className="fixed right-4 bottom-4 z-50 font-mono text-lg text-white bg-black bg-opacity-60 px-3 py-1 rounded">
        {fpsNumber}
      </div>
      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 4, 10]} fov={50} />
          
          <color attach="background" args={['#202025']} />
     

          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[5, 10, 5]} 
            intensity={1} 
            castShadow 
            shadow-mapSize={[2048, 2048]}
          >
            <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10]} />
          </directionalLight>

          {/* Side light to create stronger directional shadows */}
          <directionalLight
            position={[-8, 6, 2]}
            intensity={0.6}
            castShadow
          />

          <group key={resetKey}>
            <SimulationScene 
              stiffness={stiffness} 
              clothFriction={clothFriction}
              sphereFriction={sphereFriction}
              resolution={resolution}
              clothSize={clothSize}
              sphereRadius={sphereRadius}
              leftHandRef={leftHandRef}
              rightHandRef={rightHandRef}
              showSkeletonHands={showSkeletonHands}
            />
          </group>

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>

          <OrbitControls 
            makeDefault
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2 - 0.1}
            enablePan={false}
            mouseButtons={{
              LEFT: null as unknown as THREE.MOUSE, // Unbind left click
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.ROTATE
            }}
          />
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* Hand Tracking Camera Feed */}
      <HandTracking onHandsUpdate={handleHandsUpdate} />

      {/* UI Overlay Layer */}
      <UIControls 
        stiffness={stiffness} 
        setStiffness={setStiffness}
        resolution={resolution}
        setResolution={setResolution}
        clothSize={clothSize}
        setClothSize={setClothSize}
        sphereRadius={sphereRadius}
        setSphereRadius={setSphereRadius}
        showSkeletonHands={showSkeletonHands}
        setShowSkeletonHands={setShowSkeletonHands}
        onReset={handleReset} 
      />
    </div>
  );
}