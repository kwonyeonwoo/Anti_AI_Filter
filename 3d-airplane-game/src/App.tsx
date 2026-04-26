import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, PerspectiveCamera, Stars, Float, Cloud, Text } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Airplane Model ---
const AirplaneModel = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return (
    <primitive 
      object={scene} 
      scale={scale} 
      rotation={[0, Math.PI, 0]} 
    />
  );
};

// --- World Objects ---
const Landmark = ({ position, type }: { position: [number, number, number], type: 'mountain' | 'building' }) => {
  const height = type === 'mountain' ? 400 + Math.random() * 600 : 150 + Math.random() * 250;
  const width = type === 'mountain' ? 500 + Math.random() * 500 : 40 + Math.random() * 60;
  const color = type === 'mountain' ? '#3d3326' : '#1a2a3a';

  return (
    <mesh position={position}>
      {type === 'mountain' ? <coneGeometry args={[width, height, 4]} /> : <boxGeometry args={[width, height, width]} />}
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
};

// --- Flight Simulator Engine ---
const FlightSimulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Physics States
  const planePos = useRef(new THREE.Vector3(0, 500, 0)); // 고도 500m 시작
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(200); 
  const rotationVelocity = useRef(new THREE.Euler(0, 0, 0));
  
  const keys = useRef<{ [key: string]: boolean }>({});
  const [hud, setHud] = useState({ speed: 200, alt: 500 });

  useEffect(() => {
    // 시작 시 카메라 위치 즉시 비행기 뒤로 이동
    camera.position.set(0, 508, 25);
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // 1. Inputs (S: Up, W: Down)
    const targetPitch = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const targetRoll = keys.current['a'] ? 2.0 : (keys.current['d'] ? -2.0 : 0);

    rotationVelocity.current.x = THREE.MathUtils.lerp(rotationVelocity.current.x, targetPitch, 0.05);
    rotationVelocity.current.z = THREE.MathUtils.lerp(rotationVelocity.current.z, targetRoll, 0.05);

    // 2. Physics
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const verticalInclination = forward.dot(new THREE.Vector3(0, 1, 0));

    velocity.current -= verticalInclination * 100 * delta; 
    velocity.current = THREE.MathUtils.clamp(velocity.current, 100, 500); 

    // Rotation Apply
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVelocity.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVelocity.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat);
    planeQuat.current.normalize();

    // 3. Movement
    planePos.current.add(forward.multiplyScalar(velocity.current * delta));
    if (planePos.current.y < 5) planePos.current.y = 5;

    // 4. Mesh & Camera Update
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    const cameraOffset = new THREE.Vector3(0, 6, 25).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(cameraOffset), 0.1);

    const lookOffset = new THREE.Vector3(0, 2, -50).applyQuaternion(planeQuat.current);
    cameraLookAtTarget.current.lerp(planePos.current.clone().add(lookOffset), 0.1);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));

    if (state.clock.elapsedTime % 0.5 < 0.02) {
      setHud({ speed: Math.round(velocity.current), alt: Math.round(planePos.current.y) });
    }
  });

  const landmarks = useMemo(() => {
    return [...Array(80)].map((_, i) => ({
      id: i,
      pos: [(Math.random() - 0.5) * 15000, 0, (Math.random() - 0.5) * 15000] as [number, number, number],
      type: Math.random() > 0.4 ? 'mountain' : 'building'
    }));
  }, []);

  return (
    <>
      <group ref={airplaneRef}>
        <AirplaneModel scale={0.04} /> {/* 스케일을 안정적인 0.04로 조정 */}
      </group>

      {landmarks.map(lm => <Landmark key={lm.id} position={lm.pos} type={lm.type as any} />)}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[50000, 50000]} />
        <meshStandardMaterial color="#0b2b40" metalness={0.8} roughness={0.2} />
      </mesh>

      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={300} count={10000} />
      <Environment preset="city" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 200, 100]} intensity={1.5} />
      <fog attach="fog" args={['#87ceeb', 1000, 15000]} />

      <Text position={[planePos.current.x, planePos.current.y + 15, planePos.current.z - 60]} fontSize={4} color="white" font="/fonts/inter.woff">
        SPD: {hud.speed} | ALT: {hud.alt}
      </Text>
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', overflow: 'hidden', color: 'white', fontFamily: 'monospace' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          <h1 style={{ fontSize: '5rem', fontStyle: 'italic', color: '#3498db' }}>SKY ACE PRO</h1>
          <p style={{ letterSpacing: '10px', marginBottom: '40px' }}>INITIALIZING FLIGHT SYSTEMS...</p>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', border: '3px solid #3498db', background: 'transparent', color: 'white', fontWeight: 900 }}>
            ENGAGE
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, pointerEvents: 'none' }}>
            <h2 style={{ margin: 0, color: '#3498db' }}>ACE FLIGHT SIMULATOR</h2>
            <p style={{ opacity: 0.5 }}>SYSTEM: ONLINE | S: PULL UP | W: PUSH DOWN</p>
          </div>
          <Canvas shadows>
            <Suspense fallback={null}>
              <FlightSimulator />
            </Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
