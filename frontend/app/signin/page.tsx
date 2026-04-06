"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bootstrapUser, loginUser, saveAuthSession } from "../../lib/api";

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
      <section className="auth-card">
        <h1>Sign In</h1>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button onClick={onLogin}>Sign In</button>
        <button className="ghost" onClick={onGuest}>Continue as Guest</button>
        <p>New here? <Link href="/signup">Create account</Link></p>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
