import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, Stars, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

// --- Improved Airplane Model (Horizontally Aligned to Z-axis) ---
const AirplaneModel = () => {
  const propellerRef = useRef<THREE.Group>(null);
  
  useFrame((_state, delta) => {
    if (propellerRef.current) propellerRef.current.rotation.y += 50 * delta;
  });

  return (
    <group>
      {/* 1. Fuselage (유선형 동체 - 수평 방향) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.2, 3.5, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* 2. Nose Cone (기수 - 정면을 향함) */}
      <mesh position={[0, 0, -1.75]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* 3. Cockpit (조종석) */}
      <mesh position={[0, 0.4, -0.4]} rotation={[Math.PI / 8, 0, 0]}>
        <capsuleGeometry args={[0.22, 0.6, 4, 16]} />
        <meshStandardMaterial color="#111" transparent opacity={0.8} metalness={1} roughness={0} />
      </mesh>

      {/* 4. Main Wings (주 날개) */}
      <group position={[0, 0, -0.2]}>
        <mesh castShadow>
          <boxGeometry args={[5.5, 0.05, 1.0]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
        {/* Winglets */}
        <mesh position={[2.75, 0.25, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.05, 0.6, 0.8]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
        <mesh position={[-2.75, 0.25, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.05, 0.6, 0.8]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
      </group>

      {/* 5. Tail Stabilizers (꼬리 날개) */}
      <group position={[0, 0, 1.4]}>
        <mesh>
          <boxGeometry args={[1.8, 0.05, 0.6]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.05, 0.9, 0.6]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
      </group>

      {/* 6. Engine Exhaust (배기구) */}
      <mesh position={[0, 0, 1.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
        <meshStandardMaterial color="#111" emissive="#ff4400" emissiveIntensity={1} />
      </mesh>

      {/* 7. Propeller (기수 정면) */}
      <group ref={propellerRef} position={[0, 0, -1.9]}>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[3.2, 0.12, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[3.2, 0.12, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color="#b71c1c" />
        </mesh>
      </group>
    </group>
  );
};

// --- World Objects ---
const Ring = ({ position, passed }: { position: [number, number, number], passed: boolean }) => (
  <group position={position}>
    <mesh>
      <torusGeometry args={[3, 0.15, 16, 64]} />
      <meshStandardMaterial 
        color={passed ? "#00ffbb" : "#ffaa00"} 
        emissive={passed ? "#00ffbb" : "#ffaa00"} 
        emissiveIntensity={passed ? 3 : 0.8} 
      />
    </mesh>
    <mesh>
      <circleGeometry args={[2.8, 32]} />
      <meshBasicMaterial color={passed ? "#00ffbb" : "#ffaa00"} transparent opacity={0.1} />
    </mesh>
  </group>
);

const Cloud = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[3, 8, 8]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.2} />
    </mesh>
  </group>
);

// --- Game Engine ---
const Game = ({ setScore }: { setScore: (val: number | ((v: number) => number)) => void }) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  const [state, setState] = useState({ x: 0, y: 0, roll: 0, pitch: 0 });
  const keys = useRef<{ [key: string]: boolean }>({});

  const [rings, setRings] = useState<{ id: number, pos: [number, number, number], passed: boolean }[]>([]);
  const [clouds, setClouds] = useState<{ id: number, pos: [number, number, number] }[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
    const up = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((clockState, delta) => {
    // 1. Controls Physics
    let targetRoll = 0;
    let targetPitch = 0;

    if (keys.current['a']) targetRoll = 0.9;
    if (keys.current['d']) targetRoll = -0.9;
    if (keys.current['w']) targetPitch = -0.7;
    if (keys.current['s']) targetPitch = 0.7;

    const roll = THREE.MathUtils.lerp(state.roll, targetRoll, 0.08);
    const pitch = THREE.MathUtils.lerp(state.pitch, targetPitch, 0.08);

    const nextX = THREE.MathUtils.clamp(state.x - roll * 28 * delta, -30, 30);
    const nextY = THREE.MathUtils.clamp(state.y - pitch * 22 * delta, -18, 18);

    setState({ x: nextX, y: nextY, roll, pitch });

    // 2. Update Airplane Mesh
    if (airplaneRef.current) {
      airplaneRef.current.position.set(nextX, nextY, 0);
      airplaneRef.current.rotation.set(pitch, 0, roll, 'XYZ');
    }

    // 3. Dynamic Camera (비행기 꼬리 뒤에서 정면을 주시)
    const cameraOffset = new THREE.Vector3(roll * 2.5, 1.8 + pitch * 0.8, 8.5);
    const idealPos = new THREE.Vector3(nextX, nextY, 0).add(cameraOffset);
    
    camera.position.lerp(idealPos, 0.12);
    camera.lookAt(nextX, nextY, -25);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, -roll * 0.4, 0.1);

    // 4. World Movement (장애물이 정면에서 옴)
    const worldSpeed = 35 * delta;
    
    setRings(prev => {
      // Z값이 증가하며 다가옴 (-150 -> 0 -> 20)
      const updated = prev.map(r => ({ ...r, pos: [r.pos[0], r.pos[1], r.pos[2] + worldSpeed] as [number, number, number] }));
      updated.forEach(r => {
        if (!r.passed && Math.abs(r.pos[2]) < 2) {
          const dist = Math.sqrt((r.pos[0] - nextX) ** 2 + (r.pos[1] - nextY) ** 2);
          if (dist < 3.2) {
            r.passed = true;
            setScore(s => s + 10);
            soundEngine.playScore();
          }
        }
      });
      return updated.filter(r => r.pos[2] < 30);
    });

    setClouds(prev => prev.map(c => ({ ...c, pos: [c.pos[0], c.pos[1], c.pos[2] + worldSpeed * 0.6] as [number, number, number] })).filter(c => c.pos[2] < 40));

    // Generation (저 먼 앞쪽 -150 에서 생성)
    if (clockState.clock.elapsedTime % 1.1 < 0.02) {
      setRings(prev => [...prev, { id: Date.now(), pos: [(Math.random() - 0.5) * 35, (Math.random() - 0.5) * 25, -150], passed: false }]);
    }
    if (clockState.clock.elapsedTime % 0.4 < 0.02) {
      setClouds(prev => [...prev, { id: Math.random(), pos: [(Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80, -200] }]);
    }

    if (Math.random() > 0.985) soundEngine.playEngine();
  });

  return (
    <>
      <group ref={airplaneRef}>
        <AirplaneModel />
      </group>
      
      {rings.map(r => <Ring key={r.id} position={r.pos} passed={r.passed} />)}
      {clouds.map(c => <Cloud key={c.id} position={c.pos} />)}

      <Sky sunPosition={[100, 10, 100]} turbidity={0.05} />
      <Stars radius={150} depth={50} count={7000} factor={4} />
      <Environment preset="city" />
      <gridHelper args={[600, 60, '#444', '#1a1a1a']} rotation={[Math.PI / 2, 0, 0]} position={[0, -30, -100]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 25, 10]} intensity={1.8} castShadow />
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {!started && (
        <div style={{ 
          position: 'absolute', zIndex: 10, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, #222 0%, #000 100%)', color: 'white', fontFamily: 'Impact, sans-serif'
        }}>
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', marginBottom: 0, textShadow: '0 0 20px #d32f2f' }}>SKY ACE</h1>
          <p style={{ letterSpacing: '12px', color: '#d32f2f', marginBottom: '50px', fontWeight: 'bold' }}>ULTIMATE FLIGHT</p>
          <button 
            onClick={() => setStarted(true)}
            style={{ 
              padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', 
              border: '3px solid white', background: 'transparent', color: 'white', fontWeight: 900,
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'black'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'white'; }}
          >
            START TURBINE
          </button>
        </div>
      )}

      <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, color: '#d32f2f', fontFamily: 'monospace' }}>
        <h2 style={{ fontSize: '4rem', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{String(score).padStart(5, '0')}</h2>
      </div>

      <Canvas shadows camera={{ position: [0, 3, 12], fov: 75 }}>
        {started && <Game setScore={setScore} />}
      </Canvas>
    </div>
  );
}
