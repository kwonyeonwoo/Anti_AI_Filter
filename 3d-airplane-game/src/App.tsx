import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, useGLTF, Stars, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants ---
const G_ACCEL = 9.80665;
const SEA_LEVEL_DENSITY = 1.225;

// --- Aircraft Model Config ---
const AIRCRAFT_CONFIG = {
  f35: {
    name: "F-35 LIGHTNING",
    file: "/f35.glb",
    mass: 20000, thrust: 250000, wingArea: 43, cd0: 0.012, liftSlope: 5.5, scale: 1.2, camDist: 250, camHeight: 35, color: "#3498db"
  },
  f16: {
    name: "F-16 FALCON",
    file: "/f16.glb",
    mass: 12000, thrust: 180000, wingArea: 28, cd0: 0.015, liftSlope: 5.0, scale: 1.0, camDist: 220, camHeight: 30, color: "#2ecc71"
  },
  stunt: {
    name: "EXTRA 300 (STUNT)",
    file: "/stunt.glb",
    mass: 1100, thrust: 25000, wingArea: 10, cd0: 0.025, liftSlope: 4.5, scale: 160.0, camDist: 150, camHeight: 25, color: "#f1c40f"
  },
  airliner: {
    name: "BOEING 747",
    file: "/airplane.glb",
    mass: 300000, thrust: 1200000, wingArea: 511, cd0: 0.020, liftSlope: 4.0, scale: 5.0, camDist: 400, camHeight: 60, color: "#e74c3c"
  }
};

// --- Aircraft Component ---
const AircraftModel = ({ type, scale }: { type: keyof typeof AIRCRAFT_CONFIG, scale: number }) => {
  const { scene } = useGLTF(AIRCRAFT_CONFIG[type].file);
  
  // 기체별 방향 보정: 모든 모델이 정면(-Z)을 바라보도록 설정
  const rotation: [number, number, number] = type === 'stunt' ? [0, -Math.PI / 2, 0] : [0, 0, 0];
  if (type === 'f35' || type === 'f16') {
    // 반대로 되어 있는 기체를 180도 회전시켜 정면(-Z)을 보게 함 (기존 -PI/2 -> PI/2)
    return <primitive object={scene} scale={scale} rotation={[0, Math.PI / 2, 0]} />; 
  }

  return <primitive object={scene} scale={scale} rotation={rotation} />; 
};

// --- World Terrain ---
const World = () => {
  const mountains = useMemo(() => [...Array(100)].map((_, i) => ({
    id: i, pos: [(Math.random()-0.5)*150000, 0, (Math.random()-0.5)*150000] as [number, number, number],
    h: 1500 + Math.random()*5000, r: 2500 + Math.random()*4000, color: Math.random() > 0.6 ? '#3b5e2b' : '#5c4033'
  })), []);

  return (
    <group>
      {mountains.map(m => (
        <mesh key={m.id} position={[m.pos[0], m.h/2 - 100, m.pos[2]]}>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.color} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]}>
        <planeGeometry args={[500000, 500000]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -500, 0]}>
        <planeGeometry args={[1000000, 1000000]} />
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

  const specs = AIRCRAFT_CONFIG[aircraftType as keyof typeof AIRCRAFT_CONFIG];
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    camera.position.set(0, 2000 + specs.camHeight, specs.camDist);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [specs]);

  useFrame((_state, delta) => {
    if (delta > 0.1) return;

    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    const pitchTarget = (keys.current['s'] ? 1.6 : (keys.current['w'] ? -1.6 : 0));
    const rollTarget = (keys.current['a'] ? 2.8 : (keys.current['d'] ? -2.8 : 0));

    const currentSpeed = vel.current.length();
    const dynamicPressure = 0.5 * SEA_LEVEL_DENSITY * currentSpeed * currentSpeed;

    angularVel.current.x += (pitchTarget * 4.5 - angularVel.current.x * 3.5) * delta;
    angularVel.current.z += (rollTarget * 6.5 - angularVel.current.z * 3.5) * delta;

    const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(angularVel.current.x * delta, 0, angularVel.current.z * delta));
    quat.current.multiply(qDelta).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(quat.current).normalize();
    const velNorm = vel.current.clone().normalize();

    const thrust = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    const gravity = new THREE.Vector3(0, -specs.mass * G_ACCEL, 0);
    const aoa = -velNorm.dot(upVec);
    const liftCoeff = THREE.MathUtils.clamp(0.45 + aoa * specs.liftSlope, -0.9, 1.8);
    const lift = upVec.clone().multiplyScalar(dynamicPressure * specs.wingArea * liftCoeff);
    const drag = velNorm.clone().multiplyScalar(-(dynamicPressure * specs.wingArea * (specs.cd0 + (liftCoeff**2 / 20))));

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
        <Suspense fallback={null}>
          <AircraftModel type={aircraftType} scale={specs.scale} />
        </Suspense>
      </group>
      <World />
      <Sky distance={450000} sunPosition={[100, 10, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[100, 1000, 100]} intensity={1.5} />
      <fog attach="fog" args={['#d0e7ff', 1000, 60000]} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<keyof typeof AIRCRAFT_CONFIG>('f35');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 40px #3498db' }}>SKY ACE PRO</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '40px 0' }}>
            {Object.entries(AIRCRAFT_CONFIG).map(([key, data]) => (
              <div key={key} onClick={() => setAircraft(key as any)} style={{ padding: '20px', border: `5px solid ${aircraft === key ? data.color : '#333'}`, borderRadius: '15px', cursor: 'pointer', background: 'rgba(0,0,0,0.6)', width: '220px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{data.name}</h3>
              </div>
            ))}
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.2rem 6rem', fontSize: '2rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.8)', padding: '25px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>SPEED</span><span style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '0.8rem' }}>KM/H</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>ALTITUDE</span><span style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '1rem' }}>M</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>THRUST</span><span style={{ fontSize: '1.5rem', color: '#2ecc71' }}>{telemetry.thr}%</span></div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}><span style={{ fontSize: '1.5rem', color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G</span></div>
          </div>
          <Canvas shadows camera={{ fov: 75, near: 5, far: 200000 }}>
            <color attach="background" args={['#d0e7ff']} />
            <Suspense fallback={<Html center><div style={{ color: 'black', fontSize: '2rem', fontWeight: 900 }}>LOADING AIRCRAFT...</div></Html>}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
