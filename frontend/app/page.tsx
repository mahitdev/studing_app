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
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={`w-full min-h-screen ${darkMode ? "bg-[#050505] text-white" : "bg-gray-100 text-[#050505]"} overflow-y-auto relative selection:bg-[#00F0FF] selection:text-[#050505] font-sans transition-colors duration-500`}>
      
      <div className="w-full h-screen relative">
        {/* Dynamic HTML Hero Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
          
          {/* Navbar */}
          <div className="w-full p-8 md:px-16 flex justify-between items-center animate-fade-in pointer-events-auto" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-2xl md:text-3xl font-black tracking-widest uppercase flex items-center gap-2">
              GrindLock<span className="text-[#00F0FF] animate-pulse shadow-[0_0_10px_#00F0FF]">.</span>
            </h1>
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold hover:bg-white/10 transition-all"
              >
                {darkMode ? "LIGHT MODE" : "DARK MODE"}
              </button>
              <span className="text-xs font-bold tracking-widest uppercase opacity-50">V 1.0.0</span>
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
              <div className="inline-block border border-current opacity-70 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full mb-4">
                <span className="text-[#00F0FF] text-[10px] font-bold tracking-[0.2em] uppercase">The Ultimate Productivity OS</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">
                Master Your Focus.<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#888888] via-[#aaaaaa] to-[#00F0FF]">Hack Your Potential.</span>
              </h2>
              <p className="opacity-50 tracking-widest uppercase text-xs md:text-sm font-medium max-w-2xl mx-auto leading-relaxed">
                A premium, neural-inspired operating system designed for extreme discipline. Enter the simulation and permanently rewire your work ethic.
              </p>
            </framerMotion.div>
          </div>

          {/* Bottom Feature Bar */}
          <div className="w-full p-8 md:px-16 flex flex-col md:flex-row justify-between items-end gap-6 animate-fade-in pointer-events-auto" style={{ animationDelay: '1s' }}>
            <div className="flex gap-4">
              <div className="glass-light p-4 rounded-xl border-l-2 border-[#00F0FF] max-w-[200px]">
                <h4 className="font-bold text-[10px] tracking-widest uppercase mb-1">Deep Work Mechanics</h4>
                <p className="opacity-40 text-[10px] leading-relaxed">Mongoose-backed session tracking with anti-cheat protocols.</p>
              </div>
              <div className="glass-light p-4 rounded-xl border-l-2 border-white/20 max-w-[200px] hidden sm:block">
                <h4 className="font-bold text-[10px] tracking-widest uppercase mb-1">Neural Analytics</h4>
                <p className="opacity-40 text-[10px] leading-relaxed">Python-powered machine learning performance projections.</p>
              </div>
            </div>
            <p className="opacity-30 text-[10px] tracking-[0.2em] uppercase font-bold text-right animate-bounce">
              Scroll down to explore features ↓
            </p>
          </div>
        </div>

        {/* 3D Scene */}
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 1, 10], fov: 45 }}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} color="#00F0FF" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
            
            <DataOcean />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            <MasterAIAgent />

            <MotionGroup 
              initial={{ y: -10, opacity: 0, scale: 0.6 }}
              animate={{ y: -3.2, opacity: 1, scale: 0.8 }}
              transition={{ duration: 1.5, ease: "easeOut", type: "spring", stiffness: 50, damping: 20, delay: 1 }}
              position={[0, -3.2, 0]}
            >
              <Luxury3DButton position={[-3.5, 0, 0]} label="SIGN IN" onClick={() => router.push("/signin")} width={2.8} />
              <Luxury3DButton position={[0, 0, 0]} label="INITIALIZE" onClick={() => router.push("/signup")} width={4} />
              <Luxury3DButton position={[3.5, 0, 0]} label="DATA CORE" onClick={() => router.push("/dashboard")} width={2.8} />
            </MotionGroup>
          </Canvas>
        </div>
      </div>

      {/* Scrolling Content Below Hero */}
      <div className="relative z-20 container mx-auto px-8 py-20 space-y-32 pointer-events-auto">
        
        {/* Animated Feature Highlights */}
        <section>
          <framerMotion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-black uppercase tracking-widest text-center mb-16"
          >
            Live Environment Sync
          </framerMotion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['Global Duels', 'AI Neural Coach', 'Real-time Squads'].map((f, i) => (
              <framerMotion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 border border-current rounded-3xl bg-current/5 hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/5 transition-all shadow-[0_0_0_rgba(0,240,255,0)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
              >
                <div className="w-12 h-12 bg-[#00F0FF]/20 rounded-full mb-6 flex items-center justify-center text-[#00F0FF] font-black">{i + 1}</div>
                <h4 className="text-xl font-bold uppercase mb-2">{f}</h4>
                <p className="text-sm opacity-60">Synchronize your focus state with operatives worldwide using ultra-low latency websockets.</p>
              </framerMotion.div>
            ))}
          </div>
        </section>

        {/* Social Proof Carousel */}
        <section className="text-center">
          <h3 className="text-xl font-black uppercase tracking-widest mb-8 opacity-50">Join <span className="text-[#00F0FF] animate-pulse">12,408</span> Active Grinders</h3>
          <div className="flex gap-4 overflow-x-auto pb-8 snap-x scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="shrink-0 w-80 p-6 border border-current rounded-2xl bg-current/5 snap-center text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20" />
                  <div>
                    <p className="font-bold text-sm">Operative_0{i}</p>
                    <p className="text-[10px] text-[#00F0FF] uppercase tracking-widest">Level 42</p>
                  </div>
                </div>
                <p className="text-sm opacity-80 italic">"The AI Neural Coach instantly detected my burnout and forced a pause. Unbelievable system."</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-black uppercase tracking-widest text-center mb-12">Protocol FAQ</h3>
          <div className="space-y-4">
            {['Is the Neural Coach free?', 'How do Study Duels work?', 'Can I sync with wearable biometrics?'].map((q, i) => (
              <details key={i} className="group border border-current/20 rounded-xl bg-current/5 open:bg-current/10 transition-all cursor-pointer">
                <summary className="p-6 font-bold uppercase tracking-wider flex justify-between items-center list-none">
                  {q}
                  <span className="text-[#00F0FF] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="p-6 pt-0 opacity-70 text-sm">
                  Our documentation indicates full functionality across the OS. The AI coach utilizes live session metrics to intervene before neural strain reaches critical levels.
                </div>
              </details>
            ))}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-current/10 py-12 text-center text-xs font-bold uppercase tracking-widest opacity-50 relative overflow-hidden">
        <div className="flex justify-center items-center gap-12 mb-6">
          <div className="flex flex-col items-center">
            <span className="text-2xl text-[#00F0FF]">1.4M</span>
            <span>Focus Hours</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl text-[#00F0FF]">98%</span>
            <span>Uptime</span>
          </div>
        </div>
        <p>GrindLock OS © 2026</p>
      </footer>

    </div>
  );
}