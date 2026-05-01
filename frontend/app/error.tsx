"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import FloatingScene from "../components/FloatingScene";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Render Error:", error);
  }, [error]);

  return (
    <main className="auth-wrapper">
      <div className="absolute inset-0 opacity-40 grayscale">
        <FloatingScene />
      </div>

      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="auth-form max-w-[500px]"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center border border-danger/20">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-danger">System Offline</h1>
          <p className="muted text-sm leading-relaxed">
            A critical UI synchronization error was encountered. Neural engines have suspended to prevent data corruption.
          </p>
          
          <div className="w-full p-4 bg-black/40 rounded-2xl border border-white/5 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Error Digest</p>
            <p className="text-xs font-mono text-danger/80 break-words">{error.message}</p>
          </div>

          <button className="w-full primary-glow py-4 font-black uppercase tracking-widest text-xs" onClick={() => reset()}>
            Re-Initialize Core
          </button>
          
          <p className="text-[10px] muted">Session ID: {error.digest || "Local-Bypass"}</p>
        </div>
      </motion.section>
    </main>
  );
}
