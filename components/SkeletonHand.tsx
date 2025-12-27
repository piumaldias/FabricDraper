import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { HandData } from './HandTracking';

interface SkeletonHandProps {
  handDataRef: React.MutableRefObject<HandData>;
  showSkeleton: boolean;
}

// MediaPipe hand landmark indices
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17]
];

export const SkeletonHand: React.FC<SkeletonHandProps> = ({ handDataRef, showSkeleton }) => {
  const jointRefs = useRef<THREE.Mesh[]>([]);
  const boneRefs = useRef<THREE.Mesh[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const handednessRef = useRef<'Left' | 'Right' | null>(null);
  const jointMaterial = useRef<THREE.MeshStandardMaterial | null>(null);
  const boneMaterial = useRef<THREE.MeshStandardMaterial | null>(null);
  const pinchIndicatorRef = useRef<THREE.Mesh>(null);
  
  // Damping for smooth hand movement
  const smoothedPositions = useRef<THREE.Vector3[]>(
    Array.from({ length: 21 }, () => new THREE.Vector3())
  );
  const DAMPING_FACTOR = 0.3; // Lower = smoother but more lag

  // Access scene camera for proper screen-to-world mapping
  const { camera } = useThree();
  const ndcVec = useRef(new THREE.Vector3());
  const worldVec = useRef(new THREE.Vector3());
  const rayDir = useRef(new THREE.Vector3());

  useFrame(() => {
    const { landmarks, handedness } = handDataRef.current;
    
    if (!landmarks || landmarks.length !== 21) {
      if (groupRef.current) {
        groupRef.current.visible = false;
      }
      return;
    }

    if (groupRef.current) {
      groupRef.current.visible = showSkeleton;
    }

    // Update materials if handedness changed
    if (handedness !== handednessRef.current) {
      handednessRef.current = handedness;
      const isRight = handedness === 'Right';
      
      if (!jointMaterial.current) {
        jointMaterial.current = new THREE.MeshStandardMaterial({ 
          color: isRight ? '#00ff88' : '#ff4488',
          emissive: isRight ? '#00aa55' : '#aa2244',
          emissiveIntensity: 0.5,
          metalness: 0.3,
          roughness: 0.4
        });
      } else {
        jointMaterial.current.color.setStyle(isRight ? '#00ff88' : '#ff4488');
        jointMaterial.current.emissive.setStyle(isRight ? '#00aa55' : '#aa2244');
      }
      
      if (!boneMaterial.current) {
        boneMaterial.current = new THREE.MeshStandardMaterial({ 
          color: isRight ? '#00dd77' : '#dd3366',
          metalness: 0.2,
          roughness: 0.6,
          transparent: true,
          opacity: 0.85
        });
      } else {
        boneMaterial.current.color.setStyle(isRight ? '#00dd77' : '#dd3366');
      }
      
      jointRefs.current.forEach(mesh => {
        if (mesh && jointMaterial.current) mesh.material = jointMaterial.current;
      });
      boneRefs.current.forEach(mesh => {
        if (mesh && boneMaterial.current) mesh.material = boneMaterial.current;
      });
    }

    // Update joint positions with damping (always update smoothedPositions for cloth, even if skeleton is hidden)
    landmarks.forEach((landmark, i) => {
      if (jointRefs.current[i]) {
        // Map 2D landmark (0..1) into NDC (-1..1)
        const xNdc = (landmark.x - 0.5) * 2;
        const yNdc = -(landmark.y - 0.5) * 2;

        // Build a point on the ray from camera through this NDC
        ndcVec.current.set(xNdc, yNdc, 0.5).unproject(camera);

        // Direction from camera to that point
        rayDir.current.copy(ndcVec.current).sub(camera.position).normalize();

        // Intersect that ray with plane z = 0 (cloth / scene center plane)
        const t = -camera.position.z / rayDir.current.z;
        worldVec.current
          .copy(camera.position)
          .add(rayDir.current.clone().multiplyScalar(t));

        const targetX = worldVec.current.x;
        const targetY = worldVec.current.y + 5; // render hand flow 5 meters lower
        const targetZ = 0; // we explicitly place hand on z=0 plane
        
        // Apply damping for smooth movement
        const current = smoothedPositions.current[i];
        current.x += (targetX - current.x) * DAMPING_FACTOR;
        current.y += (targetY - current.y) * DAMPING_FACTOR;
        current.z += (targetZ - current.z) * DAMPING_FACTOR;
        
        // Only move visible joint meshes when skeleton rendering is enabled
        if (showSkeleton) {
          jointRefs.current[i].position.copy(current);
        }
      }
    });

    // Detect pinch (distance between thumb tip [4] and index tip [8])
    // Use original landmark space so pinch behavior is stable under scene scaling
    const thumbLm = landmarks[4];
    const indexLm = landmarks[8];
    const dxLm = thumbLm.x - indexLm.x;
    const dyLm = thumbLm.y - indexLm.y;
    const dzLm = (thumbLm.z || 0) - (indexLm.z || 0);
    const pinchDistance = Math.sqrt(dxLm * dxLm + dyLm * dyLm + dzLm * dzLm);
    const isPinching = pinchDistance < 0.06; // Tunable threshold in normalized landmark space

    // World-space thumb/index for pinch indicator & cloth mapping
    const thumbTip = smoothedPositions.current[4];
    const indexTip = smoothedPositions.current[8];
    
    // Store pinch state and position in handDataRef for cloth to use
    handDataRef.current.isPinching = isPinching;
    handDataRef.current.pinchPosition = isPinching ? thumbTip.clone() : null;
    
    // Update pinch indicator visibility and position (only when skeleton is shown)
    if (pinchIndicatorRef.current) {
      pinchIndicatorRef.current.visible = showSkeleton && isPinching;
      if (showSkeleton && isPinching) {
        const midPoint = new THREE.Vector3().addVectors(thumbTip, indexTip).multiplyScalar(0.5);
        pinchIndicatorRef.current.position.copy(midPoint);
        pinchIndicatorRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.2);
      }
    }

    // Update bone positions only when skeleton rendering is enabled
    if (showSkeleton) {
      HAND_CONNECTIONS.forEach((connection, i) => {
        const [startIdx, endIdx] = connection;
        if (jointRefs.current[startIdx] && jointRefs.current[endIdx] && boneRefs.current[i]) {
          const start = jointRefs.current[startIdx].position;
          const end = jointRefs.current[endIdx].position;
          const bone = boneRefs.current[i];
          
          bone.position.copy(start).add(end).multiplyScalar(0.5);
          const direction = new THREE.Vector3().subVectors(end, start);
          const length = direction.length();
          bone.scale.set(1, length, 1);
          bone.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
          );
        }
      });
    }
  });

  // Initialize materials
  if (!jointMaterial.current) {
    jointMaterial.current = new THREE.MeshStandardMaterial({ 
      color: '#00ff88',
      emissive: '#00aa55',
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.4
    });
  }
  
  if (!boneMaterial.current) {
    boneMaterial.current = new THREE.MeshStandardMaterial({ 
      color: '#00dd77',
      metalness: 0.2,
      roughness: 0.6,
      transparent: true,
      opacity: 0.85
    });
  }

  return (
    <group ref={groupRef}>
      {/* Pinch indicator */}
      <mesh ref={pinchIndicatorRef} visible={false}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#ffff00"
          emissive="#ffaa00"
          emissiveIntensity={1}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Joints (spheres) */}
      {Array.from({ length: 21 }).map((_, i) => (
        <mesh
          key={`joint-${i}`}
          ref={(el) => {
            if (el) jointRefs.current[i] = el;
          }}
          material={jointMaterial.current!}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
        </mesh>
      ))}

      {HAND_CONNECTIONS.map((_, i) => (
        <mesh
          key={`bone-${i}`}
          ref={(el) => {
            if (el) boneRefs.current[i] = el;
          }}
          material={boneMaterial.current!}
        >
          <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        </mesh>
      ))}
    </group>
  );
};
