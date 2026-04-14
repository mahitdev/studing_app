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
    <main className="auth-wrapper">
      <div className="absolute inset-0 z-0">
        <FloatingScene />
      </div>

      <motion.section 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="auth-form max-w-[500px]"
      >
        <h1>Create Identity</h1>
        
        <div className="flex flex-col gap-5 text-left w-full">
          <div className="space-y-1.5">
            <label>Operative Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Focused Student" />
          </div>
          <div className="space-y-1.5">
            <label>Secure Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
          </div>
          <div className="space-y-1.5">
            <label>Access Key</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label>Commitment</label>
              <select value={identity} onChange={(e) => setIdentity(e.target.value as "Casual" | "Serious" | "Hardcore")}>
                <option value="Casual">Casual</option>
                <option value="Serious">Serious</option>
                <option value="Hardcore">Hardcore</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label>Objective</label>
              <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Goal/Motivation" />
            </div>
          </div>
        </div>

        <button className="btn-primary w-full mt-8 py-4 text-sm tracking-widest uppercase font-bold" onClick={onSignup} disabled={loading}>
          {loading ? "Initializing..." : "Register Operative"}
        </button>
        <p className="text-xs text-center mt-6 text-muted font-medium">
          Existing operative? <Link href="/signin" className="text-accent font-bold hover:underline">Verify Identity</Link>
        </p>
        
        {error && (
          <div className="mt-8 p-4 glass rounded-2xl border-l-2 border-danger animate-shake">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              <span className="text-xs font-bold text-danger uppercase tracking-wider">{error}</span>
            </div>
          </div>
        )}
      </motion.section>
    </main>
  );
}

