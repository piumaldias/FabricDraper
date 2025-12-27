import React from 'react';

interface UIControlsProps {
  stiffness: number;
  setStiffness: (val: number) => void;
  resolution: number;
  setResolution: (val: number) => void;
  clothSize: number;
  setClothSize: (val: number) => void;
  sphereRadius: number;
  setSphereRadius: (val: number) => void;
   showSkeletonHands: boolean;
   setShowSkeletonHands: (val: boolean) => void;
  onReset: () => void;
}

export const UIControls: React.FC<UIControlsProps> = ({ 
  stiffness, 
  setStiffness, 
  resolution,
  setResolution,
  clothSize,
  setClothSize,
  sphereRadius,
  setSphereRadius,
  showSkeletonHands,
  setShowSkeletonHands,
  onReset 
}) => {
  return (
    <div className="absolute top-6 left-6 z-10 w-80 bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-white shadow-xl max-h-[90vh] overflow-y-auto scrollbar-hide">
      <h1 className="text-xl font-bold mb-1 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
        Fabric Drape Simulation
      </h1>
      <p className="text-xs text-gray-400 mb-6">Verlet Integration Physics</p>

      {/* Material Properties Section */}
      <div className="mb-6 space-y-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/10 pb-1">
          Material Properties
        </h2>

        {/* GSM (Stiffness) Control */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="stiffness" className="text-sm font-medium text-gray-200">
              GSM
            </label>
            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">
              {(() => {
                const maxStiffForGsm = 0.7;
                const clamped = Math.min(stiffness, maxStiffForGsm);
                const gsm = Math.round(100 + (clamped / maxStiffForGsm) * 700);
                return `${gsm} gsm`;
              })()}
            </span>
          </div>
          <input
            id="stiffness"
            type="range"
            min="0"
            max="0.7"
            step="0.01"
            value={stiffness}
            onChange={(e) => setStiffness(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase tracking-wide">
            <span>Light</span>
            <span>Heavy</span>
          </div>
        </div>


      </div>

      {/* Geometry Settings Section */}
      <div className="mb-6 space-y-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/10 pb-1">
          Geometry Settings
        </h2>

        {/* Resolution Control */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="resolution" className="text-sm font-medium text-gray-200">
              Polygon Count
            </label>
            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">
              {resolution}x{resolution}
            </span>
          </div>
          <input
            id="resolution"
            type="range"
            min="10"
            max="60"
            step="1"
            value={resolution}
            onChange={(e) => setResolution(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        {/* Cloth Size Control */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="clothSize" className="text-sm font-medium text-gray-200">
              Fabric Size
            </label>
            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">
              {clothSize}m
            </span>
          </div>
          <input
            id="clothSize"
            type="range"
            min="0.5"
            max="8"
            step="0.1"
            value={clothSize}
            onChange={(e) => setClothSize(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        {/* Sphere Radius Control */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="sphereRadius" className="text-sm font-medium text-gray-200">
              Sphere Radius
            </label>
            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">
              {sphereRadius}m
            </span>
          </div>
          <input
            id="sphereRadius"
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={sphereRadius}
            onChange={(e) => setSphereRadius(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          />
        </div>
      </div>

      {/* Visualization Section */}
      <div className="mb-6 space-y-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/10 pb-1">
          Visualization
        </h2>

        {/* Skeleton Hands Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-200">Skeleton Hands</span>
          <button
            type="button"
            onClick={() => setShowSkeletonHands(!showSkeletonHands)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
              showSkeletonHands ? 'bg-purple-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                showSkeletonHands ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 group"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="group-hover:rotate-180 transition-transform duration-500"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Reset Simulation
      </button>
    </div>
  );
};