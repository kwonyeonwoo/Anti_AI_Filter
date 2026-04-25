import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, OrbitControls, PerspectiveCamera, Environment, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

// --- Components ---

// 1. 비행기 모델 (도형 조합)
const Airplane = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    // 부드러운 흔들림 효과
    meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 2) * 0.1;
    meshRef.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 2) * 0.1;
  });

  return (
    <group ref={meshRef} position={position}>
      {/* 몸통 */}
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.4, 2, 8]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      {/* 조종석 */}
      <mesh position={[0, 0.3, 0.4]} rotation={[Math.PI / 4, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#333" transparent opacity={0.6} />
      </mesh>
      {/* 날개 */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[4, 0.05, 0.8]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
      {/* 꼬리 날개 */}
      <mesh position={[0, 0.3, -0.8]}>
        <boxGeometry args={[0.05, 0.6, 0.4]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
      {/* 프로펠러 축 */}
      <mesh position={[0, 0, 1]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
};

// 2. 장애물 (통과해야 하는 링)
const Ring = ({ position, onPass }: { position: [number, number, number], onPass: () => void }) => {
  const ref = useRef<THREE.Group>(null);
  const [passed, setPassed] = useState(false);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    ref.current.position.z -= 15 * delta; // 플레이어 쪽으로 다가옴
    
    // 비행기와의 충돌(통과) 감지
    if (!passed && ref.current.position.z < 0 && ref.current.position.z > -1) {
      const dist = Math.sqrt(ref.current.position.x ** 2 + ref.current.position.y ** 2);
      if (dist < 1.5) {
        setPassed(true);
        onPass();
      }
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.1, 16, 50]} />
        <meshStandardMaterial color={passed ? "#2ecc71" : "#f1c40f"} />
      </mesh>
    </group>
  );
};

// 3. 배경 구름
const Cloud = ({ position }: { position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (ref.current) ref.current.position.z -= 10 * delta;
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[1, 7, 7]} />
        <meshStandardMaterial color="white" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0.8, 0, -0.5]}>
        <sphereGeometry args={[0.7, 7, 7]} />
        <meshStandardMaterial color="white" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.8, 0, -0.5]}>
        <sphereGeometry args={[0.7, 7, 7]} />
        <meshStandardMaterial color="white" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// --- Main Scene ---

const Game = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [airplanePos, setAirplanePos] = useState({ x: 0, y: 0 });
  
  // 장애물 생성 관리
  const [rings, setRings] = useState<{id: number, pos: [number, number, number]}[]>([]);
  const [clouds, setClouds] = useState<{id: number, pos: [number, number, number]}[]>([]);

  // 조작 핸들러
  React.useEffect(() => {
    const handleMove = (e: KeyboardEvent) => {
      const step = 0.5;
      setTargetPos(prev => {
        let { x, y } = prev;
        if (e.key === 'ArrowLeft' || e.key === 'a') x -= step;
        if (e.key === 'ArrowRight' || e.key === 'd') x += step;
        if (e.key === 'ArrowUp' || e.key === 'w') y += step;
        if (e.key === 'ArrowDown' || e.key === 's') y -= step;
        return { x: THREE.MathUtils.clamp(x, -5, 5), y: THREE.MathUtils.clamp(y, -3, 3) };
      });
    };
    window.addEventListener('keydown', handleMove);
    return () => window.removeEventListener('keydown', handleMove);
  }, []);

  // 게임 루프 및 장애물 생성
  useFrame((state) => {
    if (gameOver) return;

    // 비행기 부드러운 이동 (Lerp)
    setAirplanePos(prev => ({
      x: THREE.MathUtils.lerp(prev.x, targetPos.x, 0.1),
      y: THREE.MathUtils.lerp(prev.y, targetPos.y, 0.1)
    }));

    // 일정 시간마다 링과 구름 생성
    if (state.clock.elapsedTime % 2 < 0.02) {
      const id = Date.now();
      setRings(prev => [...prev.filter(r => r.pos[2] > -10), {
        id, pos: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5, 50]
      }]);
    }
    if (state.clock.elapsedTime % 1 < 0.02) {
      setClouds(prev => [...prev.filter(c => c.pos[2] > -10), {
        id: Math.random(), pos: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20 - 10, 100]
      }]);
    }
    
    // 매 프레임 엔진 소리 시뮬레이션
    if (Math.random() > 0.98) soundEngine.playEngine();
  });

  const handlePass = () => {
    setScore(s => s + 10);
    soundEngine.playScore();
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      
      <group position={[airplanePos.x, airplanePos.y, 0]} rotation={[0, 0, 0]}>
        <Airplane position={[0, 0, 0]} />
      </group>

      <gridHelper args={[100, 20, '#ffffff', '#ffffff']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -25]} opacity={0.1} transparent />

      {rings.map(ring => (
        <Ring key={ring.id} position={ring.pos} onPass={handlePass} />
      ))}

      {clouds.map(cloud => (
        <Cloud key={cloud.id} position={cloud.pos} />
      ))}

      {/* UI */}
      <Float speed={2} rotationIntensity={0.5}>
        <Text position={[0, 4, -5]} fontSize={1} color="white">
          SCORE: {score}
        </Text>
      </Float>
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', overflow: 'hidden' }}>
      {!started ? (
        <div style={{ 
          position: 'absolute', zIndex: 10, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', color: 'white', fontFamily: 'sans-serif'
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>3D AIRPLANE ADVENTURE</h1>
          <p style={{ marginBottom: '2rem' }}>WASD 또는 화살표 키로 조종하세요!</p>
          <button 
            onClick={() => { setStarted(true); soundEngine.playScore(); }}
            style={{ 
              padding: '1.5rem 4rem', fontSize: '1.8rem', cursor: 'pointer', 
              border: 'none', borderRadius: '1.5rem', background: '#e74c3c', color: 'white',
              fontWeight: 'bold', boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
            }}
          >
            START GAME
          </button>
          <p style={{ marginTop: '2rem', opacity: 0.6, fontSize: '0.8rem' }}>화면을 클릭하면 소리가 활성화됩니다</p>
        </div>
      ) : null}
      
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 75 }}>
        <color attach="background" args={['#87ceeb']} />
        {started && <Game />}
        {!started && (
          <>
            <Sky sunPosition={[100, 20, 100]} />
            <ambientLight intensity={0.5} />
            <Airplane position={[0, 0, 0]} />
          </>
        )}
      </Canvas>
      
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none', zIndex: 5 }}>
        <p><b>조작:</b> WASD / 화살표 키</p>
        <p><b>목표:</b> 황금색 링을 통과하세요!</p>
      </div>
    </div>
  );
}
