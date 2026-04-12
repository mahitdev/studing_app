"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import FloatingScene from "../../components/FloatingScene";
import { registerUser, saveAuthSession } from "../../lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("Focused Student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<"Casual" | "Serious" | "Hardcore">("Serious");
  const [why, setWhy] = useState("Job - 12 LPA");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignup = async () => {
    if (loading) return;
    try {
      setError("");
      setLoading(true);
      const response = await registerUser(name, email, password, "General", identity, why);
      saveAuthSession(response.user._id, response.token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Sign up failed");
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
        initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="auth-card max-w-[540px]"
      >
        <h1>Create Account</h1>
        
        <div className="flex flex-col gap-4 text-left w-full">
          <div className="flex flex-col gap-1.5">
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Focused Student" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Study Identity</label>
            <select value={identity} onChange={(e) => setIdentity(e.target.value as "Casual" | "Serious" | "Hardcore")}>
              <option value="Casual">Casual</option>
              <option value="Serious">Serious</option>
              <option value="Hardcore">Hardcore</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Why are you studying?</label>
            <textarea 
              value={why} 
              onChange={(e) => setWhy(e.target.value)} 
              placeholder="Your high-stakes motivation..." 
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <button className="w-full mt-4 primary-glow py-4 text-lg" onClick={onSignup} disabled={loading}>
          {loading ? "Initializing Journey..." : "Start My Journey"}
        </button>
        <p className="text-sm mt-2">Already have account? <Link href="/signin" className="text-accent font-bold hover:underline">Sign in</Link></p>
        
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

