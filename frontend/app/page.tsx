"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import GrindLock3D from "../components/GrindLock3D";
import GrindLockHeroPanel from "../components/GrindLockHeroPanel";
import LandingWaitlistForm from "../components/LandingWaitlistForm";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
    >
      {children}
    </Link>
  );
}

function FeatureCard({ title, icon, description, delay }: { title: string; icon: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="w-12 h-12 mb-6 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-white/60 leading-relaxed text-sm">{description}</p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <main className="relative min-h-screen bg-black text-white selection:bg-purple-500/30">
      <GrindLock3D />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black tracking-tighter"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            GRINDLOCK
          </span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex items-center gap-8 px-8 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
        >
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how">Process</NavLink>
          <NavLink href="/signin">Login</NavLink>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link 
            href="/signup"
            className="px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-all transform hover:scale-105 active:scale-95"
          >
            Start Project
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-8 flex flex-col items-center justify-center min-h-screen overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="text-center lg:text-left z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                Discipline your time.<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 animate-gradient">
                  Own your future.
                </span>
              </h1>
              <p className="text-xl text-white/60 mb-10 max-w-xl leading-relaxed font-light">
                The high-performance workspace for elite students. 
                Focus with atomic precision, build unbroken streaks, and track every second of your ascent.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link 
                  href="/signup"
                  className="group relative px-10 py-5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg shadow-2xl shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 overflow-hidden"
                >
                  <span className="relative z-10">Start Tracking</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Link>
                <div className="w-full sm:w-auto">
                  <LandingWaitlistForm />
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="hidden lg:block relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30 blur-[120px] rounded-full" />
            <GrindLockHeroPanel />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">ENGINEERED FOR RESULTS</h2>
            <p className="text-white/40 text-lg">Tools that force consistency where motivation fails.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              title="Atomic Timer"
              icon="⏱️"
              description="High-precision tracking with anti-cheat detection and deep work optimization."
              delay={0.1}
            />
            <FeatureCard 
              title="Iron Strength Streaks"
              icon="🔥"
              description="Gamified consistency blocks that reward momentum and punish mediocrity."
              delay={0.2}
            />
            <FeatureCard 
              title="Deep Analytics"
              icon="📊"
              description="Visualize your study patterns and identifies exactly where your focus leaks."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <div className="text-2xl font-black mb-2 tracking-tighter">GRINDLOCK</div>
            <p className="text-white/40 text-sm italic">Discipline over motivation. Every day.</p>
          </div>
          
          <div className="flex gap-12 text-sm font-bold tracking-widest uppercase">
            <a href="https://github.com" className="hover:text-purple-400 transition-colors">GitHub</a>
            <a href="https://twitter.com" className="hover:text-blue-400 transition-colors">Twitter</a>
            <Link href="/signin" className="hover:text-white transition-colors">Account</Link>
          </div>
          
          <div className="text-white/20 text-xs">
            © 2026 GRINDLOCK. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s linear infinite;
        }
      `}</style>
    </main>
  );
}