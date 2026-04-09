const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DailyGoal = require("../models/DailyGoal");
const StudySession = require("../models/StudySession");
const WaitlistEmail = require("../models/WaitlistEmail");
const { sendProgressEmail } = require("../services/emailService");
const {
  todayKey,
  ensureDailyGoal,
  recalculateDailyTotals,
  dashboardForUser
} = require("../services/trackerService");

const router = express.Router();

const legacyHash = (input) => crypto.createHash("sha256").update(input).digest("hex");
const JWT_SECRET = process.env.JWT_SECRET || "focusflow-dev-secret-change-in-production";

const sanitizeUser = (userDoc) => {
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete user.passwordHash;
  delete user.authToken;
  return user;
};

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

const verifyPassword = async (user, password) => {
  if (!user?.passwordHash) return false;
  if (user.passwordHash.startsWith("$2")) {
    return bcrypt.compare(password, user.passwordHash);
  }
  return user.passwordHash === legacyHash(password);
};

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireSelf = (req, res, next) => {
  if (String(req.auth?.sub || "") !== String(req.params.userId || "")) {
    return res.status(403).json({ message: "Forbidden: user mismatch" });
  }
  return next();
};

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "study-tracker-backend" });
});

router.post("/waitlist/subscribe", async (req, res, next) => {
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
    return res.status(201).json({ ok: true, message: "You're in. We'll notify you soon." });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const { name, email, password, college = "General", identityType = "Serious", motivationWhy = "" } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({
      name: name?.trim() || "Focused Student",
      college,
      identityType,
      motivationWhy,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12)
    });

    await ensureDailyGoal(user._id);
    const dashboard = await dashboardForUser(user._id);
    const token = signToken(user);

    return res.status(201).json({ user: sanitizeUser(user), token, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    const valid = await verifyPassword(user, password || "");
    if (!user || !valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Upgrade legacy SHA-256 hashes to bcrypt on successful login.
    if (user.passwordHash && !user.passwordHash.startsWith("$2")) {
      user.passwordHash = await bcrypt.hash(password, 12);
      await user.save();
    }

    const dashboard = await dashboardForUser(user._id);
    const token = signToken(user);
    return res.json({ user: sanitizeUser(user), token, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/users/bootstrap", async (req, res, next) => {
  try {
    const { name, college, identityType = "Serious", motivationWhy = "" } = req.body;
    const user = await User.create({
      name: name?.trim() || "Focused Student",
      college: college?.trim() || "General",
      identityType,
      motivationWhy
    });

    await ensureDailyGoal(user._id);
    const dashboard = await dashboardForUser(user._id);
    const token = signToken(user);

    res.status(201).json({ user: sanitizeUser(user), token, dashboard });
  } catch (err) {
    next(err);
  }
});

router.use("/users/:userId", requireAuth, requireSelf);
router.use("/leaderboard", requireAuth);

router.post("/users/:userId/email-summary", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetEmail = String(req.body?.email || "").trim().toLowerCase();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validEmail.test(targetEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const summary = await sendProgressEmail(user, targetEmail);
    return res.json({ ok: true, message: "Progress email sent successfully.", summary });
  } catch (err) {
    next(err);
  }
});

router.put("/users/:userId/goals/today", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { targetMinutes } = req.body;

    if (typeof targetMinutes !== "number" || targetMinutes < 1 || targetMinutes > 960) {
      return res.status(400).json({ message: "targetMinutes must be between 1 and 960" });
    }

    const goal = await ensureDailyGoal(userId);
    goal.targetMinutes = targetMinutes;
    goal.completionPercent = Math.min(100, Math.round((goal.studiedMinutes / targetMinutes) * 100));
    goal.completed = goal.studiedMinutes >= targetMinutes;
    await goal.save();

    await User.findByIdAndUpdate(userId, { $set: { "goalConfig.dailyMinutes": targetMinutes } });

    const dashboard = await dashboardForUser(userId);
    return res.json({ goal, dashboard });
  } catch (err) {
    next(err);
  }
});

router.put("/users/:userId/goals/config", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { dailyMinutes, weeklyTargetMinutes, weeklySessionTarget } = req.body;

    const patch = {};
    if (typeof dailyMinutes === "number") patch["goalConfig.dailyMinutes"] = dailyMinutes;
    if (typeof weeklyTargetMinutes === "number") patch["goalConfig.weeklyTargetMinutes"] = weeklyTargetMinutes;
    if (typeof weeklySessionTarget === "number") patch["goalConfig.weeklySessionTarget"] = weeklySessionTarget;

    const user = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    const goal = await ensureDailyGoal(userId);
    if (typeof dailyMinutes === "number") {
      goal.targetMinutes = dailyMinutes;
      await goal.save();
    }

    const dashboard = await dashboardForUser(userId);
    return res.json({ user, dashboard });
  } catch (err) {
    next(err);
  }
});


