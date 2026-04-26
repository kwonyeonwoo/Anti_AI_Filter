import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, useGLTF, Stars, Cloud, PerspectiveCamera, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// --- Realistic Airplane ---
const Airplane = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF('/airplane.glb');
  return <primitive object={scene} scale={scale} rotation={[0, Math.PI, 0]} castShadow receiveShadow />;
};

// --- Realistic Terrain: Mountain & City ---
const Terrain = () => {
  const landmarks = useMemo(() => {
    const items = [];
    for (let i = 0; i < 150; i++) {
      const isMountain = Math.random() > 0.4;
      const x = (Math.random() - 0.5) * 30000;
      const z = (Math.random() - 0.5) * 30000;
      const height = isMountain ? 600 + Math.random() * 1000 : 200 + Math.random() * 400;
      const width = isMountain ? 800 + Math.random() * 1000 : 80 + Math.random() * 100;
      items.push({ id: i, pos: [x, height / 2 - 5, z] as [number, number, number], args: [width, height, isMountain ? 4 : width] as [number, number, number], type: isMountain ? 'm' : 'b' });
    }
    return items;
  }, []);

  return (
    <group>
      {landmarks.map((lm) => (
        <mesh key={lm.id} position={lm.pos} castShadow receiveShadow>
          {lm.type === 'm' ? (
            <coneGeometry args={[lm.args[0], lm.args[1], 4]} />
          ) : (
            <boxGeometry args={[lm.args[0], lm.args[1], lm.args[0]]} />
          )}
          <meshStandardMaterial 
            color={lm.type === 'm' ? '#2d251a' : '#1e272e'} 
            roughness={lm.type === 'm' ? 1 : 0.2}
            metalness={lm.type === 'm' ? 0 : 0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- Simulation Logic ---
const Simulator = () => {
  const { camera } = useThree();
  const airplaneRef = useRef<THREE.Group>(null);
  
  const planePos = useRef(new THREE.Vector3(0, 1200, 0)); // 시작 고도 1200m
  const planeQuat = useRef(new THREE.Quaternion());
  const velocity = useRef(300);
  const rotationVel = useRef(new THREE.Vector3(0, 0, 0));
  
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    camera.position.set(0, 1210, 100);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [camera]);

  const cameraLookAtTarget = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // 1. Controls (S: Up, W: Down)
    const targetPitch = keys.current['s'] ? 1.6 : (keys.current['w'] ? -1.6 : 0);
    const targetRoll = keys.current['a'] ? 2.5 : (keys.current['d'] ? -2.5 : 0);

    rotationVel.current.x = THREE.MathUtils.lerp(rotationVel.current.x, targetPitch, 0.03);
    rotationVel.current.z = THREE.MathUtils.lerp(rotationVel.current.z, targetRoll, 0.03);

    // 2. Physics & Banking
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationVel.current.x * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationVel.current.z * delta);
    planeQuat.current.multiply(pitchQuat).multiply(rollQuat).normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat.current);
    const vIncline = forward.dot(new THREE.Vector3(0, 1, 0));
    
    // Speed Energy Conversion
    velocity.current = THREE.MathUtils.clamp(velocity.current - vIncline * 150 * delta, 150, 700);

    planePos.current.add(forward.multiplyScalar(velocity.current * delta));
    if (planePos.current.y < 15) planePos.current.y = 15;

    // 3. Sync & Dynamic FOV
    if (airplaneRef.current) {
      airplaneRef.current.position.copy(planePos.current);
      airplaneRef.current.quaternion.copy(planeQuat.current);
    }

    const speedFactor = (velocity.current - 150) / 550;
    (camera as THREE.PerspectiveCamera).fov = 60 + speedFactor * 30; // 속도에 따라 FOV 확장
    camera.updateProjectionMatrix();

    const camOffset = new THREE.Vector3(0, 15, 60 + speedFactor * 20).applyQuaternion(planeQuat.current);
    camera.position.lerp(planePos.current.clone().add(camOffset), 0.1);
    
    cameraLookAtTarget.current.lerp(planePos.current.clone().add(new THREE.Vector3(0, 0, -150).applyQuaternion(planeQuat.current)), 0.1);
    camera.lookAt(cameraLookAtTarget.current);
    camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat.current));
  });

  return (
    <>
      <group ref={airplaneRef}>
        <Suspense fallback={<mesh><boxGeometry args={[20, 5, 40]} /><meshStandardMaterial color="white" wireframe /></mesh>}>
          <Airplane scale={0.3} /> {/* 비행기 크기를 대폭 키움 */}
        </Suspense>
      </group>

      <Terrain />
      
      {/* 바다 */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -10, 0]} receiveShadow>
        <planeGeometry args={[100000, 100000]} />
        <meshStandardMaterial color="#0a3d62" metalness={0.9} roughness={0.1} />
      </mesh>

      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={2} />
      <Stars radius={500} count={10000} factor={8} />
      
      {/* 볼륨감 있는 구름 층 */}
      <Float speed={1} floatIntensity={10}>
        {useMemo(() => [...Array(25)].map((_, i) => (
          <Cloud 
            key={i} 
            position={[(Math.random()-0.5)*15000, 1500 + Math.random()*500, (Math.random()-0.5)*15000]} 
            opacity={0.3}
            width={500}
            depth={200}
            segments={20}
          />
        )), [])}
      </Float>

      <Environment preset="night" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[100, 500, 100]} intensity={2} castShadow />
      <fog attach="fog" args={['#2c3e50', 2000, 40000]} />
    </>
  );
};

// --- Main App ---
export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', color: 'white', fontFamily: 'Impact, sans-serif' }}>
      {!started ? (
        <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #2c3e50 0%, #000 100%)' }}>
          <h1 style={{ fontSize: '8rem', fontStyle: 'italic', color: '#3498db', margin: 0, textShadow: '0 0 50px rgba(52,152,219,0.5)' }}>SKY ACE PRO</h1>
          <p style={{ letterSpacing: '15px', marginBottom: '50px', fontSize: '1.5rem', opacity: 0.8 }}>ULTRA REALISTIC FLIGHT SIM</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px', textAlign: 'left' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', borderLeft: '10px solid #3498db' }}>
              <h3>CONTROLS</h3>
              <p><b>S</b> : PULL UP (상승)</p>
              <p><b>W</b> : PUSH DOWN (하강)</p>
              <p><b>A / D</b> : ROLL (회전)</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', borderLeft: '10px solid #2ecc71' }}>
              <h3>PHYSICS</h3>
              <p>• High-Altitude Aerodynamics</p>
              <p>• Speed / FOV Synchronization</p>
              <p>• Advanced Cloud Systems</p>
            </div>
          </div>
          <button 
            onClick={() => setStarted(true)} 
            style={{ padding: '1.5rem 8rem', fontSize: '2.5rem', cursor: 'pointer', border: '4px solid #3498db', background: 'transparent', color: 'white', fontWeight: 900, borderRadius: '60px', transition: 'all 0.3s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3498db'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            ENGAGE TURBINES
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', top: '50px', left: '50px', zIndex: 5, pointerEvents: 'none' }}>
            <h2 style={{ margin: 0, color: '#3498db', fontSize: '1.5rem', letterSpacing: '2px' }}>FLIGHT TELEMETRY: ACTIVE</h2>
            <div style={{ width: '300px', height: '2px', background: '#3498db', marginTop: '10px' }} />
          </div>
          <Canvas shadows>
            <Simulator />
          </Canvas>
        </div>
      )}
    </div>
  );
}
