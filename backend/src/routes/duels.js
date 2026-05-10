const express = require("express");
const router = express.Router();
const Duel = require("../models/Duel");
const { requireAuth } = require("../middleware/auth");

// POST /duels
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { challengerId, opponentId, durationMinutes } = req.body;
    const duel = await Duel.create({
      challengerId,
      opponentId,
      durationMinutes,
      status: "pending"
    });
    res.status(201).json(duel);
  } catch (err) {
    next(err);
  }
});

// GET /duels/:userId
router.get("/:userId", requireAuth, async (req, res, next) => {
  try {
    const duels = await Duel.find({
      $or: [{ challengerId: req.params.userId }, { opponentId: req.params.userId }]
    }).sort({ createdAt: -1 });
    res.json(duels);
  } catch (err) {
    next(err);
  }
});

// POST /duels/:duelId/sync
router.post("/:duelId/sync", requireAuth, async (req, res, next) => {
  try {
    const { userId, progress } = req.body;
    const duel = await Duel.findById(req.params.duelId);
    if (!duel) return res.status(404).json({ message: "Duel not found" });

    if (String(duel.challengerId) === String(userId)) {
      duel.challengerProgress = progress;
    } else if (String(duel.opponentId) === String(userId)) {
      duel.opponentProgress = progress;
    } else {
      return res.status(403).json({ message: "Not a participant" });
    }

    if (duel.challengerProgress >= duel.durationMinutes || duel.opponentProgress >= duel.durationMinutes) {
      duel.status = "completed";
      duel.winnerId = duel.challengerProgress >= duel.durationMinutes ? duel.challengerId : duel.opponentId;
    }

    await duel.save();
    res.json(duel);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
