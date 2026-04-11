"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeWaitlist } from "../lib/api";

export default function LandingWaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email) return;
    try {
      setLoading(true);
      setStatus("");
      const res = await subscribeWaitlist(email, "landing-hero");
      setStatus(res.message);
      setEmail("");
    } catch (err) {
      setStatus((err as Error).message || "Could not subscribe right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex-1 w-full">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Priority access email"
            className="w-full px-6 py-4 rounded-full glass-light border border-white/10 text-white placeholder-white/50 focus:outline-none focus:border-accent/50 transition-all duration-300 font-medium"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSubmit}
          disabled={loading}
          className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-white/5 whitespace-nowrap"
        >
          {loading ? "Sychronizing..." : "Join the Elite"}
        </motion.button>
      </div>
      <AnimatePresence>
        {status && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -bottom-8 left-6 text-xs font-bold tracking-widest text-accent uppercase"
          >
            {status}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}