"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import FloatingScene from "../../components/FloatingScene";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onLogin = async () => {
    try {
      setError("");
      const response = await loginUser(email, password);
      saveAuthSession(response.user._id, response.token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    }
  };

  const onGuest = async () => {
    try {
      setError("");
      const response = await bootstrapUser("Focused Student", "General", "Serious", "Skill");
      saveAuthSession(response.user._id, response.token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Guest setup failed");
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
        className="auth-card"
      >
        <h1>Sign In</h1>
        <div className="flex flex-col gap-6 text-left">
          <div className="flex flex-col gap-2">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          </div>
        </div>
        
        <button className="w-full" onClick={onLogin}>Sign In</button>
        <button className="ghost w-full" onClick={onGuest}>Continue as Guest</button>
        
        <p className="text-sm">New here? <Link href="/signup" className="text-accent font-bold hover:underline">Create account</Link></p>
        {error && <p className="error">{error}</p>}
      </motion.section>
    </main>
  );
}
