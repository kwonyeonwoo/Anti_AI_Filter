import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Cloud, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Airplane ---
const Airplane = ({ scale }: { scale: number }) => {
  // Pre-load to avoid suspense issues
  const { scene } = useGLTF('/airplane.glb');
  
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} scale={scale} rotation={[0, 0, 0]} />;
};

// --- Realistic Environment ---
const Terrain = () => {
  return (
    <group>
      {/* Ocean */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[100000, 100000]} />
        <meshStandardMaterial color="#004d71" metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Distant Islands */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, -8000]}>
        <planeGeometry args={[20000, 10000]} />
        <meshStandardMaterial color="#1e3a1e" roughness={1} />
      </mesh>
    </group>
  );
};

// --- Simulation Logic ---
const Simulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const planePos = useRef(new THREE.Vector3(0, 800, 0));
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(250);
  const rotationVel = useRef(new THREE.Vector3(0, 0, 0));
  
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    // 1. Physics & Controls
    const targetPitch = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const targetRoll = keys.current['a'] ? 2.0 : (keys.current['d'] ? -2.0 : 0);

    rotationVel.current.x = THREE.MathUtils.lerp(rotationVel.current.x, targetPitch, 0.05);
    rotationVel.current.z = THREE.MathUtils.lerp(rotationVel.current.z, targetRoll, 0.05);

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVel.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVel.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const vIncline = forward.dot(new THREE.Vector3(0, 1, 0));
    
    velocity.current = THREE.MathUtils.clamp(velocity.current - vIncline * 100 * delta, 120, 600);
    planePos.current.add(forward.multiplyScalar(velocity.current * delta));

    if (planePos.current.y < 10) planePos.current.y = 10;

    // 2. Mesh Update
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // 3. Camera Chase
    const camOffset = new THREE.Vector3(0, 10, 45).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    
    cameraLookAtTarget.current.lerp(planePos.current.clone().add(new THREE.Vector3(0, 0, -100).applyQuaternion(planeQuat.current)), 0.1);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Airplane scale={0.12} />
      </group>

      <Terrain />

      <Sky sunPosition={[100, 20, 100]} rayleigh={3} />
      
      <Suspense fallback={null}>
        <Cloud position={[0, 1000, -5000]} opacity={0.5} speed={0.2} width={1000} depth={500} segments={40} />
        <Environment preset="night" />
      </Suspense>

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 50, 10]} intensity={1.5} />
      <fog attach="fog" args={['#d0e7ff', 500, 30000]} />
    </>
  );
};

// --- Main App ---
export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#d0e7ff', overflow: 'hidden' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '5rem', fontWeight: 900, marginBottom: 0 }}>SKY ACE</h1>
          <p style={{ letterSpacing: '10px', marginBottom: '50px', opacity: 0.7 }}>PRO FLIGHT SYSTEM</p>
          <button 
            onClick={() => setStarted(true)} 
            style={{ padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', border: '3px solid #3498db', background: 'transparent', color: 'white', fontWeight: 900, borderRadius: '50px' }}
          >
            ENGAGE
          </button>
        </div>
      ) : (
        <Canvas shadows camera={{ position: [0, 810, 50], fov: 60, near: 0.1, far: 50000 }}>
          <Suspense fallback={null}>
            <Simulator />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
