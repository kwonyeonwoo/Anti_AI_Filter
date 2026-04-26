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
  useEffect(() => {
    scene.traverse((obj) => { if ((obj as THREE.Mesh).isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  }, [scene]);
  return <primitive object={scene} scale={scale} rotation={[0, 0, 0]} />; 
};

const StealthJet = ({ scale }: { scale: number }) => {
  const engineFlame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (engineFlame.current) {
      const s = 0.8 + Math.sin(clock.elapsedTime * 50) * 0.3;
      engineFlame.current.scale.set(s, s, 2.5);
    }
  });

  return (
    <group scale={scale} rotation={[0, Math.PI, 0]}>
      {/* High-detail body */}
      <mesh castShadow><cylinderGeometry args={[0.5, 0.1, 6, 8]} /><meshStandardMaterial color="#050505" metalness={1} roughness={0.1} /></mesh>
      <mesh position={[0, 0.45, -0.8]} rotation={[-Math.PI/12, 0, 0]}><capsuleGeometry args={[0.22, 0.7, 4, 12]} /><meshStandardMaterial color="#222" transparent opacity={0.5} metalness={1} /></mesh>
      <mesh castShadow position={[0, -0.05, 0.8]}><boxGeometry args={[6.8, 0.08, 2.4]} /><meshStandardMaterial color="#050505" /></mesh>
      <group ref={engineFlame} position={[0, -0.05, 3]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.05, 2, 12]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.8} /></mesh></group>
    </group>
  );
};

// --- World ---
const NaturalWorld = () => {
  const mountains = useMemo(() => {
    return [...Array(180)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 120000, 0, (Math.random() - 0.5) * 120000] as [number, number, number],
      h: 1500 + Math.random() * 6000,
      r: 2000 + Math.random() * 4000,
      color: Math.random() > 0.6 ? '#3b5e2b' : '#5c4033' 
    }));
  }, []);

  return (
    <group>
      {mountains.map((m) => (
        <mesh key={m.id} position={[m.pos[0], m.h / 2 - 50, m.pos[2]]} receiveShadow>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.color} roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]} receiveShadow>
        <planeGeometry args={[400000, 400000]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -500, 0]}>
        <planeGeometry args={[600000, 600000]} />
        <meshStandardMaterial color="#003d5c" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

