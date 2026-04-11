"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import FloatingScene from "../components/FloatingScene";
import LandingWaitlistForm from "../components/LandingWaitlistForm";

function MagneticButton({ children, href, primary = false }: { children: React.ReactNode; href: string; primary?: boolean }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPosition({ x: x * 0.3, y: y * 0.3 });
  };

  const handleMouseLeave = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="inline-block"
    >
      <Link
        href={href}
        className={`relative inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-sm transition-all duration-300 ${
          primary
            ? "bg-gradient-to-r from-accent via-accent-2 to-accent text-white shadow-lg shadow-accent/30 hover:shadow-accent/50"
            : "border border-border bg-surface/50 text-primary hover:bg-surface"
        }`}
      >
        {children}
        {primary && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ boxShadow: ["0 0 20px rgba(79, 120, 255, 0.3)", "0 0 40px rgba(122, 99, 246, 0.5)", "0 0 20px rgba(79, 120, 255, 0.3)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </Link>
    </motion.div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: string; title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="group relative p-6 rounded-2xl border border-border bg-surface/60 backdrop-blur-sm overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-2/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white font-bold text-sm">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

function StepCard({ number, title, description, delay }: { number: number; title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="relative text-center"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-accent/30">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </motion.div>
  );
}

function ParallaxBlob({ className, delay }: { className: string; delay: number }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);

  return (
    <motion.div
      style={{ y }}
      className={`absolute rounded-full blur-[80px] opacity-30 ${className}`}
      animate={{
        x: [0, 20, 0],
        y: [0, -20, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background text-primary overflow-x-hidden">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <ParallaxBlob className="w-64 h-64 bg-accent top-20 left-10" delay={0} />
        <ParallaxBlob className="w-56 h-56 bg-accent-2 top-40 right-20" delay={2} />
        <ParallaxBlob className="w-72 h-72 bg-purple-500 bottom-20 left-1/3" delay={4} />
      </div>

      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-background/80 border-b border-border/50"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold tracking-wider font-display"
        >
          <span className="text-accent">Grind</span><span className="text-accent-2">Lock</span>
        </motion.div>
        <div className="flex items-center gap-6 text-sm text-muted">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#how" className="hover:text-primary transition-colors">How It Works</a>
          <Link href="/signin" className="hover:text-primary transition-colors">Sign In</Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-center lg:text-left"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm uppercase tracking-[0.2em] text-accent mb-4"
            >
              Student Productivity Tracker
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight mb-6"
            >
              Discipline your time.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-2">
                Own your future.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-lg text-muted mb-8 max-w-lg mx-auto lg:mx-0"
            >
              A calm, powerful space to track your progress, build consistent habits, and achieve your goals.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <MagneticButton href="/signup" primary>
                Start Tracking
              </MagneticButton>
              <MagneticButton href="#how">
                See How It Works
              </MagneticButton>
            </motion.div>

            {/* Waitlist Form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-10"
            >
              <LandingWaitlistForm />
            </motion.div>
          </motion.div>

          {/* 3D Scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="relative"
          >
            {/* Glow behind */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-accent-2/20 to-purple-500/20 blur-3xl rounded-full" />
            
            {/* 3D Canvas */}
            <div className="relative z-10">
              <FloatingScene />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-accent mb-4">Core Features</p>
            <h2 className="text-4xl font-bold font-display">Built for consistency, not motivation spikes</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon="FT"
              title="Focus Tracking"
              description="Track real deep-work time with session quality and anti-cheat checks."
              delay={0.1}
            />
            <FeatureCard
              icon="SS"
              title="Streak System"
              description="Use momentum, recovery mode, and streak pressure to stay accountable."
              delay={0.2}
            />
            <FeatureCard
              icon="SA"
              title="Smart Analytics"
              description="See weak days, effort vs result, and long-term trend insights."
              delay={0.3}
            />
            <FeatureCard
              icon="SR"
              title="Session Replay"
              description="Review exact daily blocks to understand where focus was won or lost."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-32 px-6 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-accent mb-4">How It Works</p>
            <h2 className="text-4xl font-bold font-display">Three steps. One disciplined system.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            <StepCard
              number={1}
              title="Set your goal"
              description="Choose daily targets and lock in your preferred study window."
              delay={0.1}
            />
            <StepCard
              number={2}
              title="Start focus sessions"
              description="Run Pomodoro, deep work, or custom sessions with precision tracking."
              delay={0.2}
            />
            <StepCard
              number={3}
              title="Build streak"
              description="Use pressure, analytics, and weekly reports to stay consistent."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl font-bold font-display mb-6">Ready to take control?</h2>
          <p className="text-lg text-muted mb-8">
            Join thousands of students who are building consistent study habits.
          </p>
          <MagneticButton href="/signup" primary>
            Start Your Journey
          </MagneticButton>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold font-display">
              <span className="text-accent">Grind</span><span className="text-accent-2">Lock</span>
            </h3>
            <p className="text-sm text-muted mt-1">Discipline-first productivity tracker.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <Link href="/signup" className="hover:text-primary transition-colors">Start Tracking</Link>
            <Link href="/signin" className="hover:text-primary transition-colors">Sign In</Link>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted hover:text-primary hover:border-accent transition-all">
              X
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted hover:text-primary hover:border-accent transition-all">
              In
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted hover:text-primary hover:border-accent transition-all">
              Gh
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}