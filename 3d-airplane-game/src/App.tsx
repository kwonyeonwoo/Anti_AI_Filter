import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Cloud, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Aircraft Specs & Constants ---
const AIR_DENSITY = 1.225; // kg/m^3 (Sea level)
const GRAVITY = 9.81; // m/s^2

// --- Models ---
const Airliner = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale} rotation={[0, 0, 0]} />; 
};

const StealthJet = ({ scale }: { scale: number }) => {
  const flame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (flame.current) flame.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 45) * 0.2); });
  return (
    <group scale={scale} rotation={[0, Math.PI, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.5, 0.1, 6, 6]} /><meshStandardMaterial color="#050505" metalness={1} /></mesh>
      <mesh position={[0, 0.45, -1]} rotation={[-Math.PI / 12, 0, 0]}><capsuleGeometry args={[0.25, 0.8, 4, 12]} /><meshStandardMaterial color="#222" transparent opacity={0.6} /></mesh>
      <mesh castShadow position={[0, -0.05, 0.5]}><boxGeometry args={[7, 0.1, 2.5]} /><meshStandardMaterial color="#050505" /></mesh>
      <mesh castShadow position={[0.9, 0.8, 2.5]} rotation={[0, 0, -Math.PI/5]}><boxGeometry args={[0.05, 2, 1.2]} /><meshStandardMaterial color="#050505" /></mesh>
      <mesh castShadow position={[-0.9, 0.8, 2.5]} rotation={[0, 0, Math.PI/5]}><boxGeometry args={[0.05, 2, 1.2]} /><meshStandardMaterial color="#050505" /></mesh>
      <group ref={flame} position={[0, -0.1, 3]}><mesh rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.3, 0.1, 2, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.8} /></mesh></group>
    </group>
  );
};

// --- FLIGHT PHYSICS ENGINE ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // State Refs (World Space Physics)
  const pos = useRef(new THREE.Vector3(0, 2000, 0));
  const quat = useRef(new THREE.Quaternion());
  const vel = useRef(new THREE.Vector3(0, 0, -180)); 
  const angularVel = useRef(new THREE.Euler(0, 0, 0));
  const throttle = useRef(0.6); 

  // Aircraft Specs
  const specs = useMemo(() => {
    return aircraftType === 'stealth'
      ? { mass: 18000, maxThrust: 350000, wingArea: 65, dragCoeff: 0.012, liftSlope: 4.8, scale: 28, camDist: 180, camHeight: 25 }
      : { mass: 65000, maxThrust: 600000, wingArea: 210, dragCoeff: 0.022, liftSlope: 4.0, scale: 15, camDist: 1000, camHeight: 130 };
  }, [aircraftType]);

  const keys = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_state, delta) => {
    if (delta > 0.1) return; // Lag spike prevention

    // 1. INPUTS
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    const pitchTarget = keys.current['s'] ? 1.6 : (keys.current['w'] ? -1.6 : 0);
    const rollTarget = keys.current['a'] ? 3.0 : (keys.current['d'] ? -3.0 : 0);

    // Smooth Control Surface Response
    angularVel.current.x = THREE.MathUtils.lerp(angularVel.current.x, pitchTarget, 0.1);
    angularVel.current.z = THREE.MathUtils.lerp(angularVel.current.z, rollTarget, 0.1);

    // Apply Local Rotation (Pitch/Roll)
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angularVel.current.x * delta);
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angularVel.current.z * delta);
    quat.current.multiply(pitchQ).multiply(rollQ).normalize();

    // 2. VECTOR BASIS (Always derived from current orientation)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat.current).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat.current).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat.current).normalize();

    // 3. FORCE CALCULATION
    const currentSpeed = vel.current.length();
    const velNorm = vel.current.clone().normalize();

    // a. Thrust (Always pushes forward)
    const thrustForce = forward.clone().multiplyScalar(throttle.current * specs.maxThrust);

    // b. Gravity (Always pulls down in World Space)
    const gravityForce = new THREE.Vector3(0, -specs.mass * GRAVITY, 0);

    // c. Lift
    // Real-time AoA (Angle of Attack): Angle between forward and velocity
    const aoa = -velNorm.dot(up); 
    const liftCoeff = THREE.MathUtils.clamp(0.45 + aoa * specs.liftSlope, -1.0, 1.8);
    const liftMag = 0.5 * AIR_DENSITY * currentSpeed * currentSpeed * specs.wingArea * liftCoeff;
    const liftForce = up.clone().multiplyScalar(liftMag);

    // d. Drag (Parasitic + Induced)
    const dragCoeff = specs.dragCoeff + (liftCoeff * liftCoeff) / (Math.PI * 6);
    const dragMag = 0.5 * AIR_DENSITY * currentSpeed * currentSpeed * specs.wingArea * dragCoeff;
    const dragForce = velNorm.clone().multiplyScalar(-dragMag);

    // 4. INTEGRATION (F = ma)
    const netForce = new THREE.Vector3().add(thrustForce).add(gravityForce).add(liftForce).add(dragForce);
    const acc = netForce.divideScalar(specs.mass);

    vel.current.add(acc.multiplyScalar(delta));

    // --- CRITICAL: Weather-vaning (Directional Stability) ---
    // This aligns the velocity vector with the aircraft's heading over time due to aerodynamic pressure.
    // Without this, turning feels like "sliding" and physics seems to disappear.
    const alignmentStrength = 2.5 * delta; 
    vel.current.lerp(forward.clone().multiplyScalar(currentSpeed), alignmentStrength);

    pos.current.add(vel.current.clone().multiplyScalar(delta));

    // Ground limit
    if (pos.current.y < 10) {
      pos.current.y = 10;
      vel.current.y = Math.max(0, vel.current.y);
      vel.current.multiplyScalar(0.95);
    }

    // 5. UPDATE SCENE
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(pos.current);
      airplaneRef.current.quaternion.copy(quat.current);
    }

    // Dynamic Camera
    const speedKph = currentSpeed * 3.6;
    const fov = 75 + (speedKph / 2500) * 20;
    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, fov, 0.1);
    camera.updateProjectionMatrix();

    const camOffset = new THREE.Vector3(0, specs.camHeight, specs.camDist).applyQuaternion(quat.current);
    camera.position.lerp(pos.current.clone().add(camOffset), 0.1);
    camera.up.copy(up);
    camera.lookAt(pos.current.clone().add(forward.clone().multiplyScalar(400)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(speedKph), 
        alt: Math.round(pos.current.y), 
        thr: Math.round(throttle.current * 100),
        g: Math.round((liftMag / specs.mass) / GRAVITY * 10) / 10
      });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={null}>
          {aircraftType === 'passenger' ? <Airliner scale={specs.scale} /> : <StealthJet scale={specs.scale} />}
        </Suspense>
      </group>
      <World />
      <Sky distance={450000} sunPosition={[100, 20, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[100, 1000, 100]} intensity={1.5} castShadow />
      <fog attach="fog" args={['#d0e7ff', 500, 50000]} />
    </>
  );
};

