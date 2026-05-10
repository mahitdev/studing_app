const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const sessionRoutes = require("./sessions");
const roomRoutes = require("./rooms");
const integrationRoutes = require("./integrations");
const userRoutes = require("./users");
const duelRoutes = require("./duels");
const waitlistRoutes = require("./waitlist");
const { getLeaderboard } = require("../services/trackerService");

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "study-tracker-backend", status: "Neural link optimal" });
});

router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/rooms", roomRoutes);
router.use("/integrations", integrationRoutes);
router.use("/users", userRoutes);
router.use("/duels", duelRoutes);
router.use("/waitlist", waitlistRoutes);

router.get("/leaderboard", async (req, res, next) => {
  try {
    const college = req.query.college || "global";
    const users = await getLeaderboard(null, college); 
    res.json({ leaderboard: users });
  } catch (err) {
    next(err);
  }
});

// Legacy/Misc routes can be kept here or moved further

module.exports = router;
