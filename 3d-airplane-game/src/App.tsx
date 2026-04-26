import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Cloud, PerspectiveCamera, Float, Html, Center } from '@react-three/drei';
import * as THREE from 'three';

// --- Loading Screen ---
const LoadingScreen = () => (
  <Html center>
    <div style={{ 
      color: 'white', background: 'rgba(0,0,0,0.9)', padding: '30px 50px', 
      borderRadius: '20px', textAlign: 'center', border: '2px solid #3498db',
      fontFamily: 'Arial, sans-serif', minWidth: '300px'
    }}>
      <h2 style={{ margin: 0, letterSpacing: '5px' }}>SYSTEM BOOTING</h2>
      <div style={{ width: '100%', height: '4px', background: '#222', marginTop: '20px', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', background: '#3498db', animation: 'load 2s infinite' }} />
      </div>
      <p style={{ opacity: 0.5, marginTop: '15px' }}>SYNCING SATELLITES...</p>
      <style>{`@keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
    </div>
  </Html>
);

// --- High-Detail Procedural Stealth Fighter (F-35 Style) ---
const F35StealthModel = ({ scale }: { scale: number }) => {
  const engineRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (engineRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 40) * 0.2;
      engineRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group scale={scale * 22} rotation={[0, Math.PI, 0]}>
      {/* Upper Body / Stealth Shape */}
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.2, 5.5, 6]} />
        <meshStandardMaterial color="#0a0a0a" metalness={1} roughness={0.2} />
      </mesh>
      {/* Cockpit Canopy */}
      <mesh position={[0, 0.45, -0.8]} rotation={[-Math.PI / 12, 0, 0]}>
        <capsuleGeometry args={[0.22, 0.7, 4, 12]} />
        <meshStandardMaterial color="#222" transparent opacity={0.6} metalness={1} roughness={0} />
      </mesh>
      {/* Main Wings (Large Delta) */}
      <mesh castShadow position={[0, -0.05, 0.8]}>
        <boxGeometry args={[6.5, 0.1, 2.2]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Air Intakes */}
      <group position={[0, 0, -1.2]}>
        <mesh position={[0.45, 0, 0]}><boxGeometry args={[0.35, 0.45, 1.2]} /><meshStandardMaterial color="#050505" /></mesh>
        <mesh position={[-0.45, 0, 0]}><boxGeometry args={[0.35, 0.45, 1.2]} /><meshStandardMaterial color="#050505" /></mesh>
      </group>
      {/* V-Tails (쌍발 꼬리날개) */}
      <mesh castShadow position={[0.8, 0.7, 2.3]} rotation={[0, 0, -Math.PI / 5]}>
        <boxGeometry args={[0.05, 1.8, 1.2]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh castShadow position={[-0.8, 0.7, 2.3]} rotation={[0, 0, Math.PI / 5]}>
        <boxGeometry args={[0.05, 1.8, 1.2]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Main Engine & Exhaust */}
      <group ref={engineRef} position={[0, -0.05, 2.8]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.1, 1.8, 12]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
};

const PassengerPlane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  // Airliner orientation fix: Make it face -Z
  return <primitive object={scene} scale={scale * 8} rotation={[0, 0, 0]} />; 
};

// --- World Environment ---
const World = () => {
  const mountains = useMemo(() => {
    return [...Array(150)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 60000, 0, (Math.random() - 0.5) * 60000] as [number, number, number],
      h: 500 + Math.random() * 3000,
      r: 1000 + Math.random() * 2000,
      color: Math.random() > 0.5 ? '#2d3436' : '#1e272e'
    }));
  }, []);

  return (
    <group>
      {mountains.map((m) => (
        <mesh key={m.id} position={[m.pos[0], m.h / 2 - 100, m.pos[2]]} receiveShadow>
          <coneGeometry args={[m.r, m.h, 4]} />
          <meshStandardMaterial color={m.color} roughness={1} />
        </mesh>
      ))}
      {/* Deep Ocean */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[200000, 200000]} />
        <meshStandardMaterial color="#002d44" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// --- FLIGHT SIMULATOR LOGIC ---
const FlightSimulator = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Real Physics
  const planePos = useRef(new THREE.Vector3(0, 1500, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -120)); 
  const throttle = useRef(0.6); // 스로틀
  
  const specs = aircraftType === 'stealth' ? { mass: 18000, thrust: 250000, wingArea: 65 } : { mass: 50000, thrust: 380000, wingArea: 180 };
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = true; 
      if (e.key === 'Shift') keys.current['shift'] = true;
      if (e.key === 'Control') keys.current['ctrl'] = true;
    };
    const up = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = false; 
      if (e.key === 'Shift') keys.current['shift'] = false;
      if (e.key === 'Control') keys.current['ctrl'] = false;
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    camera.position.set(0, 1520, 120);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  useFrame((_state, delta) => {
    // 1. Throttle logic (FIXED)
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    // 2. Control logic
    const pitchInput = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const rollInput = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);

    // G-force limiter
    const speed = planeVelocity.current.length();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    const aoa = -planeVelocity.current.clone().normalize().dot(upVec);
    const liftMag = 0.5 * 1.225 * speed * speed * specs.wingArea * (0.4 + aoa * 3.5);
    const currentG = liftMag / (specs.mass * 9.81);

    const pitchFinal = (currentG > 10 && pitchInput > 0) ? 0.1 : (currentG < -9 && pitchInput < 0) ? -0.1 : pitchInput;

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchFinal * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    // 3. Movement
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const thrust = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    const gravity = new THREE.Vector3(0, -specs.mass * 9.81, 0);
    const lift = upVec.clone().multiplyScalar(liftMag);
    const drag = planeVelocity.current.clone().multiplyScalar(-speed * 0.15);

    const netForce = new THREE.Vector3().add(thrust).add(gravity).add(lift).add(drag);
    const acceleration = netForce.divideScalar(specs.mass);

    planeVelocity.current.add(acceleration.multiplyScalar(delta));
    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));

    if (planePos.current.y < 10) { planePos.current.y = 10; planeVelocity.current.y = 0; }

    // 4. Update Aircraft Mesh
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // 5. Camera follow
    const camOffset = new THREE.Vector3(0, 12, 60).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(100)));

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
        {aircraftType === 'passenger' ? <PassengerPlane scale={0.15} /> : <F35StealthModel scale={0.25} />}
      </group>
      <World />
      <Sky distance={450000} sunPosition={[100, 10, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} factor={6} />
      <ambientLight intensity={1.0} />
      <directionalLight position={[100, 1000, 100]} intensity={2.0} />
      <fogExp2 attach="fog" color="#87ceeb" density={0.00003} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ 
          position: 'absolute', zIndex: 10, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' 
        }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 30px #3498db' }}>SKY ACE PRO</h1>
          <p style={{ letterSpacing: '15px', color: '#aaa', marginBottom: '50px' }}>ULTRA REALISTIC PHYSICS</p>
          
          <div style={{ display: 'flex', gap: '30px', marginBottom: '50px' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#00ffff' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px', transition: 'all 0.2s' }}>
              <h2 style={{ margin: 0, color: aircraft === 'stealth' ? '#00ffff' : 'white' }}>F-35 STEALTH</h2>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Advanced Aerodynamics</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px', transition: 'all 0.2s' }}>
              <h2 style={{ margin: 0, color: aircraft === 'passenger' ? '#e74c3c' : 'white' }}>747 AIRLINER</h2>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Heavy Weight System</p>
            </div>
          </div>

          <button 
            onClick={() => setStarted(true)} 
            style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900, boxShadow: '0 0 40px rgba(52, 152, 219, 0.5)' }}
          >
            LAUNCH
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.8)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '300px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '2px', marginBottom: '15px' }}>SYSTEM TELEMETRY</div>
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
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G-LOAD</span>
            </div>
          </div>
          
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', opacity: 0.5, fontSize: '0.8rem', textAlign: 'center' }}>
            SHIFT: THROTTLE UP | CTRL: THROTTLE DOWN | S: PULL UP | W: PUSH DOWN | A/D: ROLL
          </div>

          <Canvas shadows camera={{ fov: 60, far: 200000 }}>
            <color attach="background" args={['#87ceeb']} />
            <Suspense fallback={<LoadingScreen />}>
              <FlightSimulator aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
