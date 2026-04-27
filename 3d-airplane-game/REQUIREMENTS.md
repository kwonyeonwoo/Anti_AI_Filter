# Sky Ace Pro: Flight Simulator Requirements (v6.0 - Expanded Local Fleet)

## 1. Core Physics Engine
- **Newtonian Physics**: Vector-based force summation (F=ma).
- **Advanced Moments**: Torque-based rotation with aerodynamic damping.
- **Directional Stability**: Real-time heading alignment (Weather-vaning).
- **G-Force Limiter**: Enforced between -9G and +10G.

## 2. Aircraft Fleet (Local GLB Models)
### F-35A Lightning II
- **File**: `/f35.glb` | **Scale**: 20 | **CamDist**: 80m
- **Role**: Standard Stealth Fighter.

### F-16 Fighting Falcon (New)
- **File**: `/f16.glb` | **Scale**: 0.05 | **CamDist**: 70m
- **Role**: High Agility Interceptor.

### Aerobatic Stunt Plane (New)
- **File**: `/stunt.glb` | **Scale**: 8 | **CamDist**: 50m
- **Role**: Light maneuverability, High roll rate.

### 747 Airliner
- **File**: `/airplane.glb` | **Scale**: 0.8 | **CamDist**: 350m
- **Role**: Heavy Scale Transport.

## 3. Visual & UI
- **Selection UI**: 4 distinctive aircraft cards.
- **Loading Screen**: Animation-based system booting UI.
- **Environment**: NATURAL WORLD v3.0 (Daylight sky, ocean, mountains).
- **Rendering**: Optimized near/far planes to prevent flickering.
