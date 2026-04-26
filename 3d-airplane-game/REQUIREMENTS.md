# Sky Ace Pro: Flight Simulator Requirements (v5.0 - Multi-Aircraft Expansion)

## 1. Professional Aerodynamics Engine
- **Physics**: Constant Newtonian physics (F=ma).
- **Moments**: Angular velocity and torque-based rotation.
- **Damping**: Dynamic aerodynamic damping based on speed.

## 2. Structural & Human Limits (G-Force)
- **Range**: -9.0G to +10.0G.
- **Control Clamping**: Enforced to prevent airframe failure.

## 3. Aircraft Fleet (Realistic Models)
### F-35 Lightning II (Stealth Jet)
- **Source**: Hugging Face / cutechicken
- **Mass**: 18,000 kg | Thrust: 191 kN
- **Inertia**: Low | Handling: Extreme agility.

### F-16 Fighting Falcon (Agile Jet)
- **Source**: GitHub / ThreeFlightSimulator
- **Mass**: 12,000 kg | Thrust: 127 kN
- **Inertia**: Very Low | Handling: Superior roll rate.

### Supermarine Spitfire (WW2 Propeller)
- **Source**: BabylonJS Assets
- **Mass**: 3,000 kg | Thrust: 25,000 N (Propeller equivalent)
- **Inertia**: Minimal | Handling: High maneuverability at low speeds.

### Airbus A380 (Super-Heavy Airliner)
- **Source**: Khronos Sample Assets
- **Mass**: 560,000 kg | Thrust: 1,200,000 N
- **Inertia**: Extreme | Handling: Very slow response, massive stability.

## 4. Visual & UI
- **Selection UI**: Visual aircraft cards with specs.
- **Camera**: Dynamic chase cam with aircraft-specific distance and height.
- **Terrain**: Optimized Natural World v3.0.
