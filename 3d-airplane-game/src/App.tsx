import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants ---
const G_ACCEL = 9.80665;
const SEA_LEVEL_DENSITY = 1.225;

// --- Aircraft Models ---
const Airliner = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale} rotation={[0, 0, 0]} />; 
};

const StealthJet = ({ scale }: { scale: number }) => {
  const flame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (flame.current) flame.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 45) * 0.2); });
  return (
    <group scale={scale} rotation={[0, Math.PI, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.5, 0.1, 6, 8]} /><meshStandardMaterial color="#050505" metalness={1} /></mesh>
      <mesh position={[0, 0.45, -0.8]} rotation={[-Math.PI / 12, 0, 0]}><capsuleGeometry args={[0.25, 0.8, 4, 12]} /><meshStandardMaterial color="#222" transparent opacity={0.5} metalness={1} /></mesh>
      <mesh castShadow position={[0, -0.05, 0.5]}><boxGeometry args={[6.8, 0.08, 2.4]} /><meshStandardMaterial color="#050505" /></mesh>
      <group ref={flame} position={[0, -0.05, 3]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.05, 2, 12]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.8} /></mesh></group>
    </group>
  );
};

// --- FLIGHT DYNAMICS ENGINE (STABILIZED) ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const pos = useRef(new THREE.Vector3(0, 2000, 0));
  const quat = useRef(new THREE.Quaternion());
  const velocity = useRef(new THREE.Vector3(0, 0, -200)); 
  const angularVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const throttle = useRef(0.6); 

  const specs = useMemo(() => {
    return aircraftType === 'stealth'
      ? { mass: 20000, thrust: 191000, wingArea: 42.7, cd0: 0.012, liftSlope: 5.5, scale: 28, camDist: 180, camHeight: 25, inertia: [1.2, 1.8, 0.8], damping: 4.5, stability: 4.0 }
      : { mass: 300000, thrust: 1128000, wingArea: 525, cd0: 0.020, liftSlope: 4.2, scale: 15, camDist: 1000, camHeight: 120, inertia: [4.0, 6.0, 2.5], damping: 6.0, stability: 2.0 };
  }, [aircraftType]);

  const keys = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_state, delta) => {
    if (delta > 0.1) return; // Lag spike guard

    // 1. INPUTS
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.4 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.4 * delta);

    const currentSpeed = velocity.current.length();
    const authority = Math.min(1.0, currentSpeed / 60);

    const pitchTorque = (keys.current['s'] ? 1.0 : (keys.current['w'] ? -1.0 : 0)) * authority * 3.5;
    const rollTorque = (keys.current['a'] ? 1.0 : (keys.current['d'] ? -1.0 : 0)) * authority * 6.0;

    // 2. BASIS VECTORS
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(quat.current).normalize();
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(quat.current).normalize();
    const velNorm = velocity.current.clone().normalize();

    // 3. AERODYNAMIC MOMENTS & STABILIZATION (Solve Oscillation)
    const aoa = -velNorm.dot(upVec);
    const slip = -velNorm.dot(rightVec);

    // Weather-vaning (Restoring force)
    const restoringPitch = aoa * specs.stability * (currentSpeed / 100);
    const restoringYaw = slip * specs.stability * (currentSpeed / 100);

    // Rotational Damping (Critical to stop oscillation)
    // Damping must be strong enough to eat the kinetic energy of the restoring force.
    const dynamicDamping = specs.damping * (currentSpeed / 150);

    angularVelocity.current.x += (pitchTorque + restoringPitch - angularVelocity.current.x * dynamicDamping) * delta / specs.inertia[0];
    angularVelocity.current.y += (restoringYaw - angularVelocity.current.y * dynamicDamping) * delta / specs.inertia[1];
    angularVelocity.current.z += (rollTorque - angularVelocity.current.z * dynamicDamping) * delta / specs.inertia[2];

    // 4. APPLY ROTATION
    const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      angularVelocity.current.x * delta,
      angularVelocity.current.y * delta,
      angularVelocity.current.z * delta
    ));
    quat.current.multiply(qDelta).normalize();

    // 5. LINEAR PHYSICS
    const thrust = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    const gravity = new THREE.Vector3(0, -specs.mass * G_ACCEL, 0);
    
    const liftCoeff = THREE.MathUtils.clamp(0.45 + aoa * specs.liftSlope, -0.9, 1.7);
    const liftMag = 0.5 * SEA_LEVEL_DENSITY * currentSpeed * currentSpeed * specs.wingArea * liftCoeff;
    const lift = upVec.clone().multiplyScalar(liftMag);
    
    const dragCoeff = specs.cd0 + (liftCoeff * liftCoeff) / (Math.PI * 6.5);
    const dragForce = velNorm.clone().multiplyScalar(-(0.5 * SEA_LEVEL_DENSITY * currentSpeed * currentSpeed * specs.wingArea * dragCoeff));

    const netForce = new THREE.Vector3().add(thrust).add(gravity).add(lift).add(dragForce);
    velocity.current.add(netForce.divideScalar(specs.mass).multiplyScalar(delta));
    
    // Natural heading alignment (Slowly pull velocity toward nose)
    velocity.current.lerp(forward.clone().multiplyScalar(currentSpeed), 1.8 * delta);

    pos.current.add(velocity.current.clone().multiplyScalar(delta));
    if (pos.current.y < 15) { pos.current.y = 15; velocity.current.y = 0; }

    // 6. SYNC
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(pos.current);
      airplaneRef.current.quaternion.copy(quat.current);
    }

    const camOffset = new THREE.Vector3(0, specs.camHeight, specs.camDist).applyQuaternion(quat.current);
    camera.position.lerp(pos.current.clone().add(camOffset), 0.15);
    camera.up.copy(upVec);
    camera.lookAt(pos.current.clone().add(forward.clone().multiplyScalar(400)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(currentSpeed * 3.6), 
        alt: Math.round(pos.current.y), 
        thr: Math.round(throttle.current * 100),
        g: Math.round((liftMag / specs.mass) / G_ACCEL * 10) / 10,
        aoa: Math.round(aoa * 57.3)
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
      <NaturalWorld />
      <Sky distance={450000} sunPosition={[100, 10, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} factor={6} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[100, 1000, 100]} intensity={1.5} castShadow />
      <fog attach="fog" args={['#d0e7ff', 1000, 60000]} />
    </>
  );
};

