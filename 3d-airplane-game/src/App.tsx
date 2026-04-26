import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Float, Cloud } from '@react-three/drei';
import * as THREE from 'three';

// --- Airplane Wrapper (Handles GLB loading safely) ---
const Airplane = ({ scale }: { scale: number }) => {
  try {
    const { scene } = useGLTF('/airplane.glb');
    return <primitive object={scene} scale={scale} rotation={[0, Math.PI, 0]} />;
  } catch (e) {
    // 모델 로드 실패 시 보여줄 대체 도형
    return (
      <mesh>
        <boxGeometry args={[10, 2, 5]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }
};

// --- World Objects ---
const Landmark = ({ position, type }: { position: [number, number, number], type: 'mountain' | 'building' }) => {
  const isMountain = type === 'mountain';
  return (
    <mesh position={position}>
      {isMountain ? <coneGeometry args={[400, 600, 4]} /> : <boxGeometry args={[60, 200, 60]} />}
      <meshStandardMaterial color={isMountain ? '#3d2b1f' : '#2c3e50'} />
    </mesh>
  );
};

// --- Simulation Logic ---
const Simulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Physics Refs
  const planePos = useRef(new THREE.Vector3(0, 500, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(200);
  const rotationVel = useRef(new THREE.Vector3(0, 0, 0));
  
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    // 초기 카메라 위치 강제 설정
    camera.position.set(0, 510, 40);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  useFrame((_state, delta) => {
    // 1. Input Logic (S: Up, W: Down)
    const targetPitch = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const targetRoll = keys.current['a'] ? 2.0 : (keys.current['d'] ? -2.0 : 0);

    rotationVel.current.x = THREE.MathUtils.lerp(rotationVel.current.x, targetPitch, 0.05);
    rotationVel.current.z = THREE.MathUtils.lerp(rotationVel.current.z, targetRoll, 0.05);

    // 2. Physics & Movement
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVel.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVel.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const vIncline = forward.dot(new THREE.Vector3(0, 1, 0));
    velocity.current = THREE.MathUtils.clamp(velocity.current - vIncline * 120 * delta, 120, 550);

    planePos.current.add(forward.multiplyScalar(velocity.current * delta));
    if (planePos.current.y < 10) planePos.current.y = 10;

    // 3. Sync Mesh & Camera
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    const camOffset = new THREE.Vector3(0, 8, 35).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    camera.lookAt(planePos.current.clone().add(new THREE.Vector3(0, 0, -100).applyQuaternion(planeQuat.current)));
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));
  });

  const landmarks = useMemo(() => [...Array(60)].map((_, i) => ({
    id: i,
    pos: [(Math.random()-0.5)*10000, 0, (Math.random()-0.5)*10000] as [number, number, number],
    type: Math.random() > 0.5 ? 'mountain' : 'building' as any
  })), []);

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={<mesh><boxGeometry args={[5, 2, 10]} /><meshStandardMaterial color="yellow" wireframe /></mesh>}>
          <Airplane scale={0.06} />
          {/* 디버그용 가이드 상자 */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="red" />
          </mesh>
        </Suspense>
      </group>

      {landmarks.map(lm => <Landmark key={lm.id} position={lm.pos} type={lm.type} />)}
      
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[100000, 100000]} />
        <meshStandardMaterial color="#1a2a2a" />
      </mesh>
      <gridHelper args={[100000, 200, '#444', '#111']} position={[0, -4.5, 0]} />

      <Sky sunPosition={[100, 10, 100]} />
      <Stars radius={300} count={5000} />
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 50, 10]} intensity={1.5} />
      <fog attach="fog" args={['#87ceeb', 1000, 20000]} />
    </>
  );
};

// --- Main App ---
export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', overflow: 'hidden', color: 'white', fontFamily: 'sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          <h1 style={{ fontSize: '5rem', fontStyle: 'italic', fontWeight: 900, color: '#3498db' }}>SKY ACE PRO</h1>
          <p style={{ letterSpacing: '8px', marginBottom: '40px', opacity: 0.7 }}>AERODYNAMIC SIMULATION READY</p>
          <button 
            onClick={() => setStarted(true)} 
            style={{ padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', border: '3px solid #3498db', background: 'transparent', color: 'white', fontWeight: 900, borderRadius: '50px' }}
          >
            ENGAGE
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', top: '30px', left: '30px', zIndex: 5, pointerEvents: 'none', background: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '15px', border: '1px solid #3498db' }}>
            <h2 style={{ margin: 0, color: '#3498db', fontSize: '1.2rem' }}>FLIGHT STATUS: ACTIVE</h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>S: 상승 | W: 하강 | A/D: 회전</p>
          </div>
          <Canvas shadows camera={{ fov: 60, near: 0.1, far: 50000 }}>
            <Simulator />
          </Canvas>
        </div>
      )}
    </div>
  );
}
