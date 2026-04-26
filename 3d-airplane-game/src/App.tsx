import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, PerspectiveCamera, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants ---
const G_ACCEL = 9.80665;
const SEA_LEVEL_DENSITY = 1.225;

// --- Aircraft Model Data (Using stable CDN links) ---
const AIRCRAFT_DATA = {
  stealth: {
    name: "F-35 LIGHTNING II",
    url: "https://vazxmixjsiawhamurptp.supabase.co/storage/v1/object/public/models/fighter-jet/model.gltf",
    mass: 20000, thrust: 250000, wingArea: 42.7, cd0: 0.012, liftSlope: 5.5, scale: 3, camDist: 60, camHeight: 12, color: "#3498db"
  },
  airliner: {
    name: "747 JUMBO JET",
    url: "https://vazxmixjsiawhamurptp.supabase.co/storage/v1/object/public/models/airplane/model.gltf",
    mass: 300000, thrust: 1100000, wingArea: 525, cd0: 0.022, liftSlope: 4.2, scale: 0.8, camDist: 200, camHeight: 40, color: "#e74c3c"
  },
  propeller: {
    name: "CESSNA SKYHAWK",
    url: "https://vazxmixjsiawhamurptp.supabase.co/storage/v1/object/public/models/propeller-plane/model.gltf",
    mass: 1100, thrust: 15000, wingArea: 16, cd0: 0.03, liftSlope: 4.0, scale: 4, camDist: 45, camHeight: 10, color: "#f1c40f"
  }
};

// --- Loading UI ---
const LoadingScreen = () => (
  <Html center>
    <div style={{ 
      color: 'white', background: 'rgba(0,0,0,0.9)', padding: '40px 60px', 
      borderRadius: '30px', textAlign: 'center', border: '2px solid #3498db',
      fontFamily: 'sans-serif', minWidth: '320px', backdropFilter: 'blur(10px)'
    }}>
      <h1 style={{ margin: 0, letterSpacing: '4px' }}>INITIALIZING</h1>
      <p style={{ opacity: 0.5, marginTop: '10px' }}>CALIBRATING FLIGHT SYSTEMS...</p>
      <div style={{ width: '100%', height: '4px', background: '#222', marginTop: '20px', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: '40%', height: '100%', background: '#3498db', animation: 'load 1.5s infinite ease-in-out' }} />
      </div>
      <style>{`@keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }`}</style>
    </div>
  </Html>
);

