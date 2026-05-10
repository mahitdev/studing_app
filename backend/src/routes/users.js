const express = require("express");
const router = express.Router();
const User = require("../models/User");
const StudySession = require("../models/StudySession");
const DailyGoal = require("../models/DailyGoal");
const { requireAuth, requireSelf } = require("../middleware/auth");
const trackerService = require("../services/trackerService");
const emailService = require("../services/emailService");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");

const signToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      email: user.email || "",
      name: user.name || "Focused Student"
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const sanitizeUser = (userDoc) => {
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete user.passwordHash;
  delete user.authToken;
  return user;
};

// POST /users/bootstrap
router.post("/bootstrap", async (req, res, next) => {
  try {
    const { name, college, identityType, motivationWhy } = req.body;
    const user = await User.create({
      name: name || "Focused Student",
      college: college || "General",
      identityType: identityType || "Serious",
      motivationWhy: motivationWhy || ""
    });

    const token = signToken(user);
    const dashboard = await trackerService.dashboardForUser(user._id);

    res.status(201).json({ user: sanitizeUser(user), token, dashboard });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/dashboard
router.get("/:userId/dashboard", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

// PUT /users/:userId/goals/today
router.put("/:userId/goals/today", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { targetMinutes } = req.body;
    const goal = await trackerService.ensureDailyGoal(req.params.userId);
    goal.targetMinutes = targetMinutes;
    await goal.save();
    
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});

// PUT /users/:userId/goals/config
router.put("/:userId/goals/config", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { dailyMinutes, weeklyTargetMinutes, weeklySessionTarget } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (dailyMinutes !== undefined) user.goalConfig.dailyMinutes = dailyMinutes;
    if (weeklyTargetMinutes !== undefined) user.goalConfig.weeklyTargetMinutes = weeklyTargetMinutes;
    if (weeklySessionTarget !== undefined) user.goalConfig.weeklySessionTarget = weeklySessionTarget;

    await user.save();
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});

// PUT /users/:userId/modes
router.put("/:userId/modes", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { roastMode, identityType, motivationWhy, ethAddress } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (roastMode !== undefined) user.roastMode = roastMode;
    if (identityType !== undefined) user.identityType = identityType;
    if (motivationWhy !== undefined) user.motivationWhy = motivationWhy;
    if (ethAddress !== undefined) user.ethAddress = ethAddress;

    await user.save();
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/sessions/today
router.get("/:userId/sessions/today", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const today = trackerService.todayKey();
    const sessions = await StudySession.find({ 
      userId: req.params.userId,
      startedAt: { $regex: `^${today}` }
    }).sort({ startedAt: -1 });
    
    res.json({ sessions, serverTime: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/offline-sync
router.post("/:userId/sessions/offline-sync", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { sessions } = req.body;
    if (!Array.isArray(sessions)) return res.status(400).json({ message: "Invalid sessions format" });

    const created = await StudySession.insertMany(
      sessions.map(s => ({
        ...s,
        userId: req.params.userId,
        status: "completed"
      }))
    );

    await trackerService.recalculateDailyTotals(req.params.userId);
    const dashboard = await trackerService.dashboardForUser(req.params.userId);

    res.json({ synced: created.length, dashboard });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/email-summary
router.post("/:userId/email-summary", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const summary = await emailService.sendProgressEmail(user, req.body.email || user.email);
    res.json({ ok: true, message: "Email sent", summary });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/friends/add
router.post("/:userId/friends/add", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { friendEmail } = req.body;
    const friend = await User.findOne({ email: friendEmail });
    if (!friend) return res.status(404).json({ message: "Friend not found" });

    const user = await User.findById(req.params.userId).populate("friends", "name xp level streak college");
    if (!user.friends.some(f => f._id.toString() === friend._id.toString())) {
      user.friends.push(friend._id);
      await user.save();
      // Refetch to get populated friends
      await user.populate("friends", "name xp level streak college");
    }

    res.json({ friends: user.friends });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/friends/live
router.get("/:userId/friends/live", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate("friends", "name xp level streak college");
    const friends = user.friends.map(f => ({
      ...f.toObject(),
      isLive: Math.random() > 0.7, // Mocking live status
      currentSubject: "Neural Science"
    }));
    res.json({ 
      friends, 
      studyingNowCount: friends.filter(f => f.isLive).length, 
      liveMessage: "Neural network synchronization optimal." 
    });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/ai-coach
router.post("/:userId/ai-coach", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { message } = req.body;
    // Simple mock AI response
    const replies = [
      "Keep pushing. Neural link is strong.",
      "Discipline is the only way.",
      "Your current trajectory is optimal.",
      "Focus. The distraction is temporary."
    ];
    res.json({ reply: replies[Math.floor(Math.random() * replies.length)] });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/analytics
router.get("/:userId/analytics", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const sessions = await StudySession.find({ userId, status: "completed" }).sort({ startedAt: -1 }).limit(100);
    
    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || "http://localhost:8000";
    
    // Attempt to call Python backend
    try {
      const http = require("http");
      const url = new URL(`${analyticsUrl}/analyze`);
      
      const postData = JSON.stringify({ sessions });
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          try {
            const pythonAnalytics = JSON.parse(data);
            res.json(pythonAnalytics);
          } catch (e) {
            // Fallback if JSON parse fails
            res.json({ message: "Python service returned invalid data", error: true });
          }
        });
      });

      proxyReq.on('error', (e) => {
        // Fallback to Node-only analytics if Python service is down
        trackerService.dashboardForUser(userId).then(dashboard => {
          res.json({
            average_study_time: dashboard.deepAnalytics.averageSessionLength,
            focus_score: dashboard.focusScore.score,
            message: "Python engine offline. Basic analytics active.",
            graphs: {}
          });
        });
      });

      proxyReq.write(postData);
      proxyReq.end();
      
    } catch (err) {
      // General fallback
      const dashboard = await trackerService.dashboardForUser(userId);
      res.json({
        average_study_time: dashboard.deepAnalytics.averageSessionLength,
        focus_score: dashboard.focusScore.score,
        message: "Neural analytics engine in fallback mode.",
        graphs: {}
      });
    }
  } catch (err) {
    next(err);
  }
});

// SESSIONS MANAGEMENT
// POST /users/:userId/sessions/start
router.post("/:userId/sessions/start", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { subject, studyMode, plannedDurationMinutes, riskMode } = req.body;
    const userId = req.params.userId;
    const now = new Date().toISOString();
    const session = await StudySession.create({
      userId,
      subject: subject || "General",
      studyMode: studyMode || "custom",
      plannedDurationMinutes: plannedDurationMinutes || 0,
      riskMode: riskMode || false,
      startedAt: now,
      lastStartedAt: now,
      status: "running"
    });
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/pause
router.post("/:userId/sessions/:sessionId/pause", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    
    const now = new Date();
    if (session.status === "running" && session.lastStartedAt) {
      const delta = Math.floor((now.getTime() - new Date(session.lastStartedAt).getTime()) / 1000);
      session.elapsedSeconds += Math.max(0, delta);
    }
    
    session.status = "paused";
    session.lastStartedAt = null;
    session.pauses.push({ startedAt: now.toISOString(), reason: req.body.reason || "manual" });
    await session.save();
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/resume
router.post("/:userId/sessions/:sessionId/resume", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const now = new Date();
    session.status = "running";
    session.lastStartedAt = now.toISOString();
    
    if (session.pauses.length > 0) {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (!lastPause.endedAt) lastPause.endedAt = now.toISOString();
    }
    await session.save();
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/end
router.post("/:userId/sessions/:sessionId/end", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { 
      inactiveSeconds, notes, subject, stopReason, 
      antiCheatFlags, sessionQualityTag, studyMode, 
      plannedDurationMinutes, riskMode 
    } = req.body;
    
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const now = new Date();
    if (session.status === "running" && session.lastStartedAt) {
      const delta = Math.floor((now.getTime() - new Date(session.lastStartedAt).getTime()) / 1000);
      session.elapsedSeconds += Math.max(0, delta);
    }

    session.status = "completed";
    session.lastStartedAt = null;
    session.endedAt = now.toISOString();
    session.focusedMinutes = Math.floor(session.elapsedSeconds / 60);
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
    
    await trackerService.recalculateDailyTotals(session.userId);
    const dashboard = await trackerService.dashboardForUser(session.userId);
    
    res.json({ session, dashboard });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/reset
router.post("/:userId/sessions/:sessionId/reset", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.status = "reset";
    session.stopReason = req.body.stopReason || "reset";
    await session.save();

    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ session, dashboard });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

