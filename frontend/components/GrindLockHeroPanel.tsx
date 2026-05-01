import { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  Float, 
  MeshTransmissionMaterial, 
  PerspectiveCamera, 
  Text, 
  Environment,
  ContactShadows,
  Torus
} from "@react-three/drei";
import * as THREE from "three";

function TimerDisplay({ isPlaying, togglePlay }: { isPlaying: boolean, togglePlay: () => void }) {
  const [timeLeft, setTimeLeft] = useState(1500); // 25 mins in seconds
  
  useFrame((state, delta) => {
    if (isPlaying && timeLeft > 0) {
      setTimeLeft((prev) => Math.max(0, prev - delta * 50)); // Fast ticking for demo
    }
  });

  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = Math.floor(timeLeft % 60).toString().padStart(2, '0');

  return (
    <group position={[-0.7, 0.4, 0.1]}>
      <Text
        fontSize={0.08}
        color="#ffffff"
        fillOpacity={0.9}
        anchorX="left"
        font="https://fonts.gstatic.com/s/outfit/v11/Q_k79pU63_fa7S1chDyk.woff"
      >
        FOCUS TIMER
      </Text>
      <Text
        position={[0, -0.15, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="left"
        fontWeight="bold"
        font="https://fonts.gstatic.com/s/outfit/v11/Q_k79pU63_fa7S1chDyk.woff"
      >
        {m}:{s}
      </Text>
      <mesh position={[0.4, -0.15, -0.05]} onClick={togglePlay} onPointerOver={(e) => (document.body.style.cursor = 'pointer')} onPointerOut={(e) => (document.body.style.cursor = 'auto')}>
        <planeGeometry args={[0.9, 0.25]} />
        <meshBasicMaterial color="#4f78ff" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

function StreakIndicator() {
  return (
    <group position={[0.4, 0.4, 0.1]}>
      <Text
        fontSize={0.08}
        color="#ffffff"
        fillOpacity={0.9}
        anchorX="left"
        font="https://fonts.gstatic.com/s/outfit/v11/Q_k79pU63_fa7S1chDyk.woff"
      >
        STREAK
      </Text>
      <Text
        position={[0, -0.15, 0]}
        fontSize={0.25}
        color="#ff8a00"
        anchorX="left"
        fontWeight="bold"
        font="https://fonts.gstatic.com/s/outfit/v11/Q_k79pU63_fa7S1chDyk.woff"
      >
        12d 🔥
      </Text>
    </group>
  );
}

function ProgressRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = -state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group position={[0.6, -0.3, 0.1]}>
      <Text
        position={[0, 0, 0.05]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        85%
      </Text>
      <Torus ref={ringRef} args={[0.3, 0.03, 16, 100]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#4f78ff" emissive="#4f78ff" emissiveIntensity={2} />
      </Torus>
      <Torus args={[0.3, 0.032, 16, 100]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.1} />
      </Torus>
    </group>
  );
}

function MainPanel() {
  const group = useRef<THREE.Group>(null);
  const { mouse } = useThree();
  const [isPlaying, setIsPlaying] = useState(false);

  useFrame(() => {
    if (group.current) {
      // Mouse Parallax Tilt
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -mouse.y * 0.2, 0.1);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, mouse.x * 0.2, 0.1);
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[3, 2]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.1}
          transmission={1}
          thickness={0.5}
          color="#ffffff"
        />
      </mesh>
      
      {/* Glow Border */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[3.05, 2.05]} />
        <meshBasicMaterial color="#4f78ff" transparent opacity={0.2} />
      </mesh>

      <TimerDisplay isPlaying={isPlaying} togglePlay={() => setIsPlaying(!isPlaying)} />
      <StreakIndicator />
      <ProgressRing />
      
      <group position={[-0.7, -0.3, 0.1]}>
        <Text
          fontSize={0.08}
          color="#ffffff"
          fillOpacity={0.8}
          anchorX="left"
        >
          UPCOMING OBJECTIVE
        </Text>
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="left"
        >
          CompSci 101: Data Structures
        </Text>
      </group>
    </group>
  );
}

function roundedPlaneGeometry(args: any) {
  return <planeGeometry args={[args[0], args[1]]} />;
}

export default function GrindLockHeroPanel() {
  return (
    <div className="w-full h-[500px] lg:h-[700px] cursor-pointer">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={35} />
        <ambientLight intensity={1.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={4} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={5} color="#4f78ff" />
        <pointLight position={[5, -5, 5]} intensity={5} color="#a78bfa" />
        
        <Environment preset="city" />
        
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <MainPanel />
        </Float>
        
        <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
      </Canvas>
    </div>
  );
}

