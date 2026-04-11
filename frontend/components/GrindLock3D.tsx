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
      <Sphere ref={mesh} position={position} args={[radius, 64, 64]}>
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
      <Sphere ref={mesh} position={position} args={[radius, 64, 64]}>
        <MeshTransmissionMaterial
          backside
          samples={16}
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

function Rig() {
  const { camera, mouse } = useThree();
  const vec = new THREE.Vector3();

  return useFrame(() => {
    camera.position.lerp(vec.set(mouse.x * 2, mouse.y * 2, 10), 0.05);
    camera.lookAt(0, 0, 0);
  });
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={6} color="#7B61FF" />
      <pointLight position={[-10, -10, -10]} intensity={4} color="#00D4FF" />
      <spotLight position={[0, 10, 0]} intensity={5} color="#ffffff" angle={0.5} penumbra={1} />
      
      {/* Background Layer */}
      <AnimatedBlob position={[-6, 4, -10]} speed={0.5} color="#2d1b69" distort={0.2} radius={3} factor={0.5} />
      <AnimatedBlob position={[8, -6, -12]} speed={0.4} color="#0a2a4a" distort={0.1} radius={4} factor={0.3} />
      
      {/* Midground Layer */}
      <AnimatedBlob position={[4, 2, -5]} speed={1} color="#7B61FF" distort={0.4} radius={1.5} factor={1} />
      <AnimatedBlob position={[-5, -3, -5]} speed={1.2} color="#00D4FF" distort={0.3} radius={1.2} factor={1.2} />
      
      {/* Foreground Glass Layer */}
      <GlassSphere position={[2, -1, 2]} radius={0.5} factor={2} />
      <GlassSphere position={[-3, 2, 3]} radius={0.3} factor={2.5} />
      
      {/* Futuristic Grid */}
      <Grid
        infiniteGrid
        fadeDistance={50}
        fadeStrength={5}
        cellSize={0.5}
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#ffffff"
        cellColor="#ffffff"
        cellThickness={0.5}
        position={[0, -2, 0]}
        rotation={[Math.PI / 2.5, 0, 0]}
      />
      
      <Rig />
    </>
  );
}

export default function GrindLock3D() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#000000]">
      <div className="absolute inset-0 bg-mesh opacity-50" />
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(123,97,255,0.1),transparent_80%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#000000] to-transparent" />
    </div>
  );
}