// --- Aircraft Model Handler ---
const Aircraft = ({ type, scale }: { type: keyof typeof AIRCRAFT_DATA, scale: number }) => {
  const { scene } = useGLTF(AIRCRAFT_DATA[type].url);
  useEffect(() => {
    scene.traverse((obj) => { if ((obj as THREE.Mesh).isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  }, [scene]);
  return <primitive object={scene} scale={scale} rotation={[0, Math.PI, 0]} />; 
};

// --- World Terrain ---
const Terrain = () => {
  const mountains = useMemo(() => [...Array(100)].map((_, i) => ({
    id: i, pos: [(Math.random()-0.5)*120000, 0, (Math.random()-0.5)*120000] as [number, number, number],
    h: 1000 + Math.random()*5000, r: 2000 + Math.random()*4000, color: Math.random() > 0.6 ? '#3b5e2b' : '#5c4033'
  })), []);

  return (
    <group>
      {mountains.map(m => (
        <mesh key={m.id} position={[m.pos[0], m.h/2 - 50, m.pos[2]]} receiveShadow>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.color} roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]} receiveShadow>
        <planeGeometry args={[500000, 500000]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -500, 0]}>
        <planeGeometry args={[800000, 800000]} />
        <meshStandardMaterial color="#003d5c" metalness={0.8} roughness={0.2} />
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
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_state, delta) => {
    if (delta > 0.1) return;

    // Throttle
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    const pitchTarget = (keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0));
    const rollTarget = (keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0));

    const currentSpeed = vel.current.length();
    const dynamicPressure = 0.5 * SEA_LEVEL_DENSITY * currentSpeed * currentSpeed;

    // Moments
    const damping = 4.0 * (currentSpeed / 200);
    angularVel.current.x += (pitchTarget * 4.0 - angularVel.current.x * damping) * delta;
    angularVel.current.z += (rollTarget * 6.0 - angularVel.current.z * damping) * delta;

    const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(angularVel.current.x * delta, 0, angularVel.current.z * delta));
    quat.current.multiply(qDelta).normalize();

    // Basis
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(quat.current).normalize();
    const velNorm = vel.current.clone().normalize();

    // Aerodynamics
    const thrust = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    const gravity = new THREE.Vector3(0, -specs.mass * G_ACCEL, 0);
    const aoa = -velNorm.dot(upVec);
    const liftCoeff = THREE.MathUtils.clamp(0.4 + aoa * specs.liftSlope, -0.8, 1.8);
    const lift = upVec.clone().multiplyScalar(dynamicPressure * specs.wingArea * liftCoeff);
    const drag = velNorm.clone().multiplyScalar(-(dynamicPressure * specs.wingArea * (specs.cd0 + (liftCoeff**2 / 18))));

    // Physics
    const acc = new THREE.Vector3().add(thrust).add(gravity).add(lift).add(drag).divideScalar(specs.mass);
    vel.current.add(acc.multiplyScalar(delta));
    vel.current.lerp(forward.clone().multiplyScalar(currentSpeed), 2.5 * delta); // Weather-vaning

    pos.current.add(vel.current.clone().multiplyScalar(delta));
    if (pos.current.y < 20) { pos.current.y = 20; vel.current.y = 0; }

    // Sync
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(pos.current);
      airplaneRef.current.quaternion.copy(quat.current);
    }

    const currentG = lift.length() / (specs.mass * G_ACCEL);
    camera.position.lerp(pos.current.clone().add(new THREE.Vector3(0, specs.camHeight, specs.camDist).applyQuaternion(quat.current)), 0.15);
    camera.up.copy(upVec);
    camera.lookAt(pos.current.clone().add(forward.clone().multiplyScalar(500)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(currentSpeed * 3.6), 
        alt: Math.round(pos.current.y), 
        thr: Math.round(throttle.current * 100),
        g: Math.round(currentG * 10) / 10
      });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Aircraft type={aircraftType} scale={specs.scale} />
      </group>
      <Terrain />
      <Sky sunPosition={[100, 20, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <Environment preset="city" />
      <ambientLight intensity={1.0} />
      <directionalLight position={[100, 1000, 100]} intensity={2.0} castShadow />
      <fog attach="fog" args={['#d0e7ff', 1000, 80000]} />
    </>
  );
};

// --- App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<keyof typeof AIRCRAFT_DATA>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ 
          position: 'absolute', zIndex: 10, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' 
        }}>
          <h1 style={{ fontSize: '8rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 40px #3498db' }}>SKY ACE PRO</h1>
          <p style={{ letterSpacing: '15px', color: '#aaa', marginBottom: '60px' }}>ULTRA REALISTIC FLIGHT SIMULATOR</p>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '60px' }}>
            {Object.entries(AIRCRAFT_DATA).map(([key, data]) => (
              <div 
                key={key}
                onClick={() => setAircraft(key as any)}
                style={{ 
                  padding: '30px', width: '220px', cursor: 'pointer', 
                  border: `5px solid ${aircraft === key ? data.color : '#333'}`, 
                  borderRadius: '20px', background: 'rgba(0,0,0,0.6)', transition: 'all 0.2s' 
                }}
              >
                <h3 style={{ margin: 0, color: aircraft === key ? data.color : 'white' }}>{data.name}</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '10px' }}>{data.mass.toLocaleString()} kg</p>
              </div>
            ))}
          </div>

          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900, boxShadow: '0 0 50px rgba(52, 152, 219, 0.5)' }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.85)', padding: '30px', borderRadius: '25px', border: '2px solid #3498db', minWidth: '320px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '3px', marginBottom: '20px' }}>FLIGHT TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>AIRSPEED</span><span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '1rem' }}>KM/H</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>ALTITUDE</span><span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '1rem' }}>M</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}><span>THRUST</span><span style={{ fontSize: '1.8rem', color: '#2ecc71' }}>{telemetry.thr}%</span></div>
            <div style={{ width: '100%', height: '5px', background: '#333', marginBottom: '20px' }}><div style={{ width: `${telemetry.thr}%`, height: '100%', background: '#2ecc71', transition: 'width 0.1s' }} /></div>
            <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '20px' }}>
              <span style={{ fontSize: '1.5rem', color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G-LOAD</span>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', opacity: 0.5, fontSize: '0.8rem', textAlign: 'center', color: 'black' }}>
            SHIFT: THRUST UP | CTRL: THRUST DOWN | S: PULL UP | W: PUSH DOWN | A/D: ROLL
          </div>
          <Canvas shadows camera={{ fov: 75, near: 5, far: 200000 }}>
            <Suspense fallback={<LoadingScreen />}>
              <FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
