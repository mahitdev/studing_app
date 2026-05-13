const express = require("express");
const WaitlistEmail = require("../models/WaitlistEmail");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/subscribe", waitlistLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const source = String(req.body?.source || "landing").trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!validEmail.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const existing = await WaitlistEmail.findOne({ email });
    if (existing) {
      return res.status(200).json({ ok: true, message: "You're already on the waitlist." });
    }

    await WaitlistEmail.create({ email, source });
    res.status(201).json({ ok: true, message: "Successfully added to waitlist." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
