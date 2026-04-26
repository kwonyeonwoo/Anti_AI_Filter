import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Cloud, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Aircraft Models ---

// 1. Airliner (Passenger Plane)
const Airliner = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  useEffect(() => {
    scene.traverse((obj) => { if ((obj as THREE.Mesh).isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  }, [scene]);
  return <primitive object={scene} scale={scale} rotation={[0, 0, 0]} />; 
};

// 2. High-Detail Stealth Jet (Procedural)
const StealthJet = ({ scale }: { scale: number }) => {
  const engineFlame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (engineFlame.current) {
      const s = 0.8 + Math.sin(clock.elapsedTime * 40) * 0.2;
      engineFlame.current.scale.set(s, s, 1.5);
    }
  });

  return (
    <group scale={scale} rotation={[0, Math.PI, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.5, 0.1, 6, 6]} /><meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} /></mesh>
      <mesh position={[0, 0.45, -1]} rotation={[-Math.PI / 12, 0, 0]}><capsuleGeometry args={[0.25, 0.8, 4, 12]} /><meshStandardMaterial color="#222" transparent opacity={0.6} metalness={1} /></mesh>
      <mesh castShadow position={[0, -0.05, 0.5]}><boxGeometry args={[7, 0.1, 2.5]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
      <group position={[0, 0, -1.5]}><mesh position={[0.5, 0, 0]}><boxGeometry args={[0.4, 0.5, 1.5]} /><meshStandardMaterial color="#000" /></mesh><mesh position={[-0.5, 0, 0]}><boxGeometry args={[0.4, 0.5, 1.5]} /><meshStandardMaterial color="#000" /></mesh></group>
      <mesh castShadow position={[0.9, 0.8, 2.5]} rotation={[0, 0, -Math.PI / 5]}><boxGeometry args={[0.05, 2, 1.2]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
      <mesh castShadow position={[-0.9, 0.8, 2.5]} rotation={[0, 0, Math.PI / 5]}><boxGeometry args={[0.05, 2, 1.2]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
      <group ref={engineFlame} position={[0, -0.1, 3]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.1, 2, 12]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.8} /></mesh></group>
    </group>
  );
};

// --- World ---
const Terrain = () => {
  const mountains = useMemo(() => {
    return [...Array(120)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 80000, 0, (Math.random() - 0.5) * 80000] as [number, number, number],
      h: 1000 + Math.random() * 4000,
      r: 1500 + Math.random() * 2500,
      color: Math.random() > 0.5 ? '#3b5e2b' : '#5c4033' 
    }));
  }, []);

  return (
    <group>
      {mountains.map((m) => (
        <mesh key={m.id} position={[m.pos[0], m.h / 2 - 20, m.pos[2]]}>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.color} roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
        <planeGeometry args={[200000, 200000]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]}>
        <planeGeometry args={[300000, 300000]} />
        <meshStandardMaterial color="#004d71" metalness={0.6} />
      </mesh>
    </group>
  );
};

// --- FLIGHT ENGINE ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const planePos = useRef(new THREE.Vector3(0, 2000, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -150)); 
  const throttle = useRef(0.6); 

  // --- Optimized Camera Distances (To show full aircraft) ---
  const config = useMemo(() => {
    return aircraftType === 'stealth' 
      ? { mass: 18000, thrust: 280000, wingArea: 65, maxSpeed: 950, scale: 25, camDist: 100, camHeight: 18 } // Jet: dist 100m
      : { mass: 55000, thrust: 450000, wingArea: 190, maxSpeed: 350, scale: 15, camDist: 220, camHeight: 35 }; // Airliner: dist 220m
  }, [aircraftType]);

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
    camera.position.set(0, 2000 + config.camHeight, config.camDist);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [config, camera]);

  useFrame((_state, delta) => {
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    const pitchInput = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const rollInput = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);

    const speed = planeVelocity.current.length();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    const aoa = -planeVelocity.current.clone().normalize().dot(upVec);
    const liftMag = 0.5 * 1.225 * speed * speed * config.wingArea * (0.45 + aoa * 4.0);
    const currentG = liftMag / (config.mass * 9.81);

    const pitchFinal = (currentG > 10 && pitchInput > 0) ? 0.1 : (currentG < -9 && pitchInput < 0) ? -0.1 : pitchInput;
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchFinal * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const thrust = forward.clone().multiplyScalar(throttle.current * config.thrust);
    const gravity = new THREE.Vector3(0, -config.mass * 9.81, 0);
    const lift = upVec.clone().multiplyScalar(liftMag);
    const drag = planeVelocity.current.clone().multiplyScalar(-speed * 0.12);

    const netForce = new THREE.Vector3().add(thrust).add(gravity).add(lift).add(drag);
    const acceleration = netForce.divideScalar(config.mass);

    planeVelocity.current.add(acceleration.multiplyScalar(delta));
    if (planeVelocity.current.length() > config.maxSpeed) planeVelocity.current.normalize().multiplyScalar(config.maxSpeed);

    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));
    if (planePos.current.y < 10) { planePos.current.y = 10; planeVelocity.current.y = 0; }

    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // Dynamic Camera Distance with Speed & Config
    const speedFactor = (speed * 3.6) / 2500;
    const camOffset = new THREE.Vector3(0, config.camHeight, config.camDist + speedFactor * 50).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(300)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(speed * 3.6), 
        alt: Math.round(planePos.current.y), 
        thr: Math.round(throttle.current * 100),
        g: Math.round(currentG * 10) / 10
      });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={null}>
          {aircraftType === 'passenger' ? <Airliner scale={config.scale} /> : <StealthJet scale={config.scale} />}
        </Suspense>
      </group>
      <Terrain />
      <Sky sunPosition={[100, 20, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[100, 1000, 100]} intensity={1.5} />
      <fog attach="fog" args={['#d0e7ff', 500, 45000]} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0 }}>SKY ACE PRO</h1>
          <div style={{ display: 'flex', gap: '30px', margin: '40px 0' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#00ffff' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'stealth' ? '#00ffff' : 'white' }}>ADVANCED JET</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Full Scale Stealth Simulation</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'passenger' ? '#e74c3c' : 'white' }}>AIRLINER</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Mega Scale Flight Experience</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.8)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '300px' }}>
            <div style={{ fontSize: '1rem', color: '#3498db', marginBottom: '10px' }}>TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#aaa' }}>THRUST</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2ecc71' }}>{telemetry.thr}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#aaa' }}>SPEED</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '1rem' }}>KM/H</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#aaa' }}>ALTITUDE</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '1rem' }}>M</span></span>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '15px' }}>
              <span style={{ fontSize: '1.8rem', color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G</span>
            </div>
          </div>
          <Canvas shadows camera={{ fov: 60, near: 50, far: 100000 }}>
            <Suspense fallback={null}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
