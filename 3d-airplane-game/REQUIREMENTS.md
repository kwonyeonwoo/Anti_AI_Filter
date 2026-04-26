# Sky Ace Pro: Flight Simulator Requirements

## 1. Core Physics Engine (True Aerodynamics)
- **Thrust (T)**: Controlled by Shift (Up) and Ctrl (Down). Dynamic engine response.
- **Gravity (G)**: 9.81 m/s² acceleration downwards, proportional to mass.
- **Lift (L)**: Based on Angle of Attack (AoA) and Velocity squared. Must support stalling below 180 km/h.
- **Drag (D)**: Parasitic and Induced drag that slows the aircraft during high-G maneuvers.
- **Energy Conservation**: Conversion between potential energy (altitude) and kinetic energy (speed).
- **G-Force Limiter**: Clamped between -9G and +10G. Control surfaces must lock/stiffen when limits are reached.

## 2. Aircraft Specifications
### F-35 Stealth Jet
- **Mass**: 18,000 kg
- **Max Thrust**: 350,000 N
- **Max Speed**: 3,000 km/h (Mach 2.5)
- **Camera**: Distance 200m, Height 25m, FOV 75 (Speed-dependent)
- **Appearance**: High-detail procedural model with twin canted tails and afterburner.

### 747 Airliner
- **Mass**: 65,000 kg
- **Max Thrust**: 600,000 N
- **Max Speed**: 1,080 km/h
- **Camera**: Distance 450m, Height 60m, FOV 75
- **Appearance**: Accurate commercial airliner model (airplane.glb).

## 3. Environment & Terrain
- **Terrain**: Realistic green plains (#2d5a27) and dark blue oceans (#004d71).
- **Elevation**: Brown/Dark green mountains ranging up to 5,000m.
- **Sky**: Daylight system with Rayleigh scattering and dynamic fog (#d0e7ff).
- **Rendering**: Near plane set to 50, Far plane to 150,000 to prevent flickering (Z-fighting).

## 4. Controls (Inverted)
- **S**: Pitch Up (Pull back)
- **W**: Pitch Down (Push forward)
- **A / D**: Roll Left / Right
- **Shift / Ctrl**: Throttle Up / Down
