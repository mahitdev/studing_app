const crypto = require("crypto");
const express = require("express");
const User = require("../models/User");
const DailyGoal = require("../models/DailyGoal");
const StudySession = require("../models/StudySession");
const {
  todayKey,
  ensureDailyGoal,
  recalculateDailyTotals,
  dashboardForUser
} = require("../services/trackerService");

const router = express.Router();

const hash = (input) => crypto.createHash("sha256").update(input).digest("hex");

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "study-tracker-backend" });
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const { name, email, password, college = "General" } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({
      name: name?.trim() || "Focused Student",
      college,
      email: email.toLowerCase(),
      passwordHash: hash(password),
      authToken: crypto.randomBytes(24).toString("hex")
    });

    await ensureDailyGoal(user._id);
    const dashboard = await dashboardForUser(user._id);

    return res.status(201).json({ user, token: user.authToken, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || user.passwordHash !== hash(password || "")) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.authToken = crypto.randomBytes(24).toString("hex");
    await user.save();

    const dashboard = await dashboardForUser(user._id);
    return res.json({ user, token: user.authToken, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/users/bootstrap", async (req, res, next) => {
  try {
    const { name, college } = req.body;
    const user = await User.create({
      name: name?.trim() || "Focused Student",
      college: college?.trim() || "General"
    });

    await ensureDailyGoal(user._id);
    const dashboard = await dashboardForUser(user._id);

    res.status(201).json({ user, dashboard });
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
    const { roastMode } = req.body;
    const user = await User.findByIdAndUpdate(userId, { $set: { roastMode: Boolean(roastMode) } }, { new: true });
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
    const { subject = "General" } = req.body;
    const existing = await StudySession.findOne({ userId, status: { $in: ["running", "paused"] } });

    if (existing) {
      return res.status(409).json({ message: "A session is already active", session: existing });
    }

    const session = await StudySession.create({
      userId,
      date: todayKey(),
      startedAt: new Date(),
      status: "running",
      subject: subject || "General"
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
    const { inactiveSeconds = 0, notes = "", subject = "" } = req.body;

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
    if (subject) session.subject = subject;
    session.status = "completed";
    await session.save();

    const { goal } = await recalculateDailyTotals(userId, session.date);
    const dashboard = await dashboardForUser(userId);

    res.json({ session, goal, dashboard });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:userId/sessions/:sessionId/reset", async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;

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
        ? `${liveFriends.find((f) => f.studyingNow).name} is studying right now ??`
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