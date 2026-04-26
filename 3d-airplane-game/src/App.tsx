import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Cloud, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Loading Component ---
const LoadingScreen = () => (
  <Html center>
    <div style={{ color: 'white', background: 'black', padding: '20px 40px', borderRadius: '10px', textAlign: 'center', border: '2px solid #3498db' }}>
      <h2 style={{ margin: 0 }}>INITIALIZING AIRCRAFT</h2>
      <p style={{ opacity: 0.6 }}>SYSTEMS CHECKING...</p>
    </div>
  </Html>
);

// --- Aircraft Models ---
const PassengerPlane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale * 3.5} rotation={[0, Math.PI, 0]} />; 
};

const StealthFighter = ({ scale }: { scale: number }) => {
  const engineFlame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (engineFlame.current) engineFlame.current.scale.z = 1 + Math.sin(clock.elapsedTime * 25) * 0.3;
  });
  return (
    <group scale={scale * 20}>
      <mesh castShadow><coneGeometry args={[0.5, 6, 4]} /><meshStandardMaterial color="#111" metalness={1} roughness={0.1} /></mesh>
      <mesh castShadow position={[0, -0.1, 1.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.5, 0.1, 2.5, 3]} /><meshStandardMaterial color="#111" metalness={0.8} /></mesh>
      <mesh ref={engineFlame} position={[0, -0.1, 3.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.15, 0.05, 1, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.6} /></mesh>
    </group>
  );
};

// --- Terrain ---
const Terrain = () => {
  const landmarks = useMemo(() => {
    return [...Array(200)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 40000, 0, (Math.random() - 0.5) * 40000] as [number, number, number],
      type: Math.random() > 0.4 ? 'mountain' : 'building'
    }));
  }, []);

  return (
    <group>
      {landmarks.map((lm) => (
        <mesh key={lm.id} position={[lm.pos[0], lm.type === 'mountain' ? 250 : 100, lm.pos[2]]}>
          {lm.type === 'mountain' ? <coneGeometry args={[500, 500, 4]} /> : <boxGeometry args={[100, 200, 100]} />}
          <meshStandardMaterial color={lm.type === 'mountain' ? '#222' : '#1e272e'} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[100000, 100000]} />
        <meshStandardMaterial color="#002d44" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// --- Engine ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  const planePos = useRef(new THREE.Vector3(0, 1000, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -100));
  const throttle = useRef(0.5);
  
  const keys = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    camera.position.set(0, 1010, 50);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  useFrame((_state, delta) => {
    if (keys.current['shift']) throttle.current = Math.min(1, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0, throttle.current - 0.5 * delta);
    
    const targetPitch = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const targetRoll = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), targetPitch * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), targetRoll * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    
    // Simple Physics
    const speed = planeVelocity.current.length();
    const thrust = forward.clone().multiplyScalar(throttle.current * (aircraftType === 'stealth' ? 120000 : 200000));
    const gravity = new THREE.Vector3(0, -9.81 * 10000, 0); // Mass ignored for simple simulation
    const lift = upVec.clone().multiplyScalar(speed * speed * 0.5);
    
    const acc = thrust.add(gravity).add(lift).divideScalar(aircraftType === 'stealth' ? 10000 : 30000);
    planeVelocity.current.add(acc.multiplyScalar(delta));
    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));
    
    if (planePos.current.y < 10) planePos.current.y = 10;

    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    camera.position.lerp(planePos.current.clone().add(new THREE.Vector3(0, 10, 40).applyQuaternion(planeQuat.current)), 0.15);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(100)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ speed: Math.round(speed * 3.6), alt: Math.round(planePos.current.y), thr: Math.round(throttle.current * 100) });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={null}>
          {aircraftType === 'passenger' ? <PassengerPlane scale={0.15} /> : <StealthFighter scale={0.2} />}
        </Suspense>
      </group>
      <Terrain />
      <Sky distance={450000} sunPosition={[100, 20, 100]} rayleigh={3} />
      <Stars radius={300} count={5000} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 500, 100]} intensity={2} />
      <fog attach="fog" args={['#87ceeb', 1000, 30000]} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'Arial, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', fontWeight: 900, color: '#3498db' }}>SKY ACE PRO</h1>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            <button onClick={() => setAircraft('stealth')} style={{ padding: '20px 40px', border: `3px solid ${aircraft === 'stealth' ? '#3498db' : '#333'}`, background: '#000', color: 'white', cursor: 'pointer' }}>STEALTH JET</button>
            <button onClick={() => setAircraft('passenger')} style={{ padding: '20px 40px', border: `3px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, background: '#000', color: 'white', cursor: 'pointer' }}>AIRLINER</button>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 6rem', fontSize: '2rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '30px', left: '30px', zIndex: 5, background: 'rgba(0,0,0,0.7)', padding: '20px', border: '2px solid #3498db' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '0.8rem' }}>KM/H</span></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '0.8rem' }}>M</span></div>
            <div style={{ fontSize: '0.9rem', color: '#3498db' }}>THR: {telemetry.thr}%</div>
          </div>
          <Canvas shadows camera={{ fov: 60, far: 100000 }}>
            <color attach="background" args={['#87ceeb']} />
            <Suspense fallback={<LoadingScreen />}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
