"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SignOutPage() {
  useEffect(() => {
    localStorage.removeItem("study-tracker-user-id");
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Signed Out</h1>
        <p>You have been signed out successfully.</p>
        <Link href="/signin" className="cta">Sign In Again</Link>
      </section>
    </main>
  );
}
