const express = require("express");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const router = express.Router();

// Mock Calendar Sync
router.post("/calendar/sync", requireAuth, async (req, res) => {
  try {
    // In a real app, this would use OAuth and fetch events
    res.json({ 
      ok: true, 
      message: "Neural Calendar Sync Protocol Initialized",
      syncedEvents: 5,
      nextScheduledSession: "2026-05-10T10:00:00Z"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mock Wearable Device Tracking
router.post("/wearable/sync", requireAuth, async (req, res) => {
  try {
    const bonusXp = Math.floor(Math.random() * 50) + 10;
    const user = await User.findById(req.auth.sub);
    if (user) {
      user.xp += bonusXp;
      await user.save();
    }
    res.json({ 
      ok: true, 
      bonusXp,
      message: "Biometric focus detected. Bonus XP awarded."
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
