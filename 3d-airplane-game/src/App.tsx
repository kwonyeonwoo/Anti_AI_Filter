import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, PerspectiveCamera, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants ---
const AIR_DENSITY = 1.225;
const GRAVITY = 9.81;

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
      const s = 0.8 + Math.sin(clock.elapsedTime * 45) * 0.2;
      engineFlame.current.scale.set(s, s, 1.8);
    }
  });

  return (
    <group scale={scale} rotation={[0, Math.PI, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.5, 0.1, 6, 8]} /><meshStandardMaterial color="#0a0a0a" metalness={1} roughness={0.1} /></mesh>
      <mesh position={[0, 0.45, -1]} rotation={[-Math.PI / 12, 0, 0]}><capsuleGeometry args={[0.25, 0.8, 4, 12]} /><meshStandardMaterial color="#222" transparent opacity={0.6} metalness={1} /></mesh>
      <mesh castShadow position={[0, -0.05, 0.5]}><boxGeometry args={[7.5, 0.1, 2.8]} /><meshStandardMaterial color="#0a0a0a" /></mesh>
      <group ref={engineFlame} position={[0, -0.1, 3.2]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.1, 2.5, 12]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.8} /></mesh></group>
    </group>
  );
};

// --- Natural Terrain ---
const World = () => {
  const mountains = useMemo(() => {
    return [...Array(150)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 120000, 0, (Math.random() - 0.5) * 120000] as [number, number, number],
      h: 1000 + Math.random() * 6000,
      r: 2000 + Math.random() * 4000,
      color: Math.random() > 0.5 ? '#3b5e2b' : '#5c4033' 
    }));
  }, []);

  return (
    <group>
      {mountains.map((m) => (
        <mesh key={m.id} position={[m.pos[0], m.h / 2 - 50, m.pos[2]]}>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.color} roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]}>
        <planeGeometry args={[300000, 300000]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -500, 0]}>
        <planeGeometry args={[600000, 600000]} />
        <meshStandardMaterial color="#004d71" metalness={0.6} />
      </mesh>
    </group>
  );
};

// --- ADVANCED FLIGHT ENGINE ---
const FlightEngine = ({ aircraftType, setTelemetry }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Real Physics Stats
  const planePos = useRef(new THREE.Vector3(0, 3000, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -250)); // Start with decent speed
  const throttle = useRef(0.6); 
  
  const specs = useMemo(() => {
    return aircraftType === 'stealth'
      ? { mass: 18000, thrust: 350000, wingArea: 42, dragCoeff: 0.012, scale: 28, camDist: 140, camHeight: 25 }
      : { mass: 330000, thrust: 1200000, wingArea: 510, dragCoeff: 0.022, scale: 15, camDist: 1100, camHeight: 150 };
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
    camera.position.set(0, 3020, 150);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_state, delta) => {
    if (delta > 0.1) return;

    // 1. Throttle logic
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);

    // 2. Control logic
    const pitchInput = keys.current['s'] ? 1.6 : (keys.current['w'] ? -1.6 : 0);
    const rollInput = keys.current['a'] ? 2.8 : (keys.current['d'] ? -2.8 : 0);

    // 3. Force Calculation
    const currentSpeed = planeVelocity.current.length();
    const velNorm = planeVelocity.current.clone().normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();

    // Thrust
    const thrustForce = forward.clone().multiplyScalar(throttle.current * specs.thrust);
    // Gravity
    const gravityForce = new THREE.Vector3(0, -specs.mass * GRAVITY, 0);
    // Lift
    const aoa = -velNorm.dot(upVec); 
    const liftCoeff = THREE.MathUtils.clamp(0.45 + aoa * 5.0, -1.0, 2.0);
    const liftMag = 0.5 * AIR_DENSITY * currentSpeed * currentSpeed * specs.wingArea * liftCoeff;
    const liftForce = upVec.clone().multiplyScalar(liftMag);
    // Drag
    const totalDragCoeff = specs.dragCoeff + (liftCoeff * liftCoeff) / (Math.PI * 6);
    const dragMag = 0.5 * AIR_DENSITY * currentSpeed * currentSpeed * specs.wingArea * totalDragCoeff;
    const dragForce = velNorm.clone().multiplyScalar(-dragMag);

    // G-Force Limiter
    const currentG = liftMag / (specs.mass * GRAVITY);
    let pitchFinal = pitchInput;
    if (currentG > 9.5 && pitchInput > 0) pitchFinal = 0.1; 
    if (currentG < -8.5 && pitchInput < 0) pitchFinal = -0.1;

    // Integration
    const netForce = new THREE.Vector3().add(thrustForce).add(gravityForce).add(liftForce).add(dragForce);
    const acceleration = netForce.divideScalar(specs.mass);
    planeVelocity.current.add(acceleration.multiplyScalar(delta));

    // Weather-vaning (High-speed alignment)
    const alignmentStrength = 3.0 * delta;
    planeVelocity.current.lerp(forward.clone().multiplyScalar(currentSpeed), alignmentStrength);

    // MOVE PLANE (Using a visual scale multiplier for perceived speed if needed, 
    // but here we keep it 1:1 and rely on FOV and camera effects)
    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));

    if (planePos.current.y < 10) { planePos.current.y = 10; planeVelocity.current.y = 0; }

    // Update Orientation
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchFinal * delta);
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * delta);
    planeQuat.current.multiply(pitchQ).multiply(rollQ).normalize();

    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // --- VISUAL SPEED ENHANCEMENTS ---
    const speedKph = currentSpeed * 3.6;
    
    // 1. Dynamic FOV (Expanding at high speed)
    const fovBase = 70;
    const fovExtra = THREE.MathUtils.clamp((speedKph - 500) / 10, 0, 40); // Max +40 FOV
    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, fovBase + fovExtra, 0.1);
    camera.updateProjectionMatrix();

    // 2. High-Speed Camera Shake
    const shakeIntensity = THREE.MathUtils.clamp((speedKph - 800) / 1000, 0, 0.5);
    const shake = new THREE.Vector3(
      (Math.random() - 0.5) * shakeIntensity,
      (Math.random() - 0.5) * shakeIntensity,
      (Math.random() - 0.5) * shakeIntensity
    );

    // 3. Dynamic Camera Position (Lag behind on acceleration)
    const speedDistMult = 1 + (speedKph / 2000); // Further distance at high speed
    const camOffset = new THREE.Vector3(0, specs.camHeight, specs.camDist * speedDistMult).applyQuaternion(planeQuat.current).add(shake);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.12);
    camera.up.copy(upVec);
    camera.lookAt(planePos.current.clone().add(forward.clone().multiplyScalar(200)));

    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(speedKph), 
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
          {aircraftType === 'passenger' ? <Airliner scale={specs.scale} /> : <StealthJet scale={specs.scale} />}
        </Suspense>
      </group>
      <World />
      <Sky distance={450000} sunPosition={[100, 10, 100]} rayleigh={3} />
      <Stars radius={500} count={5000} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[100, 1000, 100]} intensity={2.0} />
      <fog attach="fog" args={['#d0e7ff', 500, 60000]} />
    </>
  );
};

