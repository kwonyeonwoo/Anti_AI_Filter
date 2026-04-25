import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, Stars, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

// --- Advanced Airplane Model (Facing -Z) ---
const AirplaneModel = () => {
  const propellerRef = useRef<THREE.Group>(null);
  
  useFrame((_state, delta) => {
    if (propellerRef.current) propellerRef.current.rotation.z += 50 * delta;
  });

  return (
    <group rotation={[0, Math.PI, 0]}> {/* 시점 반전을 위해 모델을 180도 회전 */}
      {/* 1. Aerodynamic Fuselage (유선형 몸체) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.4, 0.1, 3, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* 2. Nose Section (기수) */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* 3. Cockpit Canopy (조종석) */}
      <mesh position={[0, 0.6, 0.3]} rotation={[-Math.PI / 8, 0, 0]}>
        <capsuleGeometry args={[0.25, 0.6, 4, 16]} />
        <meshStandardMaterial color="#111" transparent opacity={0.8} metalness={1} roughness={0} />
      </mesh>

      {/* 4. Main Wings (주 날개) */}
      <group position={[0, 0.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[5, 0.05, 0.8]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
        {/* Wing Details (날개 끝 윙렛) */}
        <mesh position={[2.5, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.05, 0.5, 0.6]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
        <mesh position={[-2.5, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.05, 0.5, 0.6]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
      </group>

      {/* 5. Rear Tail Section (꼬리 날개) */}
      <group position={[0, -1.3, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 0.05, 0.5]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.05, 0.8, 0.5]} />
          <meshStandardMaterial color="#d32f2f" />
        </mesh>
      </group>

      {/* 6. Landing Gear (바퀴) */}
      <mesh position={[0.5, 0.5, -0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.5, 0.5, -0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* 7. Propeller (정면에서 회전) */}
      <group ref={propellerRef} position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <boxGeometry args={[3, 0.1, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[3, 0.1, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.15, 8, 8]} />
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
      <torusGeometry args={[3, 0.12, 16, 64]} />
      <meshStandardMaterial 
        color={passed ? "#00ff88" : "#f1c40f"} 
        emissive={passed ? "#00ff88" : "#f1c40f"} 
        emissiveIntensity={passed ? 2 : 0.5} 
      />
    </mesh>
    <mesh>
      <circleGeometry args={[2.9, 32]} />
      <meshBasicMaterial color={passed ? "#00ff88" : "#f1c40f"} transparent opacity={0.05} />
    </mesh>
  </group>
);

const Cloud = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[2, 7, 7]} />
      <meshStandardMaterial color="white" transparent opacity={0.3} />
    </mesh>
  </group>
);

// --- Game Logic ---
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
    // 1. Flight Physics (Roll & Pitch 기반 이동)
    let targetRoll = 0;
    let targetPitch = 0;

    if (keys.current['a']) targetRoll = 0.8;
    if (keys.current['d']) targetRoll = -0.8;
    if (keys.current['w']) targetPitch = -0.6;
    if (keys.current['s']) targetPitch = 0.6;

    const roll = THREE.MathUtils.lerp(state.roll, targetRoll, 0.1);
    const pitch = THREE.MathUtils.lerp(state.pitch, targetPitch, 0.1);

    // Roll이 있으면 X축으로 선회, Pitch가 있으면 Y축으로 이동
    const nextX = THREE.MathUtils.clamp(state.x - roll * 25 * delta, -25, 25);
    const nextY = THREE.MathUtils.clamp(state.y - pitch * 20 * delta, -15, 15);

    setState({ x: nextX, y: nextY, roll, pitch });

    // 2. Update Airplane Mesh
    if (airplaneRef.current) {
      airplaneRef.current.position.set(nextX, nextY, 0);
      airplaneRef.current.rotation.set(pitch, 0, roll, 'XYZ');
    }

    // 3. Dynamic Follow Camera (비행기 뒤에서 진행 방향을 봄)
    const cameraPos = new THREE.Vector3(nextX + roll * 3, nextY + 2 + pitch * 1, 8);
    camera.position.lerp(cameraPos, 0.1);
    camera.lookAt(nextX, nextY, -20); // 앞쪽 멀리 봄
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, -roll * 0.4, 0.1); // 지평선 기울기 효과

    // 4. World Movement & Collision
    const worldSpeed = 30 * delta;
    
    setRings(prev => {
      const updated = prev.map(r => ({ ...r, pos: [r.pos[0], r.pos[1], r.pos[2] - worldSpeed] as [number, number, number] }));
      updated.forEach(r => {
        if (!r.passed && Math.abs(r.pos[2]) < 1.5) {
          const dist = Math.sqrt((r.pos[0] - nextX) ** 2 + (r.pos[1] - nextY) ** 2);
          if (dist < 3) {
            r.passed = true;
            setScore(s => s + 10);
            soundEngine.playScore();
          }
        }
      });
      return updated.filter(r => r.pos[2] > -30);
    });

    setClouds(prev => prev.map(c => ({ ...c, pos: [c.pos[0], c.pos[1], c.pos[2] - worldSpeed * 0.7] as [number, number, number] })).filter(c => c.pos[2] > -40));

    // Generation
    if (clockState.clock.elapsedTime % 1.0 < 0.02) {
      setRings(prev => [...prev, { id: Date.now(), pos: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, 150], passed: false }]);
    }
    if (clockState.clock.elapsedTime % 0.5 < 0.02) {
      setClouds(prev => [...prev, { id: Math.random(), pos: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60, 200] }]);
    }

    if (Math.random() > 0.98) soundEngine.playEngine();
  });

  return (
    <>
      <group ref={airplaneRef}>
        <AirplaneModel />
      </group>
      
      {rings.map(r => <Ring key={r.id} position={r.pos} passed={r.passed} />)}
      {clouds.map(c => <Cloud key={c.id} position={c.pos} />)}

      <Sky sunPosition={[100, 10, 100]} turbidity={0.1} />
      <Stars radius={100} depth={50} count={5000} factor={4} />
      <Environment preset="city" />
      <gridHelper args={[500, 50, '#333', '#111']} rotation={[Math.PI / 2, 0, 0]} position={[0, -25, -100]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
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
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', marginBottom: 0 }}>SKY ACE</h1>
          <p style={{ letterSpacing: '10px', color: '#d32f2f', marginBottom: '50px' }}>NEXT-GEN FLIGHT</p>
          <button 
            onClick={() => setStarted(true)}
            style={{ 
              padding: '1.5rem 5rem', fontSize: '2rem', cursor: 'pointer', 
              border: '2px solid white', background: 'transparent', color: 'white', fontWeight: 900
            }}
          >
            START ENGINE
          </button>
        </div>
      )}

      <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, color: '#d32f2f', fontFamily: 'monospace' }}>
        <h2 style={{ fontSize: '4rem', margin: 0 }}>SCORE: {String(score).padStart(4, '0')}</h2>
      </div>

      <Canvas shadows camera={{ position: [0, 2, 10], fov: 75 }}>
        {started && <Game setScore={setScore} />}
      </Canvas>
    </div>
  );
}
