import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Cloud, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Stealth Fighter Model (Procedural High-Detail) ---
const StealthFighter = ({ scale }: { scale: number }) => {
  const engineFlame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (engineFlame.current) {
      engineFlame.current.scale.x = 0.8 + Math.sin(clock.elapsedTime * 40) * 0.2;
      engineFlame.current.scale.y = 0.8 + Math.sin(clock.elapsedTime * 40) * 0.2;
    }
  });

  return (
    <group scale={scale * 20} rotation={[0, Math.PI, 0]}>
      {/* Main Fuselage (다각형 동체) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.2, 5, 6]} />
        <meshStandardMaterial color="#1a1c21" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Cockpit Canopy */}
      <mesh position={[0, 0.4, -0.8]} rotation={[-Math.PI / 10, 0, 0]}>
        <capsuleGeometry args={[0.2, 0.8, 4, 12]} />
        <meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.6} />
      </mesh>

      {/* Air Intakes (공기 흡기구) */}
      <mesh position={[0.4, 0, -1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.4, 1]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.4, 0, -1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.4, 1]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Delta Wings (주 날개) */}
      <mesh castShadow position={[0, -0.05, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.8, 0.1, 2.5, 3]} />
        <meshStandardMaterial color="#1a1c21" metalness={0.7} />
      </mesh>

      {/* Twin Tail Fins (쌍발 수직 미익) */}
      <mesh castShadow position={[0.7, 0.5, 2]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.05, 1.2, 0.8]} />
        <meshStandardMaterial color="#1a1c21" />
      </mesh>
      <mesh castShadow position={[-0.7, 0.5, 2]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.05, 1.2, 0.8]} />
        <meshStandardMaterial color="#1a1c21" />
      </mesh>

      {/* Twin Engines & Flames */}
      <group ref={engineFlame} position={[0, 0, 2.5]}>
        <mesh position={[0.3, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.05, 1.2, 8]} />
          <meshBasicMaterial color="#00ccff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-0.3, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.05, 1.2, 8]} />
          <meshBasicMaterial color="#00ccff" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
};

const PassengerPlane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale * 8} rotation={[0, 0, 0]} />; 
};

// --- Realistic Terrain (Forest & Rock Mountains) ---
const Terrain = () => {
  const mountains = useMemo(() => {
    return [...Array(100)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 60000, 0, (Math.random() - 0.5) * 60000] as [number, number, number],
      h: 500 + Math.random() * 2000,
      r: 800 + Math.random() * 1500
    }));
  }, []);

  return (
    <group>
      {mountains.map((m) => (
        <mesh key={m.id} position={[m.pos[0], m.h / 2 - 100, m.pos[2]]} receiveShadow>
          <coneGeometry args={[m.r, m.h, 4]} />
          <meshStandardMaterial color="#2d3436" roughness={1} />
        </mesh>
      ))}
      {/* Ocean */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[200000, 200000]} />
        <meshStandardMaterial color="#003b5c" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// --- ADVANCED PHYSICS ENGINE ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Real Physics States
  const planePos = useRef(new THREE.Vector3(0, 2000, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -150)); // m/s
  const throttle = useRef(0.6); // 스로틀
  
  // Specs
  const specs = aircraftType === 'stealth' ? { mass: 18000, thrust: 220000, wingArea: 55 } : { mass: 45000, thrust: 350000, wingArea: 150 };
  const GRAVITY = 9.81;
  const AIR_DENSITY = 1.225;

  const keys = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = true; 
      if(e.key === 'Shift') keys.current['shift'] = true; 
      if(e.key === 'Control') keys.current['ctrl'] = true; 
    };
    const up = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = false; 
      if(e.key === 'Shift') keys.current['shift'] = false; 
      if(e.key === 'Control') keys.current['ctrl'] = false; 
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    camera.position.set(0, 2020, 100);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  useFrame((_state, delta) => {
    // 1. Throttle Input
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    // 2. Control Inputs (Inverted W/S)
    const pitchInput = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const rollInput = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchInput * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    // 3. FORCE CALCULATIONS (F = ma)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    const currentSpeed = planeVelocity.current.length();

    // Thrust Force
    const thrustForce = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    
    // Gravity Force (Weight = mass * gravity)
    const gravityForce = new THREE.Vector3(0, -specs.mass * GRAVITY, 0);

    // Lift Force
    const aoa = -planeVelocity.current.clone().normalize().dot(upVec);
    const liftCoeff = 0.4 + aoa * 3.5;
    const liftMag = 0.5 * AIR_DENSITY * currentSpeed * currentSpeed * specs.wingArea * liftCoeff;
    const liftForce = upVec.clone().multiplyScalar(liftMag);

    // Drag Force
    const dragForce = planeVelocity.current.clone().multiplyScalar(-currentSpeed * 0.15);

    // Net Acceleration: a = (Thrust + Gravity + Lift + Drag) / mass
    const netForce = new THREE.Vector3().add(thrustForce).add(gravityForce).add(liftForce).add(dragForce);
    const acceleration = netForce.divideScalar(specs.mass);

    planeVelocity.current.add(acceleration.multiplyScalar(delta));
    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));

    // Ground limit
    if (planePos.current.y < 10) {
      planePos.current.y = 10;
      planeVelocity.current.y = Math.max(0, planeVelocity.current.y);
      planeVelocity.current.multiplyScalar(0.95);
    }

    // 4. Object & Camera Sync
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    const camOffset = new THREE.Vector3(0, 15, 60).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(100)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(currentSpeed * 3.6), 
        alt: Math.round(planePos.current.y), 
        thr: Math.round(throttle.current * 100),
        g: Math.round((liftMag / specs.mass) / GRAVITY * 10) / 10
      });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={null}>
          {aircraftType === 'passenger' ? <PassengerPlane scale={0.1} /> : <StealthFighter scale={0.2} />}
        </Suspense>
      </group>
      <Terrain />
      <Sky distance={450000} sunPosition={[500, 150, -1000]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <Environment preset="night" />
      <ambientLight intensity={1.0} />
      <directionalLight position={[500, 1000, 100]} intensity={2.0} castShadow />
      <fog attach="fog" args={['#d0e7ff', 2000, 50000]} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #1a2a3a 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0 }}>FLIGHT PHYSICS</h1>
          <div style={{ display: 'flex', gap: '30px', margin: '40px 0' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#3498db' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '250px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'stealth' ? '#3498db' : 'white' }}>F-X STEALTH</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Weight: 18 Tons | High Thrust</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '250px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'passenger' ? '#e74c3c' : 'white' }}>HEAVY AIRLINER</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Weight: 45 Tons | Large Lift</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>TAKE OFF</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.8)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '280px' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '2px', marginBottom: '15px' }}>SYSTEM TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '1rem', color: '#aaa' }}>THRUST</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>{telemetry.thr}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '1rem', color: '#aaa' }}>SPEED</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '1rem' }}>KM/H</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '1rem', color: '#aaa' }}>ALTITUDE</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '1rem' }}>M</span></span>
            </div>
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333', textAlign: 'right' }}>
              <span style={{ fontSize: '1.2rem', color: '#f1c40f' }}>{telemetry.g} G-FORCE</span>
            </div>
          </div>
          <Canvas shadows camera={{ fov: 60, far: 200000 }}>
            <Suspense fallback={null}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
