import React from 'react';
import { Cloth } from './Cloth';
import { SphereCollider } from './SphereCollider';
import { SkeletonHand } from './SkeletonHand';
import type { HandData } from './HandTracking';

interface SimulationSceneProps {
  stiffness: number;
  clothFriction: number;
  sphereFriction: number;
  resolution: number;
  clothSize: number;
  sphereRadius: number;
  leftHandRef: React.MutableRefObject<HandData>;
  rightHandRef: React.MutableRefObject<HandData>;
  showSkeletonHands: boolean;
}

export const SimulationScene: React.FC<SimulationSceneProps> = ({ 
  stiffness, 
  clothFriction, 
  sphereFriction,
  resolution,
  clothSize,
  sphereRadius,
  leftHandRef,
  rightHandRef,
  showSkeletonHands
}) => {
  const spherePosition: [number, number, number] = [0, 0, 0];

  return (
    <>
      {/* Skeleton Hands */}
      <SkeletonHand handDataRef={leftHandRef} showSkeleton={showSkeletonHands} />
      <SkeletonHand handDataRef={rightHandRef} showSkeleton={showSkeletonHands} />
      
      <SphereCollider 
        position={spherePosition} 
        radius={sphereRadius} 
        friction={sphereFriction}
      />
      {/* 
        Key only depends on resolution. 
        Changing clothSize will update props but NOT remount, allowing dynamic resizing.
        Changing resolution still requires a remount to re-allocate buffers.
      */}
      <Cloth 
        key={`cloth-${resolution}`}
        position={[0, clothSize * 0.8, 0]} 
        resolution={resolution} 
        clothSize={clothSize}
        stiffness={stiffness}
        clothFriction={clothFriction}
        sphereFriction={sphereFriction}
        spherePosition={spherePosition}
        sphereRadius={sphereRadius}
        leftHandRef={leftHandRef}
        rightHandRef={rightHandRef}
      />
    </>
  );
};