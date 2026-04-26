# Sky Ace Pro: Flight Simulator Requirements (v4.0 - True Flight Dynamics)

## 1. Advanced Aerodynamics & Moments
- **Moment-based Rotation**: Inputs (A/D, W/S) no longer directly set rotation. Instead, they apply **Torque** to the airframe.
- **Rotational Damping**: The air provides resistance against rotation, which scales with speed. This prevents the "instant stop" feel of UFOs and adds "weight" to the controls.
- **Directional Stability (Weather-vaning)**: The aircraft naturally attempts to align its nose with the velocity vector (relative wind) through aerodynamic pressure on the vertical and horizontal stabilizers.
- **Sideslip & Skidding**: Turning without banking will result in a "skid," where the plane's nose is not aligned with its travel path, increasing drag and reducing efficiency.

## 2. Realistic Physics Constants
- **Gravity**: 9.80665 m/s².
- **Inertia Tensor**: 
  - Roll: Lowest inertia (quickest to rotate).
  - Pitch: Medium inertia.
  - Yaw: High inertia.
- **Compression**: Control surface effectiveness decreases as speed approaches Mach 1.0.

## 3. Structural Limits (G-Force)
- **Range**: -9.0G to +10.0G.
- **G-Induced Loss of Control**: High-G turns bleed speed rapidly due to induced drag.

## 4. Visual & UI
- **HUD**: Show speed, altitude, thrust, G-load, and AoA.
- **Camera**: Dynamic chase cam with "spring" damping to follow the aircraft's mass center rather than its exact pixel position.
