import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, PerspectiveCamera, Stars, Float, Cloud, Text } from '@react-three/drei';
import * as THREE from 'three';

// --- Aircraft Models ---
// 1. 여객기 (Downloaded GLB)
const PassengerPlane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  useEffect(() => {
    scene.traverse((obj) => { if ((obj as THREE.Mesh).isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  }, [scene]);
  return <primitive object={scene} scale={scale * 2.0} rotation={[0, Math.PI, 0]} />; // 훨씬 크게 표시
};

// 2. 스텔스 전투기 (Procedural High-Poly Style)
const StealthFighter = ({ scale }: { scale: number }) => {
  const group = useRef<THREE.Group>(null);
  const engineFlame = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (engineFlame.current) {
      engineFlame.current.scale.z = 1 + Math.sin(clock.elapsedTime * 20) * 0.2;
    }
  });

  return (
    <group ref={group} scale={scale * 15}>
      {/* 날렵한 메인 동체 */}
      <mesh castShadow position={[0, 0, 0]}>
        <coneGeometry args={[0.5, 6, 4]} />
        <meshStandardMaterial color="#1a1c20" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* 조종석 */}
      <mesh position={[0, 0.4, 0.5]} rotation={[-Math.PI / 10, 0, 0]}>
        <capsuleGeometry args={[0.2, 0.8, 4, 8]} />
        <meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.8} />
      </mesh>
      {/* 델타 주 날개 */}
      <mesh castShadow position={[0, -0.1, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.5, 0.1, 2, 3]} />
        <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* 수직 미익 (쌍발 꼬리날개) */}
      <mesh castShadow position={[0.6, 0.5, 2.5]} rotation={[0, 0, -Math.PI / 8]}>
        <boxGeometry args={[0.05, 1.2, 0.8]} />
        <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[-0.6, 0.5, 2.5]} rotation={[0, 0, Math.PI / 8]}>
        <boxGeometry args={[0.05, 1.2, 0.8]} />
        <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* 제트 엔진 배기구 */}
      <mesh position={[0.4, -0.1, 2.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.4, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.4, -0.1, 2.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.4, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* 애프터버너 불꽃 */}
      <mesh ref={engineFlame} position={[0, -0.1, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.05, 1, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

// --- Realistic Terrain Generator ---
const Terrain = () => {
  // InstancedMesh로 수천 개의 산맥과 빌딩을 고성능으로 렌더링
  const mountainCount = 1000;
  const buildingCount = 500;
  
  const mountainMesh = useRef<THREE.InstancedMesh>(null);
  const buildingMesh = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    
    // Mountains
    if (mountainMesh.current) {
      for (let i = 0; i < mountainCount; i++) {
        const x = (Math.random() - 0.5) * 50000;
        const z = (Math.random() - 0.5) * 50000;
        const h = 500 + Math.random() * 2500; // 최대 3000m 높이의 거대 산맥
        const r = 1000 + Math.random() * 2000;
        dummy.position.set(x, h/2 - 100, z);
        dummy.scale.set(r, h, r);
        dummy.updateMatrix();
        mountainMesh.current.setMatrixAt(i, dummy.matrix);
      }
      mountainMesh.current.instanceMatrix.needsUpdate = true;
    }

    // Buildings (City Area)
    if (buildingMesh.current) {
      for (let i = 0; i < buildingCount; i++) {
        const x = (Math.random() - 0.5) * 10000;
        const z = (Math.random() - 0.5) * 10000;
        const h = 200 + Math.random() * 800; // 마천루
        const w = 50 + Math.random() * 100;
        dummy.position.set(x, h/2, z - 5000); // 도시는 중심에서 Z축으로 약간 떨어진 곳에 배치
        dummy.scale.set(w, h, w);
        dummy.updateMatrix();
        buildingMesh.current.setMatrixAt(i, dummy.matrix);
      }
      buildingMesh.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <group>
      <instancedMesh ref={mountainMesh} args={[new THREE.ConeGeometry(1, 1, 4), new THREE.MeshStandardMaterial({ color: '#2d3436', roughness: 0.9 }), mountainCount]} castShadow receiveShadow />
      <instancedMesh ref={buildingMesh} args={[new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#1e272e', metalness: 0.6, roughness: 0.2 }), buildingCount]} castShadow receiveShadow />
      
      {/* 바다 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[200000, 200000]} />
        <meshStandardMaterial color="#003b5c" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// --- TRUE PHYSICS FLIGHT ENGINE ---
const FlightSimulator = ({ aircraftType, setTelemetry }: { aircraftType: 'passenger' | 'stealth', setTelemetry: any }) => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  // Real Physics Variables
  const planePos = useRef(new THREE.Vector3(0, 2000, 0)); // 시작 고도 2000m
  const planeQuat = useRef(new THREE.Quaternion());
  const planeVelocity = useRef(new THREE.Vector3(0, 0, -150)); // m/s (약 540km/h)
  
  const throttle = useRef(0.5); // 0.0 to 1.0
  const pitchAngle = useRef(0); // Elevator
  const rollAngle = useRef(0);  // Aileron

  // Aircraft Specs
  const MASS = aircraftType === 'stealth' ? 15000 : 40000; // kg
  const MAX_THRUST = aircraftType === 'stealth' ? 180000 : 250000; // N (Newton)
  const WING_AREA = aircraftType === 'stealth' ? 45 : 120; // m^2
  const AIR_DENSITY = 1.225; // kg/m^3
  const GRAVITY = 9.81;

  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if(e.key === 'Shift') keys.current['shift'] = true; if(e.key === 'Control') keys.current['ctrl'] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; if(e.key === 'Shift') keys.current['shift'] = false; if(e.key === 'Control') keys.current['ctrl'] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    camera.position.set(0, 2020, 80);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    // 1. 조작 입력 처리 (W/S 반전 적용, 스로틀은 Shift/Ctrl)
    if (keys.current['shift']) throttle.current = Math.min(1.0, throttle.current + 0.5 * delta);
    if (keys.current['ctrl']) throttle.current = Math.max(0.0, throttle.current - 0.5 * delta);
    
    // W: Push Down (하강), S: Pull Up (상승)
    const targetPitch = keys.current['s'] ? 1.5 : (keys.current['w'] ? -1.5 : 0);
    const targetRoll = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);
    
    pitchAngle.current = THREE.MathUtils.lerp(pitchAngle.current, targetPitch, 0.1);
    rollAngle.current = THREE.MathUtils.lerp(rollAngle.current, targetRoll, 0.1);

    // 2. 비행 자세(Orientation) 업데이트
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchAngle.current * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollAngle.current * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    // Local Vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeQuat.current).normalize();

    // 3. 물리력 계산 (Forces)
    const speedSq = planeVelocity.current.lengthSq();
    const speed = Math.sqrt(speedSq);
    
    // a. 추력 (Thrust) - 전방으로 작용
    const thrustForce = forward.clone().multiplyScalar(throttle.current * MAX_THRUST);
    
    // b. 중력 (Gravity) - 아래로 작용
    const gravityForce = new THREE.Vector3(0, -MASS * GRAVITY, 0);

    // c. 받음각 (Angle of Attack, AoA) 및 양력 (Lift)
    // 기체의 전방 방향과 실제 속도 방향의 차이로 계산
    const velNorm = speed > 0.1 ? planeVelocity.current.clone().normalize() : forward.clone();
    // 속도 벡터의 Up 축 성분 (받음각 근사치)
    const aoa = -velNorm.dot(up); 
    const liftCoefficient = 0.3 + aoa * 3.0; // 단순화된 양력 계수 곡선
    
    // 양력은 기체의 로컬 Up 방향으로 작용
    const liftMag = 0.5 * AIR_DENSITY * speedSq * WING_AREA * liftCoefficient;
    const liftForce = up.clone().multiplyScalar(liftMag);

    // d. 항력 (Drag) - 속도 반대 방향
    const dragCoefficient = 0.02 + Math.abs(aoa) * 0.1; // 유도 항력 포함
    const dragMag = 0.5 * AIR_DENSITY * speedSq * WING_AREA * dragCoefficient;
    const dragForce = velNorm.clone().multiplyScalar(-dragMag);

    // 4. 가속도 적용 및 속도/위치 업데이트 (F = ma)
    const netForce = new THREE.Vector3().add(thrustForce).add(gravityForce).add(liftForce).add(dragForce);
    const acceleration = netForce.divideScalar(MASS);

    planeVelocity.current.add(acceleration.multiplyScalar(delta));
    planePos.current.add(planeVelocity.current.clone().multiplyScalar(delta));

    // 바닥 충돌 처리 (간단한 파괴/정지 로직)
    if (planePos.current.y < 5) {
      planePos.current.y = 5;
      planeVelocity.current.y = Math.max(0, planeVelocity.current.y); // 바닥 뚫기 방지
      planeVelocity.current.multiplyScalar(0.9); // 마찰로 감속
    }

    // 5. Mesh & Camera Update
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      // 자연스러운 바람개비 효과를 위해 velocity 벡터를 따라 회전을 보정하는 로직 추가 가능
      // 여기서는 조종사의 입력을 직접적으로 자세에 매핑하여 아케이드성과 리얼리즘 사이를 타협
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    // 카메라 추적 (속도에 따른 FOV 및 거리 동적 조절)
    const kph = speed * 3.6; // m/s to km/h
    const fovTarget = 60 + THREE.MathUtils.clamp((kph - 300) / 1000 * 40, 0, 40);
    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, fovTarget, 0.1);
    camera.updateProjectionMatrix();

    // 기체 크기에 맞게 카메라 거리 조정
    const baseDist = aircraftType === 'stealth' ? 25 : 45;
    const camOffset = new THREE.Vector3(0, aircraftType === 'stealth' ? 8 : 12, baseDist + (kph / 400) * 15).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.15);
    
    cameraLookAtTarget.current.lerp(planePos.current.clone().add(forward.clone().multiplyScalar(100)), 0.15);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(up);

    // Telemetry Update (UI용)
    if (_state.clock.elapsedTime % 0.1 < 0.02) {
      setTelemetry({ 
        speed: Math.round(kph), 
        alt: Math.round(planePos.current.y),
        thr: Math.round(throttle.current * 100),
        gforce: Math.round((liftMag / MASS) / GRAVITY * 10) / 10
      });
    }
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={<mesh><boxGeometry args={[5, 2, 10]} /><meshStandardMaterial color="white" wireframe /></mesh>}>
          {aircraftType === 'passenger' ? <PassengerPlane scale={0.1} /> : <StealthFighter scale={0.15} />}
        </Suspense>
      </group>
      <Terrain />
      
      {/* 사실적 대기 및 하늘 */}
      <Sky distance={450000} sunPosition={[500, 100, -1000]} turbidity={0.2} rayleigh={2} />
      <Stars radius={500} depth={50} count={10000} factor={6} />
      <Environment preset="day" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[500, 1000, -1000]} intensity={2.5} castShadow />
      
      {/* 고도와 거리감을 나타내는 안개 */}
      <fogExp2 attach="fog" color="#87ceeb" density={0.00004} />
    </>
  );
};

// --- Main App ---
export default function App() {
  const [started, setStarted] = useState(false);
  const [aircraftType, setAircraftType] = useState<'passenger' | 'stealth'>('stealth');
  const [telemetry, setTelemetry] = useState({ speed: 0, alt: 0, thr: 0, gforce: 0 });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '8rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 50px rgba(52,152,219,0.5)' }}>AERO DYNAMICS</h1>
          <p style={{ letterSpacing: '15px', marginBottom: '40px', fontSize: '1.2rem', opacity: 0.8 }}>TRUE PHYSICS FLIGHT SIMULATOR</p>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            <div 
              onClick={() => setAircraftType('stealth')}
              style={{ padding: '20px', width: '250px', cursor: 'pointer', border: `4px solid ${aircraftType === 'stealth' ? '#3498db' : '#333'}`, borderRadius: '15px', background: 'rgba(0,0,0,0.5)', transition: 'all 0.2s' }}
            >
              <h2 style={{ margin: '0 0 10px 0', color: aircraftType === 'stealth' ? '#3498db' : 'white' }}>F-X STEALTH JET</h2>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0 }}>High Thrust, High Maneuverability</p>
            </div>
            <div 
              onClick={() => setAircraftType('passenger')}
              style={{ padding: '20px', width: '250px', cursor: 'pointer', border: `4px solid ${aircraftType === 'passenger' ? '#e74c3c' : '#333'}`, borderRadius: '15px', background: 'rgba(0,0,0,0.5)', transition: 'all 0.2s' }}
            >
              <h2 style={{ margin: '0 0 10px 0', color: aircraftType === 'passenger' ? '#e74c3c' : 'white' }}>HEAVY AIRLINER</h2>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0 }}>High Mass, Large Wing Area</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px', textAlign: 'left', width: '600px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #f1c40f' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>CONTROLS (INVERTED)</h3>
              <p><b>S</b> : PULL UP (기수 상승)</p>
              <p><b>W</b> : PUSH DOWN (기수 하강)</p>
              <p><b>A / D</b> : ROLL (좌우 뱅크)</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #2ecc71' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>ENGINE & PHYSICS</h3>
              <p><b>SHIFT</b> : THROTTLE UP</p>
              <p><b>CTRL</b> : THROTTLE DOWN</p>
              <p style={{ color: '#e74c3c', marginTop: '10px', fontSize: '0.9rem' }}>* 경고: 속도가 낮으면 양력을 잃고 추락합니다 (Stall)</p>
            </div>
          </div>

          <button 
            onClick={() => setStarted(true)} 
            style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', cursor: 'pointer', border: 'none', background: aircraftType === 'stealth' ? '#3498db' : '#e74c3c', color: 'white', fontWeight: 900, borderRadius: '60px', boxShadow: `0 10px 40px ${aircraftType === 'stealth' ? 'rgba(52, 152, 219, 0.5)' : 'rgba(231, 76, 60, 0.5)'}`, transition: 'all 0.3s' }}
          >
            TAKE OFF
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%' }}>
          {/* ADVANCED TELEMETRY HUD */}
          <div style={{ position: 'absolute', top: '30px', left: '30px', zIndex: 5, pointerEvents: 'none', background: 'rgba(0,10,20,0.7)', padding: '25px', borderRadius: '15px', border: '2px solid #3498db', backdropFilter: 'blur(5px)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#3498db', fontSize: '1.2rem', letterSpacing: '2px' }}>FLIGHT TELEMETRY</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', width: '250px' }}>
              <span style={{ color: '#aaa', fontSize: '1.2rem' }}>THRUST</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: telemetry.thr < 30 ? '#e74c3c' : '#2ecc71' }}>{telemetry.thr} %</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', marginBottom: '20px' }}>
              <div style={{ width: `${telemetry.thr}%`, height: '100%', background: telemetry.thr < 30 ? '#e74c3c' : '#2ecc71' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#aaa', fontSize: '1.2rem' }}>AIRSPEED</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: telemetry.speed < 200 ? '#e74c3c' : 'white' }}>{telemetry.speed} KM/H</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#aaa', fontSize: '1.2rem' }}>ALTITUDE</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>{telemetry.alt} M</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #444' }}>
              <span style={{ color: '#aaa', fontSize: '1rem' }}>G-FORCE</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: telemetry.gforce > 3 ? '#e74c3c' : '#f1c40f' }}>{telemetry.gforce} G</span>
            </div>
          </div>

          {/* WARNING SYSTEM */}
          {telemetry.speed < 180 && telemetry.alt > 100 && (
            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, color: '#e74c3c', fontSize: '5rem', fontWeight: 900, textShadow: '0 0 30px red', animation: 'blink 1s infinite' }}>
              STALL WARNING
              <style>{`@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }`}</style>
            </div>
          )}

          <Canvas shadows camera={{ fov: 60, near: 1, far: 100000 }}>
            <Suspense fallback={null}>
              <FlightSimulator aircraftType={aircraftType} setTelemetry={setTelemetry} />
            </Suspense>
          </Canvas>
        </div>
      )}
    </div>
  );
}
