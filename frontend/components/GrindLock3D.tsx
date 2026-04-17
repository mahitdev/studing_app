"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, PerspectiveCamera, MeshTransmissionMaterial, Grid } from "@react-three/drei";
import { useRef, useMemo, useState } from "react";
import * as THREE from "three";

function AnimatedBlob({ position, speed, color, distort, radius, factor = 1 }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.getElapsedTime() * speed * 0.05;
      mesh.current.rotation.y = state.clock.getElapsedTime() * speed * 0.08;
      
      // Reactive to mouse
      const targetX = state.mouse.x * factor;
      const targetY = state.mouse.y * factor;
      mesh.current.position.x += (targetX + position[0] - mesh.current.position.x) * 0.02;
      mesh.current.position.y += (targetY + position[1] - mesh.current.position.y) * 0.02;
    }
  });

  return (
    <Float speed={speed * 2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={mesh} position={position} args={[radius, 32, 32]}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={speed}
          roughness={0.1}
          metalness={0.9}
        />
      </Sphere>
    </Float>
  );
}

function GlassSphere({ position, radius, factor = 1.2 }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current) {
      const targetX = state.mouse.x * factor;
      const targetY = state.mouse.y * factor;
      mesh.current.position.x += (targetX + position[0] - mesh.current.position.x) * 0.05;
      mesh.current.position.y += (targetY + position[1] - mesh.current.position.y) * 0.05;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={mesh} position={position} args={[radius, 32, 32]}>
        <MeshTransmissionMaterial
          backside
          samples={6}
          thickness={0.2}
          chromaticAberration={0.1}
          anisotropy={0.1}
          distortion={0.1}
          color="#ffffff"
          transmission={1}
          roughness={0.05}
        />
      </Sphere>
    </Float>
  );
}

function StarField({ count = 200 }: { count?: number }) {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 30;
      p[i * 3 + 1] = (Math.random() - 0.5) * 30;
      p[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return p;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      ref.current.rotation.x = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={points} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function Rig() {
  const { camera, mouse } = useThree();
  const vec = new THREE.Vector3();

  useFrame(() => {
    camera.position.lerp(vec.set(mouse.x * 2, mouse.y * 2, 10), 0.05);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={25} color="#7B61FF" />
      <pointLight position={[-10, -10, -10]} intensity={15} color="#00D4FF" />
      
      <StarField count={400} />
      
      {/* Background Layer */}
      <AnimatedBlob position={[-6, 4, -10]} speed={0.5} color="#150a33" distort={0.2} radius={3} factor={0.5} />
      <AnimatedBlob position={[8, -6, -12]} speed={0.4} color="#051020" distort={0.1} radius={4} factor={0.3} />
      
      {/* Midground Layer - Optimized */}
      <AnimatedBlob position={[4, 2, -5]} speed={1} color="#3e63dd" distort={0.3} radius={1.2} factor={1} />
      <AnimatedBlob position={[-5, -3, -5]} speed={0.8} color="#8e4ec6" distort={0.2} radius={1.5} factor={1.2} />
      
      {/* Futuristic Grid - Refined */}
      <Grid
        infiniteGrid
        fadeDistance={40}
        fadeStrength={8}
        cellSize={1}
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#3e63dd"
        cellColor="#ffffff"
        cellThickness={0.5}
        position={[0, -4, 0]}
        rotation={[Math.PI / 2.2, 0, 0]}
      />
      
      <Rig />
    </>
  );
}

export default function GrindLock3D() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#000000]">
      <div className="absolute inset-0 bg-mesh opacity-50" />
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, alpha: true }}>
        <Scene />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(123,97,255,0.1),transparent_80%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#000000] to-transparent" />
    </div>
  );
}

