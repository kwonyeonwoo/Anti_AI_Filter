import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Airplane Model (Loaded from External GLB) ---
// Note: We use a primitive to render the downloaded GLTF model.
const AirplaneModel = () => {
  // 다운로드한 실제 비행기 모델 로드 (에러 방지를 위해 Suspense 사용 필요)
  const { scene } = useGLTF('/airplane.glb');
  
  // 모델의 크기와 초기 방향(Z축 정렬) 조정
  return (
    <primitive 
      object={scene} 
      scale={0.015} // 모델에 따라 스케일 조절 필요 (일반적으로 매우 크거나 작음)
      rotation={[0, Math.PI, 0]} // 모델을 정면(-Z)으로 향하도록 180도 회전
    />
  );
};

// --- Flight Simulator Engine ---
const FlightSimulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // 비행기의 절대 위치와 자세(Quaternion) 상태
  const planePos = useRef(new THREE.Vector3(0, 100, 0)); // 시작 고도 100m
  const planeQuat = useRef(new THREE.Quaternion());
  
  // 비행 속도 (일정하게 유지)
  const speed = 150; 
  
  // 조작 키 상태
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // 카메라가 부드럽게 바라볼 목표점 (Lerp 용도)
  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    // 1. Controls (War Thunder Style: Bank and Yank)
    let pitchInput = 0; // X-axis local rotation
    let rollInput = 0;  // Z-axis local rotation

    if (keys.current['w']) pitchInput = 1;  // Pitch Down (기수 내림)
    if (keys.current['s']) pitchInput = -1; // Pitch Up (기수 올림 - 보통 선회 시 당김)
    if (keys.current['a']) rollInput = 1;   // Roll Left (좌측 기울임)
    if (keys.current['d']) rollInput = -1;  // Roll Right (우측 기울임)

    // 회전 속도 (Rad/sec)
    const pitchRate = 1.5; 
    const rollRate = 2.5;  

    // 현재 기체의 로컬 축을 기준으로 회전(Quaternion) 적용
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchInput * pitchRate * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * rollRate * delta);
    
    // Quaternion 곱셈으로 현재 자세 업데이트 (Local rotation)
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat);
    planeQuat.current.normalize(); // 오차 방지

    // 2. Flight Physics (Forward movement based on orientation)
    // 현재 기체가 바라보는 정면 벡터(-Z) 계산
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    
    // 비행기 이동 (속도 * 전방벡터)
    planePos.current.add(forwardVector.multiplyScalar(speed * delta));

    // 바닥 충돌 방지 (고도 제한)
    if (planePos.current.y < 2) planePos.current.y = 2;

    // 3. Update Airplane Mesh
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // 4. Advanced Camera (War Thunder Chase Cam)
    // 기체의 약간 뒤 위쪽에 위치하되, 기체의 기울기(Roll)를 똑같이 따라감
    const cameraOffset = new THREE.Vector3(0, 3, 12).applyQuaternion(planeQuat.current);
    const idealCameraPos = planePos.current.clone().add(cameraOffset);
    
    // 카메라 위치 부드럽게 이동
    camera.position.lerp(idealCameraPos, 0.2);

    // 카메라가 바라볼 지점 (기체 앞쪽)
    const lookOffset = new THREE.Vector3(0, 0, -30).applyQuaternion(planeQuat.current);
    const idealLookAt = planePos.current.clone().add(lookOffset);
    cameraLookAtTarget.current.lerp(idealLookAt, 0.2);
    
    camera.lookAt(cameraLookAtTarget.current);
    // 카메라의 Up 벡터를 기체의 Up 벡터와 일치시켜 화면이 함께 기울어지게 함 (다이내믹 몰입감)
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));
  });

  return (
    <>
      <group ref={airplaneRef}>
        <React.Suspense fallback={
          <mesh><boxGeometry args={[2,2,2]} /><meshStandardMaterial color="gray" /></mesh>
        }>
          <AirplaneModel />
        </React.Suspense>
      </group>

      {/* Environment: Ground (육지) */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#2d4c1e" roughness={0.8} />
      </mesh>
      <gridHelper args={[10000, 1000, '#000000', '#1b3310']} position={[0, 0.1, 0]} />

      {/* Environment: Sea (바다 - 육지 바깥쪽이나 일부 영역) */}
      <mesh position={[5000, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.1} metalness={0.8} />
      </mesh>

      <Sky sunPosition={[1000, 500, 1000]} turbidity={0.1} rayleigh={1} />
      <Environment preset="park" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[1000, 2000, 1000]} intensity={1.5} castShadow />
    </>
  );
};

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'Arial, sans-serif' }}>
      {!started && (
        <div style={{ 
          position: 'absolute', zIndex: 10, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, #333 0%, #000 100%)' 
        }}>
          <h1 style={{ fontSize: '5rem', fontWeight: 900, marginBottom: '10px', textTransform: 'uppercase' }}>REAL FLIGHT SIM</h1>
          <p style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '40px' }}>War Thunder Style Controls</p>
          
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '10px', marginBottom: '40px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#4CAF50' }}>FLIGHT MANUAL</h3>
            <p><b>W</b> : Pitch Down (기수 내림)</p>
            <p><b>S</b> : Pitch Up (기수 올림 - 선회 시 당김)</p>
            <p><b>A</b> : Roll Left (좌측 기울임)</p>
            <p><b>D</b> : Roll Right (우측 기울임)</p>
            <hr style={{ borderColor: '#444', margin: '20px 0' }}/>
            <p style={{ color: '#ccc', fontSize: '0.9rem' }}>💡 <b>선회 팁:</b> A/D로 기체를 기울인 후 S를 당겨 턴하세요!</p>
          </div>

          <button 
            onClick={() => setStarted(true)}
            style={{ 
              padding: '1rem 4rem', fontSize: '1.5rem', cursor: 'pointer', 
              border: 'none', borderRadius: '5px', background: '#4CAF50', color: 'white', fontWeight: 'bold'
            }}
          >
            TAKE OFF
          </button>
        </div>
      )}

      {started && (
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 5, color: 'white', textShadow: '1px 1px 2px black' }}>
          <h3>REAL FLIGHT SIM</h3>
          <p>Speed: 150 km/h (Auto-Throttle)</p>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 105, 10], fov: 60 }}>
        {started && <FlightSimulator />}
      </Canvas>
    </div>
  );
}
