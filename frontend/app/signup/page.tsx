"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import FloatingScene from "../../components/FloatingScene";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("Focused Student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<"Casual" | "Serious" | "Hardcore">("Serious");
  const [why, setWhy] = useState("Job - 12 LPA");
  const [error, setError] = useState("");

  const onSignup = async () => {
    try {
      setError("");
      const response = await registerUser(name, email, password, "General", identity, why);
      saveAuthSession(response.user._id, response.token);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Sign up failed");
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
        className="auth-card max-w-[550px]"
      >
        <h1>Create Account</h1>
        
        <div className="grid two gap-6 text-left">
          <div className="flex flex-col gap-2">
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 chars" />
          </div>
          <div className="flex flex-col gap-2">
            <label>Study Identity</label>
            <select value={identity} onChange={(e) => setIdentity(e.target.value as "Casual" | "Serious" | "Hardcore")}>
              <option value="Casual">Casual</option>
              <option value="Serious">Serious</option>
              <option value="Hardcore">Hardcore</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-left">
          <label>Why are you studying?</label>
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Your high-stakes motivation..." />
        </div>

        <button className="w-full mt-4" onClick={onSignup}>Start My Journey</button>
        <p className="text-sm">Already have account? <Link href="/signin" className="text-accent font-bold hover:underline">Sign in</Link></p>
        
        {error && <p className="error">{error}</p>}
      </motion.section>
    </main>
  );
}
