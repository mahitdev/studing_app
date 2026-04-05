import { Dashboard, StudySession, User } from "./types";

type Store = {
  user: User | null;
  dailyMinutes: number;
  weeklyTargetMinutes: number;
  weeklySessionTarget: number;
  sessions: StudySession[];
  roastMode: boolean;
  identityType: "Casual" | "Serious" | "Hardcore";
  motivationWhy: string;
};

const STORE_KEY = "study-tracker-mock-store-v1";

function loadStore(): Store {
  if (typeof window === "undefined") {
    return {
      user: null,
      dailyMinutes: 180,
      weeklyTargetMinutes: 1200,
      weeklySessionTarget: 7,
      sessions: [],
      roastMode: true,
      identityType: "Serious",
      motivationWhy: ""
    };
  }

  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) throw new Error("no store");
    return JSON.parse(raw) as Store;
  } catch {
    return {
      user: null,
      dailyMinutes: 180,
      weeklyTargetMinutes: 1200,
      weeklySessionTarget: 7,
      sessions: [],
      roastMode: true,
      identityType: "Serious",
      motivationWhy: ""
    };
  }
}

function saveStore(store: Store) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDashboard(store: Store): Dashboard {
  const today = todayKey();
  const todaySessions = store.sessions.filter((s) => s.date === today && s.status === "completed");
  const studiedMinutes = todaySessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);
  const completionPercent = Math.min(100, Math.round((studiedMinutes / Math.max(1, store.dailyMinutes)) * 100));
  const completed = studiedMinutes >= store.dailyMinutes;
  const totalMinutes = store.sessions.filter((s) => s.status === "completed").reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);
  const deepCount = store.sessions.filter((s) => s.sessionQualityTag === "deep").length;
  const avgCount = store.sessions.filter((s) => s.sessionQualityTag === "average").length;
  const disCount = store.sessions.filter((s) => s.sessionQualityTag === "distracted").length;
  const sessionTotal = Math.max(1, store.sessions.length);

  const history = Array.from({ length: 60 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (59 - idx));
    const key = d.toISOString().slice(0, 10);
    const mins = store.sessions
      .filter((s) => s.date === key && s.status === "completed")
      .reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);
    const p = Math.min(100, Math.round((mins / Math.max(1, store.dailyMinutes)) * 100));
    return {
      date: key,
      studiedMinutes: mins,
      targetMinutes: store.dailyMinutes,
      completionPercent: p,
      completed: mins >= store.dailyMinutes,
      intensity: Math.min(4, Math.floor(p / 25)),
      color: p >= 100 ? "green" : p >= 50 ? "yellow" : p > 0 ? "orange" : "red"
    };
  });

  return {
    todayGoal: {
      _id: "mock-goal",
      userId: store.user?._id || "mock-user",
      date: today,
      targetMinutes: store.dailyMinutes,
      studiedMinutes,
      completionPercent,
      completed
    },
    identity: {
      type: store.identityType,
      strictness: store.identityType === "Hardcore" ? 1 : store.identityType === "Casual" ? 3 : 2,
      message: store.identityType === "Hardcore" ? "No excuses. Finish your goal." : "Stay disciplined. Hit your target."
    },
    startRitual: { title: "START YOUR DAY", goalMinutes: store.dailyMinutes },
    streak: { current: completionPercent >= 100 ? 1 : 0, longest: completionPercent >= 100 ? 1 : 0, missed: 0 },
    punishmentActive: false,
    totals: {
      totalStudyHours: +(totalMinutes / 60).toFixed(1),
      totalCompletedDays: history.filter((h) => h.completed).length,
      totalMissedDays: 0
    },
    weekly: {
      weeklyTargetHours: +(store.weeklyTargetMinutes / 60).toFixed(1),
      weeklyStudyHours: +(studiedMinutes / 60).toFixed(1),
      weeklyWastedHours: +((Math.max(0, store.dailyMinutes - studiedMinutes)) / 60).toFixed(1),
      weeklyCompletionPercent: completionPercent,
      completedDays: completionPercent >= 100 ? 1 : 0,
      weeklyGoalTypeTargetHours: +(store.weeklyTargetMinutes / 60).toFixed(1),
      weeklyGoalTypeCompletionPercent: completionPercent
    },
    history,
    pulse: {
      score: Math.max(0, Math.min(100, completionPercent)),
      level: completionPercent >= 70 ? "Solid" : "Warming Up",
      avgFocusMinutes: todaySessions.length ? Math.round(studiedMinutes / todaySessions.length) : 0,
      avgInactiveMinutes: 0
    },
    complianceRate: completionPercent,
    consistencyScore7d: completionPercent,
    timePressure: {
      remainingMinutes: Math.max(0, store.dailyMinutes - studiedMinutes),
      message: studiedMinutes >= store.dailyMinutes ? "Goal completed for today" : `${Math.ceil((store.dailyMinutes - studiedMinutes) / 60)} hours left to finish goal`
    },
    smartReminder: studiedMinutes >= store.dailyMinutes ? "You're on track today." : "You're 1 hour behind today.",
    weeklyRealityReport: {
      available: new Date().getDay() === 0,
      totalHours: +(studiedMinutes / 60).toFixed(1),
      missedDays: 0,
      bestDay: today,
      worstDay: today,
      message: "You wasted 0 days this week."
    },
    futureYouReminder: completionPercent >= 70 ? "Keep this up -> you're ahead of 90% students." : "If you repeat this week for 6 months -> you'll fall behind.",
    endOfDayReport: {
      available: new Date().getHours() >= 21,
      success: completionPercent >= 100,
      totalHours: +(studiedMinutes / 60).toFixed(1),
      streak: completionPercent >= 100 ? 1 : 0,
      message: completionPercent >= 100 ? "Solid work. Repeat tomorrow." : "You slipped. Fix it tomorrow."
    },
    motivationReminder: store.motivationWhy ? `You said you are studying for: ${store.motivationWhy}. Act like it.` : "",
    habitLoop: { trigger: "Reminder", action: "Start timer", reward: "XP + streak pressure" },
    momentum: { score: completionPercent, state: completionPercent >= 70 ? "on-fire" : "stable", message: "You are on a roll." },
    comebackMode: { active: false, reducedGoalMinutes: store.dailyMinutes, message: "" },
    microGoals: [
      { label: "1h checkpoint", targetMinutes: Math.round(store.dailyMinutes / 3), done: studiedMinutes >= Math.round(store.dailyMinutes / 3) },
      { label: "2h checkpoint", targetMinutes: Math.round((store.dailyMinutes * 2) / 3), done: studiedMinutes >= Math.round((store.dailyMinutes * 2) / 3) },
      { label: "Final checkpoint", targetMinutes: store.dailyMinutes, done: studiedMinutes >= store.dailyMinutes }
    ],
    focusScore: { score: completionPercent, label: completionPercent >= 70 ? "strong" : "weak", message: `Your focus score today: ${completionPercent}%` },
    gamification: {
      xp: totalMinutes,
      level: Math.min(50, Math.floor(totalMinutes / 600) + 1),
      badges: completionPercent >= 100 ? ["Disciplined Beast"] : [],
      nextLevelXp: 600
    },
    challenges: [
      { id: "study-20h", title: "Study 20 hours this week", target: 1200, value: studiedMinutes, completed: studiedMinutes >= 1200, rewardXp: 250, rewardBadge: "20h Warrior" }
    ],
    goalTypes: {
      dailyMinutes: store.dailyMinutes,
      weeklyTargetMinutes: store.weeklyTargetMinutes,
      weeklySessionTarget: store.weeklySessionTarget,
      todaySessionCount: todaySessions.length
    },
    sessionQuality: {
      deepPercent: Math.round((deepCount / sessionTotal) * 100),
      averagePercent: Math.round((avgCount / sessionTotal) * 100),
      distractedPercent: Math.round((disCount / sessionTotal) * 100)
    },
    subjectTracking: { subjects: [{ subject: "General", minutes: studiedMinutes, hours: +(studiedMinutes / 60).toFixed(1) }], weakAlerts: [] },
    deepAnalytics: {
      bestStudyTime: "20:00",
      averageSessionLength: todaySessions.length ? Math.round(studiedMinutes / todaySessions.length) : 0,
      trendDirection: "flat",
      weekendConsistency: "No weekend data"
    },
    autoHabitBuilder: { ready: completionPercent >= 70, suggestedTime: "20:00", message: "Auto routine: study daily at 20:00." },
    softLockMode: { active: false, message: "" },
    energyPatternTracking: { strongestWindow: "20:00", quitWindow: "22:00", message: "You're strong around 20:00." },
    distractionReflection: { reasons: [], topReason: "" },
    aiCoach: ["Try 45-minute deep-focus blocks."],
    roastMessage: "",
    aiSuggestions: ["Try 45-minute deep-focus blocks."],
    antiCheat: { tabSwitchDetected: false, idleDetected: false, randomCheckEnabled: true },
    premiumHooks: { lockedAnalytics: true, lockedAiInsights: true },
    brutalMessage: studiedMinutes > 0 ? "Keep pushing. Discipline compounds." : "Start now. No excuses."
  };
}

