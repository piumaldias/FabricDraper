
## FabricDraper

FabricDraper is an exploratory textile‑driven cloth simulation built on Three.js/React Three Fiber. The goal is to approximate how woven/knit fabrics with different GSM values drape over a 3D body (here represented by a sphere), and to use that as a building block for consumer‑facing digital experiences (interactive 3D, web, and VR).

![FabricDraper](image.png)

---

### Focus

This project is **not** a generic game cloth demo: it is explicitly framed around textile behavior and how end users “feel” fabric digitally.

Current focus:

- **GSM‑driven stiffness mapping**  
   - Input: an abstracted GSM slider (≈100–800 gsm) in the UI.  
   - Mapping: GSM is mapped to the internal stiffness parameter of a Verlet cloth solver.  
   - Intent: Higher GSM → heavier, stiffer cloth with reduced deflection and a steeper drape angle; lower GSM → lighter, more collapsible cloth.

- **Drape and weight response**  
   - Gravity‑driven sag and fold formation over a rigid sphere.  
   - Qualitative differences in silhouette and fold density as GSM changes.  
   - High‑friction contact modeling so the cloth can “stick” to the sphere at high friction, approximating real fabrics that grip underlying geometry.

- **Consumer experience angle**  
   - Designed to be driven by hand tracking (pinch and move the virtual fabric corners).  
   - Target context: digital fitting rooms, VR/AR previews, or interactive 3D product pages where the user manipulates a swatch and reads its drape visually.

### Textile Properties Considered vs. Pending

**Currently modeled (first‑order approximation):**

- **Areal density (GSM → effective stiffness)**  
   GSM is used as a proxy that simultaneously stands in for fabric mass per unit area and bending resistance. The mapping is intentionally simple and is tuned visually, not calibrated to a physical testing rig.

- **Drape under gravity**  
   The cloth uses a mass‑spring‑like network (Verlet constraints) to simulate drape over a spherical form. Changes to the GSM slider directly influence how sharply the fabric hangs and how quickly folds develop.

- **Weight / load effect**  
   Heavier settings (higher GSM) preserve structure and show slower, more limited displacement under the same gravity field, while lighter settings collapse and wrap more tightly around the sphere.

- **Contact and friction with the support surface**  
   The cloth–sphere contact has tangential friction and a high‑friction “stick” regime. This is important for reproducing the visual behavior of fabrics that catch and hold on a body or object.

**Not yet modeled (planned / out of scope for this version):**

- **Elastic stretch (mechanical elongation)**  
   - No separate warp/weft/biased stretch curves are modeled.  
   - The current solver assumes an inextensible (or very weakly extensible) sheet; GSM only changes bending/drape, not in‑plane stretch.

- **Thickness and bulk from GSM**  
   - The visual thickness of the fabric is not directly tied to GSM.  
   - Effects such as edge rounding, layered bulk, or compression under load are not yet simulated.

- **Shear and bias drape behavior**  
   - There is no explicit shear modulus; bias‑cut effects (e.g., asymmetric drape when the fabric is rotated relative to gravity) are not captured separately.  
   - The cloth is currently treated as mechanically isotropic in‑plane.

- **Yarn‑level structure and finishing**  
   - Yarn count, twist, weave/knit pattern, and finishing (calendering, brushing, coating, etc.) are not parameterized.  
   - The procedural texture is purely visual and does not change the physical model.

These limitations are intentional for this iteration. The simulation is optimized for **interactive speed and visual intuition**, not for engineering‑grade prediction. Future work will focus on adding controlled stretch and thickness effects derived from GSM and basic mechanical testing data.

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
- **Fabric GSM / stiffness**: Adjust the GSM slider in the left control panel to move from light, drapey fabrics to heavy, structured fabrics
- **Cloth & sphere size**: Use "Fabric Size" and "Sphere Radius" sliders
- **Hand interaction**:
   - Enable camera preview (top‑right card)
   - Bring your hands into view and pinch thumb + index to grab cloth corners and reposition them
- **Skeleton hands**: Toggle on/off in the "Visualization" section
- **Reset**: Use the "Reset Simulation" button in the control panel

### Build for Production

```bash
npm run build
```

The built assets will be in the `dist` folder and can be deployed to any static host (e.g., GitHub Pages, Vercel, Netlify).

# FabricDraper
