import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Cloud, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Loading Component ---
const LoadingScreen = () => (
  <Html center>
    <div style={{ color: 'white', background: 'rgba(0,0,0,0.8)', padding: '20px 40px', borderRadius: '10px', textAlign: 'center', border: '2px solid #3498db', width: '300px' }}>
      <h2 style={{ margin: 0 }}>LOADING AIRCRAFT...</h2>
    </div>
  </Html>
);

// --- Aircraft Models ---
const PassengerPlane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale * 5} rotation={[0, 0, 0]} />; // 방향 수정: Math.PI 제거
};

const StealthFighter = ({ scale }: { scale: number }) => {
  const engineFlame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (engineFlame.current) {
      engineFlame.current.scale.z = 1 + Math.sin(clock.elapsedTime * 30) * 0.5;
    }
  });
  return (
    <group scale={scale * 10} rotation={[0, Math.PI, 0]}> {/* 정면 정렬 */}
      {/* Fuselage */}
      <mesh castShadow><coneGeometry args={[0.6, 6, 8]} rotation={[Math.PI / 2, 0, 0]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} /></mesh>
      {/* Wings */}
      <mesh castShadow position={[0, 0, 0.5]}><boxGeometry args={[6, 0.1, 2]} /><meshStandardMaterial color="#111" /></mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.4, -1]}><sphereGeometry args={[0.3, 16, 16]} scale={[1, 1, 2]} /><meshStandardMaterial color="#00ffff" transparent opacity={0.4} /></mesh>
      {/* Tail */}
      <mesh position={[0.8, 0.4, 2.5]} rotation={[0, 0, -Math.PI / 6]}><boxGeometry args={[0.05, 1, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[-0.8, 0.4, 2.5]} rotation={[0, 0, Math.PI / 6]}><boxGeometry args={[0.05, 1, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
      {/* Flame */}
      <mesh ref={engineFlame} position={[0, 0, 3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.05, 1.5, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.8} /></mesh>
    </group>
  );
};

// --- Terrain ---
const Terrain = () => {
  const landmarks = useMemo(() => {
    return [...Array(150)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 50000, 0, (Math.random() - 0.5) * 50000] as [number, number, number],
      type: Math.random() > 0.4 ? 'mountain' : 'building'
    }));
  }, []);

  return (
    <group>
      {landmarks.map((lm) => (
        <mesh key={lm.id} position={[lm.pos[0], lm.type === 'mountain' ? 300 : 150, lm.pos[2]]}>
          {lm.type === 'mountain' ? <coneGeometry args={[600, 600, 4]} /> : <boxGeometry args={[150, 300, 150]} />}
          <meshLambertMaterial color={lm.type === 'mountain' ? '#3d2b1f' : '#2c3e50'} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[200000, 200000]} />
        <meshStandardMaterial color="#005b8c" />
      </mesh>
    </group>
  );
};

// --- Flight Simulator Engine ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Real Physics Stats
  const planePos = useRef(new THREE.Vector3(0, 1500, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -100)); // m/s
  const throttle = useRef(0.6); 
  
  const keys = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_state, delta) => {
    // 1. Throttle Control
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.4 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.4 * delta);

    // 2. Control Surfaces (S: Up, W: Down)
    const pitchInput = keys.current['s'] ? 1.4 : (keys.current['w'] ? -1.4 : 0);
    const rollInput = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchInput * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    // 3. Physics Vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    const currentSpeed = planeVelocity.current.length();

    // Thrust
    const thrustPower = aircraftType === 'stealth' ? 250000 : 350000;
    const thrust = forward.clone().multiplyScalar(throttle.current * thrustPower);

    // Gravity
    const mass = aircraftType === 'stealth' ? 15000 : 40000;
    const gravity = new THREE.Vector3(0, -9.81 * mass, 0);

    // Lift (F_lift = 0.5 * rho * v^2 * S * Cl)
    const aoa = -planeVelocity.current.clone().normalize().dot(upVec);
    const liftCoeff = 0.5 + aoa * 4.0;
    const liftMag = 0.5 * 1.225 * currentSpeed * currentSpeed * (aircraftType === 'stealth' ? 50 : 130) * liftCoeff;
    const lift = upVec.clone().multiplyScalar(liftMag);

    // Drag
    const drag = planeVelocity.current.clone().multiplyScalar(-currentSpeed * 0.1);

    // Net Force
    const netForce = new THREE.Vector3().add(thrust).add(gravity).add(lift).add(drag);
    const acceleration = netForce.divideScalar(mass);

    planeVelocity.current.add(acceleration.multiplyScalar(delta));
    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));

    // Ground limit
    if (planePos.current.y < 10) {
      planePos.current.y = 10;
      planeVelocity.current.y = Math.max(0, planeVelocity.current.y);
    }

    // 4. Update Objects
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // Dynamic Camera
    const cameraOffset = new THREE.Vector3(0, 12, 50).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(cameraOffset), 0.1);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(100)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(currentSpeed * 3.6), 
        alt: Math.round(planePos.current.y), 
        thr: Math.round(throttle.current * 100),
        stall: currentSpeed * 3.6 < 180
      });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={null}>
          {aircraftType === 'passenger' ? <PassengerPlane scale={0.2} /> : <StealthFighter scale={0.2} />}
        </Suspense>
      </group>
      <Terrain />
      <Sky distance={450000} sunPosition={[100, 20, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <Environment preset="night" />
      <ambientLight intensity={1.0} /> {/* 광원 강화 */}
      <directionalLight position={[100, 1000, 100]} intensity={2.0} castShadow />
      <fog attach="fog" args={['#87ceeb', 1000, 50000]} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, stall: false });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', overflow: 'hidden', color: 'white', fontFamily: 'Arial, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', fontWeight: 900, color: '#3498db', margin: 0 }}>SKY ACE PRO</h1>
          <div style={{ display: 'flex', gap: '20px', margin: '40px 0' }}>
            <button onClick={() => setAircraft('stealth')} style={{ padding: '20px 40px', border: `4px solid ${aircraft === 'stealth' ? '#3498db' : '#333'}`, background: '#000', color: 'white', cursor: 'pointer', borderRadius: '10px' }}>STEALTH JET</button>
            <button onClick={() => setAircraft('passenger')} style={{ padding: '20px 40px', border: `4px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, background: '#000', color: 'white', cursor: 'pointer', borderRadius: '10px' }}>AIRLINER</button>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: aircraft === 'stealth' ? '#3498db' : '#e74c3c', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '30px', left: '30px', zIndex: 5, background: 'rgba(0,10,20,0.8)', padding: '25px', borderRadius: '15px', border: '2px solid #3498db', minWidth: '250px' }}>
            <div style={{ fontSize: '1rem', color: '#3498db', marginBottom: '10px' }}>FLIGHT TELEMETRY</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '0.8rem', color: '#aaa' }}>KM/H</span></div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '0.8rem', color: '#aaa' }}>M</span></div>
            <div style={{ width: '100%', height: '5px', background: '#222', marginTop: '15px' }}><div style={{ width: `${telemetry.thr}%`, height: '100%', background: '#2ecc71' }} /></div>
            <div style={{ fontSize: '0.8rem', marginTop: '5px', color: '#aaa' }}>THRUST: {telemetry.thr}%</div>
          </div>
          {telemetry.stall && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ff0000', fontSize: '5rem', fontWeight: 900, textShadow: '0 0 20px red' }}>STALL</div>
          )}
          <Canvas shadows camera={{ fov: 60, near: 1, far: 200000 }}>
            <Suspense fallback={<LoadingScreen />}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
