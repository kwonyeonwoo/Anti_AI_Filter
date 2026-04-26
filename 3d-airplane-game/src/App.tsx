import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Cloud, PerspectiveCamera, ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Photorealistic Airplane ---
const Airplane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale} rotation={[0, 0, 0]} castShadow receiveShadow />; 
  // rotation을 [0, 0, 0]으로 하여 정면(-Z)을 향하게 수정
};

// --- Realistic Terrain: Infinite Ocean & Islands ---
const Sea = () => {
  return (
    <group>
      {/* Ocean Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[100000, 100000]} />
        <meshStandardMaterial 
          color="#006994" 
          metalness={0.8} 
          roughness={0.1} 
          transparent 
          opacity={0.9} 
        />
      </mesh>
      {/* Ground / Islands */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, -5000]} receiveShadow>
        <planeGeometry args={[20000, 20000, 10, 10]} />
        <meshStandardMaterial color="#2d5a27" roughness={1} />
      </mesh>
    </group>
  );
};

// --- Flight Simulator Engine ---
const Simulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const planePos = useRef(new THREE.Vector3(0, 1000, 0)); // 고도 1000m
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(250); 
  const rotationVel = useRef(new THREE.Vector3(0, 0, 0));
  
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    // 초기 카메라 위치: 비행기 뒤쪽
    camera.position.set(0, 1015, 80);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // 1. Controls (S: Up, W: Down)
    const targetPitch = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const targetRoll = keys.current['a'] ? 2.2 : (keys.current['d'] ? -2.2 : 0);

    rotationVel.current.x = THREE.MathUtils.lerp(rotationVel.current.x, targetPitch, 0.04);
    rotationVel.current.z = THREE.MathUtils.lerp(rotationVel.current.z, targetRoll, 0.04);

    // 2. Realistic Physics
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVel.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVel.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const vIncline = forward.dot(new THREE.Vector3(0, 1, 0));
    
    // 에너지 전환 물리
    velocity.current = THREE.MathUtils.clamp(velocity.current - vIncline * 120 * delta, 120, 600);
    planePos.current.add(forward.multiplyScalar(velocity.current * delta));

    // 고도 제한
    if (planePos.current.y < 10) planePos.current.y = 10;

    // 3. Sync & Camera
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    const camOffset = new THREE.Vector3(0, 10, 45).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.12);
    
    cameraLookAtTarget.current.lerp(planePos.current.clone().add(new THREE.Vector3(0, 0, -100).applyQuaternion(planeQuat.current)), 0.1);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={<mesh><boxGeometry args={[10, 2, 20]} /><meshStandardMaterial color="white" wireframe /></mesh>}>
          <Airplane scale={0.15} /> {/* 크기를 사실적인 비례로 조정 */}
        </Suspense>
      </group>

      <Sea />

      {/* 사실적인 낮 하늘 설정 */}
      <Sky 
        distance={450000} 
        sunPosition={[100, 20, 100]} 
        turbidity={0.1} 
        rayleigh={3} 
        mieCoefficient={0.005} 
        mieDirectionalG={0.7} 
      />
      
      {/* 구름 레이어 */}
      <Float speed={1} floatIntensity={5}>
        {useMemo(() => [...Array(20)].map((_, i) => (
          <Cloud 
            key={i} 
            position={[(Math.random()-0.5)*20000, 1000 + Math.random()*1000, (Math.random()-0.5)*20000]} 
            opacity={0.4}
            speed={0.1}
            width={400}
            depth={150}
          />
        )), [])}
      </Float>

      <Environment preset="day" />
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 500, 100]} intensity={2} castShadow />
      <fog attach="fog" args={['#d0e7ff', 500, 40000]} />
    </>
  );
};

// --- Main App ---
export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden', color: 'black', fontFamily: 'Arial, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom, #87ceeb 0%, #ffffff 100%)' }}>
          <h1 style={{ fontSize: '6rem', fontWeight: 900, color: '#1a3a3a', margin: 0 }}>SKY ACE</h1>
          <p style={{ letterSpacing: '10px', marginBottom: '50px', fontSize: '1.2rem', color: '#555' }}>REALISTIC FLIGHT SIMULATOR</p>
          <div style={{ background: 'rgba(0,0,0,0.05)', padding: '30px', borderRadius: '20px', marginBottom: '50px', textAlign: 'left', border: '1px solid rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>FLIGHT CONTROLS</h3>
            <p><b>S / W</b> : PITCH (UP / DOWN)</p>
            <p><b>A / D</b> : ROLL (BANK LEFT / RIGHT)</p>
          </div>
          <button 
            onClick={() => setStarted(true)} 
            style={{ padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', border: 'none', background: '#1a3a3a', color: 'white', fontWeight: 900, borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            START FLIGHT
          </button>
        </div>
      ) : (
        <Canvas shadows camera={{ fov: 60, near: 0.1, far: 100000 }}>
          <Simulator />
        </Canvas>
      )}
    </div>
  );
}
