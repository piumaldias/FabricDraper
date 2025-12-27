import { useEffect, useRef, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import * as THREE from 'three';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[] | null;
  handedness: 'Left' | 'Right' | null;
  isPinching?: boolean;
  pinchPosition?: THREE.Vector3 | null;
}

interface HandTrackingProps {
  onHandsUpdate: (leftHand: HandData, rightHand: HandData) => void;
}

export const HandTracking: React.FC<HandTrackingProps> = ({ onHandsUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: Results) => {
      if (!canvasRef.current) return;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      // Clear canvas
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video feed
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Reset hand data
      let leftHandData: HandData = { landmarks: null, handedness: null };
      let rightHandData: HandData = { landmarks: null, handedness: null };

      // Process detected hands
      if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i];
          const handedness = results.multiHandedness[i].label as 'Left' | 'Right';

          // Draw landmarks on canvas
          canvasCtx.fillStyle = handedness === 'Right' ? '#00FF88' : '#FF4488';
          landmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasRef.current!.width,
              landmark.y * canvasRef.current!.height,
              5,
              0,
              2 * Math.PI
            );
            canvasCtx.fill();
          });

          // Store hand data (swap left/right due to camera flip)
          // Also invert x coordinate for 3D scene to match mirror view
          const handData: HandData = {
            landmarks: landmarks.map(lm => ({ x: 1 - lm.x, y: lm.y, z: lm.z })),
            handedness
          };

          if (handedness === 'Left') {
            leftHandData = handData;
          } else {
            rightHandData = handData;
          }
        }
      }

      canvasCtx.restore();

      // Update parent component
      onHandsUpdate(leftHandData, rightHandData);
    });

    // Start camera
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });

    cameraRef.current = camera;

    camera.start().then(() => {
      setIsInitialized(true);
    });

    return () => {
      camera.stop();
      hands.close();
      cameraRef.current = null;
    };
  }, [onHandsUpdate]);

  // Toggle preview start/stop when showPreview changes
  useEffect(() => {
    if (!cameraRef.current) return;
    if (showPreview) cameraRef.current.start();
    else {
      cameraRef.current.stop();
      // Clear canvas when hidden
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
  }, [showPreview]);

  // Render camera feed and UI overlay
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative w-64 h-48 bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-gray-700">
        <div className={`absolute inset-0 transition-opacity ${showPreview ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-0"
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>

        <div className="absolute top-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-xs">
          {isInitialized ? '🟢 Tracking Active' : '🔴 Initializing...'}
        </div>

        <button
          onClick={() => setShowPreview(s => !s)}
          className="absolute top-2 right-2 bg-black bg-opacity-60 px-2 py-1 rounded text-xs"
        >
          {showPreview ? 'Disable Camera' : 'Enable Camera'}
        </button>
      </div>
    </div>
  );
};