// --- World Terrain ---
const World = () => {
  const mountains = useMemo(() => [...Array(120)].map((_, i) => ({
    id: i, pos: [(Math.random()-0.5)*100000, 0, (Math.random()-0.5)*100000] as [number, number, number],
    h: 1500 + Math.random()*5000, r: 2000 + Math.random()*3000, color: Math.random() > 0.5 ? '#3b5e2b' : '#5c4033'
  })), []);
  return (
    <group>
      {mountains.map(m => <mesh key={m.id} position={[m.pos[0], m.h/2 - 100, m.pos[2]]} receiveShadow><coneGeometry args={[m.r, m.h, 6]} /><meshStandardMaterial color={m.color} roughness={1} /></mesh>)}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -100, 0]} receiveShadow><planeGeometry args={[300000, 300000]} /><meshStandardMaterial color="#2d5a27" roughness={0.8} /></mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -500, 0]}><planeGeometry args={[500000, 500000]} /><meshStandardMaterial color="#004d71" metalness={0.6} /></mesh>
    </group>
  );
};

// --- Main UI ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 30px #3498db' }}>SKY ACE PRO</h1>
          <div style={{ display: 'flex', gap: '30px', margin: '40px 0' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#3498db' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2>F-X STEALTH</h2>
              <p style={{ opacity: 0.7 }}>Twin-Engine Fighter</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2>AIRLINER</h2>
              <p style={{ opacity: 0.7 }}>Stability Transport</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.85)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '300px', backdropFilter: 'blur(5px)' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '2px', marginBottom: '15px' }}>FLIGHT TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>SPEED</span><span style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '0.8rem' }}>KM/H</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>ALTITUDE</span><span style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '1rem' }}>M</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>THRUST</span><span style={{ fontSize: '1.5rem', color: '#2ecc71' }}>{telemetry.thr}%</span></div>
            <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '15px' }}><span style={{ fontSize: '1.5rem', color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G-LOAD</span></div>
          </div>
          <Canvas shadows camera={{ fov: 75, near: 5, far: 200000 }}>
            <color attach="background" args={['#d0e7ff']} />
            <Suspense fallback={null}><FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} /></Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
