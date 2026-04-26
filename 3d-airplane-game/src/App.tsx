import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, PerspectiveCamera, Stars, Float, Cloud, Text } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Airplane Model ---
const AirplaneModel = () => {
  const { scene } = useGLTF('/airplane.glb');
  return (
    <primitive 
      object={scene} 
      scale={0.12} // 크기를 다시 대폭 키움 (기존 0.05 -> 0.12)
      rotation={[0, Math.PI, 0]} 
    />
  );
};

// --- World Objects (Buildings & Mountains) ---
const Landmark = ({ position, type }: { position: [number, number, number], type: 'mountain' | 'building' }) => {
  const height = type === 'mountain' ? 300 + Math.random() * 500 : 100 + Math.random() * 200;
  const width = type === 'mountain' ? 400 + Math.random() * 400 : 30 + Math.random() * 50;
  const color = type === 'mountain' ? '#4b3f2f' : '#2c3e50';

  return (
    <mesh position={position}>
      {type === 'mountain' ? (
        <coneGeometry args={[width, height, 4]} />
      ) : (
        <boxGeometry args={[width, height, width]} />
      )}
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
};

// --- Flight Simulator Engine ---
const FlightSimulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Physics States
  const planePos = useRef(new THREE.Vector3(0, 800, 0)); // 시작 고도 800m
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(250); 
  const rotationVelocity = useRef(new THREE.Euler(0, 0, 0));
  
  const [telemetry, setTelemetry] = useState({ speed: 250, alt: 800 });
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // 1. Inputs (W/S Inverse Applied)
    // S를 누르면 상승(-), W를 누르면 하강(+) - Quaternion 회전 축 기준
    const targetPitch = keys.current['s'] ? 1.4 : (keys.current['w'] ? -1.4 : 0);
    const targetRoll = keys.current['a'] ? 2.0 : (keys.current['d'] ? -2.0 : 0);

    rotationVelocity.current.x = THREE.MathUtils.lerp(rotationVelocity.current.x, targetPitch, 0.04);
    rotationVelocity.current.z = THREE.MathUtils.lerp(rotationVelocity.current.z, targetRoll, 0.04);

    // 2. Physics
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const verticalInclination = forward.dot(new THREE.Vector3(0, 1, 0));

    velocity.current -= verticalInclination * 120 * delta; 
    velocity.current = THREE.MathUtils.clamp(velocity.current, 120, 600); 

    // Lift simulation
    const rollAngle = Math.abs(rotationVelocity.current.z);
    const liftLoss = (1 - Math.cos(rollAngle * 0.4)) * 15 * delta;
    planePos.current.y -= liftLoss;

    // Rotation Apply
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVelocity.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVelocity.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat);
    planeQuat.current.normalize();

    // 3. Movement
    planePos.current.add(forward.multiplyScalar(velocity.current * delta));

    if (planePos.current.y < 10) planePos.current.y = 10;

    // 4. Update
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // Camera with Speed-based distance
    const dynamicDist = 25 + (velocity.current / 500) * 15;
    const cameraOffset = new THREE.Vector3(0, 8, dynamicDist).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(cameraOffset), 0.1);

    const lookOffset = new THREE.Vector3(0, 2, -60).applyQuaternion(planeQuat.current);
    cameraLookAtTarget.current.lerp(planePos.current.clone().add(lookOffset), 0.1);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));

    // Telemetry Sync (every 10 frames)
    if (state.clock.elapsedTime % 0.2 < 0.02) {
      setTelemetry({ speed: Math.round(velocity.current), alt: Math.round(planePos.current.y) });
    }
  });

  // Generate Terrain Decorations
  const landmarks = useMemo(() => {
    const items = [];
    for (let i = 0; i < 100; i++) {
      const type = Math.random() > 0.3 ? 'mountain' : 'building';
      const x = (Math.random() - 0.5) * 20000;
      const z = (Math.random() - 0.5) * 20000;
      // 육지 근처에만 생성 (Z < -2000 영역 위주)
      items.push({ id: i, pos: [x, 0, z] as [number, number, number], type });
    }
    return items;
  }, []);

  return (
    <>
      <group ref={airplaneRef}>
        <React.Suspense fallback={<mesh><boxGeometry args={[10,4,20]} /><meshStandardMaterial color="white" wireframe /></mesh>}>
          <AirplaneModel />
        </React.Suspense>
      </group>

      {/* --- Environment --- */}
      {landmarks.map(lm => <Landmark key={lm.id} position={lm.pos} type={lm.type} />)}

      {/* Sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[100000, 100000]} />
        <meshStandardMaterial color="#0a2a43" metalness={0.9} roughness={0.1} transparent opacity={0.8} />
      </mesh>

      {/* Land */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, -10000]} receiveShadow>
        <planeGeometry args={[50000, 20000]} />
        <meshStandardMaterial color="#2c4c2c" roughness={1} />
      </mesh>

      <Sky distance={450000} sunPosition={[100, 20, 100]} />
      <Stars radius={300} count={20000} factor={7} />
      
      {/* Cloud Layer */}
      <Float speed={1} floatIntensity={2}>
        {useMemo(() => [...Array(15)].map((_, i) => (
          <Cloud 
            key={i} 
            position={[(Math.random() - 0.5) * 10000, 1200 + Math.random() * 500, (Math.random() - 0.5) * 10000]} 
            opacity={0.3}
            width={300}
            depth={100}
          />
        )), [])}
      </Float>

      <Environment preset="city" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[100, 200, 100]} intensity={2} castShadow />
      <fog attach="fog" args={['#87ceeb', 2000, 30000]} />

      {/* Telemetry UI (In-3D) */}
      <Float speed={2} rotationIntensity={0.1}>
        <group position={[telemetry.speed * 0, 0, 0]}> {/* Trigger re-render */}
          <Text position={[planePos.current.x - 40, planePos.current.y + 20, planePos.current.z - 100]} fontSize={10} color="#3498db" font="/fonts/inter.woff">
            SPD: {telemetry.speed} KM/H
          </Text>
          <Text position={[planePos.current.x - 40, planePos.current.y + 5, planePos.current.z - 100]} fontSize={10} color="#2ecc71" font="/fonts/inter.woff">
            ALT: {telemetry.alt} M
          </Text>
        </group>
      </Float>
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started && (
        <div style={{ 
          position: 'absolute', zIndex: 10, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, #1a1a1a 0%, #000 100%)' 
        }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', marginBottom: '0px', textShadow: '0 0 30px #3498db' }}>SKY ACE PRO</h1>
          <p style={{ fontSize: '1.5rem', letterSpacing: '12px', color: '#3498db', marginBottom: '60px' }}>ULTRA REALISTIC SIM</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '60px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '15px', borderLeft: '8px solid #3498db' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5rem' }}>CONTROLS (INVERTED)</h3>
              <p><b>S</b> : PULL UP (상승)</p>
              <p><b>W</b> : PUSH DOWN (하강)</p>
              <p><b>A / D</b> : ROLL (좌우 기울기)</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '15px', borderLeft: '8px solid #e74c3c' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5rem' }}>ENVIRONMENT</h3>
              <p>• Massive Mountains & Peaks</p>
              <p>• Coastal City Buildings</p>
              <p>• High-Speed Terrain HUD</p>
            </div>
          </div>

          <button 
            onClick={() => setStarted(true)}
            style={{ 
              padding: '1.5rem 8rem', fontSize: '2.5rem', cursor: 'pointer', 
              border: 'none', borderRadius: '50px', background: '#3498db', color: 'white', fontWeight: 900,
              boxShadow: '0 10px 40px rgba(52, 152, 219, 0.5)', transition: 'all 0.3s'
            }}
          >
            ENGAGE TURBINE
          </button>
        </div>
      )}

      {started && (
        <div style={{ position: 'absolute', top: '50px', left: '50px', zIndex: 5, pointerEvents: 'none' }}>
          <div style={{ fontSize: '1rem', color: '#3498db', letterSpacing: '3px' }}>SYSTEM ONLINE</div>
          <div style={{ height: '4px', width: '200px', background: '#3498db', marginTop: '5px' }}></div>
        </div>
      )}

      <Canvas shadows>
        {started && <FlightSimulator />}
      </Canvas>
    </div>
  );
}
