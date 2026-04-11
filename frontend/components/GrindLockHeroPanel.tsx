"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";

function Card({ position, title, value, color }: any) {
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[0.8, 0.5]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={0.1}
          chromaticAberration={0.05}
          anisotropy={0.1}
          distortion={0.1}
          color="#ffffff"
          transmission={0.95}
          roughness={0.1}
          transparent
          opacity={0.4}
        />
      </mesh>
      <Text
        position={[-0.3, 0.1, 0.01]}
        fontSize={0.06}
        color="#ffffff"
        anchorX="left"
        font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
      >
        {title}
      </Text>
      <Text
        position={[-0.3, -0.05, 0.01]}
        fontSize={0.12}
        color={color}
        anchorX="left"
        fontWeight="bold"
        font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
      >
        {value}
      </Text>
    </group>
  );
}

function MainDashboard() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.getElapsedTime();
      group.current.rotation.x = Math.sin(t * 0.5) * 0.1;
      group.current.rotation.y = Math.cos(t * 0.3) * 0.1;
    }
  });

  return (
    <group ref={group}>
      {/* Main Glass Panel */}
      <mesh>
        <planeGeometry args={[3, 2]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          thickness={0.2}
          chromaticAberration={0.1}
          anisotropy={0.2}
          distortion={0.1}
          distortionScale={0.2}
          temporalDistortion={0.1}
          color="#ffffff"
          transmission={0.9}
          roughness={0.05}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Header Simulation */}
      <Text
        position={[-1.3, 0.8, 0.05]}
        fontSize={0.1}
        color="#ffffff"
        anchorX="left"
        font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
      >
        Dashboard Preview
      </Text>
      
      {/* Cards simulation */}
      <Card position={[-0.9, 0.2, 0.1]} title="Daily Focus" value="4h 20m" color="#7B61FF" />
      <Card position={[0.1, 0.2, 0.1]} title="Current Streak" value="12 Days" color="#00D4FF" />
      <Card position={[-0.9, -0.5, 0.1]} title="Productivity" value="94%" color="#3ddc84" />
      <Card position={[0.1, -0.5, 0.1]} title="Tasks Done" value="8/10" color="#FFD700" />
      
      {/* Decorative lines/UI elements */}
      <mesh position={[0, 0.7, 0.02]}>
        <planeGeometry args={[2.8, 0.01]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

export default function GrindLockHeroPanel() {
  return (
    <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] cursor-grab active:cursor-grabbing">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7B61FF" />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <MainDashboard />
        </Float>
      </Canvas>
    </div>
  );
}
