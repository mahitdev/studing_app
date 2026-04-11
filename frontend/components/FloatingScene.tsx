"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

function FloatingBlob({ position, color, scale = 1, speed = 1 }: { position: [number, number, number]; color: string; scale?: number; speed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15 * speed;
    }
  });

  return (
    <Float speed={1.5 * speed} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={0.5}
          chromaticAberration={0.1}
          anisotropy={0.3}
          distortion={0.2}
          distortionScale={0.3}
          temporalDistortion={0.1}
          color={color}
          transmission={0.9}
          roughness={0.1}
        />
      </mesh>
    </Float>
  );
}

function GlassPanel({ position }: { position: [number, number, number] }) {
  const panelRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (panelRef.current) {
      const t = state.clock.elapsedTime;
      panelRef.current.rotation.x = Math.sin(t * 0.3) * 0.05;
      panelRef.current.rotation.y = Math.sin(t * 0.2) * 0.05;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={panelRef} position={position} rotation={[0.1, 0, 0]}>
        <mesh>
          <boxGeometry args={[3, 2, 0.1]} />
          <meshPhysicalMaterial
            color="#1a1a2e"
            transmission={0.6}
            thickness={0.5}
            roughness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            transparent
            opacity={0.8}
          />
        </mesh>
        <mesh position={[-1, 0.6, 0.06]}>
          <boxGeometry args={[0.8, 0.3, 0.02]} />
          <meshStandardMaterial color="#4f78ff" emissive="#4f78ff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-1, 0.2, 0.06]}>
          <boxGeometry args={[1.2, 0.15, 0.02]} />
          <meshStandardMaterial color="#7a63f6" emissive="#7a63f6" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.3, -0.3, 0.06]}>
          <boxGeometry args={[1.5, 0.8, 0.02]} />
          <meshStandardMaterial color="#0b0b0d" transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.3, -0.3, 0.07]}>
          <ringGeometry args={[0.3, 0.4, 32]} />
          <meshStandardMaterial color="#3ddc84" emissive="#3ddc84" emissiveIntensity={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </Float>
  );
}

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={150}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#4f78ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
      <Environment preset="night" />
      
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4f78ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7a63f6" />

      <FloatingBlob position={[-4, 2, -3]} color="#a78bfa" scale={0.8} speed={0.8} />
      <FloatingBlob position={[4, -1, -4]} color="#60a5fa" scale={1.2} speed={1.2} />
      <FloatingBlob position={[-3, -2, -5]} color="#f9a8d4" scale={0.6} speed={0.6} />
      <FloatingBlob position={[3, 2.5, -6]} color="#fde68a" scale={0.5} speed={0.9} />

      <GlassPanel position={[0, 0, 0]} />

      <Particles />
    </>
  );
}

export default function FloatingScene() {
  return (
    <div className="w-full h-[500px] md:h-[600px]">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}