router.put("/users/:userId/modes", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roastMode, identityType, motivationWhy } = req.body;
    const patch = {};
    if (typeof roastMode !== "undefined") patch.roastMode = Boolean(roastMode);
    if (identityType) patch.identityType = identityType;
    if (typeof motivationWhy === "string") patch.motivationWhy = motivationWhy;

    const user = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    const dashboard = await dashboardForUser(userId);
    return res.json({ user, dashboard });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:userId/dashboard", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const dashboard = await dashboardForUser(userId);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

router.get("/users/:userId/sessions/today", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const date = todayKey();
    const sessions = await StudySession.find({ userId, date }).sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/sessions/start", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { subject = "General", studyMode = "custom", plannedDurationMinutes = 0, riskMode = false } = req.body;
    const existing = await StudySession.findOne({ userId, status: { $in: ["running", "paused"] } });

    if (existing) {
      return res.status(409).json({ message: "A session is already active", session: existing });
    }

    const session = await StudySession.create({
      userId,
      date: todayKey(),
      startedAt: new Date(),
      status: "running",
      subject: subject || "General",
      studyMode: ["pomodoro", "deep", "custom"].includes(studyMode) ? studyMode : "custom",
      plannedDurationMinutes: Math.max(0, Number(plannedDurationMinutes || 0)),
      riskMode: Boolean(riskMode)
    });

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/sessions/:sessionId/pause", async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;
    const { reason = "manual" } = req.body;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (session.status !== "running") {
      return res.status(400).json({ message: "Only running sessions can be paused" });
    }

    session.status = "paused";
    session.pauseCount += 1;
    session.pauses.push({ startedAt: new Date(), reason });
    await session.save();

    res.json({ session });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/sessions/:sessionId/resume", async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (session.status !== "paused") {
      return res.status(400).json({ message: "Only paused sessions can resume" });
    }

    const lastPause = session.pauses[session.pauses.length - 1];
    if (lastPause && !lastPause.endedAt) {
      lastPause.endedAt = new Date();
    }

    session.status = "running";
    await session.save();

    res.json({ session });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/sessions/:sessionId/end", async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;
    const {
      inactiveSeconds = 0,
      notes = "",
      subject = "",
      stopReason = "",
      antiCheatFlags = 0,
      sessionQualityTag = "",
      studyMode = "",
      plannedDurationMinutes = 0,
      riskMode = false
    } = req.body;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session already completed" });
    }

    const endedAt = new Date();
    session.endedAt = endedAt;

    if (session.status === "paused") {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (lastPause && !lastPause.endedAt) {
        lastPause.endedAt = endedAt;
      }
    }

    const totalSeconds = Math.max(0, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000));
    const pauseSeconds = session.pauses.reduce((sum, pause) => {
      if (!pause.endedAt) {
        return sum;
      }
      return sum + Math.max(0, Math.round((pause.endedAt.getTime() - pause.startedAt.getTime()) / 1000));
    }, 0);

    const effectiveSeconds = Math.max(0, totalSeconds - pauseSeconds - (inactiveSeconds || 0));
    const focusedMinutes = Math.round(effectiveSeconds / 60);

    session.focusedMinutes = focusedMinutes;
    session.inactiveSeconds = inactiveSeconds;
    session.notes = notes;
    session.stopReason = stopReason;
    session.antiCheatFlags = antiCheatFlags;
    session.sessionQualityTag = sessionQualityTag;
    if (subject) session.subject = subject;
    if (studyMode && ["pomodoro", "deep", "custom"].includes(studyMode)) session.studyMode = studyMode;
    if (plannedDurationMinutes > 0) session.plannedDurationMinutes = plannedDurationMinutes;
    if (typeof riskMode === "boolean") session.riskMode = riskMode;
    session.status = "completed";
    await session.save();

    const { goal } = await recalculateDailyTotals(userId, session.date);
    const dashboard = await dashboardForUser(userId);

    res.json({ session, goal, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/sessions/offline-sync", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      sessions = []
    } = req.body;

    if (!Array.isArray(sessions) || !sessions.length) {
      return res.json({ synced: 0 });
    }

    let synced = 0;
    const touchedDates = new Set();
    for (const item of sessions) {
      const startedAt = item.startedAt ? new Date(item.startedAt) : new Date();
      const endedAt = item.endedAt ? new Date(item.endedAt) : new Date();
      const focusedMinutes = Math.max(0, Number(item.focusedMinutes || 0));
      const date = item.date || startedAt.toISOString().slice(0, 10);
      touchedDates.add(date);

      await StudySession.create({
        userId,
        date,
        startedAt,
        endedAt,
        status: "completed",
        focusedMinutes,
        inactiveSeconds: Math.max(0, Number(item.inactiveSeconds || 0)),
        pauseCount: Math.max(0, Number(item.pauseCount || 0)),
        subject: item.subject || "General",
        studyMode: ["pomodoro", "deep", "custom"].includes(item.studyMode) ? item.studyMode : "custom",
        plannedDurationMinutes: Math.max(0, Number(item.plannedDurationMinutes || 0)),
        riskMode: Boolean(item.riskMode),
        notes: item.notes || "",
        stopReason: item.stopReason || "",
        sessionQualityTag: ["deep", "average", "distracted", ""].includes(item.sessionQualityTag) ? item.sessionQualityTag : "",
        offlineSynced: true
      });
      synced += 1;
    }

    for (const date of touchedDates) {
      await recalculateDailyTotals(userId, date);
    }
    await recalculateDailyTotals(userId, todayKey());
    const dashboard = await dashboardForUser(userId);
    return res.json({ synced, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/sessions/:sessionId/reset", async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;
    const { stopReason = "" } = req.body;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (session.status === "completed") {
      return res.status(400).json({ message: "Completed sessions cannot be reset" });
    }

    const now = new Date();
    if (session.status === "paused") {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (lastPause && !lastPause.endedAt) {
        lastPause.endedAt = now;
      }
    }

    session.endedAt = now;
    session.focusedMinutes = 0;
    session.inactiveSeconds = 0;
    session.notes = "Session reset by user";
    session.stopReason = stopReason;
    session.status = "completed";
    await session.save();

    const { goal } = await recalculateDailyTotals(userId, session.date);
    const dashboard = await dashboardForUser(userId);

    return res.json({ session, goal, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/friends/add", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { friendEmail, friendId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let friend = null;
    if (friendId) friend = await User.findById(friendId);
    if (!friend && friendEmail) friend = await User.findOne({ email: friendEmail.toLowerCase() });
    if (!friend) return res.status(404).json({ message: "Friend not found" });

    const selfId = String(user._id);
    const friendDocId = String(friend._id);
    if (selfId === friendDocId) return res.status(400).json({ message: "Cannot add yourself" });

    await User.findByIdAndUpdate(userId, { $addToSet: { friends: friend._id } });
    await User.findByIdAndUpdate(friend._id, { $addToSet: { friends: user._id } });

    const friends = await User.findById(userId).populate("friends", "name college level xp");
    return res.json({ friends: friends?.friends || [] });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:userId/friends/live", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("friends", "name college level xp");
    if (!user) return res.status(404).json({ message: "User not found" });

    const friendIds = (user.friends || []).map((f) => f._id);
    const liveSessions = await StudySession.find({ userId: { $in: friendIds }, status: "running" });
    const liveSet = new Set(liveSessions.map((s) => String(s.userId)));

    const liveFriends = (user.friends || []).map((f) => ({
      userId: f._id,
      name: f.name,
      level: f.level,
      studyingNow: liveSet.has(String(f._id))
    }));

    return res.json({
      friends: liveFriends,
      studyingNowCount: liveFriends.filter((f) => f.studyingNow).length,
      liveMessage: liveFriends.find((f) => f.studyingNow)
        ? `${liveFriends.find((f) => f.studyingNow).name} is studying right now`
        : "No friends live right now"
    });
  } catch (err) {
    next(err);
  }
});

router.get("/leaderboard", async (req, res, next) => {
  try {
    const { college = "General", limit = 10 } = req.query;
    const date = todayKey();

    const users = await User.find({ college }).limit(100);
    const userIds = users.map((u) => u._id);

    const todayGoals = await DailyGoal.find({ userId: { $in: userIds }, date });
    const byUser = new Map(todayGoals.map((g) => [String(g.userId), g]));

    const ranked = users
      .map((u) => {
        const goal = byUser.get(String(u._id));
        return {
          userId: u._id,
          name: u.name,
          college: u.college,
          studiedMinutes: goal?.studiedMinutes || 0,
          completionPercent: goal?.completionPercent || 0,
          completed: Boolean(goal?.completed),
          level: u.level || 1,
          xp: u.xp || 0
        };
      })
      .sort((a, b) => b.studiedMinutes - a.studiedMinutes)
      .slice(0, Number(limit));

    res.json({ leaderboard: ranked, date, college });
  } catch (err) {
    next(err);
  }
});



module.exports = router;
