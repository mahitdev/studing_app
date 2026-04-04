const DailyGoal = require("../models/DailyGoal");
const StudySession = require("../models/StudySession");
const User = require("../models/User");

const todayKey = () => new Date().toISOString().slice(0, 10);

const levelFromXp = (xp) => Math.min(50, Math.floor((xp || 0) / 600) + 1);

const ensureDailyGoal = async (userId, date = todayKey()) => {
  let goal = await DailyGoal.findOne({ userId, date });
  if (!goal) {
    const user = await User.findById(userId);
    const dailyMinutes = user?.goalConfig?.dailyMinutes || 180;
    goal = await DailyGoal.create({ userId, date, targetMinutes: dailyMinutes });
  }
  return goal;
};

const recalculateDailyTotals = async (userId, date = todayKey()) => {
  const goal = await ensureDailyGoal(userId, date);

  const sessions = await StudySession.find({ userId, date, status: "completed" });
  const studiedMinutes = sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);

  goal.studiedMinutes = studiedMinutes;
  goal.completionPercent = goal.targetMinutes
    ? Math.min(100, Math.round((studiedMinutes / goal.targetMinutes) * 100))
    : 0;
  goal.completed = goal.targetMinutes > 0 && studiedMinutes >= goal.targetMinutes;
  await goal.save();

  return { goal, sessions };
};

const streakFromGoals = (goals) => {
  if (!goals.length) {
    return { current: 0, longest: 0, missed: 0 };
  }

  const byDate = new Map(goals.map((g) => [g.date, g]));
  const dates = goals.map((g) => g.date).sort();

  let longest = 0;
  let running = 0;
  for (const date of dates) {
    const item = byDate.get(date);
    if (item.completed) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    const day = byDate.get(key);
    if (day && day.completed) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }

  const today = todayKey();
  const missed = goals.filter((g) => g.date < today && !g.completed).length;

  return { current, longest, missed };
};

const weeklyMetrics = (goals, weeklyTargetMinutes = 1200) => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const fromKey = from.toISOString().slice(0, 10);

  const weeklyGoals = goals.filter((g) => g.date >= fromKey && g.date <= todayKey());
  const targetMinutes = weeklyGoals.reduce((sum, g) => sum + (g.targetMinutes || 0), 0);
  const studiedMinutes = weeklyGoals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const wastedMinutes = weeklyGoals.reduce(
    (sum, g) => sum + Math.max(0, (g.targetMinutes || 0) - (g.studiedMinutes || 0)),
    0
  );
  const completedDays = weeklyGoals.filter((g) => g.completed).length;

  return {
    weeklyTargetHours: +(targetMinutes / 60).toFixed(1),
    weeklyStudyHours: +(studiedMinutes / 60).toFixed(1),
    weeklyWastedHours: +(wastedMinutes / 60).toFixed(1),
    weeklyCompletionPercent: targetMinutes ? Math.round((studiedMinutes / targetMinutes) * 100) : 0,
    completedDays,
    weeklyGoalTypeTargetHours: +(weeklyTargetMinutes / 60).toFixed(1),
    weeklyGoalTypeCompletionPercent: weeklyTargetMinutes
      ? Math.round((studiedMinutes / weeklyTargetMinutes) * 100)
      : 0
  };
};

const scoreLabel = (score) => {
  if (score >= 85) return "elite";
  if (score >= 70) return "strong";
  if (score >= 50) return "average";
  return "weak";
};

const focusScoreForToday = (todaySessions) => {
  if (!todaySessions.length) {
    return { score: 0, label: "weak", message: "Your focus score today: 0% (weak)" };
  }

  const uninterruptedBonus = todaySessions.reduce((sum, s) => {
    const pausePenalty = (s.pauseCount || 0) * 8;
    const inactivePenalty = Math.round((s.inactiveSeconds || 0) / 60);
    const longSessionBonus = (s.focusedMinutes || 0) >= 45 ? 12 : 4;
    return sum + Math.max(0, longSessionBonus + (s.focusedMinutes || 0) - pausePenalty - inactivePenalty);
  }, 0);

  const maxPossible = todaySessions.reduce((sum, s) => sum + Math.max(20, (s.focusedMinutes || 0) + 12), 0);
  const score = maxPossible ? Math.max(0, Math.min(100, Math.round((uninterruptedBonus / maxPossible) * 100))) : 0;
  const label = scoreLabel(score);

  return { score, label, message: `Your focus score today: ${score}% (${label})` };
};

