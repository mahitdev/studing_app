"use client";

import { useState } from "react";
import { subscribeWaitlist } from "../lib/api";

export default function LandingWaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
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
    <div className="hero-input smart-inputs">
      <label className="input-field">
        <input
          type="email"
          placeholder=" "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <span>Email Address</span>
      </label>
      <button type="button" className="magnetic" onClick={onSubmit} disabled={loading}>
        {loading ? "Joining..." : "Get Early Access"}
      </button>
      {status ? <p className="waitlist-status">{status}</p> : null}
    </div>
  );
}
