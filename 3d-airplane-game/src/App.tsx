import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, PerspectiveCamera, Stars, Float, Cloud, Text, Center } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Airplane Model with Auto-Centering ---
const AirplaneModel = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  
  // 모델 내부의 모든 메쉬에 그림자 설정
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <Center top> {/* 모델을 중앙으로 정렬 */}
      <primitive 
        object={scene} 
        scale={scale} 
        rotation={[0, Math.PI, 0]} 
      />
    </Center>
  );
};

// --- World Objects ---
const Landmark = ({ position, type }: { position: [number, number, number], type: 'mountain' | 'building' }) => {
  const height = type === 'mountain' ? 500 : 200;
  const width = type === 'mountain' ? 600 : 50;
  return (
    <mesh position={position}>
      {type === 'mountain' ? <coneGeometry args={[width, height, 4]} /> : <boxGeometry args={[width, height, width]} />}
      <meshStandardMaterial color={type === 'mountain' ? '#3d2b1f' : '#223344'} />
    </mesh>
  );
};

// --- Flight Simulator Engine ---
const FlightSimulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const planePos = useRef(new THREE.Vector3(0, 500, 0)); 
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(200); 
  const rotationVelocity = useRef(new THREE.Euler(0, 0, 0));
  
  const keys = useRef<{ [key: string]: boolean }>({});
  const [hud, setHud] = useState({ speed: 200, alt: 500 });

  useEffect(() => {
    // 초기 카메라 강제 설정
    camera.position.set(0, 515, 60); 
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const targetPitch = keys.current['s'] ? 1.4 : (keys.current['w'] ? -1.4 : 0);
    const targetRoll = keys.current['a'] ? 1.8 : (keys.current['d'] ? -1.8 : 0);

    rotationVelocity.current.x = THREE.MathUtils.lerp(rotationVelocity.current.x, targetPitch, 0.05);
    rotationVelocity.current.z = THREE.MathUtils.lerp(rotationVelocity.current.z, targetRoll, 0.05);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const verticalInclination = forward.dot(new THREE.Vector3(0, 1, 0));
    velocity.current -= verticalInclination * 100 * delta; 
    velocity.current = THREE.MathUtils.clamp(velocity.current, 100, 600); 

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVelocity.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVelocity.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat);
    planeQuat.current.normalize();

    planePos.current.add(forward.multiplyScalar(velocity.current * delta));
    if (planePos.current.y < 10) planePos.current.y = 10;

    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // 카메라 추적 (더 멀리서 추적)
    const cameraOffset = new THREE.Vector3(0, 10, 50).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(cameraOffset), 0.1);

    const lookOffset = new THREE.Vector3(0, 0, -100).applyQuaternion(planeQuat.current);
    cameraLookAtTarget.current.lerp(planePos.current.clone().add(lookOffset), 0.1);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));

    if (state.clock.elapsedTime % 0.5 < 0.02) {
      setHud({ speed: Math.round(velocity.current), alt: Math.round(planePos.current.y) });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={<mesh><boxGeometry args={[10, 5, 20]} /><meshBasicMaterial color="red" wireframe /></mesh>}>
          <AirplaneModel scale={0.05} />
          {/* 디버그용 상자: 비행기가 안보일 경우 이 상자라도 보여야 함 */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial color="red" transparent opacity={0.3} />
          </mesh>
        </Suspense>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[100000, 100000]} />
        <meshStandardMaterial color="#1a3a3a" metalness={0.5} roughness={0.5} />
      </mesh>
      <gridHelper args={[100000, 100, '#000000', '#224444']} position={[0, -4.5, 0]} />

      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={300} count={5000} />
      <Environment preset="night" />
      <ambientLight intensity={1.0} /> {/* 광원 대폭 강화 */}
      <directionalLight position={[100, 200, 100]} intensity={2} castShadow />
      <fog attach="fog" args={['#87ceeb', 1000, 20000]} />
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'monospace' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
          <h1 style={{ fontSize: '6rem', fontStyle: 'italic', color: '#3498db' }}>SKY ACE</h1>
          <p style={{ letterSpacing: '10px', marginBottom: '40px' }}>SYSTEM READY</p>
          <button onClick={() => setStarted(true)} style={{ padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', border: '3px solid #3498db', background: 'transparent', color: 'white', fontWeight: 900 }}>
            LAUNCH
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '10px' }}>
            <h2 style={{ margin: 0, color: '#3498db' }}>FLIGHT TELEMETRY</h2>
            <p style={{ fontSize: '1.5rem' }}>SPD: {hud.speed} | ALT: {hud.alt}</p>
            <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>S: PULL UP | W: PUSH DOWN | A/D: ROLL</p>
          </div>
          <Canvas shadows>
            <FlightSimulator />
          </Canvas>
        </>
      )}
    </div>
  );
}
