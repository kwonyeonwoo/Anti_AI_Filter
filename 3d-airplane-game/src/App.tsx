import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, PerspectiveCamera, Stars, Float, Cloud } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Airplane Model ---
const AirplaneModel = () => {
  const { scene } = useGLTF('/airplane.glb');
  return (
    <primitive 
      object={scene} 
      scale={0.05} // 크기를 이전보다 대폭 키움 (0.015 -> 0.05)
      rotation={[0, Math.PI, 0]} 
    />
  );
};

// --- Flight Simulator Engine ---
const FlightSimulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Physics States
  const planePos = useRef(new THREE.Vector3(0, 500, 0)); // 시작 고도 500m
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(180); // 현재 속도 (km/h)
  const rotationVelocity = useRef(new THREE.Euler(0, 0, 0));
  
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
    // 1. Inputs with Smoothing
    const targetPitch = keys.current['w'] ? 1.2 : (keys.current['s'] ? -1.2 : 0);
    const targetRoll = keys.current['a'] ? 1.8 : (keys.current['d'] ? -1.8 : 0);

    rotationVelocity.current.x = THREE.MathUtils.lerp(rotationVelocity.current.x, targetPitch, 0.05);
    rotationVelocity.current.z = THREE.MathUtils.lerp(rotationVelocity.current.z, targetRoll, 0.05);

    // 2. Complex Physics (Aerodynamics)
    // - Pitch affects speed: Climbing slow down, Diving speed up
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current);
    const verticalInclination = forward.dot(new THREE.Vector3(0, 1, 0)); // -1 (down) to 1 (up)

    velocity.current -= verticalInclination * 80 * delta; // 고도 변화에 따른 속도 가감
    velocity.current = THREE.MathUtils.clamp(velocity.current, 80, 450); // 최소/최대 속도 제한

    // - Lift simulation: Roll reduces vertical lift
    const rollAngle = Math.abs(rotationVelocity.current.z);
    const liftForce = Math.cos(rollAngle * 0.5) * 9.8 * delta; // 단순화된 양력 계산
    planePos.current.y -= (9.8 * delta - liftForce); // 기울어지면 고도가 떨어짐

    // - Rotation Apply
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVelocity.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVelocity.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat);
    planeQuat.current.normalize();

    // 3. Movement
    planePos.current.add(forward.multiplyScalar(velocity.current * delta));

    // 바닥 충돌 및 수면 제한
    if (planePos.current.y < 5) planePos.current.y = 5;

    // 4. Mesh & Camera Update
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // Dynamic Camera Offset (속도와 자세에 따라 거리가 변함)
    const dynamicDist = 18 + (velocity.current / 400) * 10;
    const cameraOffset = new THREE.Vector3(0, 6, dynamicDist).applyQuaternion(planeQuat.current);
    const idealCameraPos = planePos.current.clone().add(cameraOffset);
    camera.position.lerp(idealCameraPos, 0.15);

    const lookOffset = new THREE.Vector3(0, 0, -50).applyQuaternion(planeQuat.current);
    const idealLookAt = planePos.current.clone().add(lookOffset);
    cameraLookAtTarget.current.lerp(idealLookAt, 0.15);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));
  });

  return (
    <>
      <group ref={airplaneRef}>
        <React.Suspense fallback={<mesh><boxGeometry args={[5,2,10]} /><meshStandardMaterial color="white" wireframe /></mesh>}>
          <AirplaneModel />
        </React.Suspense>
      </group>

      {/* --- Environment --- */}
      
      {/* 바다 (사실적인 쉐이더 느낌의 재질) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[50000, 50000]} />
        <meshStandardMaterial 
          color="#0a2a43" 
          metalness={0.9} 
          roughness={0.1} 
          transparent 
          opacity={0.8}
        />
      </mesh>

      {/* 육지 및 섬 (곳곳에 배치) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, -5000]} receiveShadow>
        <planeGeometry args={[10000, 10000, 32, 32]} />
        <meshStandardMaterial color="#1e3a1e" roughness={1} />
      </mesh>

      <Sky distance={450000} sunPosition={[100, 10, 100]} inclination={0} azimuth={0.25} />
      <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />
      
      {/* 구름 레이어 */}
      <Float speed={1} rotationIntensity={0.1} floatIntensity={1}>
        {useMemo(() => [...Array(20)].map((_, i) => (
          <Cloud 
            key={i} 
            position={[(Math.random() - 0.5) * 5000, 800 + Math.random() * 500, (Math.random() - 0.5) * 5000]} 
            opacity={0.4}
            speed={0.2}
            width={100}
            depth={50}
            segments={20}
          />
        )), [])}
      </Float>

      <Environment preset="city" />
      <ambientLight intensity={0.2} />
      <directionalLight position={[100, 100, 100]} intensity={1.5} castShadow />
      <fog attach="fog" args={['#87ceeb', 1000, 20000]} />
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', overflow: 'hidden', color: 'white', fontFamily: 'monospace' }}>
      {!started && (
        <div style={{ 
          position: 'absolute', zIndex: 10, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' 
        }}>
          <h1 style={{ fontSize: '6rem', fontWeight: 900, fontStyle: 'italic', marginBottom: '0px' }}>ACE FLIGHT</h1>
          <p style={{ fontSize: '1.5rem', letterSpacing: '10px', color: '#3498db', marginBottom: '50px' }}>ADVANCED SIMULATION</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #3498db' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>CONTROLS</h3>
              <p><b>W / S</b> : Pitch (Nose Up/Down)</p>
              <p><b>A / D</b> : Roll (Left/Right)</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #2ecc71' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>PHYSICS</h3>
              <p>• Climbing reduces speed</p>
              <p>• Diving increases speed</p>
              <p>• Bank to turn (Bank & Yank)</p>
            </div>
          </div>

          <button 
            onClick={() => setStarted(true)}
            style={{ 
              padding: '1.5rem 6rem', fontSize: '2rem', cursor: 'pointer', 
              border: '4px solid #3498db', background: 'transparent', color: 'white', fontWeight: 900,
              boxShadow: '0 0 30px rgba(52, 152, 219, 0.4)', transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3498db'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            START SIMULATION
          </button>
        </div>
      )}

      {started && (
        <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 5, padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <h3 style={{ margin: 0, color: '#3498db' }}>FLIGHT TELEMETRY</h3>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>AIRSPEED</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>180 <span style={{ fontSize: '1rem' }}>KM/H</span></div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>ALTITUDE</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>500 <span style={{ fontSize: '1rem' }}>M</span></div>
          </div>
        </div>
      )}

      <Canvas shadows camera={{ fov: 65 }}>
        {started && <FlightSimulator />}
      </Canvas>
    </div>
  );
}
