import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Float, Text, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

// --- Advanced Airplane Model ---
const AirplaneModel = () => {
  const propellerRef = useRef<THREE.Group>(null);
  
  useFrame((_state, delta) => {
    if (propellerRef.current) propellerRef.current.rotation.y += 40 * delta;
  });

  return (
    <group>
      {/* 1. Sleek Fuselage (유선형 동체) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.15, 3.5, 16]} />
        <meshStandardMaterial color="#f0f0f0" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* 2. Nose Cone (기수 부분) */}
      <mesh position={[0, 0, 1.75]}>
        <sphereGeometry args={[0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d1d1d1" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* 3. Detailed Cockpit (정밀한 조종석) */}
      <mesh position={[0, 0.35, 0.5]} rotation={[Math.PI / 10, 0, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 4, 16]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.7} metalness={1} roughness={0} />
      </mesh>

      {/* 4. High-Performance Wings (날개 및 윙렛) */}
      <group position={[0, -0.1, 0.3]}>
        <mesh castShadow>
          <boxGeometry args={[6, 0.05, 1.2]} />
          <meshStandardMaterial color="#cc0000" />
        </mesh>
        {/* Winglets (날개 끝부분) */}
        <mesh position={[3, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.05, 0.6, 0.8]} />
          <meshStandardMaterial color="#cc0000" />
        </mesh>
        <mesh position={[-3, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.05, 0.6, 0.8]} />
          <meshStandardMaterial color="#cc0000" />
        </mesh>
      </group>

      {/* 5. Tail Fin (꼬리 날개 세트) */}
      <group position={[0, 0, -1.4]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 0.05, 0.6]} />
          <meshStandardMaterial color="#cc0000" />
        </mesh>
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.05, 1, 0.6]} />
          <meshStandardMaterial color="#cc0000" />
        </mesh>
      </group>

      {/* 6. Engine Exhaust (엔진 배기구) */}
      <mesh position={[0, 0, -1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
        <meshStandardMaterial color="#222" emissive="#ff5500" emissiveIntensity={0.5} />
      </mesh>

      {/* 7. Propeller Unit */}
      <group ref={propellerRef} position={[0, 0, 2]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[3.2, 0.12, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
          <boxGeometry args={[3.2, 0.12, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color="#880000" />
        </mesh>
      </group>
    </group>
  );
};

// --- Environment Components ---
const Ring = ({ position, passed }: { position: [number, number, number], passed: boolean }) => {
  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[2.5, 0.1, 16, 64]} />
        <meshStandardMaterial 
          color={passed ? "#00ff88" : "#ffcc00"} 
          emissive={passed ? "#00ff88" : "#ffcc00"} 
          emissiveIntensity={1} 
        />
      </mesh>
      <mesh>
        <circleGeometry args={[2.4, 32]} />
        <meshBasicMaterial color={passed ? "#00ff88" : "#ffcc00"} transparent opacity={0.05} />
      </mesh>
    </group>
  );
};

// --- Main Game Engine ---
const Game = ({ setScore }: { setScore: (val: number | ((v: number) => number)) => void }) => {
  const airplaneGroup = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  const [flightState, setFlightState] = useState({
    x: 0, y: 0, 
    roll: 0, pitch: 0
  });

  const keys = useRef<{ [key: string]: boolean }>({});
  const [rings, setRings] = useState<{id: number, pos: [number, number, number], passed: boolean}[]>([]);
  const [clouds, setClouds] = useState<{id: number, pos: [number, number, number]}[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
    const up = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((state, delta) => {
    // 1. Controls Physics
    let targetRoll = 0;
    let targetPitch = 0;

    if (keys.current['a']) targetRoll = 1.0;
    if (keys.current['d']) targetRoll = -1.0;
    if (keys.current['w']) targetPitch = -0.8;
    if (keys.current['s']) targetPitch = 0.8;

    const roll = THREE.MathUtils.lerp(flightState.roll, targetRoll, 0.08);
    const pitch = THREE.MathUtils.lerp(flightState.pitch, targetPitch, 0.08);
    
    // 2. Update Position based on orientation
    const speed = 20 * delta;
    const nextX = THREE.MathUtils.clamp(flightState.x - roll * 25 * delta, -20, 20);
    const nextY = THREE.MathUtils.clamp(flightState.y - pitch * 20 * delta, -15, 15);

    setFlightState({ x: nextX, y: nextY, roll, pitch });

    // 3. Apply to Airplane
    if (airplaneGroup.current) {
      airplaneGroup.current.position.set(nextX, nextY, 0);
      // Roll/Pitch rotation + Banking effect
      airplaneGroup.current.rotation.set(pitch, 0, roll, 'XYZ');
    }

    // 4. Dynamic Camera (진행 방향 및 기울기 동기화)
    const cameraOffset = new THREE.Vector3(roll * 2, 1.5 + pitch * 0.5, 6.5);
    const idealPosition = new THREE.Vector3(nextX, nextY, 0).add(cameraOffset);
    
    camera.position.lerp(idealPosition, 0.1);
    camera.lookAt(nextX, nextY, -10);
    // 지평선 기울기 효과 (카메라 롤링)
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, -roll * 0.3, 0.1);

    // 5. World Generation (Rings & Clouds)
    const worldSpeed = 25 * delta;
    setRings(prev => {
      const updated = prev.map(r => ({ ...r, pos: [r.pos[0], r.pos[1], r.pos[2] - worldSpeed] }));
      // Collision Check
      updated.forEach(r => {
        if (!r.passed && Math.abs(r.pos[2]) < 1.5) {
          const dist = Math.sqrt((r.pos[0] - nextX) ** 2 + (r.pos[1] - nextY) ** 2);
          if (dist < 2.5) {
            r.passed = true;
            setScore(s => s + 10);
            soundEngine.playScore();
          }
        }
      });
      return updated.filter(r => r.pos[2] > -20);
    });

    setClouds(prev => prev.map(c => ({ ...c, pos: [c.pos[0], c.pos[1], c.pos[2] - worldSpeed * 0.6] })).filter(c => c.pos[2] > -30));

    if (state.clock.elapsedTime % 1.2 < 0.02) {
      setRings(prev => [...prev, { id: Date.now(), pos: [(Math.random() - 0.5) * 25, (Math.random() - 0.5) * 20, 120], passed: false }]);
    }
    if (state.clock.elapsedTime % 0.6 < 0.02) {
      setClouds(prev => [...prev, { id: Math.random(), pos: [(Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50 - 10, 150] }]);
    }

    // Sound
    if (Math.random() > 0.99) soundEngine.playEngine();
  });

  return (
    <>
      <group ref={airplaneGroup}>
        <AirplaneModel />
      </group>

      {rings.map(ring => (
        <Ring key={ring.id} position={ring.pos} passed={ring.passed} />
      ))}

      {clouds.map(cloud => (
        <mesh key={cloud.id} position={cloud.pos}>
          <sphereGeometry args={[2.5, 8, 8]} />
          <meshStandardMaterial color="white" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Grid for Speed Sense */}
      <gridHelper args={[300, 50, '#333', '#111']} rotation={[Math.PI / 2, 0, 0]} position={[0, -20, -50]} />
      
      <Sky sunPosition={[100, 10, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="city" />
      <ambientLight intensity={0.2} />
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
          background: 'radial-gradient(circle, #1a1a1a 0%, #000 100%)', color: 'white', fontFamily: 'Impact, sans-serif'
        }}>
          <h1 style={{ fontSize: '6rem', margin: 0, fontStyle: 'italic', textShadow: '0 0 30px #e74c3c' }}>SKY ACE</h1>
          <p style={{ letterSpacing: '8px', color: '#e74c3c', fontWeight: 'bold', marginBottom: '40px' }}>PRO FLIGHT SIMULATOR</p>
          
          <button 
            onClick={() => setStarted(true)}
            style={{ 
              padding: '1.5rem 6rem', fontSize: '2.5rem', cursor: 'pointer', 
              border: '4px solid #e74c3c', background: 'transparent', color: 'white',
              fontWeight: '900', transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.transform = 'skewX(-10deg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'skewX(0deg)'; }}
          >
            ENGAGE
          </button>
        </div>
      )}

      <div style={{ position: 'absolute', top: '40px', right: '40px', zIndex: 5, color: '#e74c3c', fontFamily: 'monospace' }}>
        <h2 style={{ fontSize: '4rem', margin: 0 }}>{String(score).padStart(5, '0')}</h2>
      </div>

      <Canvas shadows>
        <Game setScore={setScore} />
      </Canvas>
    </div>
  );
}
