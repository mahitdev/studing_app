const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const sessionRoutes = require("./sessions");
const roomRoutes = require("./rooms");
// Additional routes can be imported here

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "study-tracker-backend", status: "Neural link optimal" });
});

router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/rooms", roomRoutes);

// Legacy/Misc routes can be kept here or moved further
router.post("/waitlist/subscribe", async (req, res, next) => {
  // Existing waitlist logic...
  res.json({ ok: true }); 
});

module.exports = router;
