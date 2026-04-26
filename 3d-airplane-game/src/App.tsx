import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Stealth Fighter Model (High-Detail Procedural) ---
const StealthFighter = ({ scale }: { scale: number }) => {
  const engineFlame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (engineFlame.current) {
      engineFlame.current.scale.x = 0.9 + Math.sin(clock.elapsedTime * 35) * 0.1;
      engineFlame.current.scale.y = 0.9 + Math.sin(clock.elapsedTime * 35) * 0.1;
    }
  });

  return (
    <group scale={scale * 20} rotation={[0, Math.PI, 0]}>
      {/* Sleek Diamond Fuselage */}
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.1, 5, 8]} />
        <meshStandardMaterial color="#0a0a0a" metalness={1} roughness={0.2} />
      </mesh>
      {/* Wing root / Body extension */}
      <mesh position={[0, -0.05, 0.5]}>
        <boxGeometry args={[1.5, 0.2, 3]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Large Delta Wings */}
      <mesh castShadow position={[0, -0.1, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3, 0.1, 2.5, 3]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.4, -1]}>
        <sphereGeometry args={[0.3, 16, 16]} scale={[1, 1, 2.5]} />
        <meshStandardMaterial color="#222" transparent opacity={0.6} metalness={1} roughness={0} />
      </mesh>
      {/* Twin Engines Intakes */}
      <mesh position={[0.4, 0, -1.2]}><boxGeometry args={[0.3, 0.4, 1.2]} /><meshStandardMaterial color="#050505" /></mesh>
      <mesh position={[-0.4, 0, -1.2]}><boxGeometry args={[0.3, 0.4, 1.2]} /><meshStandardMaterial color="#050505" /></mesh>
      {/* Twin Canted Tails */}
      <mesh castShadow position={[0.8, 0.6, 2.5]} rotation={[0, 0, -Math.PI / 5]}><boxGeometry args={[0.05, 1.5, 1]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
      <mesh castShadow position={[-0.8, 0.6, 2.5]} rotation={[0, 0, Math.PI / 5]}><boxGeometry args={[0.05, 1.5, 1]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
      {/* Twin Exhausts */}
      <group ref={engineFlame} position={[0, -0.1, 2.8]}>
        <mesh position={[0.3, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.05, 1.5, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.7} /></mesh>
        <mesh position={[-0.3, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.05, 1.5, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.7} /></mesh>
      </group>
    </group>
  );
};

const PassengerPlane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale * 8} rotation={[0, 0, 0]} />; 
};

// --- Terrain ---
const Terrain = () => {
  const mountains = useMemo(() => {
    return [...Array(120)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 60000, 0, (Math.random() - 0.5) * 60000] as [number, number, number],
      h: 500 + Math.random() * 2500,
      r: 800 + Math.random() * 2000
    }));
  }, []);

  return (
    <group>
      {mountains.map((m) => (
        <mesh key={m.id} position={[m.pos[0], m.h / 2 - 100, m.pos[2]]} receiveShadow>
          <coneGeometry args={[m.r, m.h, 4]} />
          <meshStandardMaterial color="#222" roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[200000, 200000]} />
        <meshStandardMaterial color="#003d5c" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// --- FLIGHT ENGINE WITH G-FORCE LIMITER ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const planePos = useRef(new THREE.Vector3(0, 1500, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -120)); 
  const throttle = useRef(0.6);
  const currentG = useRef(1.0);
  
  const specs = aircraftType === 'stealth' ? { mass: 18000, thrust: 240000, wingArea: 60 } : { mass: 45000, thrust: 350000, wingArea: 160 };
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = true; 
      if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; 
    };
    const up = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = false; 
      if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; 
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    camera.position.set(0, 1520, 100);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  useFrame((_state, delta) => {
    // 1. Throttle
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    // 2. G-Force Calculation and Limitation
    // G-Force = Lift / Weight
    const currentSpeed = planeVelocity.current.length();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    const aoa = -planeVelocity.current.clone().normalize().dot(upVec);
    const liftMag = 0.5 * 1.225 * currentSpeed * currentSpeed * specs.wingArea * (0.5 + aoa * 4.0);
    currentG.current = liftMag / (specs.mass * 9.81);

    // G-Force Limiter: 조종 입력값을 G-Force에 따라 동적으로 클램핑
    let maxPitch = 1.6;
    let minPitch = -1.6;

    // 만약 현재 G가 10G를 넘어가려 하면, 더 이상의 기수 상승(S)을 차단
    if (currentG.current > 9.5) maxPitch = 0.1; 
    if (currentG.current < -8.5) minPitch = -0.1;

    const targetPitch = keys.current['s'] ? maxPitch : (keys.current['w'] ? minPitch : 0);
    const targetRoll = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), targetPitch * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), targetRoll * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    // 3. Physics Physics (F = ma)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const thrust = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    const gravity = new THREE.Vector3(0, -specs.mass * 9.81, 0);
    const lift = upVec.clone().multiplyScalar(liftMag);
    const drag = planeVelocity.current.clone().multiplyScalar(-currentSpeed * 0.15);

    const netForce = new THREE.Vector3().add(thrust).add(gravity).add(lift).add(drag);
    const acceleration = netForce.divideScalar(specs.mass);

    planeVelocity.current.add(acceleration.multiplyScalar(delta));
    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));

    if (planePos.current.y < 10) { planePos.current.y = 10; planeVelocity.current.y = 0; }

    // 4. Updates
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    const camOffset = new THREE.Vector3(0, 12, 65).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(100)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(currentSpeed * 3.6), 
        alt: Math.round(planePos.current.y), 
        thr: Math.round(throttle.current * 100),
        g: Math.round(currentG.current * 10) / 10
      });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={null}>
          {aircraftType === 'passenger' ? <PassengerPlane scale={0.12} /> : <StealthFighter scale={0.25} />}
        </Suspense>
      </group>
      <Terrain />
      <Sky sunPosition={[500, 150, -1000]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <Environment preset="night" />
      <ambientLight intensity={1.2} />
      <directionalLight position={[500, 1000, 100]} intensity={2.5} castShadow />
      <fog attach="fog" args={['#87ceeb', 2000, 50000]} />
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
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #1a2a3a 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0 }}>G-FORCE LIMIT</h1>
          <div style={{ display: 'flex', gap: '30px', margin: '40px 0' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#00ffff' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '250px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'stealth' ? '#00ffff' : 'white' }}>F-35 STEALTH</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Limiter: -9G / +10G</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '250px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'passenger' ? '#e74c3c' : 'white' }}>747 AIRLINER</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>High-Lift Cargo System</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.85)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '300px' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '2px', marginBottom: '15px' }}>FLIGHT TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '1rem', color: '#aaa' }}>SPEED</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '1rem' }}>KM/H</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '1rem', color: '#aaa' }}>ALTITUDE</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '1rem' }}>M</span></span>
            </div>
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>CURRENT LOAD</div>
              <span style={{ fontSize: '2.2rem', fontWeight: 900, color: telemetry.g > 8 || telemetry.g < -7 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G</span>
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
