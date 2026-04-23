"use client";
import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial, Text, Float, Stars, Icosahedron } from "@react-three/drei";
import { motion } from "framer-motion-3d";
import * as THREE from "three";
import { useRouter } from "next/navigation";

function Luxury3DButton({ position, label, onClick, width = 3 }: any) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  return (
    <motion.group 
      position={position}
      animate={{ z: clicked ? -0.4 : hovered ? 0.2 : 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <mesh 
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => { setHovered(false); setClicked(false); }}
        onPointerDown={() => setClicked(true)}
        onPointerUp={() => { setClicked(false); if(hovered) onClick(); }}
      >
        <boxGeometry args={[width, 1.2, 0.4]} />
        <MeshTransmissionMaterial 
          backside
          samples={4}
          thickness={1.5}
          roughness={0.1}
          transmission={0.95}
          ior={1.5}
          chromaticAberration={0.05}
          color={hovered ? "#00F0FF" : "#1A1A1A"}
        />
      </mesh>
      <Text 
        position={[0, 0, 0.21]} 
        fontSize={0.3} 
        color={hovered ? "#00F0FF" : "white"} 
        anchorX="center" 
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {label}
      </Text>
    </motion.group>
  );
}

function DataOcean() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { geometry } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 100, 100, 100);
    geo.rotateX(-Math.PI / 2);
    return { geometry: geo };
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const positionAttribute = meshRef.current.geometry.attributes.position;
      const vertex = new THREE.Vector3();
      const time = state.clock.getElapsedTime();
      
      const mouseX = (state.pointer.x * 10);
      const mouseY = (state.pointer.y * 10);

      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Base ripple
        const dist = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
        let y = Math.sin(dist * 0.5 - time * 2) * 0.5;
        
        // Mouse ripple interaction
        const dx = vertex.x - mouseX;
        const dz = vertex.z - mouseY; // using mouseY for Z axis translation
        const mouseDist = Math.sqrt(dx * dx + dz * dz);
        
        if (mouseDist < 10) {
          y += Math.sin(mouseDist * 2 - time * 5) * (10 - mouseDist) * 0.1;
        }

        positionAttribute.setY(i, y);
      }
      positionAttribute.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -6, -20]}>
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.15} />
    </mesh>
  );
}

function MasterAIAgent() {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.005;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <Float speed={2} floatIntensity={1} floatingRange={[-0.3, 0.3]}>
      <group ref={ref} position={[0, 1.5, -2]}>
        <Icosahedron args={[2, 0]}>
          <meshStandardMaterial color="#050505" roughness={0.5} metalness={0.8} />
        </Icosahedron>
        <Icosahedron args={[2.02, 0]}>
          <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.5} />
        </Icosahedron>
        <pointLight color="#00F0FF" intensity={20} distance={10} />
      </group>
    </Float>
  );
}

export default function LuxuryLandingPage() {
  const router = useRouter();

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-[#00F0FF] selection:text-[#050505]">
      {/* HTML Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 md:px-16 z-10 pointer-events-none flex justify-between items-center">
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-widest uppercase flex items-center gap-2">
          GrindLock<span className="text-[#00F0FF] animate-pulse">.</span>
        </h1>
        <p className="hidden md:block text-[#1A1A1A] font-black uppercase tracking-[0.3em] bg-[#00F0FF] px-4 py-1 text-xs rounded-full">System Active</p>
      </div>
      
      <div className="absolute bottom-10 left-0 w-full z-10 pointer-events-none flex justify-center text-center px-4">
        <p className="text-white/40 tracking-widest uppercase text-xs font-bold max-w-xl">
          The high-end productivity engine for those who refuse to settle.
        </p>
      </div>

      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 1, 10], fov: 45 }}>
        <color attach="background" args={["#050505"]} />
        <Environment preset="city" />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#00F0FF" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
        
        <DataOcean />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <MasterAIAgent />

        {/* Spatial Navigation Panels */}
        <motion.group 
          initial={{ y: -10, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", type: "spring", stiffness: 50, damping: 20 }}
          position={[0, -2.5, 0]}
        >
          <Luxury3DButton 
            position={[-3.5, 0, 0]} 
            label="SIGN IN" 
            onClick={() => router.push("/signin")}
            width={2.8}
          />
          <Luxury3DButton 
            position={[0, 0, 0]} 
            label="INITIALIZE" 
            onClick={() => router.push("/signup")}
            width={4}
          />
          <Luxury3DButton 
            position={[3.5, 0, 0]} 
            label="DATA CORE" 
            onClick={() => router.push("/dashboard")}
            width={2.8}
          />
        </motion.group>
      </Canvas>
    </div>
  );
}