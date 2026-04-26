import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, useGLTF, Stars, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants ---
const G_ACCEL = 9.80665;
const SEA_LEVEL_DENSITY = 1.225;

const AIRCRAFT_DATA = {
  stealth: {
    name: "F-35 LIGHTNING II",
    url: "https://vazxmixjsiawhamurptp.supabase.co/storage/v1/object/public/models/fighter-jet/model.gltf",
    mass: 20000, thrust: 250000, wingArea: 42.7, cd0: 0.012, liftSlope: 5.5, scale: 3, camDist: 80, camHeight: 15, color: "#3498db"
  },
  airliner: {
    name: "747 JUMBO JET",
    url: "https://vazxmixjsiawhamurptp.supabase.co/storage/v1/object/public/models/airplane/model.gltf",
    mass: 300000, thrust: 1100000, wingArea: 510, cd0: 0.022, liftSlope: 4.2, scale: 0.8, camDist: 250, camHeight: 50, color: "#e74c3c"
  },
  propeller: {
    name: "CESSNA SKYHAWK",
    url: "https://vazxmixjsiawhamurptp.supabase.co/storage/v1/object/public/models/propeller-plane/model.gltf",
    mass: 1100, thrust: 15000, wingArea: 16, cd0: 0.03, liftSlope: 4.0, scale: 4, camDist: 50, camHeight: 10, color: "#f1c40f"
  }
};

// --- Aircraft Component (Safe Loading) ---
const Aircraft = ({ type, scale }: { type: keyof typeof AIRCRAFT_DATA, scale: number }) => {
  const { scene } = useGLTF(AIRCRAFT_DATA[type].url);
  return <primitive object={scene} scale={scale} rotation={[0, Math.PI, 0]} />; 
};

// --- World ---
const Terrain = () => {
  const mountains = useMemo(() => [...Array(80)].map((_, i) => ({
    id: i, pos: [(Math.random()-0.5)*150000, 0, (Math.random()-0.5)*150000] as [number, number, number],
    h: 1000 + Math.random()*5000, r: 2000 + Math.random()*4000, color: Math.random() > 0.6 ? '#3b5e2b' : '#5c4033'
  })), []);

  return (
    <group>
      {mountains.map(m => (
        <mesh key={m.id} position={[m.pos[0], m.h/2 - 50, m.pos[2]]}>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.color} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]}>
        <planeGeometry args={[500000, 500000]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -500, 0]}>
        <planeGeometry args={[800000, 800000]} />
        <meshStandardMaterial color="#003d5c" />
      </mesh>
    </group>
  );
};

// --- FLIGHT ENGINE ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(0, 2000, 0));
  const quat = useRef(new THREE.Quaternion());
  const vel = useRef(new THREE.Vector3(0, 0, -180)); 
  const angularVel = useRef(new THREE.Vector3(0, 0, 0));
  const throttle = useRef(0.7); 

  const specs = AIRCRAFT_DATA[aircraftType as keyof typeof AIRCRAFT_DATA];
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_state, delta) => {
    if (delta > 0.1) return;

    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['control']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    const pitchTarget = (keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0));
    const rollTarget = (keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0));

    const currentSpeed = vel.current.length();
    const dynamicPressure = 0.5 * SEA_LEVEL_DENSITY * currentSpeed * currentSpeed;

    angularVel.current.x += (pitchTarget * 4.0 - angularVel.current.x * 3.0) * delta;
    angularVel.current.z += (rollTarget * 6.0 - angularVel.current.z * 3.0) * delta;

    const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(angularVel.current.x * delta, 0, angularVel.current.z * delta));
    quat.current.multiply(qDelta).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(quat.current).normalize();
    const velNorm = vel.current.clone().normalize();

    const thrust = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    const gravity = new THREE.Vector3(0, -specs.mass * G_ACCEL, 0);
    const aoa = -velNorm.dot(upVec);
    const liftCoeff = THREE.MathUtils.clamp(0.4 + aoa * specs.liftSlope, -0.8, 1.8);
    const lift = upVec.clone().multiplyScalar(dynamicPressure * specs.wingArea * liftCoeff);
    const drag = velNorm.clone().multiplyScalar(-(dynamicPressure * specs.wingArea * (specs.cd0 + (liftCoeff**2 / 18))));

    const acc = new THREE.Vector3().add(thrust).add(gravity).add(lift).add(drag).divideScalar(specs.mass);
    vel.current.add(acc.multiplyScalar(delta));
    vel.current.lerp(forward.clone().multiplyScalar(currentSpeed), 2.5 * delta); 

    pos.current.add(vel.current.clone().multiplyScalar(delta));
    if (pos.current.y < 20) { pos.current.y = 20; vel.current.y = 0; }

    if (airplaneRef.current) {
      airplaneRef.current.position.copy(pos.current);
      airplaneRef.current.quaternion.copy(quat.current);
    }

    camera.position.lerp(pos.current.clone().add(new THREE.Vector3(0, specs.camHeight, specs.camDist).applyQuaternion(quat.current)), 0.15);
    camera.up.copy(upVec);
    camera.lookAt(pos.current.clone().add(forward.clone().multiplyScalar(500)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ speed: Math.round(currentSpeed * 3.6), alt: Math.round(pos.current.y), thr: Math.round(throttle.current * 100), g: Math.round((lift.length() / (specs.mass * G_ACCEL)) * 10) / 10 });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={<mesh><boxGeometry args={[10, 2, 5]} /><meshBasicMaterial color="red" /></mesh>}>
          <Aircraft type={aircraftType} scale={specs.scale} />
        </Suspense>
      </group>
      <Terrain />
      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={500} count={5000} />
      <ambientLight intensity={1.0} />
      <directionalLight position={[100, 1000, 100]} intensity={1.5} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<keyof typeof AIRCRAFT_DATA>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', overflow: 'hidden', color: 'white', fontFamily: 'Arial, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
          <h1 style={{ fontSize: '5rem', fontStyle: 'italic', color: '#3498db', margin: 0 }}>SKY ACE PRO</h1>
          <div style={{ display: 'flex', gap: '20px', margin: '40px 0' }}>
            {Object.entries(AIRCRAFT_DATA).map(([key, data]) => (
              <div key={key} onClick={() => setAircraft(key as any)} style={{ padding: '20px', border: `3px solid ${aircraft === key ? data.color : '#333'}`, borderRadius: '15px', cursor: 'pointer', background: '#000', width: '200px' }}>
                <h3 style={{ margin: 0 }}>{data.name}</h3>
              </div>
            ))}
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1rem 5rem', fontSize: '1.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '30px', left: '30px', zIndex: 5, background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '15px', border: '1px solid #3498db' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>SPD: {telemetry.speed} KM/H</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>ALT: {telemetry.alt} M</div>
            <div style={{ fontSize: '1rem', color: '#2ecc71' }}>THR: {telemetry.thr}%</div>
            <div style={{ fontSize: '1rem', color: '#f1c40f' }}>G: {telemetry.g}</div>
          </div>
          <Canvas shadows camera={{ fov: 75, near: 5, far: 200000 }}>
            <Suspense fallback={<Html center><div style={{ color: 'white', fontSize: '2rem' }}>LOADING WORLD...</div></Html>}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
