import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Aircraft Model URLs (CDN Links for reliability) ---
const PLANE_MODELS = {
  passenger: '/airplane.glb', // Local fallback
  stealth: 'https://raw.githubusercontent.com/pmndrs/drei-assets/master/airplane.glb' // Stylized but high quality
};

// --- Aircraft Components ---
const AircraftModel = ({ type, scale }: { type: 'passenger' | 'stealth', scale: number }) => {
  const { scene } = useGLTF(PLANE_MODELS[type]);
  useEffect(() => {
    scene.traverse((obj) => { if ((obj as THREE.Mesh).isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  }, [scene]);

  // Passenger plane needs 180 flip if downloaded model faces backward, 
  // but let's keep it consistent with the engine's -Z forward.
  const rotation: [number, number, number] = type === 'passenger' ? [0, 0, 0] : [0, Math.PI, 0];

  return <primitive object={scene} scale={scale} rotation={rotation} />;
};

// --- World Environment (Optimized to prevent flickering) ---
const World = () => {
  const mountains = useMemo(() => {
    return [...Array(100)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 60000, 0, (Math.random() - 0.5) * 60000] as [number, number, number],
      h: 800 + Math.random() * 3000,
      r: 1500 + Math.random() * 2000,
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
      {/* Massive Green Ground - Lowered to Z-depth fix */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
        <planeGeometry args={[200000, 200000]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
      {/* Ocean - Further lowered to prevent overlapping flickers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]}>
        <planeGeometry args={[300000, 300000]} />
        <meshStandardMaterial color="#004d71" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

// --- FLIGHT ENGINE ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const planePos = useRef(new THREE.Vector3(0, 1500, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -150)); 
  const throttle = useRef(0.6); 

  // Aircraft-specific Camera & Scale Specs
  const config = useMemo(() => {
    return aircraftType === 'stealth' 
      ? { mass: 18000, thrust: 250000, wingArea: 65, maxSpeed: 850, scale: 20, camDist: 60, camHeight: 12 }
      : { mass: 50000, thrust: 400000, wingArea: 180, maxSpeed: 320, scale: 1.5, camDist: 100, camHeight: 20 };
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
    camera.position.set(0, 1500 + config.camHeight, config.camDist);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [config]);

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

    // --- Dynamic Camera Scale per Aircraft ---
    const speedFactor = (speed * 3.6) / 2000;
    const camOffset = new THREE.Vector3(0, config.camHeight, config.camDist + speedFactor * 30).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(200)));

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
          <AircraftModel type={aircraftType} scale={config.scale} />
        </Suspense>
      </group>
      <World />
      <Sky distance={450000} sunPosition={[100, 20, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[100, 1000, 100]} intensity={2.0} />
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
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 30px #3498db' }}>SKY ACE PRO</h1>
          <div style={{ display: 'flex', gap: '30px', margin: '40px 0' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#00ffff' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'stealth' ? '#00ffff' : 'white' }}>ADVANCED JET</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Compact & Maneuverable</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'passenger' ? '#e74c3c' : 'white' }}>AIRLINER</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Large Scale Flight</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.8)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '300px' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '2px', marginBottom: '15px' }}>TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ color: '#aaa' }}>SPEED</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '1rem' }}>KM/H</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#aaa' }}>ALTITUDE</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '1rem' }}>M</span></span>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <span style={{ fontSize: '1.8rem', color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G</span>
            </div>
          </div>
          <Canvas shadows camera={{ fov: 60, near: 50, far: 80000 }}>
            <color attach="background" args={['#d0e7ff']} />
            <Suspense fallback={null}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
