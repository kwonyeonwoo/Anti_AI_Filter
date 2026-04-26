# Sky Ace Pro: Flight Simulator Requirements (v2.1)

## 1. Core Physics Engine (Advanced Aerodynamics)
- **Gravity (G)**: Constant 9.81 m/s² downwards.
- **Thrust (T)**: 
  - F-35: 191,000 N (Max Afterburner).
  - 747: 1,000,000 N (Total 4 engines).
- **Lift (L)**: Based on AoA and Velocity squared.
- **Speed Scaling**: Visual movement speed in the 3D world must match the HUD display. High-speed effects (Motion Blur placeholder, FOV shift) should be enhanced.

## 2. Structural & Human Limits (G-Force)
- **G-Force Range**: Restricted to **-9.0G to +10.0G**.
- **Control Clamping**: Active.

## 3. Aircraft Specifications (War Thunder Reference)
### F-35 Stealth Jet (Agile)
- **Mass**: 18,000 kg
- **Visual Enhancement**: Increase default FOV and camera lag to emphasize speed.

### 747 Airliner (Heavy)
- **Mass**: 330,000 kg

## 4. Environment & Visual Speed
- **Movement Scale**: Ensure the 3D unit distance correctly represents meters so that 300 km/h feels like 300 km/h.
- **Dynamic FOV**: FOV should expand significantly at higher speeds (up to 100+) to provide a sense of Mach speed.
- **Camera Shake**: Implement subtle vibration at high speeds to enhance the feeling of rushing through the air.
