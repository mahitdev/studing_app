const express = require("express");
const StudySession = require("../models/StudySession");
const { requireAuth, requireSelf } = require("../middleware/auth");
const { recalculateDailyTotals, ensureDailyGoal } = require("../services/trackerService");
const router = express.Router();

router.get("/:userId", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const sessions = await StudySession.find({ userId: req.params.userId }).sort({ startedAt: -1 }).limit(50);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

router.post("/start", requireAuth, async (req, res, next) => {
  try {
    const { userId, subject, studyMode, plannedDurationMinutes, riskMode } = req.body;
    if (String(req.auth.sub) !== String(userId)) return res.status(403).json({ message: "Identity mismatch" });

    const session = await StudySession.create({
      userId,
      subject,
      studyMode,
      plannedDurationMinutes,
      riskMode,
      startedAt: new Date().toISOString(),
      status: "running"
    });

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

router.post("/:sessionId/pause", requireAuth, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (String(session.userId) !== String(req.auth.sub)) return res.status(403).json({ message: "Forbidden" });

    session.status = "paused";
    session.pauses.push({ startedAt: new Date().toISOString() });
    await session.save();
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post("/:sessionId/resume", requireAuth, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (String(session.userId) !== String(req.auth.sub)) return res.status(403).json({ message: "Forbidden" });

    session.status = "running";
    if (session.pauses.length > 0) {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (!lastPause.endedAt) {
        lastPause.endedAt = new Date().toISOString();
      }
    }
    await session.save();
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post("/:sessionId/end", requireAuth, async (req, res, next) => {
  try {
    const { 
      focusedMinutes, 
      inactiveSeconds, 
      notes, 
      subject, 
      stopReason, 
      antiCheatFlags, 
      sessionQualityTag,
      studyMode,
      plannedDurationMinutes,
      riskMode
    } = req.body;
    
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (String(session.userId) !== String(req.auth.sub)) return res.status(403).json({ message: "Forbidden" });

    session.status = "completed";
    session.endedAt = new Date().toISOString();
    session.focusedMinutes = focusedMinutes || 0;
    session.inactiveSeconds = inactiveSeconds || 0;
    session.notes = notes || session.notes;
    session.subject = subject || session.subject;
    session.stopReason = stopReason || "";
    session.antiCheatFlags = antiCheatFlags || 0;
    session.sessionQualityTag = sessionQualityTag || "";
    if (studyMode) session.studyMode = studyMode;
    if (plannedDurationMinutes) session.plannedDurationMinutes = plannedDurationMinutes;
    if (typeof riskMode === "boolean") session.riskMode = riskMode;

    await session.save();

    await ensureDailyGoal(session.userId);
    await recalculateDailyTotals(session.userId);

    res.json(session);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
