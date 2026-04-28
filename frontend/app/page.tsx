"use client";
import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial, Text, Float, Stars, Icosahedron, useScroll as useThreeScroll } from "@react-three/drei";
import { motion as framerMotion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { motion } from "framer-motion-3d";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { Zap, Users, Activity, Shield, ArrowRight, Globe, MapPin, Award } from "lucide-react";

const MotionGroup = motion.group as any;

function Luxury3DButton({ position, label, onClick, width = 3 }: any) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  return (
    <MotionGroup 
      position={position}
      animate={{ z: clicked ? -0.4 : hovered ? 0.2 : 0, scale: hovered ? 1.05 : 1 }}
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

function DataOcean({ scrollYProgress }: { scrollYProgress: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const yOffset = useTransform(scrollYProgress, [0, 1], [0, -10]);
  
  const { geometry } = useMemo(() => {
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
        const dist = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
        let y = Math.sin(dist * 0.5 - time * 2) * 0.5;
        const dx = vertex.x - mouseX;
        const dz = vertex.z - mouseY;
        const mouseDist = Math.sqrt(dx * dx + dz * dz);
        if (mouseDist < 10) y += Math.sin(mouseDist * 2 - time * 5) * (10 - mouseDist) * 0.1;
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

function GlobalHeatmap() {
  return (
    <div className="w-full h-80 glass-card relative overflow-hidden rounded-3xl border border-white/5">
      <div className="absolute inset-0 bg-[#050505]/80 flex items-center justify-center">
        <Globe size={160} className="text-accent/10 animate-spin-slow" />
        <div className="absolute inset-0 flex items-center justify-center">
           {[...Array(12)].map((_, i) => (
             <framerMotion.div 
               key={i}
               initial={{ opacity: 0 }}
               animate={{ opacity: [0.2, 1, 0.2] }}
               transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
               className="absolute w-2 h-2 bg-accent rounded-full shadow-[0_0_10px_#00F0FF]"
               style={{ 
                 top: `${20 + Math.random() * 60}%`, 
                 left: `${20 + Math.random() * 60}%` 
               }}
             />
           ))}
        </div>
      </div>
      <div className="absolute bottom-6 left-6 text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Live Global Pulse</p>
        <p className="text-xs font-bold text-white/60">12,408 Operatives Online</p>
      </div>
    </div>
  );
}

export default function LuxuryLandingPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const scaleParallax = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <div className={`w-full min-h-screen ${darkMode ? "bg-[#050505] text-white" : "bg-gray-100 text-[#050505]"} overflow-x-hidden relative selection:bg-[#00F0FF] selection:text-[#050505] font-sans transition-colors duration-500`}>
      
      <div className="w-full h-screen relative sticky top-0 overflow-hidden">
        {/* Background Visuals */}
        <framerMotion.div style={{ scale: scaleParallax }} className="absolute inset-0">
          <img src="/study_session_bg_1777405178295.png" className="w-full h-full object-cover opacity-30 grayscale contrast-125" alt="Neural Background" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/80" />
        </framerMotion.div>

        {/* Dynamic HTML Hero Overlay */}
        <framerMotion.div style={{ opacity: opacityHero, y: yParallax }} className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
          {/* Navbar */}
          <div className="w-full p-8 md:px-16 flex justify-between items-center animate-fade-in pointer-events-auto">
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
              <button onClick={() => router.push("/signin")} className="text-xs font-black tracking-widest hover:text-accent transition-colors">LOGIN</button>
              <button onClick={() => router.push("/signup")} className="bg-accent text-black px-6 py-2 rounded-full text-xs font-black tracking-widest hover:scale-105 transition-all">INITIALIZE</button>
            </div>
          </div>

          {/* Center Hero Text */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 -mt-24">
            <framerMotion.div className="space-y-6 max-w-4xl">
              <div className="inline-block border border-accent/40 bg-accent/5 backdrop-blur-md px-6 py-2 rounded-full mb-4">
                <span className="text-[#00F0FF] text-[10px] font-black tracking-[0.4em] uppercase">Neural Performance Infrastructure</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] filter drop-shadow-2xl">
                Master Your Focus.<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/50 to-accent">Hack Your Potential.</span>
              </h2>
              <p className="text-white/40 tracking-[0.2em] uppercase text-xs md:text-sm font-bold max-w-2xl mx-auto leading-relaxed mt-8">
                A high-fidelity productivity architecture designed for absolute discipline. Permanent neural rewiring via synchronized collaborative deep-work.
              </p>
            </framerMotion.div>
          </div>

          {/* Bottom Indicators */}
          <div className="w-full p-8 md:px-16 flex justify-center pb-12 animate-bounce">
            <div className="w-1 h-12 rounded-full bg-gradient-to-b from-accent to-transparent opacity-50" />
          </div>
        </framerMotion.div>

        {/* 3D Core */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
           <Canvas camera={{ position: [0, 1, 10], fov: 45 }}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} color="#00F0FF" />
            <DataOcean scrollYProgress={scrollYProgress} />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            <MasterAIAgent />
          </Canvas>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="relative z-20 bg-[#050505] pt-32 pb-60 space-y-60">
        
        {/* Collaborative Feature Grid */}
        <section className="container mx-auto px-8">
          <div className="text-center mb-32">
             <h3 className="text-xs font-black tracking-[0.5em] text-accent uppercase mb-4">Core Protocols</h3>
             <h4 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Collaborative Infrastructure</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[
              { title: 'Apex Arena', icon: <Award className="text-accent" />, desc: 'One-on-one study duels with real-time XP stakes and leaderboard ascension.' },
              { title: 'Neural Chambers', icon: <Users className="text-accent" />, desc: 'Synchronized study clusters with shared notes and group ambient syncing.' },
              { title: 'AI Strategist', icon: <Activity className="text-accent" />, desc: 'Neural-linked coaching that detects cognitive fatigue and optimizes intervals.' },
              { title: 'Global Sync', icon: <Globe className="text-accent" />, desc: 'Ultra-low latency progress broadcasting across the global neural grid.' },
              { title: 'Anti-Cheat', icon: <Shield className="text-accent" />, desc: 'Advanced biometric-ready focus validation to ensure absolute integrity.' },
              { title: 'XP Betting', icon: <Zap className="text-accent" />, desc: 'High-stakes gamification. Risk your reputation on collective victory.' },
            ].map((f, i) => (
              <framerMotion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-10 glass-card hover:bg-white/5 transition-all cursor-pointer border border-white/5 hover:border-accent/30"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-accent/20 transition-all">
                  {f.icon}
                </div>
                <h4 className="text-2xl font-black uppercase mb-4">{f.title}</h4>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                <ArrowRight className="mt-8 text-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" size={20} />
              </framerMotion.div>
            ))}
          </div>
        </section>

        {/* Real-time Heatmap Section */}
        <section className="container mx-auto px-8 text-center space-y-16">
           <div className="max-w-4xl mx-auto space-y-8">
              <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">The Neural Grid is Live</h3>
              <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Real-time operative density across 142 sectors.</p>
           </div>
           <GlobalHeatmap />
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-8 py-40 bg-accent/5 rounded-[4rem] border border-accent/10 relative overflow-hidden text-center">
           <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/40 via-transparent to-transparent" />
           </div>
           <h3 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-12">Rewrite Your Discipline.</h3>
           <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
              <button onClick={() => router.push("/signup")} className="px-12 py-6 bg-accent text-black text-lg font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(0,240,255,0.3)]">INITIALIZE SESSION</button>
              <button onClick={() => router.push("/signin")} className="px-12 py-6 glass text-lg font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 transition-all">ACCESS DATA CORE</button>
           </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-[#050505] border-t border-white/5 py-24">
        <div className="container mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
           <div className="col-span-2">
              <h2 className="text-3xl font-black tracking-widest uppercase mb-8">GrindLock<span className="text-accent">.</span></h2>
              <p className="text-sm text-white/40 max-w-sm leading-relaxed font-bold uppercase tracking-wider">The premier operating system for extreme focus. Built by operatives, for operatives. Absolute efficiency is the only standard.</p>
           </div>
           <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-6">Protocols</h5>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-white/60">
                 <li className="hover:text-accent transition-colors cursor-pointer">Deep Work</li>
                 <li className="hover:text-accent transition-colors cursor-pointer">Neural Link</li>
                 <li className="hover:text-accent transition-colors cursor-pointer">Apex Arena</li>
              </ul>
           </div>
           <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-6">Liaison</h5>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-white/60">
                 <li className="hover:text-accent transition-colors cursor-pointer">Support</li>
                 <li className="hover:text-accent transition-colors cursor-pointer">Terms</li>
                 <li className="hover:text-accent transition-colors cursor-pointer">Privacy</li>
              </ul>
           </div>
        </div>
        <div className="container mx-auto px-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
           <p>© 2026 GRINDLOCK NEURAL INFRASTRUCTURE</p>
           <p className="mt-4 md:mt-0">SECURE TRANSMISSION ENCRYPTED</p>
        </div>
      </footer>

    </div>
  );
}