function newSession(store: Store, subject = "General"): StudySession {
  return {
    _id: `session-${Date.now()}`,
    status: "running",
    startedAt: new Date().toISOString(),
    focusedMinutes: 0,
    pauseCount: 0,
    inactiveSeconds: 0,
    subject,
    notes: "",
    date: todayKey()
  };
}

export async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const store = loadStore();

  if (path === "/users/bootstrap" && method === "POST") {
    const user: User = {
      _id: `user-${Date.now()}`,
      name: body.name || "Focused Student",
      college: body.college || "General"
    };
    store.user = user;
    store.identityType = body.identityType || "Serious";
    store.motivationWhy = body.motivationWhy || "";
    saveStore(store);
    return { user, dashboard: defaultDashboard(store) } as T;
  }

  if (path === "/auth/register" && method === "POST") {
    const user: User = {
      _id: `user-${Date.now()}`,
      name: body.name || "Focused Student",
      college: body.college || "General",
      email: body.email
    };
    store.user = user;
    store.identityType = body.identityType || "Serious";
    store.motivationWhy = body.motivationWhy || "";
    saveStore(store);
    return { user, token: "mock-token", dashboard: defaultDashboard(store) } as T;
  }

  if (path === "/auth/login" && method === "POST") {
    const user = store.user || {
      _id: `user-${Date.now()}`,
      name: "Focused Student",
      college: "General",
      email: body.email
    };
    store.user = user;
    saveStore(store);
    return { user, token: "mock-token", dashboard: defaultDashboard(store) } as T;
  }

  const goalToday = path.match(/^\/users\/([^/]+)\/goals\/today$/);
  if (goalToday && method === "PUT") {
    store.dailyMinutes = Math.max(1, Number(body.targetMinutes || store.dailyMinutes));
    saveStore(store);
    return { dashboard: defaultDashboard(store) } as T;
  }

  const goalConfig = path.match(/^\/users\/([^/]+)\/goals\/config$/);
  if (goalConfig && method === "PUT") {
    if (typeof body.dailyMinutes === "number") store.dailyMinutes = body.dailyMinutes;
    if (typeof body.weeklyTargetMinutes === "number") store.weeklyTargetMinutes = body.weeklyTargetMinutes;
    if (typeof body.weeklySessionTarget === "number") store.weeklySessionTarget = body.weeklySessionTarget;
    saveStore(store);
    return { dashboard: defaultDashboard(store) } as T;
  }

  const modes = path.match(/^\/users\/([^/]+)\/modes$/);
  if (modes && method === "PUT") {
    if (typeof body.roastMode === "boolean") store.roastMode = body.roastMode;
    if (body.identityType) store.identityType = body.identityType;
    if (typeof body.motivationWhy === "string") store.motivationWhy = body.motivationWhy;
    saveStore(store);
    return { dashboard: defaultDashboard(store) } as T;
  }

  const dashboard = path.match(/^\/users\/([^/]+)\/dashboard$/);
  if (dashboard && method === "GET") {
    return defaultDashboard(store) as T;
  }

  const start = path.match(/^\/users\/([^/]+)\/sessions\/start$/);
  if (start && method === "POST") {
    const existing = store.sessions.find((s) => s.status === "running" || s.status === "paused");
    if (existing) return { session: existing } as T;
    const session = newSession(store, body.subject || "General");
    store.sessions.unshift(session);
    saveStore(store);
    return { session } as T;
  }

  const pause = path.match(/^\/users\/([^/]+)\/sessions\/([^/]+)\/pause$/);
  if (pause && method === "POST") {
    const s = store.sessions.find((x) => x._id === pause[2]);
    if (s) {
      s.status = "paused";
      s.pauseCount = (s.pauseCount || 0) + 1;
      saveStore(store);
    }
    return { session: s } as T;
  }

  const resume = path.match(/^\/users\/([^/]+)\/sessions\/([^/]+)\/resume$/);
  if (resume && method === "POST") {
    const s = store.sessions.find((x) => x._id === resume[2]);
    if (s) {
      s.status = "running";
      saveStore(store);
    }
    return { session: s } as T;
  }

  const end = path.match(/^\/users\/([^/]+)\/sessions\/([^/]+)\/end$/);
  if (end && method === "POST") {
    const s = store.sessions.find((x) => x._id === end[2]);
    if (s) {
      const secs = Math.max(0, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000) - (body.inactiveSeconds || 0));
      s.focusedMinutes = Math.round(secs / 60);
      s.status = "completed";
      s.endedAt = new Date().toISOString();
      s.notes = body.notes || "";
      s.subject = body.subject || s.subject;
      s.sessionQualityTag = body.sessionQualityTag || "";
      saveStore(store);
    }
    return { session: s, dashboard: defaultDashboard(store) } as T;
  }

  const reset = path.match(/^\/users\/([^/]+)\/sessions\/([^/]+)\/reset$/);
  if (reset && method === "POST") {
    const s = store.sessions.find((x) => x._id === reset[2]);
    if (s) {
      s.status = "completed";
      s.focusedMinutes = 0;
      s.endedAt = new Date().toISOString();
      saveStore(store);
    }
    return { session: s, dashboard: defaultDashboard(store) } as T;
  }

  const sessionsToday = path.match(/^\/users\/([^/]+)\/sessions\/today$/);
  if (sessionsToday && method === "GET") {
    return { sessions: store.sessions.filter((s) => s.date === todayKey()) } as T;
  }

  if (path.startsWith("/leaderboard")) {
    return { leaderboard: [] } as T;
  }

  if (path.endsWith("/friends/live")) {
    return { friends: [], studyingNowCount: 0, liveMessage: "No friends live right now" } as T;
  }

  if (path.endsWith("/friends/add")) {
    return { friends: [] } as T;
  }

  return {} as T;
}
