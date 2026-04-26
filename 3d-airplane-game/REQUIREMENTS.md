# Sky Ace Pro: Flight Simulator Requirements (v3.0 - Realistic Focus)

## 1. Professional Aerodynamics Engine
- **Gravity (F_g)**: $F_g = m \cdot g$, where $g = 9.80665$ m/s². 
- **Atmospheric Model**: $\rho$ (Air Density) should ideally scale with altitude, but for now, fixed at $1.225$ kg/m³ with a basic linear decay placeholder.
- **Lift Equation**: $L = \frac{1}{2} \rho v^2 S C_L$. 
  - $C_L$ must be derived from a realistic lift-slope curve: $C_L = 2 \pi \alpha$ (for small $\alpha$).
  - **Stall Logic**: Critical AoA at 16 degrees. Beyond this, $C_L$ drops sharply.
- **Drag Equation**: $D = \frac{1}{2} \rho v^2 S C_D$.
  - $C_D = C_{D,0} + K C_L^2$ (Parasitic + Induced Drag).
- **Thrust Lapse**: Thrust should decrease slightly as altitude increases and speed increases (ram air effect vs thinning air).
- **Moments & Stability**: Implement basic Pitch, Roll, and Yaw damping to simulate air resistance against rotation.

## 2. Structural & Human Limits (G-Force)
- **G-Force**: $G = \frac{|\vec{L} + \vec{T}_{vertical}|}{m \cdot g}$.
- **Range**: -9.0G to +10.0G.
- **Structural Integrity**: Sustained high-G should trigger airframe stress warnings.

## 3. Aircraft Specifications (War Thunder Accurate)
### F-35A Lightning II
- **Mass**: 13,290 kg (Empty) + 8,278 kg (Fuel/Internal) ≈ 20,000 kg.
- **Max Thrust**: 125 kN (Dry), 191 kN (Afterburner).
- **Wing Area**: 42.7 m².
- **Max Speed**: Mach 1.6 (1,931 km/h).

### 747-400
- **Mass**: 178,756 kg (Empty) + Load ≈ 300,000 kg.
- **Max Thrust**: 4 x 282 kN ≈ 1,128,000 N.
- **Wing Area**: 525 m².
- **Max Speed**: Mach 0.85 (912 km/h).

## 4. Visual & Controls
- **Inverted Y-axis**: (Standard for flight sims) S for Up, W for Down.
- **Throttle**: Shift/Ctrl for fine-grained control.
- **Dynamic FOV & Shake**: Maintain from v2.1.
- **Terrain**: High-precision green/brown world.
