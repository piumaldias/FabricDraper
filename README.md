<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1HOCMDjjRYfP9ZQ0EI57IGrlZPCaQIWVg

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
## FabricDraper

Interactive fabric drape simulation built with React, React Three Fiber, and MediaPipe Hands. Use your real hands (via the webcam) to grab and drape a virtual cloth over a sphere and explore different fabric behaviors.

![FabricDraper](image.png)

---

### Features

- Real‑time cloth simulation using Verlet integration
- Hand tracking with MediaPipe Hands
- Pinch‑to‑grab cloth corners and move them with your hands
- GSM‑style slider to control fabric stiffness
- Adjustable cloth size and sphere radius
- Rough, low‑shine fabric material with procedural texture
- Optional skeleton hand visualization and camera preview toggle

### Tech Stack

- React + TypeScript
- Vite
- React Three Fiber / Three.js
- @react-three/drei
- MediaPipe Hands (@mediapipe/hands, @mediapipe/camera_utils)

### Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open the URL printed in the terminal (usually http://localhost:5173) and allow camera access when prompted.

### Basic Controls

- **Camera**: Orbit with right mouse button, scroll to zoom
- **Fabric stiffness**: Adjust the GSM slider in the left control panel
- **Cloth & sphere size**: Use "Fabric Size" and "Sphere Radius" sliders
- **Hand interaction**:
  - Enable camera preview (top‑right card)
  - Bring your hands into view and pinch thumb + index to grab cloth corners
- **Skeleton hands**: Toggle on/off in the "Visualization" section
- **Reset**: Use the "Reset Simulation" button in the control panel

### Build for Production

```bash
npm run build
```

The built assets will be in the `dist` folder and can be deployed to any static host (e.g., GitHub Pages, Vercel, Netlify).

# FabricDraper
