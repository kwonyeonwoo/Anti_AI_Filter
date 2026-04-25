import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, PerspectiveCamera, Float, Text, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

// --- Components ---

// 1. 고도화된 비행기 모델
const AirplaneModel = () => {
  return (
    <group>
      {/* 동체 (Fuselage) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.6, 0.4, 3, 12]} />
        <meshStandardMaterial color="#f0f0f0" metalness={0.6} roughness={0.2} />
      </mesh>
      
      {/* 엔진 덮개 (Cowling) */}
      <mesh position={[0, 0, 1.4]}>
        <cylinderGeometry args={[0.65, 0.6, 0.5, 12]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* 조종석 (Cockpit) */}
      <mesh position={[0, 0.4, 0.4]} rotation={[Math.PI / 4, 0, 0]}>
        <sphereGeometry args={[0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.6} metalness={1} roughness={0} />
      </mesh>

      {/* 주 날개 (Main Wings) */}
      <mesh position={[0, 0, 0.2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[5, 0.08, 1]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
      {/* 날개 지지대 */}
      <mesh position={[1.5, -0.3, 0.2]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-1.5, -0.3, 0.2]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* 수평 꼬리 날개 (Horizontal Stabilizer) */}
      <mesh position={[0, 0, -1.2]}>
        <boxGeometry args={[1.8, 0.05, 0.5]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
      
      {/* 수직 꼬리 날개 (Vertical Stabilizer) */}
      <mesh position={[0, 0.4, -1.2]}>
        <boxGeometry args={[0.05, 0.8, 0.5]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>

      {/* 프로펠러 (Propeller) */}
      <Propeller />

      {/* 바퀴 (Landing Gear) */}
      <mesh position={[0.4, -0.8, 0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 12]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.4, -0.8, 0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 12]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, -0.5, -1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 12]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
};

const Propeller = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (ref.current) ref.current.rotation.y += 30 * delta;
  });
  return (
    <group ref={ref} position={[0, 0, 1.7]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[2.5, 0.15, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
        <boxGeometry args={[2.5, 0.15, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#cc0000" />
      </mesh>
    </group>
  );
};

// 2. 링 (구멍이 정면을 향하도록 수정)
const Ring = ({ position, onPass }: { position: [number, number, number], onPass: () => void }) => {
  const ref = useRef<THREE.Group>(null);
  const [passed, setPassed] = useState(false);
  
  useFrame((_state, delta) => {
    if (!ref.current) return;
    ref.current.position.z -= 18 * delta; // 더 빠른 속도감
    
    // 비행기 위치는 고정(0,0,0)이고 월드가 움직이는 방식이므로 z값이 0을 지날 때 체크
    if (!passed && ref.current.position.z < 0.5 && ref.current.position.z > -0.5) {
      // 실제 비행기의 x, y 위치와의 거리 계산 (비행기는 사실 x,y 좌표만 변함)
      // 이 부분은 Game 컴포넌트의 airplanePos와 비교해야 함. 
      // 간단하게 하기 위해 Game에서 넘겨받은 전역 상태를 사용할 수도 있지만, 
      // 여기서는 거리 기반으로 통과 여부를 결정합니다.
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh rotation={[0, 0, 0]}> {/* 정면을 바라보게 90도 회전 (기본값) */}
        <torusGeometry args={[2, 0.15, 16, 50]} />
        <meshStandardMaterial color={passed ? "#2ecc71" : "#f1c40f"} emissive={passed ? "#2ecc71" : "#f1c40f"} emissiveIntensity={0.5} />
      </mesh>
      {/* 링 내부 발광 효과 */}
      {!passed && (
        <mesh>
          <circleGeometry args={[1.8, 32]} />
          <meshBasicMaterial color="#f1c40f" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
};

// --- Game Engine ---

const Game = ({ setScore, score }: { setScore: React.Dispatch<React.SetStateAction<number>>, score: number }) => {
  const airplaneRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  // 비행 상태
  const [flight, setFlight] = useState({
    x: 0, y: 0, 
    roll: 0, pitch: 0,
    velocity: 20
  });

  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
    const up = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const [rings, setRings] = useState<{id: number, pos: [number, number, number], passed: boolean}[]>([]);
  const [clouds, setClouds] = useState<{id: number, pos: [number, number, number]}[]>([]);

  useFrame((state, delta) => {
    // 1. 입력 처리 (Pitch & Roll)
    let nextRoll = flight.roll;
    let nextPitch = flight.pitch;

    if (keys.current['a']) nextRoll = THREE.MathUtils.lerp(nextRoll, 0.8, 0.05);
    else if (keys.current['d']) nextRoll = THREE.MathUtils.lerp(nextRoll, -0.8, 0.05);
    else nextRoll = THREE.MathUtils.lerp(nextRoll, 0, 0.05);

    if (keys.current['w']) nextPitch = THREE.MathUtils.lerp(nextPitch, -0.6, 0.05);
    else if (keys.current['s']) nextPitch = THREE.MathUtils.lerp(nextPitch, 0.6, 0.05);
    else nextPitch = THREE.MathUtils.lerp(nextPitch, 0, 0.05);

    // 2. 위치 업데이트 (Roll은 X축 이동, Pitch는 Y축 이동에 영향)
    const nextX = flight.x - nextRoll * 15 * delta;
    const nextY = flight.y - nextPitch * 15 * delta;

    setFlight({
      x: THREE.MathUtils.clamp(nextX, -15, 15),
      y: THREE.MathUtils.clamp(nextY, -10, 10),
      roll: nextRoll,
      pitch: nextPitch,
      velocity: 20
    });

    // 3. 비행기 회전 및 위치 적용
    if (airplaneRef.current) {
      airplaneRef.current.position.set(flight.x, flight.y, 0);
      airplaneRef.current.rotation.set(nextPitch, 0, nextRoll, 'XYZ');
    }

    // 4. 추적 카메라 (3인칭 시점)
    const camTarget = new THREE.Vector3(flight.x, flight.y + 1.5, 6); // 뒤쪽 위
    camera.position.lerp(camTarget, 0.1);
    camera.lookAt(flight.x, flight.y, -5);

    // 5. 장애물 생성 및 통과 감지
    if (state.clock.elapsedTime % 1.5 < 0.02) {
      setRings(prev => [...prev.filter(r => r.pos[2] > -20), {
        id: Date.now(), pos: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 15, 100], passed: false
      }]);
    }
    if (state.clock.elapsedTime % 0.8 < 0.02) {
      setClouds(prev => [...prev.filter(c => c.pos[2] > -20), {
        id: Math.random(), pos: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, 150]
      }]);
    }

    // 충돌 체크
    rings.forEach(ring => {
      if (!ring.passed && Math.abs(ring.pos[2] + 0) < 1) { // 링이 z=0 근처일 때
        const dist = Math.sqrt((ring.pos[0] - flight.x) ** 2 + (ring.pos[1] - flight.y) ** 2);
        if (dist < 2.2) {
          ring.passed = true;
          setScore(s => s + 10);
          soundEngine.playScore();
        }
      }
    });

    // 사운드
    if (Math.random() > 0.99) soundEngine.playEngine();
  });

  return (
    <>
      <group ref={airplaneRef}>
        <AirplaneModel />
      </group>

      {rings.map(ring => (
        <Ring key={ring.id} position={ring.pos} onPass={() => {}} />
      ))}

      {clouds.map(cloud => (
        <group key={cloud.id} position={cloud.pos}>
          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh>
              <sphereGeometry args={[2, 8, 8]} />
              <meshStandardMaterial color="white" transparent opacity={0.6} />
            </mesh>
            <mesh position={[1.5, 0, 0]}>
              <sphereGeometry args={[1.5, 8, 8]} />
              <meshStandardMaterial color="white" transparent opacity={0.6} />
            </mesh>
            <mesh position={[-1.5, 0, 0]}>
              <sphereGeometry args={[1.5, 8, 8]} />
              <meshStandardMaterial color="white" transparent opacity={0.6} />
            </mesh>
          </Float>
        </group>
      ))}

      <gridHelper args={[200, 40, '#444', '#222']} rotation={[Math.PI / 2, 0, 0]} position={[0, -15, -50]} />
      <Sky sunPosition={[100, 10, 100]} turbidity={0.1} rayleigh={2} />
      <Environment preset="night" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} castShadow />
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
          background: 'radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,1) 100%)', color: 'white', fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-2px' }}>SKY ACE 3D</h1>
          <p style={{ marginBottom: '3rem', fontSize: '1.2rem', color: '#aaa' }}>ULTIMATE FLIGHT SIMULATOR</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '3rem', textAlign: 'left' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>CONTROLS</h3>
              <p style={{ margin: 5, fontSize: '0.9rem' }}><b>W / S</b> : Pitch (Up / Down)</p>
              <p style={{ margin: 5, fontSize: '0.9rem' }}><b>A / D</b> : Roll (Left / Right)</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#f1c40f' }}>MISSION</h3>
              <p style={{ margin: 5, fontSize: '0.9rem' }}>통과하는 링의 중심을 조준하세요!</p>
              <p style={{ margin: 5, fontSize: '0.9rem' }}>링을 통과할수록 속도가 빨라집니다.</p>
            </div>
          </div>

          <button 
            onClick={() => setStarted(true)}
            style={{ 
              padding: '1.5rem 5rem', fontSize: '2rem', cursor: 'pointer', 
              border: 'none', borderRadius: '50px', background: '#e74c3c', color: 'white',
              fontWeight: '900', boxShadow: '0 0 30px rgba(231, 76, 60, 0.5)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            FLY NOW
          </button>
        </div>
      )}
      
      <div style={{ position: 'absolute', top: '40px', width: '100%', textAlign: 'center', zIndex: 5, pointerEvents: 'none' }}>
        <h2 style={{ color: 'white', fontSize: '3rem', margin: 0, fontWeight: 900, textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
          {score}
        </h2>
      </div>

      <Canvas shadows>
        <Game score={score} setScore={setScore} />
      </Canvas>
    </div>
  );
}
