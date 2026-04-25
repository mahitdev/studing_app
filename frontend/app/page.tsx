"use client";
import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial, Text, Float, Stars, Icosahedron } from "@react-three/drei";
import { motion as framerMotion } from "framer-motion";
import { motion } from "framer-motion-3d";
import * as THREE from "three";
import { useRouter } from "next/navigation";

const MotionGroup = motion.group as any;

function Luxury3DButton({ position, label, onClick, width = 3 }: any) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  return (
    <MotionGroup 
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
          backside={false}
          resolution={256}
          samples={2}
          thickness={1.5}
          roughness={0.2}
          transmission={0.9}
          ior={1.5}
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
    </MotionGroup>
  );
}

function DataOcean() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { geometry } = useMemo(() => {
    // Highly optimized vertex count to brutally eliminate lag (was 100x100 -> dropped to 40x40)
    const geo = new THREE.PlaneGeometry(100, 100, 40, 40);
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
      <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.1} />
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
    <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-[#00F0FF] selection:text-[#050505] font-sans">
      {/* Dynamic HTML Hero Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        
        {/* Navbar */}
        <div className="w-full p-8 md:px-16 flex justify-between items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase flex items-center gap-2">
            GrindLock<span className="text-[#00F0FF] animate-pulse shadow-[0_0_10px_#00F0FF]">.</span>
          </h1>
          <div className="hidden md:flex items-center gap-6">
            <span className="text-xs font-bold text-white/50 tracking-widest uppercase">V 1.0.0</span>
            <p className="text-[#1A1A1A] font-black uppercase tracking-[0.3em] bg-[#00F0FF] px-4 py-1.5 text-[10px] rounded-full shadow-[0_0_15px_rgba(0,240,255,0.4)]">System Active</p>
          </div>
        </div>

        {/* Center Hero Text */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 -mt-24 pointer-events-none">
          <framerMotion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="space-y-6 max-w-4xl"
          >
            <div className="inline-block border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full mb-4">
              <span className="text-[#00F0FF] text-[10px] font-bold tracking-[0.2em] uppercase">The Ultimate Productivity OS</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9]">
              Master Your Focus.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-[#00F0FF]">Hack Your Potential.</span>
            </h2>
            <p className="text-white/50 tracking-widest uppercase text-xs md:text-sm font-medium max-w-2xl mx-auto leading-relaxed">
              A premium, neural-inspired operating system designed for extreme discipline. Enter the simulation and permanently rewire your work ethic.
            </p>
          </framerMotion.div>
        </div>

        {/* Bottom Feature Bar */}
        <div className="w-full p-8 md:px-16 flex flex-col md:flex-row justify-between items-end gap-6 animate-fade-in" style={{ animationDelay: '1s' }}>
          <div className="flex gap-4">
            <div className="glass-light p-4 rounded-xl border-l-2 border-[#00F0FF] max-w-[200px]">
              <h4 className="text-white font-bold text-[10px] tracking-widest uppercase mb-1">Deep Work Mechanics</h4>
              <p className="text-white/40 text-[10px] leading-relaxed">Mongoose-backed session tracking with anti-cheat protocols.</p>
            </div>
            <div className="glass-light p-4 rounded-xl border-l-2 border-white/20 max-w-[200px] hidden sm:block">
              <h4 className="text-white font-bold text-[10px] tracking-widest uppercase mb-1">Neural Analytics</h4>
              <p className="text-white/40 text-[10px] leading-relaxed">Python-powered machine learning performance projections.</p>
            </div>
          </div>
          <p className="text-white/30 text-[10px] tracking-[0.2em] uppercase font-bold text-right">
            Scroll down to interact with the 3D interface
          </p>
        </div>

      </div>

      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 1, 10], fov: 45 }}>
        <color attach="background" args={["#050505"]} />
        <Environment preset="city" />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#00F0FF" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
        
        <DataOcean />
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <MasterAIAgent />

        {/* Spatial Navigation Panels */}
        <MotionGroup 
          initial={{ y: -10, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", type: "spring", stiffness: 50, damping: 20, delay: 1 }}
          position={[0, -4.5, 0]}
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
        </MotionGroup>
      </Canvas>
    </div>
  );
}