const dailyHistory = (goals, days = 60) => {
  const byDate = new Map(goals.map((g) => [g.date, g]));
  const output = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const day = byDate.get(key);
    const completionPercent = day?.completionPercent || 0;
    output.push({
      date: key,
      studiedMinutes: day?.studiedMinutes || 0,
      targetMinutes: day?.targetMinutes || 0,
      completionPercent,
      completed: Boolean(day?.completed),
      intensity: Math.min(4, Math.floor(completionPercent / 25)),
      color: completionPercent >= 100 ? "green" : completionPercent >= 50 ? "yellow" : completionPercent > 0 ? "orange" : "red"
    });
  }

  return output;
};

const focusPulse = (sessions) => {
  if (!sessions.length) {
    return { score: 0, level: "Cold Start", avgFocusMinutes: 0, avgInactiveMinutes: 0 };
  }

  const avgFocusMinutes = Math.round(
    sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / sessions.length
  );
  const avgInactiveMinutes = Math.round(
    sessions.reduce((sum, s) => sum + ((s.inactiveSeconds || 0) / 60), 0) / sessions.length
  );
  const avgPause = Math.round(sessions.reduce((sum, s) => sum + (s.pauseCount || 0), 0) / sessions.length);

  const score = Math.max(0, Math.min(100, avgFocusMinutes + 24 - avgInactiveMinutes - (avgPause * 6)));
  let level = "Unstable";
  if (score >= 80) level = "Locked In";
  else if (score >= 60) level = "Solid";
  else if (score >= 40) level = "Warming Up";

  return { score, level, avgFocusMinutes, avgInactiveMinutes };
};

const subjectBreakdown = (sessions) => {
  const map = new Map();
  sessions.forEach((s) => {
    const key = s.subject || "General";
    map.set(key, (map.get(key) || 0) + (s.focusedMinutes || 0));
  });

  const sorted = [...map.entries()]
    .map(([subject, minutes]) => ({ subject, minutes, hours: +(minutes / 60).toFixed(1) }))
    .sort((a, b) => b.minutes - a.minutes);

  const weak = sorted.filter((s) => s.minutes < 90).map((s) => `${s.subject} needs attention.`);
  return { subjects: sorted, weakAlerts: weak.slice(0, 3) };
};

const deepAnalytics = (sessions) => {
  if (!sessions.length) {
    return {
      bestStudyTime: "No data",
      averageSessionLength: 0,
      trendDirection: "flat",
      weekendConsistency: "No weekend data"
    };
  }

  const byHour = new Array(24).fill(0);
  sessions.forEach((s) => {
    byHour[new Date(s.startedAt).getHours()] += s.focusedMinutes || 0;
  });
  const bestHour = byHour.indexOf(Math.max(...byHour));

  const averageSessionLength = Math.round(
    sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / sessions.length
  );

  const latest = sessions.slice(0, Math.min(10, sessions.length));
  const older = sessions.slice(Math.min(10, sessions.length), Math.min(20, sessions.length));
  const latestAvg = latest.length ? latest.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / latest.length : 0;
  const olderAvg = older.length ? older.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / older.length : latestAvg;
  const trendDirection = latestAvg > olderAvg + 5 ? "up" : latestAvg < olderAvg - 5 ? "down" : "flat";

  const weekend = sessions.filter((s) => {
    const day = new Date(s.startedAt).getDay();
    return day === 0 || day === 6;
  });
  const weekday = sessions.filter((s) => {
    const day = new Date(s.startedAt).getDay();
    return day >= 1 && day <= 5;
  });
  const weekendAvg = weekend.length ? weekend.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / weekend.length : 0;
  const weekdayAvg = weekday.length ? weekday.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / weekday.length : 0;

  const weekendConsistency = weekendAvg >= weekdayAvg * 0.7
    ? "You stay fairly consistent on weekends."
    : "You are inconsistent on weekends.";

  return {
    bestStudyTime: `${String(bestHour).padStart(2, "0")}:00`,
    averageSessionLength,
    trendDirection,
    weekendConsistency
  };
};

const roastLines = [
  "Netflix studied more than you today.",
  "You had one job.",
  "Discipline left the chat.",
  "Future you is not impressed."
];

