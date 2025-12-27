import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { HandData } from './HandTracking';

interface ClothProps {
  position: [number, number, number];
  resolution: number;
  clothSize: number;
  stiffness: number; // 0.0 to 1.0
  clothFriction: number;
  sphereFriction: number;
  spherePosition: [number, number, number];
  sphereRadius: number;
  leftHandRef?: React.MutableRefObject<HandData>;
  rightHandRef?: React.MutableRefObject<HandData>;
}

// Helper to get index in 1D array from 2D grid coordinates
const getIdx = (x: number, y: number, w: number) => y * w + x;

export const Cloth: React.FC<ClothProps> = ({ 
  position, 
  resolution, 
  clothSize,
  stiffness, 
  clothFriction, 
  sphereFriction,
  spherePosition,
  sphereRadius,
  leftHandRef,
  rightHandRef
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  
  // Procedural fabric-like texture (avoids external CDN failures)
  const fabricTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base color (light beige weave)
    ctx.fillStyle = '#c318a7ff';
    ctx.fillRect(0, 0, size, size);

    // Simple weave pattern
    ctx.strokeStyle = 'rgba(90, 24, 24, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(size, i + 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, size);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);
  
  // Smoothed pinch positions to damp cloth reaction to hand jitter
  const smoothedLeftPinchRef = useRef<THREE.Vector3 | null>(null);
  const smoothedRightPinchRef = useRef<THREE.Vector3 | null>(null);
  const PINCH_DAMPING = 0.3; // similar to SkeletonHand damping
  
  // Interaction State
  const interactionRef = useRef({
    active: false,
    vertexIndex: -1,
    plane: new THREE.Plane(),
    currentIntersection: new THREE.Vector3()
  });

  // Reusable objects for raycasting (avoid GC)
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  // Store latest config in ref to avoid stale closures in useFrame
  const configRef = useRef({
    stiffness,
    clothFriction,
    sphereFriction,
    sphereRadius,
    spherePosition
  });

  useEffect(() => {
    configRef.current = {
      stiffness,
      clothFriction,
      sphereFriction,
      sphereRadius,
      spherePosition
    };
  }, [stiffness, clothFriction, sphereFriction, sphereRadius, spherePosition]);

  // Physics constants
  const TIMESTEP = 1 / 60; // 60 FPS fixed step
  const GRAVITY_ACCEL = -9.8; 
  const GRAVITY = GRAVITY_ACCEL * TIMESTEP * TIMESTEP; 
  
  const DRAG = 0.99; // Air resistance
  
  // Dimensions
  const width = clothSize;
  const height = clothSize;
  const cols = resolution + 1;
  const rows = resolution + 1;
  const count = cols * rows;

  // Initialize Physics State
  const positions = useRef(new Float32Array(count * 3));
  const prevPositions = useRef(new Float32Array(count * 3));
  
  // Initialize constraints
  const { structural, bending, reinforcement } = useMemo(() => {
    const struct: number[] = [];
    const bend: number[] = [];
    const reinf: number[] = [];
    
    const addConstraint = (list: number[], p1: number, p2: number) => {
      const x1 = (p1 % cols) * (width / resolution);
      const y1 = Math.floor(p1 / cols) * (height / resolution);
      const x2 = (p2 % cols) * (width / resolution);
      const y2 = Math.floor(p2 / cols) * (height / resolution);
      const dist = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
      list.push(p1, p2, dist);
    };

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = getIdx(x, y, cols);
        
        // --- 1. Structural (Nearest Neighbors) ---
        if (x < cols - 1) addConstraint(struct, i, getIdx(x + 1, y, cols));
        if (y < rows - 1) addConstraint(struct, i, getIdx(x, y + 1, cols));
        
        // --- 2. Shear (Diagonals) ---
        if (x < cols - 1 && y < rows - 1) {
            addConstraint(struct, i, getIdx(x + 1, y + 1, cols));
            addConstraint(struct, getIdx(x + 1, y, cols), getIdx(x, y + 1, cols));
        }

        // --- 3. Bending (Skip 1 and 2) ---
        if (x < cols - 2) addConstraint(bend, i, getIdx(x + 2, y, cols));
        if (y < rows - 2) addConstraint(bend, i, getIdx(x, y + 2, cols));
        if (x < cols - 2 && y < rows - 2) {
             addConstraint(bend, i, getIdx(x + 2, y + 2, cols));
        }
      }
    }

    // --- 4. Reinforcement (Distributed Mesh Structure) ---
    const stride = Math.max(3, Math.floor(resolution / 6)); 
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = getIdx(x, y, cols);
        
        // Orthogonal long-range
        if (x < cols - stride) addConstraint(reinf, i, getIdx(x + stride, y, cols));
        if (y < rows - stride) addConstraint(reinf, i, getIdx(x, y + stride, cols));
        
        // Diagonal long-range
        if (x < cols - stride && y < rows - stride) {
             addConstraint(reinf, i, getIdx(x + stride, y + stride, cols));
        }
        if (x >= stride && y < rows - stride) {
            addConstraint(reinf, i, getIdx(x - stride, y + stride, cols));
        }
      }
    }

    return { structural: struct, bending: bend, reinforcement: reinf };
  }, [cols, rows, width, height, resolution]);

  // Initial Setup
  useEffect(() => {
    const pos = positions.current;
    const prev = prevPositions.current;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = getIdx(x, y, cols);
        const idx3 = i * 3;
        
        const lx = (x / resolution) * width - width / 2;
        const ly = 0; 
        const lz = (y / resolution) * height - height / 2;

        pos[idx3] = lx + position[0];
        pos[idx3 + 1] = ly + position[1];
        pos[idx3 + 2] = lz + position[2];

        prev[idx3] = pos[idx3];
        prev[idx3 + 1] = pos[idx3 + 1];
        prev[idx3 + 2] = pos[idx3 + 2];
      }
    }
  }, [resolution, clothSize]); 

  // --- Global Event Handlers for Dragging ---
  // Using refs for stable function callbacks in addEventListener

  const handleGlobalMove = useRef((e: PointerEvent) => {
     if (!interactionRef.current.active) return;
     
     const rect = gl.domElement.getBoundingClientRect();
     // Calculate normalized device coordinates (-1 to +1)
     const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
     const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

     mouse.set(x, y);
     raycaster.setFromCamera(mouse, camera);
     
     // Find intersection with the drag plane
     if (raycaster.ray.intersectPlane(interactionRef.current.plane, targetVec)) {
        interactionRef.current.currentIntersection.copy(targetVec);
     }
  });

  const handleGlobalUp = useRef((e: PointerEvent) => {
     interactionRef.current.active = false;
     window.removeEventListener('pointermove', handleGlobalMove.current);
     window.removeEventListener('pointerup', handleGlobalUp.current);
     gl.domElement.style.cursor = 'auto';
  });

  // Cleanup event listeners on unmount
  useEffect(() => {
      const moveHandler = handleGlobalMove.current;
      const upHandler = handleGlobalUp.current;
      return () => {
          window.removeEventListener('pointermove', moveHandler);
          window.removeEventListener('pointerup', upHandler);
      };
  }, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Only allow left click (button 0)
    if (e.button !== 0) return;
    e.stopPropagation();
    
    // Find closest vertex to the click
    const intersectPoint = e.point;
    const pos = positions.current;
    let minD = Infinity;
    let closest = -1;
    
    // Optimization: Brute force is fast enough for ~2-3k vertices
    for(let i=0; i<count; i++){
        const dx = pos[i*3] - intersectPoint.x;
        const dy = pos[i*3+1] - intersectPoint.y;
        const dz = pos[i*3+2] - intersectPoint.z;
        const d = dx*dx + dy*dy + dz*dz;
        if(d < minD) { minD = d; closest = i; }
    }

    // Create a drag plane perpendicular to the camera view at the point of intersection
    const planeNormal = new THREE.Vector3();
    camera.getWorldDirection(planeNormal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, intersectPoint);

    interactionRef.current = {
      active: true,
      vertexIndex: closest,
      plane: plane,
      currentIntersection: intersectPoint.clone()
    };

    // Attach global listeners
    window.addEventListener('pointermove', handleGlobalMove.current);
    window.addEventListener('pointerup', handleGlobalUp.current);
    gl.domElement.style.cursor = 'grabbing';
  };


  // Solver function
  const solveList = (list: number[], pos: Float32Array, strength: number) => {
    const halfStrength = strength * 0.5;
    for (let i = 0; i < list.length; i += 3) {
        const i1 = list[i];
        const i2 = list[i + 1];
        const restDist = list[i + 2];

        const idx1 = i1 * 3;
        const idx2 = i2 * 3;

        const x1 = pos[idx1];
        const y1 = pos[idx1 + 1];
        const z1 = pos[idx1 + 2];

        const x2 = pos[idx2];
        const y2 = pos[idx2 + 1];
        const z2 = pos[idx2 + 2];

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < 0.0001) continue;

        const diff = (dist - restDist) / dist;
        const correction = diff * halfStrength;

        const offsetX = dx * correction;
        const offsetY = dy * correction;
        const offsetZ = dz * correction;

        pos[idx1] += offsetX;
        pos[idx1 + 1] += offsetY;
        pos[idx1 + 2] += offsetZ;

        pos[idx2] -= offsetX;
        pos[idx2 + 1] -= offsetY;
        pos[idx2 + 2] -= offsetZ;
    }
  };

  useFrame(() => {
    if (!meshRef.current) return;
    
    const { 
        stiffness: currentStiffness, 
        clothFriction: currentClothFriction, 
        sphereFriction: currentSphereFriction,
        sphereRadius: currentSphereRadius,
        spherePosition: currentSpherePos
    } = configRef.current;

    const pos = positions.current;
    const prev = prevPositions.current;
    const geo = meshRef.current.geometry;
    
    // 1. Verlet Integration & Gravity
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      const px = pos[idx];
      const py = pos[idx + 1];
      const pz = pos[idx + 2];

      const ppx = prev[idx];
      const ppy = prev[idx + 1];
      const ppz = prev[idx + 2];

      const velX = (px - ppx) * DRAG;
      const velY = (py - ppy) * DRAG;
      const velZ = (pz - ppz) * DRAG;

      prev[idx] = px;
      prev[idx + 1] = py;
      prev[idx + 2] = pz;

      pos[idx] = px + velX;
      pos[idx + 1] = py + velY + GRAVITY;
      pos[idx + 2] = pz + velZ;
    }

    // 2. Constraint Solving
    const baseIterations = resolution > 40 ? 12 : 8;
    const iterations = currentStiffness > 0.8 ? 20 : baseIterations; 
    
    const reinforcementStrength = currentStiffness > 0.7 ? (currentStiffness - 0.7) / 0.3 : 0;

    for (let iter = 0; iter < iterations; iter++) {
        solveList(structural, pos, 1.0);
        solveList(bending, pos, currentStiffness);
        
        if (reinforcementStrength > 0) {
            solveList(reinforcement, pos, reinforcementStrength);
        }
        
        // --- Pin dragged vertex inside solver loop for strict control ---
        if (interactionRef.current.active) {
            const idx = interactionRef.current.vertexIndex * 3;
            const t = interactionRef.current.currentIntersection;
            
            pos[idx] = t.x;
            pos[idx+1] = t.y;
            pos[idx+2] = t.z;
            
            // Kill velocity
            prev[idx] = t.x;
            prev[idx+1] = t.y;
            prev[idx+2] = t.z;
        }
        
        // --- Pin cloth corners to smoothed hand pinch positions when pinching ---
        if (leftHandRef?.current.isPinching && leftHandRef.current.pinchPosition) {
          const target = leftHandRef.current.pinchPosition;
          if (!smoothedLeftPinchRef.current) {
            smoothedLeftPinchRef.current = target.clone();
          } else {
            smoothedLeftPinchRef.current.lerp(target, PINCH_DAMPING);
          }

          const pinchPos = smoothedLeftPinchRef.current;
          // INVERSE: left hand maps to RIGHT top corner
          const i = getIdx(cols - 1, 0, cols);
          const idx = i * 3;
          
          pos[idx] = pinchPos.x;
          pos[idx + 1] = pinchPos.y;
          pos[idx + 2] = pinchPos.z;
          
          prev[idx] = pinchPos.x;
          prev[idx + 1] = pinchPos.y;
          prev[idx + 2] = pinchPos.z;
        } else {
          smoothedLeftPinchRef.current = null;
        }
        
        if (rightHandRef?.current.isPinching && rightHandRef.current.pinchPosition) {
          const target = rightHandRef.current.pinchPosition;
          if (!smoothedRightPinchRef.current) {
            smoothedRightPinchRef.current = target.clone();
          } else {
            smoothedRightPinchRef.current.lerp(target, PINCH_DAMPING);
          }

          const pinchPos = smoothedRightPinchRef.current;
          // INVERSE: right hand maps to LEFT top corner
          const i = getIdx(0, 0, cols);
          const idx = i * 3;
          
          pos[idx] = pinchPos.x;
          pos[idx + 1] = pinchPos.y;
          pos[idx + 2] = pinchPos.z;
          
          prev[idx] = pinchPos.x;
          prev[idx + 1] = pinchPos.y;
          prev[idx + 2] = pinchPos.z;
        } else {
          smoothedRightPinchRef.current = null;
        }

        // 3. Collision with Sphere
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            
            // Skip collision for the actively dragged vertex to avoid fighting
            if (interactionRef.current.active && i === interactionRef.current.vertexIndex) continue;

            const px = pos[idx];
            const py = pos[idx + 1];
            const pz = pos[idx + 2];

            const dx = px - currentSpherePos[0];
            const dy = py - currentSpherePos[1];
            const dz = pz - currentSpherePos[2];

            const distSq = dx * dx + dy * dy + dz * dz;
            const colRad = currentSphereRadius + 0.08; 

            if (distSq < colRad * colRad) {
              const dist = Math.sqrt(distSq);
              const force = (colRad - dist) / dist;
                
              // Positional correction (normal push out of the sphere)
              pos[idx] += dx * force;
              pos[idx + 1] += dy * force;
              pos[idx + 2] += dz * force;

              // --- Friction: damp relative tangential motion along sphere surface ---
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;

              // Approximate vertex velocity from Verlet state
              const velX = pos[idx] - prev[idx];
              const velY = pos[idx + 1] - prev[idx + 1];
              const velZ = pos[idx + 2] - prev[idx + 2];

              // Decompose into normal and tangential components
              const vn = velX * nx + velY * ny + velZ * nz;
              const vnx = nx * vn;
              const vny = ny * vn;
              const vnz = nz * vn;

              const vtx = velX - vnx;
              const vty = velY - vny;
              const vtz = velZ - vnz;

              const combinedFriction = (currentClothFriction + currentSphereFriction) * 0.5;
              
              if (combinedFriction >= 0.60) {
                // Very high friction: snap to sphere surface and kill all velocity
                const snapX = currentSpherePos[0] + nx * colRad;
                const snapY = currentSpherePos[1] + ny * colRad;
                const snapZ = currentSpherePos[2] + nz * colRad;

                pos[idx] = snapX;
                pos[idx + 1] = snapY;
                pos[idx + 2] = snapZ;

                // Zero velocity in Verlet by setting prev equal to current
                prev[idx] = snapX;
                prev[idx + 1] = snapY;
                prev[idx + 2] = snapZ;
              } else {
                // Scale tangential velocity based on friction
                const tangentialDamping = THREE.MathUtils.clamp(combinedFriction * 1.2, 0, 0.98);
                const dampedVtx = vtx * (1 - tangentialDamping);
                const dampedVty = vty * (1 - tangentialDamping);
                const dampedVtz = vtz * (1 - tangentialDamping);

                const finalVelX = vnx + dampedVtx;
                const finalVelY = vny + dampedVty;
                const finalVelZ = vnz + dampedVtz;

                prev[idx] = pos[idx] - finalVelX;
                prev[idx + 1] = pos[idx + 1] - finalVelY;
                prev[idx + 2] = pos[idx + 2] - finalVelZ;
              }
            }
            
            // Floor Collision
            if (pos[idx + 1] < -2.5) {
                pos[idx + 1] = -2.5;
                const floorFriction = 0.5;
                const vx = pos[idx] - prev[idx];
                const vz = pos[idx+2] - prev[idx+2];
                prev[idx] = pos[idx] - vx * (1 - floorFriction);
                prev[idx+2] = pos[idx+2] - vz * (1 - floorFriction);
            }
        }
    }

    // 4. Update Geometry
    const positionAttribute = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      positionAttribute.setXYZ(i, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    }
    positionAttribute.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  });

  return (
    <mesh 
      ref={meshRef} 
      castShadow 
      receiveShadow 
      frustumCulled={false}
      onPointerDown={handlePointerDown}
      // Note: onPointerMove/Up are handled by window listeners now
    >
      <planeGeometry args={[width, height, resolution, resolution]} />
      <meshStandardMaterial 
        color={"#000000"}
        side={THREE.DoubleSide}
        wireframe={false}
        flatShading={false}
        roughness={0.95}
        metalness={0.05}
        map={fabricTexture}
        emissive={new THREE.Color('#e6d6c6')}
        emissiveMap={fabricTexture}
        emissiveIntensity={0.22}
      />
    </mesh>
  );
};