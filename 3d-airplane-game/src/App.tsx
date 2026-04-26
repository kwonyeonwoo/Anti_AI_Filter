import React, { useRef, useState, useEffect } from 'react';
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
  hp?: number; 
  hitTimer?: number; 
}

// --- Player Model ---
const PlayerModel = () => {
  const propellerRef = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (propellerRef.current) propellerRef.current.rotation.y += 50 * delta;
  });
  return (
    <group rotation={[0, Math.PI, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.3, 3.5, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.3} />
      </mesh>
      <group position={[0, 0.2, -0.2]}>
        <mesh castShadow><boxGeometry args={[6.0, 0.05, 1.2]} /><meshStandardMaterial color="#d32f2f" /></mesh>
      </group>
      <group ref={propellerRef} position={[0, 0, -1.9]}>
        <mesh><boxGeometry args={[3.5, 0.15, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[3.5, 0.15, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
      </group>
    </group>
  );
};

// --- Enemy Model (Twin-Engine Bomber Style) ---
const EnemyModel = ({ isHit }: { isHit: boolean }) => {
  const engineRef1 = useRef<THREE.Group>(null);
  const engineRef2 = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (engineRef1.current) engineRef1.current.rotation.y += 40 * delta;
    if (engineRef2.current) engineRef2.current.rotation.y += 40 * delta;
  });

  const bodyColor = isHit ? "#ff0000" : "#333333";

  return (
    <group>
      {/* Rectangular Main Body */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.8, 3]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Large Square Wings */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[8, 0.1, 1.5]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {/* Twin Engines */}
      <group position={[2.5, -0.3, 0.5]}>
        <mesh rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.4, 0.4, 1.2, 8]} /><meshStandardMaterial color="#222" /></mesh>
        <group ref={engineRef1} position={[0, 0, -0.7]}><mesh><boxGeometry args={[1.5, 0.1, 0.02]} /><meshStandardMaterial color="#111" /></mesh></group>
      </group>
      <group position={[-2.5, -0.3, 0.5]}>
        <mesh rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.4, 0.4, 1.2, 8]} /><meshStandardMaterial color="#222" /></mesh>
        <group ref={engineRef2} position={[0, 0, -0.7]}><mesh><boxGeometry args={[1.5, 0.1, 0.02]} /><meshStandardMaterial color="#111" /></mesh></group>
      </group>
      {/* Tail Fins */}
      <mesh position={[0.5, 0.5, 1.5]}><boxGeometry args={[0.1, 1.2, 0.6]} /><meshStandardMaterial color="#444" /></mesh>
      <mesh position={[-0.5, 0.5, 1.5]}><boxGeometry args={[0.1, 1.2, 0.6]} /><meshStandardMaterial color="#444" /></mesh>
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
  const [explosions, setExplosions] = useState<{id: number, pos: THREE.Vector3, scale: number}[]>([]);
  
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
      velocity: new THREE.Vector3(0, 0, -100),
      targetId: closest.id
    }]);
    setMissileGauge(0);
  };

  useFrame((clockState, delta) => {
    // 1. Player Movement
    let targetRoll = 0, targetPitch = 0;
    if (keys.current['a']) targetRoll = 1.0;
    if (keys.current['d']) targetRoll = -1.0;
    if (keys.current['w']) targetPitch = -0.8;
    if (keys.current['s']) targetPitch = 0.8;
    const roll = THREE.MathUtils.lerp(state.roll, targetRoll, 0.1);
    const pitch = THREE.MathUtils.lerp(state.pitch, targetPitch, 0.1);
    const nextX = THREE.MathUtils.clamp(state.x - roll * 35 * delta, -45, 40);
    const nextY = THREE.MathUtils.clamp(state.y - pitch * 28 * delta, -25, 25);
    setState({ x: nextX, y: nextY, roll, pitch });
    if (airplaneRef.current) {
      airplaneRef.current.position.set(nextX, nextY, 0);
      airplaneRef.current.rotation.set(pitch, 0, roll, 'XYZ');
    }

    // 2. Auto-fire
    machineGunTimer.current += delta;
    if (machineGunTimer.current > 0.15) {
      setBullets(prev => [...prev, { id: Math.random(), pos: new THREE.Vector3(nextX, nextY, -2), velocity: new THREE.Vector3(0, 0, -200) }]);
      soundEngine.playShoot();
      machineGunTimer.current = 0;
    }

    // 3. Entity Physics & Collision (Unified Loop)
    const bulletSpeed = 200 * delta;
    const missileSpeed = 120 * delta;
    const enemySpeed = 40 * delta;

    // Filter and Update Projectiles
    setBullets(prev => prev.map(b => ({ ...b, pos: b.pos.clone().add(b.velocity.clone().multiplyScalar(delta)) })).filter(b => b.pos.z > -250));
    setMissiles(prev => {
      return prev.map(m => {
        const target = enemies.find(e => e.id === m.targetId);
        if (target) {
          const dir = target.pos.clone().sub(m.pos).normalize();
          m.velocity.lerp(dir.multiplyScalar(150), 0.2);
        }
        return { ...m, pos: m.pos.clone().add(m.velocity.clone().multiplyScalar(delta)) };
      }).filter(m => m.pos.z > -250);
    });

    // Enemy Update and HIT DETECTION
    setEnemies(prev => {
      const nextEnemies: Entity[] = [];
      prev.forEach(e => {
        const nextPos = e.pos.clone().add(e.velocity.clone().multiplyScalar(delta));
        if (nextPos.z > 20) return; // Out of bounds

        let currentHp = e.hp ?? 2;
        let isDestroyed = false;

        // Check Bullets
        setBullets(bullets => {
          const aliveBullets: Entity[] = [];
          bullets.forEach(b => {
            const hit = Math.abs(b.pos.x - nextPos.x) < 4.5 && Math.abs(b.pos.y - nextPos.y) < 2.5 && Math.abs(b.pos.z - nextPos.z) < 12.0;
            if (hit && !isDestroyed) {
              currentHp -= 1;
              e.hitTimer = 0.2;
              if (currentHp <= 0) isDestroyed = true;
            } else {
              aliveBullets.push(b);
            }
          });
          return aliveBullets;
        });

        // Check Missiles
        setMissiles(missiles => {
          const aliveMissiles: Entity[] = [];
          missiles.forEach(m => {
            const hit = Math.abs(m.pos.x - nextPos.x) < 6.0 && Math.abs(m.pos.y - nextPos.y) < 4.0 && Math.abs(m.pos.z - nextPos.z) < 10.0;
            if (hit && !isDestroyed) {
              currentHp -= 2; // Instant kill
              isDestroyed = true;
            } else {
              aliveMissiles.push(m);
            }
          });
          return aliveMissiles;
        });

        if (isDestroyed) {
          setScore((s: number) => s + 150);
          setMissileGauge((g: number) => Math.min(5, g + 1));
          setExplosions(ex => [...ex, { id: Date.now(), pos: nextPos.clone(), scale: 1 }]);
          soundEngine.playExplosion();
        } else {
          if (e.hitTimer && e.hitTimer > 0) e.hitTimer -= delta;
          nextEnemies.push({ ...e, pos: nextPos, hp: currentHp });
        }
      });
      return nextEnemies;
    });

    // Explosion Effect Cleanup
    setExplosions(prev => prev.map(ex => ({ ...ex, scale: ex.scale + 10 * delta })).filter(ex => ex.scale < 10));

    // Enemy Generation
    if (clockState.clock.elapsedTime % 1.5 < 0.02) {
      setEnemies(prev => [...prev, {
        id: Date.now() + Math.random(),
        pos: new THREE.Vector3((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 60, -250),
        velocity: new THREE.Vector3(0, 0, 45),
        hp: 2, hitTimer: 0
      }]);
    }

    // Camera
    camera.position.lerp(new THREE.Vector3(nextX + roll * 5, nextY + 3.5 + pitch * 1.5, 12), 0.1);
    camera.lookAt(nextX, nextY, -60);
    
    if (hp <= 0) onGameOver();
  });

  return (
    <>
      <group ref={airplaneRef}><PlayerModel /></group>
      {bullets.map(b => <mesh key={b.id} position={b.pos}><boxGeometry args={[0.4, 0.4, 4]} /><meshBasicMaterial color="#ffff00" /></mesh>)}
      {missiles.map(m => <mesh key={m.id} position={m.pos} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.6, 0.6, 5]} /><meshStandardMaterial color="#00ff44" emissive="#00ff44" emissiveIntensity={4} /></mesh>)}
      {enemies.map(e => <group key={e.id} position={e.pos}><EnemyModel isHit={(e.hitTimer || 0) > 0} /></group>)}
      {explosions.map(ex => <mesh key={ex.id} position={ex.pos} scale={ex.scale}><sphereGeometry args={[2, 16, 16]} /><meshBasicMaterial color="#ff6600" transparent opacity={0.6} /></mesh>)}
      
      <Sky sunPosition={[100, 10, 100]} />
      <Stars radius={250} count={6000} />
      <Environment preset="city" />
      <gridHelper args={[2000, 80, '#222', '#111']} rotation={[Math.PI / 2, 0, 0]} position={[0, -60, -300]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 40, 10]} intensity={2.5} />
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
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #222 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '7rem', fontStyle: 'italic', color: '#d32f2f', margin: 0 }}>SKY ACE</h1>
          <h2 style={{ fontSize: '2rem', letterSpacing: '10px', marginBottom: '40px' }}>{gameOver ? 'MISSION FAILED' : 'BATTLE FRONT'}</h2>
          {gameOver && <h3 style={{ fontSize: '3rem', color: '#f1c40f' }}>SCORE: {score}</h3>}
          <button onClick={resetGame} style={{ padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', border: '4px solid white', background: 'transparent', color: 'white', fontWeight: 900 }}>
            {gameOver ? 'RETRY' : 'ENGAGE'}
          </button>
        </div>
      )}

      {started && !gameOver && (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5 }}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ width: '50px', height: '50px', background: i < hp ? '#d32f2f' : '#222', borderRadius: '15px', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', transition: 'all 0.5s' }}>
                  {i < hp ? '❤' : '×'}
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: '3.5rem', margin: 0, color: '#f1c40f', fontStyle: 'italic' }}>{String(score).padStart(6, '0')}</h2>
          </div>

          <div style={{ position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)', width: '400px', zIndex: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1rem', fontWeight: 'bold' }}>
              <span>MISSILE SYSTEM</span>
              <span style={{ color: missileGauge === 5 ? '#00ff44' : 'white' }}>{missileGauge === 5 ? 'READY (SPACE)' : `${missileGauge * 20}%`}</span>
            </div>
            <div style={{ width: '100%', height: '20px', background: '#222', borderRadius: '10px', overflow: 'hidden', border: '2px solid #444' }}>
              <div style={{ width: `${missileGauge * 20}%`, height: '100%', background: missileGauge === 5 ? '#00ff44' : '#3498db', boxShadow: missileGauge === 5 ? '0 0 20px #00ff44' : 'none', transition: 'all 0.4s' }} />
            </div>
          </div>
        </>
      )}

      <Canvas shadows camera={{ position: [0, 5, 15], fov: 75 }}>
        {started && !gameOver && <Game score={score} setScore={setScore} hp={hp} setHp={setHp} missileGauge={missileGauge} setMissileGauge={setMissileGauge} onGameOver={() => setGameOver(true)} />}
      </Canvas>
    </div>
  );
}