const challengeProgress = (goals, sessions, streak) => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const fromKey = from.toISOString().slice(0, 10);

  const weeklyGoals = goals.filter((g) => g.date >= fromKey && g.date <= todayKey());
  const weeklyMinutes = weeklyGoals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const noMissed = weeklyGoals.length === 7 && weeklyGoals.every((g) => g.completed);

  return [
    {
      id: "study-20h",
      title: "Study 20 hours this week",
      target: 1200,
      value: weeklyMinutes,
      completed: weeklyMinutes >= 1200,
      rewardXp: 250,
      rewardBadge: "20h Warrior"
    },
    {
      id: "no-miss",
      title: "No missed days challenge",
      target: 7,
      value: noMissed ? 7 : Math.max(0, 7 - streak.missed),
      completed: noMissed,
      rewardXp: 200,
      rewardBadge: "Unbreakable Week"
    }
  ];
};

const coachSuggestions = (sessions, deep, weakAlerts) => {
  const suggestions = [];

  suggestions.push(deep.weekendConsistency);
  suggestions.push(`Try studying at ${deep.bestStudyTime} (your best time).`);

  const avgInactive = sessions.length
    ? Math.round(sessions.reduce((sum, s) => sum + ((s.inactiveSeconds || 0) / 60), 0) / sessions.length)
    : 0;
  if (avgInactive > 8) {
    suggestions.push("Your distraction load is high. Lock distractions for 45 minutes blocks.");
  }

  if (weakAlerts.length) {
    suggestions.push(`Weak zone: ${weakAlerts[0]}`);
  }

  return suggestions.slice(0, 4);
};

const identityMessaging = (identityType, completedToday) => {
  if (identityType === "Hardcore") {
    return {
      strictness: 1,
      line: completedToday ? "You executed. Repeat tomorrow." : "No excuses. Finish your goal."
    };
  }
  if (identityType === "Casual") {
    return {
      strictness: 3,
      line: completedToday ? "Nice consistency today." : "Take one focused step right now."
    };
  }
  return {
    strictness: 2,
    line: completedToday ? "Solid work. Keep momentum." : "Stay disciplined. Hit your target."
  };
};

const endOfDayReport = (todayGoal, streak) => {
  const hour = new Date().getHours();
  if (hour < 21) {
    return { available: false, message: "" };
  }

  const success = Boolean(todayGoal?.completed);
  return {
    available: true,
    success,
    totalHours: +((todayGoal?.studiedMinutes || 0) / 60).toFixed(1),
    streak: streak.current,
    message: success ? "Solid work. Repeat tomorrow." : "You slipped. Fix it tomorrow."
  };
};

const quitReasonsSummary = (sessions) => {
  const map = new Map();
  sessions.forEach((s) => {
    if (!s.stopReason) return;
    map.set(s.stopReason, (map.get(s.stopReason) || 0) + 1);
  });
  return [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
};

const applyXpAndBadges = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const goals = await DailyGoal.find({ userId }).sort({ date: 1 });
  const sessions = await StudySession.find({ userId, status: "completed" }).sort({ startedAt: -1 });
  const streak = streakFromGoals(goals);

  const totalFocusedMinutes = sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);
  const totalHours = Math.floor(totalFocusedMinutes / 60);
  const baseXp = totalFocusedMinutes;
  const streakXp = streak.current * 20;
  let xp = baseXp + streakXp;

  const earnedBadges = new Set(user.badges || []);
  if (streak.current >= 7) earnedBadges.add("Disciplined Beast");
  if (totalHours >= 10) earnedBadges.add("10h Grinder");
  if (totalHours >= 50) earnedBadges.add("Focus Titan");

  const challenges = challengeProgress(goals, sessions, streak);
  challenges.forEach((c) => {
    if (c.completed) {
      xp += c.rewardXp;
      earnedBadges.add(c.rewardBadge);
    }
  });

  user.xp = xp;
  user.level = levelFromXp(xp);
  user.badges = [...earnedBadges];
  await user.save();

  return user;
};

