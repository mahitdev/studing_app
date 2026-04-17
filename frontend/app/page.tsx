"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion";
import GrindLock3D from "../components/GrindLock3D";
import GrindLockHeroPanel from "../components/GrindLockHeroPanel";
import LandingWaitlistForm from "../components/LandingWaitlistForm";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="text-xs font-bold uppercase tracking-widest text-white hover:text-white transition-colors duration-300"
    >
      {children}
    </Link>
  );
}

function Section({ children, id, className = "" }: { children: React.ReactNode, id?: string, className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.3 });

  return (
    <section 
      id={id} 
      ref={ref}
      className={`section-full relative overflow-hidden px-8 ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-7xl mx-auto"
      >
        {children}
      </motion.div>
    </section>
  );
}

function FeatureCard({ title, icon, description, delay }: { title: string; icon: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="glass p-10 rounded-[2rem] group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="text-4xl mb-8 group-hover:scale-110 transition-transform duration-500 ease-out">{icon}</div>
        <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{title}</h3>
        <p className="text-white leading-relaxed font-medium opacity-80">{description}</p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-[#000000]" />;

  return (
    <main className="relative text-white selection:bg-accent/30 selection:text-white min-h-screen">
      <GrindLock3D />

      {/* Persistent Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-8 py-10 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl font-black tracking-tighter"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
              GRINDLOCK<span className="text-accent">.</span>
            </span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:flex items-center gap-12 glass-light px-10 py-4 rounded-full"
          >
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#process">Process</NavLink>
            <NavLink href="/signin">Sign In</NavLink>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link 
              href="/signup"
              className="btn-primary py-3 px-8 text-[10px] tracking-[0.2em] uppercase font-black"
            >
              Start Free
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Scrollable Content */}
      <div className="scroll-container w-full" ref={scrollContainerRef}>
        
        {/* HERO SECTION */}
        <Section id="hero" className="flex flex-col items-center justify-center pt-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center w-full">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Performance First
                </div>
                <h1 className="display-lg text-5xl md:text-[clamp(4rem,10vw,8rem)] mb-10 leading-[0.9] gradient-text pt-4 tracking-[-0.04em] [text-wrap:balance]">
                  Discipline<br />
                  Your Time.
                </h1>
                <p className="text-xl text-white/80 mb-12 max-w-xl leading-relaxed font-medium mx-auto lg:mx-0 [text-wrap:balance]">
                  The high-end productivity engine for those who refuse to settle. 
                  Atomic focus, iron streaks, and cinematic analytics.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-8 justify-center lg:justify-start">
                  <Link 
                    href="/signup"
                    className="btn-primary px-12 py-5 text-sm font-black tracking-widest uppercase"
                  >
                    Start Tracking
                  </Link>
                  <LandingWaitlistForm />
                </div>
              </motion.div>
            </div>

            <div className="hidden lg:block relative perspective-1000">
              <motion.div
                initial={{ opacity: 0, rotateY: 30, scale: 0.9 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="absolute inset-0 bg-accent/20 blur-[150px] rounded-full animate-pulse" />
                <GrindLockHeroPanel />
              </motion.div>
            </div>
          </div>
        </Section>

        {/* FEATURES SECTION */}
        <Section id="features">
          <div className="text-center mb-24">
            <h2 className="display-lg text-4xl md:text-7xl mb-6 gradient-text uppercase">Engineered for Elite.</h2>
            <p className="text-white/60 text-lg font-bold tracking-[0.2em] uppercase">Tools that force consistency</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Atomic Timer"
              icon="⚡"
              description="High-precision tracking with deep work optimization and flow-state detection."
              delay={0.1}
            />
            <FeatureCard 
              title="Iron Strength"
              icon="💎"
              description="Gamified consistency blocks that reward momentum and eliminate mediocrity."
              delay={0.2}
            />
            <FeatureCard 
              title="Deep Insights"
              icon="👁️"
              description="Advanced data visualization that exposes your focus leaks and performance peaks."
              delay={0.3}
            />
          </div>
        </Section>

        {/* PROCESS SECTION */}
        <Section id="process">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="display-lg text-4xl md:text-7xl mb-24 gradient-text uppercase">The Ascent.</h2>
            
            <div className="space-y-32">
              {[
                { step: "01", title: "Set the Objective", desc: "Define your high-stakes tasks and lock in your session parameters." },
                { step: "02", title: "Enter the Void", desc: "Engage the atomic timer. All distractions are filtered. Only the work remains." },
                { step: "03", title: "Review & Refine", desc: "Analyze every second. Build streaks that are impossible to break." }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-center gap-16 text-left">
                  <div className="text-9xl font-black text-white/[0.05] font-display">{item.step}</div>
                  <div>
                    <h3 className="display-md text-4xl mb-4 tracking-tight">{item.title}</h3>
                    <p className="text-xl text-white/70 leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* FOOTER / FINAL CTA */}
        <Section id="footer" className="min-h-[70vh] flex flex-col items-center justify-center">
          <div className="text-center w-full">
            <h2 className="display-lg text-6xl md:text-[8rem] mb-12 gradient-text uppercase">Own Your Future.</h2>
            <Link 
              href="/signup"
              className="btn-primary px-16 py-6 text-2xl font-black tracking-widest uppercase shadow-[0_0_50px_var(--accent-glow)]"
            >
              Get Started Now
            </Link>
            
            <div className="mt-32 pt-16 border-t border-white/10 flex flex-col md:flex-row items-center justify-between w-full opacity-50 gap-10">
              <div className="text-xl font-black tracking-tighter">GRINDLOCK<span className="text-accent">.</span></div>
              <div className="flex gap-12 font-bold tracking-[0.2em] uppercase text-[10px]">
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
                <a href="#" className="hover:text-white transition-colors">Discord</a>
                <a href="#" className="hover:text-white transition-colors">GitHub</a>
              </div>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase">© 2026 ALPHA PROJECT</div>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}