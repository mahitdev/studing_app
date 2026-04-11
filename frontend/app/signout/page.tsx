"use client";

import { motion } from "framer-motion";
import FloatingScene from "../../components/FloatingScene";

export default function SignOutPage() {
  useEffect(() => {
    clearAuthSession();
  }, []);

  return (
    <main className="auth-page">
      <div className="auth-container">
        <FloatingScene />
      </div>
      
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card"
      >
        <h1>Signed Out</h1>
        <p>You have been signed out successfully. Time to recharge.</p>
        <Link href="/signin" className="w-full">
          <button className="w-full">Sign In Again</button>
        </Link>
      </motion.section>
    </main>
  );
}
