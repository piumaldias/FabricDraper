import React from 'react';

interface SphereColliderProps {
  position: [number, number, number];
  radius: number;
  friction: number;
}

export const SphereCollider: React.FC<SphereColliderProps> = ({ position, radius, friction }) => {
  // Map friction (0-1) to roughness (0.1 - 0.9)
  // Low friction = shiny (low roughness)
  // High friction = matte (high roughness)
  const roughness = 0.1 + friction * 0.8;

  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial 
        color="#4f46e5" 
        roughness={roughness} 
        metalness={0.3} 
      />
    </mesh>
  );
};