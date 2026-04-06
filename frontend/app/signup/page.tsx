"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUser, saveAuthSession } from "../../lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("Focused Student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<"Casual" | "Serious" | "Hardcore">("Serious");
  const [why, setWhy] = useState("Job - 8 LPA");
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
      <section className="auth-card">
        <h1>Create Account</h1>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <label>Identity</label>
        <select value={identity} onChange={(e) => setIdentity(e.target.value as "Casual" | "Serious" | "Hardcore")}>
          <option value="Casual">Casual</option>
          <option value="Serious">Serious</option>
          <option value="Hardcore">Hardcore</option>
        </select>
        <label>Why are you studying?</label>
        <input value={why} onChange={(e) => setWhy(e.target.value)} />
        <button onClick={onSignup}>Sign Up</button>
        <p>Already have account? <Link href="/signin">Sign in</Link></p>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