// --- Main App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraft, setAircraft] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, g: 1.0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #1a2a3a 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#3498db', margin: 0 }}>SKY ACE PRO</h1>
          <div style={{ display: 'flex', gap: '30px', margin: '40px 0' }}>
            <div onClick={() => setAircraft('stealth')} style={{ padding: '30px', border: `5px solid ${aircraft === 'stealth' ? '#00ffff' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2>F-35 LIGHTNING</h2>
              <p style={{ opacity: 0.7 }}>Mach 2.5 Capability</p>
            </div>
            <div onClick={() => setAircraft('passenger')} style={{ padding: '30px', border: `5px solid ${aircraft === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '20px', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: '280px' }}>
              <h2>747 JUMBO</h2>
              <p style={{ opacity: 0.7 }}>Heavy Transport</p>
            </div>
          </div>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '60px', cursor: 'pointer', fontWeight: 900 }}>LAUNCH</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, background: 'rgba(0,10,20,0.85)', padding: '30px', borderRadius: '20px', border: '2px solid #3498db', minWidth: '300px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.8rem', color: '#3498db', letterSpacing: '2px', marginBottom: '15px' }}>TELEMETRY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>SPEED</span><span style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.speed} <span style={{ fontSize: '0.8rem' }}>KM/H</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>ALTITUDE</span><span style={{ fontSize: '2rem', fontWeight: 900 }}>{telemetry.alt} <span style={{ fontSize: '0.8rem' }}>M</span></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>THRUST</span><span style={{ fontSize: '1.5rem', color: '#2ecc71' }}>{telemetry.thr}%</span></div>
            <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '15px' }}><span style={{ fontSize: '1.5rem', color: telemetry.g > 8 ? '#ff0000' : '#f1c40f' }}>{telemetry.g} G-LOAD</span></div>
          </div>
          <Canvas shadows camera={{ fov: 75, near: 5, far: 200000 }}>
            <color attach="background" args={['#d0e7ff']} />
            <Suspense fallback={null}><FlightEngine aircraftType={aircraft} setTelemetry={setTelemetry} /></Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