// --- PROFESSIONAL FLIGHT ENGINE ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Physics States
  const planePos = useRef(new THREE.Vector3(0, 3000, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -220)); 
  const throttle = useRef(0.6); 
  
  const specs = useMemo(() => {
    return aircraftType === 'stealth'
      ? { mass: 20000, thrust: 191000, wingArea: 42.7, cd0: 0.015, liftSlope: 5.5, scale: 30, camDist: 180, camHeight: 25 }
      : { mass: 300000, thrust: 1128000, wingArea: 525, cd0: 0.022, liftSlope: 4.2, scale: 18, camDist: 1200, camHeight: 180 };
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
    camera.position.set(0, 3000 + specs.camHeight, specs.camDist);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [specs]);

  useFrame((_state, delta) => {
    if (delta > 0.1) return;

    // 1. Throttle logic
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.4 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.4 * delta);

    // 2. Control logic (Inputs)
    const pitchInput = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const rollInput = keys.current['a'] ? 2.8 : (keys.current['d'] ? -2.8 : 0);

    // 3. Vector Basis
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    const currentSpeed = planeVelocity.current.length();
    const velNorm = planeVelocity.current.clone().normalize();

    // 4. ATMOSPHERIC MODEL (Density decreases with altitude)
    const airDensity = SEA_LEVEL_DENSITY * Math.exp(-planePos.current.y / 10000);

    // 5. AERODYNAMIC FORCES
    // a. Thrust
    const thrustForce = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    // b. Gravity (Accurate Fg = m * g)
    const gravityForce = new THREE.Vector3(0, -specs.mass * G_ACCEL, 0);
    // c. Lift
    const aoa = -velNorm.dot(upVec); // Approximation of Angle of Attack
    // Realistic Lift Coefficient with sharp stall after 16 degrees (~0.28 rad)
    let liftCoeff = 0.4 + aoa * specs.liftSlope;
    if (Math.abs(aoa) > 0.28) liftCoeff *= 0.3; // Simple stall
    const liftMag = 0.5 * airDensity * currentSpeed * currentSpeed * specs.wingArea * liftCoeff;
    const liftForce = upVec.clone().multiplyScalar(liftMag);
    
    // d. G-FORCE & LIMITER
    const currentG = liftMag / (specs.mass * G_ACCEL);
    let pitchFinal = pitchInput;
    if (currentG > 9.0 && pitchInput > 0) pitchFinal = 0.05; 
    if (currentG < -8.5 && pitchInput < 0) pitchFinal = -0.05;

    // e. Drag (Parasitic + Induced Drag K*Cl^2)
    const inducedDragK = 1 / (Math.PI * 6 * 0.8); // 0.8 is Oswald efficiency factor
    const dragCoeff = specs.cd0 + inducedDragK * (liftCoeff * liftCoeff);
    const dragMag = 0.5 * airDensity * currentSpeed * currentSpeed * specs.wingArea * dragCoeff;
    const dragForce = velNorm.clone().multiplyScalar(-dragMag);

    // 6. INTEGRATION
    const netForce = new THREE.Vector3().add(thrustForce).add(gravityForce).add(liftForce).add(dragForce);
    const acceleration = netForce.divideScalar(specs.mass);
    planeVelocity.current.add(acceleration.multiplyScalar(delta));

    // Directional Stability (Weather-vaning)
    const alignmentStrength = (currentSpeed / 100) * 1.5 * delta;
    planeVelocity.current.lerp(forward.clone().multiplyScalar(currentSpeed), Math.min(1.0, alignmentStrength));

    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));

    if (planePos.current.y < 10) { planePos.current.y = 10; planeVelocity.current.y = 0; }

    // 7. ORIENTATION UPDATE
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchFinal * delta);
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * delta);
    planeQuat.current.multiply(pitchQ).multiply(rollQ).normalize();

    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // 8. CAMERA & VISUALS
    const speedKph = currentSpeed * 3.6;
    const fovBase = 75;
    const fovExtra = THREE.MathUtils.clamp((speedKph - 600) / 20, 0, 35);
    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, fovBase + fovExtra, 0.1);
    camera.updateProjectionMatrix();

    const shakeIntensity = THREE.MathUtils.clamp((speedKph - 900) / 1000, 0, 0.4);
    const shake = new THREE.Vector3((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity);

    const camOffset = new THREE.Vector3(0, specs.camHeight, specs.camDist).applyQuaternion(planeQuat.current).add(shake);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.12);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(400)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(speedKph), 
        alt: Math.round(planePos.current.y), 
        thr: Math.round(throttle.current * 100),
        g: Math.round(currentG * 10) / 10,
        aoa: Math.round(aoa * 57.3 * 10) / 10 // to degrees
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
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0, aoa: 0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 30px #3498db' }}>SKY ACE PRO</h1>
          <p style={{ letterSpacing: '15px', color: '#aaa', marginBottom: '50px' }}>PROFESSIONAL FLIGHT DYNAMICS</p>
          <div style={{ display: 'flex', gap: '30px', marginBottom: '50px' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#00ffff' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '300px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'stealth' ? '#00ffff' : 'white' }}>F-35 LIGHTNING II</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Thrust: 191kN | Mass: 20 Tons</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '300px' }}>
              <h2 style={{ margin: 0, color: aircraft === 'passenger' ? '#e74c3c' : 'white' }}>747-400 JUMBO</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Thrust: 1128kN | Mass: 300 Tons</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>ENGAGE</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.85)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>SPEED</span><span style={{ fontSize: '2.2rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '0.8rem' }}>KM/H</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>ALTITUDE</span><span style={{ fontSize: '2.2rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '0.8rem' }}>M</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}><span>THRUST</span><span style={{ fontSize: '1.5rem', color: '#2ecc71' }}>{telemetry.thr}%</span></div>
            <div style={{ width: '100%', height: '4px', background: '#333', marginBottom: '20px' }}><div style={{ width: `${telemetry.thr}%`, height: '100%', background: '#2ecc71' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '15px' }}>
              <span style={{ color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G-LOAD</span>
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
