# Sky Ace Pro: Flight Simulator Requirements (v2.0)

## 1. Core Physics Engine (Advanced Aerodynamics)
- **Gravity (G)**: Constant 9.81 m/s² downwards.
- **Thrust (T)**: 
  - F-35: 191,000 N (Max Afterburner).
  - 747: 1,000,000 N (Total 4 engines).
  - Variable via Throttle (Shift/Ctrl).
- **Lift (L)**: 
  - $L = 0.5 \cdot \rho \cdot v^2 \cdot S \cdot C_L$
  - $C_L$ (Lift Coefficient) is a function of Angle of Attack (AoA).
  - Stalling occurs if $v < 180$ km/h or AoA > 15 degrees.
- **Drag (D)**: 
  - $D = 0.5 \cdot \rho \cdot v^2 \cdot S \cdot C_D$
  - Includes Parasitic Drag (base) and Induced Drag (due to lift/AoA).
- **Inertia (F=ma)**: All forces are summed into a Net Force vector, then divided by mass to calculate acceleration.

## 2. Structural & Human Limits (G-Force)
- **G-Force Range**: Restricted to **-9.0G to +10.0G**.
- **Control Clamping**: If the calculated G-Force exceeds these limits, the control surface deflection (Pitch/Roll input) must be automatically reduced (clamped) to protect the airframe and pilot.
- **Visual Feedback**: HUD must show current G-Load. Red-out/Black-out simulation placeholder (UI warning).

## 3. Aircraft Specifications (War Thunder Reference)
### F-35 Stealth Jet (Agile)
- **Mass**: 18,000 kg (Loaded)
- **Wing Area (S)**: 42 m²
- **Max Speed**: Mach 1.6+ (~2000 km/h at altitude)
- **Handling**: High roll rate, high pitch authority.

### 747 Airliner (Heavy)
- **Mass**: 330,000 kg (Empty/Partial)
- **Wing Area (S)**: 510 m²
- **Max Speed**: 988 km/h
- **Handling**: Very high inertia, slow response, stable.

## 4. Environment & Control
- **World**: Realistic green terrain and blue oceans. High-altitude clouds.
- **Controls (Inverted)**:
  - **S**: Pull Up (Elevator Up)
  - **W**: Push Down (Elevator Down)
  - **A / D**: Roll Left / Right
  - **Shift / Ctrl**: Throttle Up / Down
- **Rendering**: Optimized camera distance per aircraft to ensure full visibility. Near plane: 10, Far plane: 100,000.
