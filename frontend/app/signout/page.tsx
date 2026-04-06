"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clearAuthSession } from "../../lib/api";

export default function SignOutPage() {
  useEffect(() => {
    clearAuthSession();
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
