"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, PerspectiveCamera } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function AnimatedBlob({ position, speed, color, distort, radius }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.getElapsedTime() * speed * 0.1;
      mesh.current.rotation.y = state.clock.getElapsedTime() * speed * 0.15;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={mesh} position={position} args={[radius, 32, 32]}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={speed}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

function Scene() {
  const mouse = useRef([0, 0]);

  useFrame((state) => {
    state.camera.position.x += (state.mouse.x * 2 - state.camera.position.x) * 0.05;
    state.camera.position.y += (state.mouse.y * 2 - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#7B61FF" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00D4FF" />
      
      <AnimatedBlob position={[-4, 2, -2]} speed={2} color="#7B61FF" distort={0.4} radius={1.2} />
      <AnimatedBlob position={[4, -2, -5]} speed={1.5} color="#00D4FF" distort={0.3} radius={0.8} />
      <AnimatedBlob position={[0, 0, -10]} speed={1} color="#6d60ef" distort={0.2} radius={2} />
    </>
  );
}

export default function GrindLock3D() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0a0a0a]">
      <Canvas dpr={[1, 2]}>
        <Scene />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(123,97,255,0.05),transparent_70%)]" />
    </div>
  );
}