const NaturalWorld = () => {
  const mountains = useMemo(() => [...Array(150)].map((_, i) => ({
    id: i, pos: [(Math.random()-0.5)*120000, 0, (Math.random()-0.5)*120000] as [number, number, number],
    h: 1500 + Math.random()*5000, r: 2000 + Math.random()*3000, color: Math.random() > 0.6 ? '#3b5e2b' : '#5c4033'
  })), []);
  return (
    <group>
      {mountains.map(m => <mesh key={m.id} position={[m.pos[0], m.h/2 - 50, m.pos[2]]} receiveShadow><coneGeometry args={[m.r, m.h, 6]} /><meshStandardMaterial color={m.color} roughness={1} /></mesh>)}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -100, 0]} receiveShadow><planeGeometry args={[400000, 400000]} /><meshStandardMaterial color="#2d5a27" roughness={0.8} /></mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -500, 0]}><planeGeometry args={[600000, 600000]} /><meshStandardMaterial color="#003d5c" metalness={0.8} /></mesh>
    </group>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0, aoa: 0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0 }}>SKY ACE PRO</h1>
          <p style={{ letterSpacing: '15px', color: '#aaa', marginBottom: '50px' }}>STABILIZED FLIGHT DYNAMICS</p>
          <div style={{ display: 'flex', gap: '30px', marginBottom: '50px' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#00ffff' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '300px' }}>
              <h2>F-35 LIGHTNING II</h2>
              <p>Agility | Stability Control</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2>747-400 JUMBO</h2>
              <p>Heavy Duty | High Inertia</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.85)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '320px', backdropFilter: 'blur(5px)' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '2px', marginBottom: '15px' }}>FLIGHT TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>SPEED</span><span style={{ fontSize: '2.2rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '0.8rem' }}>KM/H</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>ALTITUDE</span><span style={{ fontSize: '2.2rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '0.8rem' }}>M</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}><span>THRUST</span><span style={{ fontSize: '1.5rem', color: '#2ecc71' }}>{telemetry.thr}%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '15px' }}>
              <span style={{ color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G</span>
              <span style={{ color: Math.abs(telemetry.aoa) > 15 ? '#ff0000' : '#aaa' }}>{telemetry.aoa}° AoA</span>
            </div>
          </div>
          <Canvas shadows camera={{ fov: 75, near: 5, far: 150000 }}>
            <color attach="background" args={['#d0e7ff']} />
            <Suspense fallback={null}><FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} /></Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
