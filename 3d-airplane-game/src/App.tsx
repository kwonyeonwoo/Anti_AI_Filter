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
  targetId?: number; 
  burstCount?: number;
  reloadTimer?: number;
  hp?: number; 
  hitTimer?: number; 
}

// --- Airplane Model ---
const AirplaneModel = ({ color = "#ffffff", isEnemy = false, isHit = false }: { color?: string, isEnemy?: boolean, isHit?: boolean }) => {
  const propellerRef = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (propellerRef.current) propellerRef.current.rotation.y += 50 * delta;
  });

  const bodyColor = isHit ? "#ff0000" : (isEnemy ? color : "#ffffff");

  return (
    <group rotation={isEnemy ? [0, 0, 0] : [0, Math.PI, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.3, 3.5, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -1.75]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={isHit ? "#ff0000" : "#e0e0e0"} />
      </mesh>
      <group position={[0, 0.2, -0.2]}>
        <mesh castShadow><boxGeometry args={[6.0, 0.05, 1.2]} /><meshStandardMaterial color={isEnemy ? "#333" : "#d32f2f"} /></mesh>
      </group>
      <group position={[0, 0, 1.4]}>
        <mesh><boxGeometry args={[2.0, 0.05, 0.8]} /><meshStandardMaterial color={isEnemy ? "#333" : "#d32f2f"} /></mesh>
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.05, 1.0, 0.8]} /><meshStandardMaterial color={isEnemy ? "#333" : "#d32f2f"} /></mesh>
      </group>
      <group ref={propellerRef} position={[0, 0, -1.9]}>
        <mesh><boxGeometry args={[3.5, 0.15, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[3.5, 0.15, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
      </group>
    </group>
  );
};

// --- Game Engine ---
const Game = ({ onGameOver, score, setScore, hp, setHp, missileGauge, setMissileGauge }: any) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  const [state, setState] = useState({ x: 0, y: 0, roll: 0, pitch: 0 });
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const [bullets, setBullets] = useState<Entity[]>([]);
  const [missiles, setMissiles] = useState<Entity[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<Entity[]>([]);
  const [enemies, setEnemies] = useState<Entity[]>([]);
  const [clouds, setClouds] = useState<{ id: number, pos: [number, number, number] }[]>([]);
  
  const lastHitTime = useRef(Date.now());
  const machineGunTimer = useRef(0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' && missileGauge >= 5) fireMissile();
    };
    const up = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [missileGauge, enemies]);

  const fireMissile = () => {
    if (enemies.length === 0) return;
    let closest = enemies[0];
    let minDist = Infinity;
    enemies.forEach(e => {
      const d = Math.abs(e.pos.z);
      if (d < minDist) { minDist = d; closest = e; }
    });

    soundEngine.playScore();
    setMissiles(prev => [...prev, {
      id: Date.now(),
      pos: new THREE.Vector3(state.x, state.y, -2),
      velocity: new THREE.Vector3(0, 0, -80),
      targetId: closest.id
    }]);
    setMissileGauge(0);
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
    const nextX = THREE.MathUtils.clamp(state.x - roll * 32 * delta, -35, 35);
    const nextY = THREE.MathUtils.clamp(state.y - pitch * 26 * delta, -20, 20);
    setState({ x: nextX, y: nextY, roll, pitch });

    machineGunTimer.current += delta;
    if (machineGunTimer.current > 0.15) {
      setBullets(prev => [...prev, {
        id: Math.random(),
        pos: new THREE.Vector3(nextX, nextY, -2),
        velocity: new THREE.Vector3(0, 0, -180)
      }]);
      soundEngine.playShoot();
      machineGunTimer.current = 0;
    }

    if (airplaneRef.current) {
      airplaneRef.current.position.set(nextX, nextY, 0);
      airplaneRef.current.rotation.set(pitch, 0, roll, 'XYZ');
    }

    // 2. Camera
    camera.position.lerp(new THREE.Vector3(nextX + roll * 4, nextY + 3 + pitch * 1.5, 10), 0.12);
    camera.lookAt(nextX, nextY, -40);

    // 3. Entity Updates
    setBullets(prev => prev.map(b => ({ ...b, pos: b.pos.clone().add(b.velocity.clone().multiplyScalar(delta)) })).filter(b => b.pos.z > -250));
    
    setMissiles(prev => {
      const updated = prev.map(m => {
        const target = enemies.find(e => e.id === m.targetId);
        if (target) {
          const dir = target.pos.clone().sub(m.pos).normalize();
          m.velocity.lerp(dir.multiplyScalar(120), 0.15);
        }
        return { ...m, pos: m.pos.clone().add(m.velocity.clone().multiplyScalar(delta)) };
      });
      return updated.filter(m => m.pos.z > -250);
    });

    setEnemyBullets(prev => {
      const updated = prev.map(b => ({ ...b, pos: b.pos.clone().add(b.velocity.clone().multiplyScalar(delta)) }));
      updated.forEach(b => {
        // Player Hit Detection
        if (Math.abs(b.pos.x - nextX) < 1.5 && Math.abs(b.pos.y - nextY) < 1.5 && Math.abs(b.pos.z - 0) < 2) {
          setHp((h: number) => Math.max(0, h - 1));
          lastHitTime.current = Date.now();
          soundEngine.playCrash();
          b.pos.z = 100;
        }
      });
      return updated.filter(b => b.pos.z < 20);
    });

    setEnemies(prev => {
      const updated = prev.map(e => {
        e.reloadTimer = (e.reloadTimer || 0) + delta;
        if (e.pos.z < -20 && e.pos.z > -180) {
          /* 적군 사격 일시 중지
          if ((e.burstCount || 0) < 3) {
            if (e.reloadTimer > 0.2) {
              setEnemyBullets(pb => [...pb, { id: Math.random(), pos: e.pos.clone(), velocity: new THREE.Vector3(0, 0, 75) }]);
              e.burstCount = (e.burstCount || 0) + 1;
              e.reloadTimer = 0;
            }
          } else {
            if (e.reloadTimer > 2.5) { 
              e.burstCount = 0;
              e.reloadTimer = 0;
            }
          }
          */
        }
        if (e.hitTimer && e.hitTimer > 0) e.hitTimer -= delta;
        return { ...e, pos: e.pos.clone().add(e.velocity.clone().multiplyScalar(delta)) };
      });
      
      updated.forEach(e => {
        // Bullet Hit Detection (Improved Box Collision)
        bullets.forEach(b => {
          if (Math.abs(b.pos.x - e.pos.x) < 3.5 && Math.abs(b.pos.y - e.pos.y) < 2.0 && Math.abs(b.pos.z - e.pos.z) < 5.0) {
            b.pos.z = -300; 
            e.hp = (e.hp || 2) - 1;
            e.hitTimer = 0.15; 
            if (e.hp <= 0) {
              e.pos.z = 200; 
              setScore((s: number) => s + 100);
              setMissileGauge((g: number) => Math.min(5, g + 1));
              soundEngine.playExplosion();
            }
          }
        });
        // Missile Hit Detection (Larger Radius)
        missiles.forEach(m => {
          if (Math.abs(m.pos.x - e.pos.x) < 5.0 && Math.abs(m.pos.y - e.pos.y) < 4.0 && Math.abs(m.pos.z - e.pos.z) < 6.0) {
            m.pos.z = -300; 
            e.pos.z = 200; 
            setScore((s: number) => s + 200);
            setMissileGauge((g: number) => Math.min(5, g + 1));
            soundEngine.playExplosion();
          }
        });
      });
      return updated.filter(e => e.pos.z < 20);
    });

    if (clockState.clock.elapsedTime % 1.5 < 0.02) {
      setEnemies(prev => [...prev, {
        id: Date.now(),
        pos: new THREE.Vector3((Math.random() - 0.5) * 65, (Math.random() - 0.5) * 45, -220),
        velocity: new THREE.Vector3(0, 0, 30 + Math.random() * 25),
        burstCount: 0, reloadTimer: 0, hp: 2, hitTimer: 0
      }]);
    }

    if (Date.now() - lastHitTime.current > 120000 && hp < 3) {
      setHp((h: number) => h + 1);
      lastHitTime.current = Date.now();
    }
    if (hp <= 0) onGameOver();
  });

  return (
    <>
      <group ref={airplaneRef}><AirplaneModel /></group>
      {bullets.map(b => <mesh key={b.id} position={b.pos}><boxGeometry args={[0.3, 0.3, 2]} /><meshBasicMaterial color="#ffff00" /></mesh>)}
      {missiles.map(m => <mesh key={m.id} position={m.pos} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 3]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} /></mesh>)}
      {enemyBullets.map(b => <mesh key={b.id} position={b.pos}><sphereGeometry args={[0.5]} /><meshBasicMaterial color="#ff2200" /></mesh>)}
      {enemies.map(e => <group key={e.id} position={e.pos}><AirplaneModel color="#333" isEnemy isHit={e.hitTimer! > 0} /></group>)}
      
      <Sky sunPosition={[100, 10, 100]} />
      <Stars radius={200} count={5000} />
      <Environment preset="city" />
      <gridHelper args={[1000, 60, '#222', '#111']} rotation={[Math.PI / 2, 0, 0]} position={[0, -45, -200]} />
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
  const [missileGauge, setMissileGauge] = useState(0);

  const resetGame = () => {
    setScore(0); setHp(3); setMissileGauge(0); setGameOver(false); setStarted(true);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {(!started || gameOver) && (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }}>
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', color: '#d32f2f' }}>{gameOver ? 'MISSION FAILED' : 'SKY ACE: COMBAT'}</h1>
          <p style={{ letterSpacing: '5px', marginBottom: '50px' }}>{gameOver ? `FINAL SCORE: ${score}` : '적기를 격추하고 미사일을 충전하세요!'}</p>
          <button onClick={resetGame} style={{ padding: '1.5rem 5rem', fontSize: '2rem', cursor: 'pointer', border: '3px solid white', background: 'transparent', color: 'white', fontWeight: 900 }}>
            {gameOver ? 'RETRY MISSION' : 'ENGAGE ENEMY'}
          </button>
        </div>
      )}

      {started && !gameOver && (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5 }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ width: '45px', height: '45px', background: i < hp ? '#d32f2f' : '#222', borderRadius: '50%', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  {i < hp ? '❤' : '×'}
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: '3rem', margin: 0, color: '#f1c40f' }}>{String(score).padStart(6, '0')}</h2>
          </div>

          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', width: '300px', zIndex: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <span>HOMING MISSILE</span>
              <span style={{ color: missileGauge === 5 ? '#00ff00' : 'white' }}>{missileGauge === 5 ? 'READY (SPACE)' : `${missileGauge * 20}%`}</span>
            </div>
            <div style={{ width: '100%', height: '15px', background: '#222', borderRadius: '10px', overflow: 'hidden', border: '2px solid #444' }}>
              <div style={{ width: `${missileGauge * 20}%`, height: '100%', background: missileGauge === 5 ? '#00ff00' : '#3498db', transition: 'all 0.3s' }} />
            </div>
          </div>
        </>
      )}

      <Canvas shadows>
        {started && !gameOver && <Game score={score} setScore={setScore} hp={hp} setHp={setHp} missileGauge={missileGauge} setMissileGauge={setMissileGauge} onGameOver={() => setGameOver(true)} />}
      </Canvas>
    </div>
  );
}
