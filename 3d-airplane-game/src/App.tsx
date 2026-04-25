import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { soundEngine } from './SoundEngine';

// --- Types ---
interface Entity {
  id: number;
  pos: THREE.Vector3;
  velocity: THREE.Vector3;
}

// --- Airplane Model ---
const AirplaneModel = ({ color = "#ffffff", isEnemy = false }: { color?: string, isEnemy?: boolean }) => {
  const propellerRef = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (propellerRef.current) propellerRef.current.rotation.y += 50 * delta;
  });

  return (
    <group rotation={isEnemy ? [0, 0, 0] : [0, Math.PI, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.2, 3.5, 16]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -1.75]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      <group position={[0, 0.2, -0.2]}>
        <mesh castShadow><boxGeometry args={[5.5, 0.05, 1.0]} /><meshStandardMaterial color={isEnemy ? "#333" : "#d32f2f"} /></mesh>
      </group>
      <group position={[0, 0, 1.4]}>
        <mesh><boxGeometry args={[1.8, 0.05, 0.6]} /><meshStandardMaterial color={isEnemy ? "#333" : "#d32f2f"} /></mesh>
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.05, 0.9, 0.6]} /><meshStandardMaterial color={isEnemy ? "#333" : "#d32f2f"} /></mesh>
      </group>
      <group ref={propellerRef} position={[0, 0, -1.9]}>
        <mesh><boxGeometry args={[3.2, 0.12, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[3.2, 0.12, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
      </group>
    </group>
  );
};

// --- Game Engine ---
const Game = ({ onGameOver, score, setScore, hp, setHp }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  const [state, setState] = useState({ x: 0, y: 0, roll: 0, pitch: 0 });
  const keys = useRef<{ [key: string]: boolean }>({});
  
  // Entities
  const [bullets, setBullets] = useState<Entity[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<Entity[]>([]);
  const [enemies, setEnemies] = useState<Entity[]>([]);
  const [clouds, setClouds] = useState<{ id: number, pos: [number, number, number] }[]>([]);
  
  // Recovery System
  const lastHitTime = useRef(Date.now());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Enter') shoot();
    };
    const up = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousedown', shoot);
    return () => { 
      window.removeEventListener('keydown', down); 
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousedown', shoot);
    };
  }, [state]);

  const shoot = () => {
    soundEngine.playShoot();
    setBullets(prev => [...prev, {
      id: Date.now() + Math.random(),
      pos: new THREE.Vector3(state.x, state.y, -2),
      velocity: new THREE.Vector3(0, 0, -150)
    }]);
  };

  useFrame((clockState, delta) => {
    // 1. Controls
    let targetRoll = 0, targetPitch = 0;
    if (keys.current['a']) targetRoll = 1.0;
    if (keys.current['d']) targetRoll = -1.0;
    if (keys.current['w']) targetPitch = -0.8;
    if (keys.current['s']) targetPitch = 0.8;

    const roll = THREE.MathUtils.lerp(state.roll, targetRoll, 0.1);
    const pitch = THREE.MathUtils.lerp(state.pitch, targetPitch, 0.1);
    const nextX = THREE.MathUtils.clamp(state.x - roll * 30 * delta, -35, 35);
    const nextY = THREE.MathUtils.clamp(state.y - pitch * 25 * delta, -20, 20);
    setState({ x: nextX, y: nextY, roll, pitch });

    if (airplaneRef.current) {
      airplaneRef.current.position.set(nextX, nextY, 0);
      airplaneRef.current.rotation.set(pitch, 0, roll, 'XYZ');
    }

    // 2. Camera
    camera.position.lerp(new THREE.Vector3(nextX + roll * 4, nextY + 2.5 + pitch * 1.5, 10), 0.12);
    camera.lookAt(nextX, nextY, -30);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, -roll * 0.4, 0.1);

    // 3. Bullets Update
    setBullets(prev => prev.map(b => ({ ...b, pos: b.pos.clone().add(b.velocity.clone().multiplyScalar(delta)) })).filter(b => b.pos.z > -200));
    setEnemyBullets(prev => {
      const updated = prev.map(b => ({ ...b, pos: b.pos.clone().add(b.velocity.clone().multiplyScalar(delta)) }));
      // Player Hit Detection
      updated.forEach(b => {
        const dist = b.pos.distanceTo(new THREE.Vector3(nextX, nextY, 0));
        if (dist < 1.5) {
          setHp((h: number) => Math.max(0, h - 1));
          lastHitTime.current = Date.now();
          soundEngine.playCrash();
          b.pos.z = 100; // Remove bullet
        }
      });
      return updated.filter(b => b.pos.z < 20);
    });

    // 4. Enemies Update
    setEnemies(prev => {
      const updated = prev.map(e => ({ ...e, pos: e.pos.clone().add(e.velocity.clone().multiplyScalar(delta)) }));
      // Enemy Shooting Logic
      updated.forEach(e => {
        if (Math.random() > 0.985 && e.pos.z < -20) {
          setEnemyBullets(pb => [...pb, {
            id: Math.random(),
            pos: e.pos.clone(),
            velocity: new THREE.Vector3(0, 0, 60)
          }]);
        }
        // Collision with Player Bullets
        bullets.forEach(b => {
          if (b.pos.distanceTo(e.pos) < 2.5) {
            e.pos.z = 200; // Kill enemy
            b.pos.z = -300; // Remove bullet
            setScore((s: number) => s + 100);
            soundEngine.playExplosion();
          }
        });
      });
      return updated.filter(e => e.pos.z < 20);
    });

    // 5. World Generation
    if (clockState.clock.elapsedTime % 2.0 < 0.02) {
      setEnemies(prev => [...prev, {
        id: Date.now(),
        pos: new THREE.Vector3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 30, -200),
        velocity: new THREE.Vector3(0, 0, 25 + Math.random() * 20)
      }]);
    }
    if (clockState.clock.elapsedTime % 0.5 < 0.02) {
      setClouds(prev => [...prev.map(c => ({...c, pos: [c.pos[0], c.pos[1], c.pos[2] + 40 * delta] as [number, number, number]})).filter(c => c.pos[2] < 50), 
        { id: Math.random(), pos: [(Math.random() - 0.5) * 150, (Math.random() - 0.5) * 100, -250] }
      ]);
    }

    // 6. Recovery System (120 seconds = 120000ms)
    if (Date.now() - lastHitTime.current > 120000 && hp < 3) {
      setHp((h: number) => h + 1);
      lastHitTime.current = Date.now(); // Reset timer for next recovery
    }

    if (hp <= 0) onGameOver();
    if (Math.random() > 0.98) soundEngine.playEngine();
  });

  return (
    <>
      <group ref={airplaneRef}><AirplaneModel /></group>
      {bullets.map(b => <mesh key={b.id} position={b.pos}><sphereGeometry args={[0.2]} /><meshBasicMaterial color="#ffff00" /></mesh>)}
      {enemyBullets.map(b => <mesh key={b.id} position={b.pos}><sphereGeometry args={[0.3]} /><meshBasicMaterial color="#ff0000" /></mesh>)}
      {enemies.map(e => <group key={e.id} position={e.pos}><AirplaneModel color="#444" isEnemy /></group>)}
      {clouds.map(c => <mesh key={c.id} position={c.pos}><sphereGeometry args={[5, 8, 8]} /><meshStandardMaterial color="white" transparent opacity={0.1} /></mesh>)}
      
      <Sky sunPosition={[100, 10, 100]} />
      <Stars radius={200} count={5000} />
      <Environment preset="city" />
      <gridHelper args={[1000, 50, '#222', '#111']} rotation={[Math.PI / 2, 0, 0]} position={[0, -40, -200]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 30, 10]} intensity={2} />
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(3);

  const resetGame = () => {
    setScore(0);
    setHp(3);
    setGameOver(false);
    setStarted(true);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {(!started || gameOver) && (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }}>
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', color: '#d32f2f' }}>{gameOver ? 'MISSION FAILED' : 'SKY ACE: COMBAT'}</h1>
          {gameOver && <h2 style={{ fontSize: '3rem' }}>SCORE: {score}</h2>}
          <p style={{ letterSpacing: '5px', marginBottom: '50px' }}>{gameOver ? '적의 총탄에 격추당했습니다' : '적기를 격추하고 생존하세요!'}</p>
          <button onClick={resetGame} style={{ padding: '1.5rem 5rem', fontSize: '2rem', cursor: 'pointer', border: '3px solid white', background: 'transparent', color: 'white', fontWeight: 900 }}>
            {gameOver ? 'RETRY MISSION' : 'ENGAGE ENEMY'}
          </button>
        </div>
      )}

      {started && !gameOver && (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5 }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ width: '40px', height: '40px', background: i < hp ? '#d32f2f' : '#333', borderRadius: '50%', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {i < hp ? '❤' : '×'}
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#f1c40f' }}>{String(score).padStart(6, '0')}</h2>
          </div>
          <div style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
            WASD: 조종 | SPACE/CLICK: 사격 | 120초간 무피격 시 체력 회복
          </div>
        </>
      )}

      <Canvas shadows>
        {started && !gameOver && <Game score={score} setScore={setScore} hp={hp} setHp={setHp} onGameOver={() => setGameOver(true)} />}
      </Canvas>
    </div>
  );
}
