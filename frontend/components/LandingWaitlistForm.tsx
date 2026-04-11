"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
    <div className="flex flex-col sm:flex-row gap-3 items-end max-w-md">
      <div className="flex-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-4 py-3 rounded-full bg-surface/60 border border-border text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSubmit}
        disabled={loading}
        className="px-6 py-3 rounded-full bg-gradient-to-r from-accent to-accent-2 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Joining..." : "Get Early Access"}
      </motion.button>
      {status && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute mt-2 text-sm text-muted"
        >
          {status}
        </motion.p>
      )}
    </div>
  );
}