const dashboardForUser = async (userId) => {
  await ensureDailyGoal(userId);
  const { goal: todayGoal, sessions: todaySessions } = await recalculateDailyTotals(userId);
  const user = await applyXpAndBadges(userId);

  const goals = await DailyGoal.find({ userId }).sort({ date: 1 });
  const streak = streakFromGoals(goals);
  const weekly = weeklyMetrics(goals, user?.goalConfig?.weeklyTargetMinutes || 1200);

  const sessions = await StudySession.find({ userId, status: "completed" }).sort({ startedAt: -1 }).limit(120);
  const totalMinutes = goals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const identity = identityMessaging(user?.identityType || "Serious", Boolean(todayGoal?.completed));
  const punishmentActive = !todayGoal?.completed && streak.missed >= identity.strictness;
  const history = dailyHistory(goals, 60);
  const pulse = focusPulse(sessions.slice(0, 40));
  const complianceRate = goals.length
    ? Math.round((goals.filter((g) => g.completed).length / goals.length) * 100)
    : 0;

  const subjectStats = subjectBreakdown(sessions);
  const deep = deepAnalytics(sessions);
  const focusToday = focusScoreForToday(todaySessions);
  const challenges = challengeProgress(goals, sessions, streak);
  const aiCoach = coachSuggestions(sessions, deep, subjectStats.weakAlerts);
  const consistencyScore7d = weekly.weeklyCompletionPercent;
  const remainingMinutes = Math.max(0, (todayGoal?.targetMinutes || 0) - (todayGoal?.studiedMinutes || 0));
  const timePressure = {
    remainingMinutes,
    message: remainingMinutes > 0
      ? `${Math.ceil(remainingMinutes / 60)} hours left to finish goal`
      : "Goal completed for today"
  };
  const smartReminder = remainingMinutes > 0
    ? `You're ${Math.ceil(remainingMinutes / 60)} hour behind today.`
    : "You're on track today.";
  const quitReasons = quitReasonsSummary(sessions.slice(0, 60));
  const endReport = endOfDayReport(todayGoal, streak);
  const motivationReminder = user?.motivationWhy
    ? `You said you are studying for: ${user.motivationWhy}. Act like it.`
    : "";

  return {
    todayGoal,
    identity: {
      type: user?.identityType || "Serious",
      strictness: identity.strictness,
      message: identity.line
    },
    startRitual: {
      title: "START YOUR DAY",
      goalMinutes: todayGoal?.targetMinutes || 0
    },
    streak,
    punishmentActive,
    totals: {
      totalStudyHours: +(totalMinutes / 60).toFixed(1),
      totalCompletedDays: goals.filter((g) => g.completed).length,
      totalMissedDays: streak.missed
    },
    weekly,
    history,
    pulse,
    complianceRate,
    consistencyScore7d,
    timePressure,
    smartReminder,
    endOfDayReport: endReport,
    motivationReminder,
    habitLoop: {
      trigger: "Reminder",
      action: "Start timer",
      reward: "XP + streak pressure"
    },
    focusScore: focusToday,
    gamification: {
      xp: user?.xp || 0,
      level: user?.level || 1,
      badges: user?.badges || [],
      nextLevelXp: (user?.level || 1) * 600
    },
    challenges,
    goalTypes: {
      dailyMinutes: user?.goalConfig?.dailyMinutes || 180,
      weeklyTargetMinutes: user?.goalConfig?.weeklyTargetMinutes || 1200,
      weeklySessionTarget: user?.goalConfig?.weeklySessionTarget || 7,
      todaySessionCount: todaySessions.length
    },
    subjectTracking: subjectStats,
    deepAnalytics: deep,
    distractionReflection: {
      reasons: quitReasons,
      topReason: quitReasons[0]?.reason || ""
    },
    aiCoach,
    roastMessage: punishmentActive && user?.roastMode
      ? roastLines[Math.floor(Math.random() * roastLines.length)]
      : "",
    aiSuggestions: aiCoach,
    antiCheat: {
      tabSwitchDetected: todaySessions.some((s) => (s.pauseCount || 0) > 0),
      idleDetected: todaySessions.some((s) => (s.inactiveSeconds || 0) > 0),
      randomCheckEnabled: true
    },
    premiumHooks: {
      lockedAnalytics: true,
      lockedAiInsights: true
    },
    brutalMessage: weekly.weeklyWastedHours > 0
      ? `You wasted ${weekly.weeklyWastedHours} hours this week. Discipline up.`
      : "No wasted hours this week. Stay ruthless."
  };
};

module.exports = {
  todayKey,
  ensureDailyGoal,
  recalculateDailyTotals,
  dashboardForUser,
  applyXpAndBadges
};
