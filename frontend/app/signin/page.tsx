"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import FloatingScene from "../../components/FloatingScene";
import { bootstrapUser, loginUser, saveAuthSession } from "../../lib/api";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (loading) return;
    try {
      setError("");
      setLoading(true);
      const response = await loginUser(email, password);
      saveAuthSession(response.user._id, response.token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onGuest = async () => {
    if (loading) return;
    try {
      setError("");
      setLoading(true);
      const response = await bootstrapUser("Focused Student", "General", "Serious", "Skill");
      saveAuthSession(response.user._id, response.token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Guest setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <FloatingScene />
      </div>

      <motion.section 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="auth-card max-w-[480px]"
      >
        <h1>Sign In</h1>
        <div className="flex flex-col gap-4 text-left w-full">
          <div className="flex flex-col gap-1.5">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          </div>
        </div>
        
        <button className="w-full mt-2 primary-glow py-4 text-lg" onClick={onLogin} disabled={loading}>
          {loading ? "Accessing Core..." : "Sign In"}
        </button>
        <button className="ghost w-full py-3" onClick={onGuest} disabled={loading}>Continue as Guest</button>
        
        <p className="text-sm mt-2">New here? <Link href="/signup" className="text-accent font-bold hover:underline">Create account</Link></p>
        
        {error && (
          <div className="error mt-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span>{error}</span>
            </div>
            <button 
              className="text-[10px] uppercase tracking-widest font-bold opacity-60 hover:opacity-100 underline decoration-danger"
              onClick={() => { localStorage.setItem("study-tracker-pref-mock", "true"); window.location.reload(); }}
            >
              Force Standalone Mode (Bypass Server)
            </button>
          </div>
        )}
      </motion.section>
    </main>
  );
}

