"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addFriend,
  bootstrapUser,
  endSession,
  fetchDashboard,
  getLiveFriends,
  getTodaySessions,
  loginUser,
  pauseSession,
  registerUser,
  resetSession,
  resumeSession,
  setGoalConfig,
  setModes,
  startSession
} from "../lib/api";
import { Dashboard, LiveFriend, StudySession, User } from "../lib/types";

type Screen = "dashboard" | "timer" | "analytics" | "streak" | "settings";
type AuthMode = "quick" | "register" | "login";

type AppSettings = {
  preferredStudyTime: string;
  punishmentMode: boolean;
  darkMode: boolean;
  notifications: boolean;
  streakProtectionWeek: string;
  streakProtectionUsed: boolean;
  roastMode: boolean;
};

const DEFAULT_NAME = "Focused Student";
const DEFAULT_COLLEGE = "General";
const DEFAULT_SETTINGS: AppSettings = {
  preferredStudyTime: "20:00",
  punishmentMode: true,
  darkMode: false,
  notifications: false,
  streakProtectionWeek: "",
  streakProtectionUsed: false,
  roastMode: true
};

function formatHMS(seconds: number) {
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${sec}`;
}

function weekKey(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return `${date.getFullYear()}-W${Math.ceil((day + start.getDay() + 1) / 7)}`;
}

function compactDate(dateKey: string) {
  const d = new Date(dateKey);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function StudyTrackerApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("quick");
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>([]);
  const [liveMessage, setLiveMessage] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [inactiveSeconds, setInactiveSeconds] = useState(0);
  const [subject, setSubject] = useState("General");
  const [notes, setNotes] = useState("");
  const [timerAlert, setTimerAlert] = useState("");
  const [goalDaily, setGoalDaily] = useState(180);
  const [goalWeekly, setGoalWeekly] = useState(1200);
  const [goalSessions, setGoalSessions] = useState(7);
  const [identityType, setIdentityType] = useState<"Casual" | "Serious" | "Hardcore">("Serious");
  const [motivationWhy, setMotivationWhy] = useState("");
  const [ritualDoneToday, setRitualDoneToday] = useState(false);
  const [antiCheatFlags, setAntiCheatFlags] = useState(0);
  const [stopReason, setStopReason] = useState("");
  const [nameInput, setNameInput] = useState(DEFAULT_NAME);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");

  const hiddenAt = useRef<number | null>(null);
  const lastActivityAt = useRef<number>(Date.now());

  const userKey = useMemo(() => "study-tracker-user-id", []);
  const settingsKey = useMemo(() => "study-tracker-settings", []);
  const ritualKey = useMemo(() => `study-tracker-ritual-${new Date().toISOString().slice(0, 10)}`, []);

  const refreshAll = async (userId: string) => {
    const [dash, todaySessions, live] = await Promise.all([
      fetchDashboard(userId),
      getTodaySessions(userId),
      getLiveFriends(userId).catch(() => ({ friends: [], studyingNowCount: 0, liveMessage: "" }))
    ]);

    setDashboard(dash);
    setGoalDaily(dash.goalTypes.dailyMinutes);
    setGoalWeekly(dash.goalTypes.weeklyTargetMinutes);
    setGoalSessions(dash.goalTypes.weeklySessionTarget);
    setIdentityType(dash.identity.type);
    setSessions(todaySessions.sessions);
    setLiveFriends(live.friends || []);
    setLiveMessage(live.liveMessage || "");

    const running = todaySessions.sessions.find((s) => s.status === "running" || s.status === "paused") || null;
    setActiveSession(running);
    if (running?.subject) setSubject(running.subject);
  };

  useEffect(() => {
    const rawSettings = localStorage.getItem(settingsKey);
    if (rawSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }

    const init = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem(userKey);

        if (!userId) {
          setOnboardingOpen(true);
          setLoading(false);
          return;
        }

        const pseudoUser = { _id: userId, name: DEFAULT_NAME, college: DEFAULT_COLLEGE };
        setUser(pseudoUser);
        await refreshAll(userId);
      } catch (err) {
        setError((err as Error).message || "Failed to initialize app");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [settingsKey, userKey]);

  useEffect(() => {
    document.body.dataset.theme = settings.darkMode ? "dark" : "light";
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings, settingsKey]);

  useEffect(() => {
    setRitualDoneToday(localStorage.getItem(ritualKey) === "done");
  }, [ritualKey]);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const started = new Date(activeSession.startedAt).getTime();
    const tick = () => {
      if (activeSession.status !== "running") return;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    const onVisibility = async () => {
      if (!activeSession || !user) return;

      if (document.hidden && activeSession.status === "running") {
        hiddenAt.current = Date.now();
        try {
          const { session } = await pauseSession(user._id, activeSession._id, "tab-switch");
          setActiveSession(session);
          setTimerAlert("Focus bro... you switched tabs 👀");
        } catch {
          setTimerAlert("Session lost focus. Resume manually.");
        }
      }

      if (!document.hidden && hiddenAt.current) {
        const delta = Math.round((Date.now() - hiddenAt.current) / 1000);
        setInactiveSeconds((prev) => prev + Math.max(0, delta));
        setAntiCheatFlags((prev) => prev + 1);
        hiddenAt.current = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [activeSession, user]);

  useEffect(() => {
    const record = () => {
      lastActivityAt.current = Date.now();
    };
    window.addEventListener("mousemove", record);
    window.addEventListener("keydown", record);
    window.addEventListener("click", record);
    return () => {
      window.removeEventListener("mousemove", record);
      window.removeEventListener("keydown", record);
      window.removeEventListener("click", record);
    };
  }, []);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running" || !user) return;
    const idleTimer = setInterval(async () => {
      const idleFor = Math.floor((Date.now() - lastActivityAt.current) / 1000);
      if (idleFor >= 120) {
        try {
          const { session } = await pauseSession(user._id, activeSession._id, "idle-detected");
          setActiveSession(session);
          setTimerAlert("Paused for inactivity. Are you still studying?");
          setAntiCheatFlags((prev) => prev + 1);
        } catch {
          setTimerAlert("Inactivity detected.");
        }
      }
    }, 15000);

    const randomCheck = setInterval(async () => {
      const ok = window.confirm("Are you still studying?");
      if (!ok) {
        try {
          const { session } = await pauseSession(user._id, activeSession._id, "random-check-fail");
          setActiveSession(session);
          setTimerAlert("Session paused by anti-cheat check.");
          setAntiCheatFlags((prev) => prev + 1);
        } catch {
          setTimerAlert("Anti-cheat check triggered.");
        }
      }
    }, 360000 + Math.floor(Math.random() * 180000));

    return () => {
      clearInterval(idleTimer);
      clearInterval(randomCheck);
    };
  }, [activeSession, user]);

  useEffect(() => {
    if (!settings.notifications || !user || !dashboard) return;

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const timer = setInterval(() => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      const studied = dashboard.todayGoal.studiedMinutes;
      const target = dashboard.todayGoal.targetMinutes;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [prefH, prefM] = settings.preferredStudyTime.split(":").map(Number);
      const preferredMinutes = (prefH * 60) + prefM;

      if (studied === 0 && currentMinutes >= preferredMinutes) {
        new Notification("You haven't studied today");
      }

      const remaining = target - studied;
      if (remaining > 0 && remaining <= 60 && now.getHours() >= 20) {
        new Notification(dashboard.smartReminder || "1 hour left to complete goal");
      }
    }, 1800000);

    return () => clearInterval(timer);
  }, [settings.notifications, settings.preferredStudyTime, user, dashboard]);

  const saveSettings = (next: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
  };

  const submitOnboarding = async () => {
    try {
      setError("");
      let response: { user: User; dashboard: Dashboard };

      if (authMode === "quick") {
        response = await bootstrapUser(nameInput, DEFAULT_COLLEGE, identityType, motivationWhy);
      } else if (authMode === "register") {
        const registerResponse = await registerUser(
          nameInput,
          emailInput,
          passwordInput,
          DEFAULT_COLLEGE,
          identityType,
          motivationWhy
        );
        response = { user: registerResponse.user, dashboard: registerResponse.dashboard };
      } else {
        const loginResponse = await loginUser(emailInput, passwordInput);
        response = { user: loginResponse.user, dashboard: loginResponse.dashboard };
      }

      localStorage.setItem(userKey, response.user._id);
      setUser(response.user);
      await setGoalConfig(response.user._id, {
        dailyMinutes: goalDaily,
        weeklyTargetMinutes: goalWeekly,
        weeklySessionTarget: goalSessions
      });
      await refreshAll(response.user._id);
      setOnboardingOpen(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleGoalUpdate = async () => {
    if (!user) return;
    const { dashboard: updated } = await setGoalConfig(user._id, {
      dailyMinutes: goalDaily,
      weeklyTargetMinutes: goalWeekly,
      weeklySessionTarget: goalSessions
    });
    setDashboard(updated);
  };

  const handleStart = async () => {
    if (!user) return;

    try {
      setError("");
      const { session } = await startSession(user._id, subject);
      setActiveSession(session);
      setInactiveSeconds(0);
      setTimerAlert("");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePauseResume = async () => {
    if (!user || !activeSession) return;

    try {
      if (activeSession.status === "running") {
        const { session } = await pauseSession(user._id, activeSession._id, "manual");
        setActiveSession(session);
      } else {
        const { session } = await resumeSession(user._id, activeSession._id);
        setActiveSession(session);
        setTimerAlert("");
      }
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEnd = async () => {
    if (!user || !activeSession) return;

    try {
      const earlyStop = elapsedSeconds < 1800 || (dashboard && dashboard.todayGoal.completionPercent < 50);
      let reason = stopReason;
      if (earlyStop && !reason) {
        const picked = window.prompt("Why did you stop? (Tired / Distracted / Bored)", "Distracted");
        reason = picked || "";
        setStopReason(reason);
      }
      const { dashboard: updated } = await endSession(
        user._id,
        activeSession._id,
        inactiveSeconds,
        notes,
        subject,
        reason,
        antiCheatFlags
      );
      setDashboard(updated);
      setActiveSession(null);
      setInactiveSeconds(0);
      setAntiCheatFlags(0);
      setNotes("");
      setStopReason("");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleReset = async () => {
    if (!user || !activeSession) return;

    try {
      let reason = stopReason;
      if (!reason) {
        const picked = window.prompt("Why did you stop? (Tired / Distracted / Bored)", "Distracted");
        reason = picked || "";
      }
      const { dashboard: updated } = await resetSession(user._id, activeSession._id, reason);
      setDashboard(updated);
      setActiveSession(null);
      setElapsedSeconds(0);
      setInactiveSeconds(0);
      setAntiCheatFlags(0);
      setNotes("");
      setStopReason("");
      setTimerAlert("Timer reset.");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const useStreakProtection = () => {
    const currentWeek = weekKey();
    if (settings.streakProtectionWeek === currentWeek && settings.streakProtectionUsed) return;
    saveSettings({ streakProtectionWeek: currentWeek, streakProtectionUsed: true });
  };

  const handleAddFriend = async () => {
    if (!user || !friendEmail.trim()) return;
    try {
      await addFriend(user._id, friendEmail.trim());
      setFriendEmail("");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRoastMode = async (enabled: boolean) => {
    if (!user) return;
    saveSettings({ roastMode: enabled });
    try {
      const { dashboard: updated } = await setModes(user._id, enabled, identityType, motivationWhy);
      setDashboard(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleIdentityUpdate = async () => {
    if (!user) return;
    try {
      const { dashboard: updated } = await setModes(user._id, settings.roastMode, identityType, motivationWhy);
      setDashboard(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStartRitual = () => {
    localStorage.setItem(ritualKey, "done");
    setRitualDoneToday(true);
    setScreen("timer");
  };

  if (loading) return <main className="shell">Loading...</main>;

  if (onboardingOpen) {
    return (
      <main className="shell onboarding-screen">
        <section className="card onboarding">
          <h1>Set Your Discipline Baseline</h1>
          <p>Quick setup: goals + preferred time, then start.</p>

          <div className="row wrap">
            <button className={authMode === "quick" ? "nav-btn active" : "nav-btn"} onClick={() => setAuthMode("quick")}>Quick Start</button>
            <button className={authMode === "register" ? "nav-btn active" : "nav-btn"} onClick={() => setAuthMode("register")}>Register</button>
            <button className={authMode === "login" ? "nav-btn active" : "nav-btn"} onClick={() => setAuthMode("login")}>Login</button>
          </div>

          {authMode !== "login" && (
            <label>Name
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            </label>
          )}
          {authMode !== "quick" && (
            <>
              <label>Email
                <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
              </label>
              <label>Password
                <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
              </label>
            </>
          )}

          <label>Daily goal (minutes)
            <input type="number" min={30} max={960} value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} />
          </label>
          <label>User type
            <select value={identityType} onChange={(e) => setIdentityType(e.target.value as "Casual" | "Serious" | "Hardcore")}>
              <option value="Casual">Casual</option>
              <option value="Serious">Serious</option>
              <option value="Hardcore">Hardcore</option>
            </select>
          </label>
          <label>Why are you studying? (Job / Exam / Skill / Salary target)
            <input value={motivationWhy} onChange={(e) => setMotivationWhy(e.target.value)} placeholder="Example: Job - 8 LPA" />
          </label>
          <label>Preferred study time
            <input type="time" value={settings.preferredStudyTime} onChange={(e) => saveSettings({ preferredStudyTime: e.target.value })} />
          </label>
          <button onClick={submitOnboarding}>{authMode === "login" ? "Login & Sync" : "Start Tracking"}</button>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  if (!dashboard || !user) return <main className="shell">Unable to load data. {error}</main>;

  const punishmentActive = settings.punishmentMode && dashboard.punishmentActive;
  const progressPercent = dashboard.todayGoal.completionPercent;
  const timerProgress = Math.min(100, Math.round((elapsedSeconds / Math.max(1, dashboard.todayGoal.targetMinutes * 60)) * 100));
  const streakProtectedThisWeek = settings.streakProtectionWeek === weekKey() && settings.streakProtectionUsed;
  const nav: Array<{ id: Screen; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "timer", label: "Study Timer" },
    { id: "analytics", label: "Analytics" },
    { id: "streak", label: "Streak" },
    { id: "settings", label: "Settings" }
  ];

  return (
    <main className={`shell ${punishmentActive ? "punishment-screen" : ""}`}>
      <header className="top-nav card">
        <h1>Study Tracker</h1>
        <nav>
          {nav.map((item) => (
            <button key={item.id} className={screen === item.id ? "nav-btn active" : "nav-btn"} onClick={() => setScreen(item.id)}>{item.label}</button>
          ))}
        </nav>
      </header>

      {punishmentActive && (
        <section className="card punish-banner">
          <strong>You failed today.</strong>
          <p>Goal missed. Streak pressure is active.</p>
          {settings.roastMode && dashboard.roastMessage && <p className="timer-alert">{dashboard.roastMessage}</p>}
        </section>
      )}

      {screen === "dashboard" && (
        <section className="card page">
          <h2>Dashboard</h2>
          {!ritualDoneToday && (
            <article className="card">
              <p className="muted">Daily Start Ritual</p>
              <h3>Today's goal: {dashboard.startRitual.goalMinutes} min</h3>
              <button onClick={handleStartRitual}>{dashboard.startRitual.title}</button>
            </article>
          )}
          <div className="kpi-grid">
            <article><p>Today's Goal</p><h3>{dashboard.todayGoal.targetMinutes} min</h3></article>
            <article><p>Studied Today</p><h3>{dashboard.todayGoal.studiedMinutes} min</h3></article>
            <article><p>Current Streak</p><h3>{dashboard.streak.current} days</h3></article>
            <article><p>Focus Score</p><h3>{dashboard.focusScore.score}%</h3><small>{dashboard.focusScore.label}</small></article>
            <article><p>XP</p><h3>{dashboard.gamification.xp}</h3></article>
            <article><p>Level</p><h3>{dashboard.gamification.level}/50</h3></article>
            <article><p>Consistency (7d)</p><h3>{dashboard.consistencyScore7d}%</h3></article>
          </div>
          <p className="motivation">{dashboard.identity.message}</p>
          <p className="motivation">{dashboard.focusScore.message}</p>
          {dashboard.motivationReminder && <p className="timer-alert">{dashboard.motivationReminder}</p>}
          <div className="progress-wrap">
            <div className="progress"><span style={{ width: `${progressPercent}%` }} /></div>
            <p>{progressPercent}% complete</p>
          </div>
          <p className="timer-alert">{dashboard.timePressure.message}</p>
          <p className="muted">{dashboard.smartReminder}</p>

          <div className="row wrap">
            <input placeholder="Add friend by email" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} />
            <button onClick={handleAddFriend}>Add Friend</button>
          </div>
          <p className="muted">{liveMessage || "No friends live right now"}</p>
          <p className="muted">{liveFriends.filter((f) => f.studyingNow).length} people studying now</p>
          {liveFriends.length > 0 && (
            <ul className="stats">
              {liveFriends.map((f) => (
                <li key={f.userId}>{f.name} • L{f.level} • {f.studyingNow ? "Studying now" : "Offline"}</li>
              ))}
            </ul>
          )}

          <button onClick={() => setScreen("timer")}>Start Studying</button>

          {dashboard.endOfDayReport.available && (
            <article className="card">
              <h3>End-of-Day Report</h3>
              <p>Total hours: {dashboard.endOfDayReport.totalHours}</p>
              <p>Streak: {dashboard.endOfDayReport.streak}</p>
              <p className={dashboard.endOfDayReport.success ? "muted" : "timer-alert"}>
                {dashboard.endOfDayReport.message}
              </p>
            </article>
          )}

          <article className="card">
            <h3>Habit Loop</h3>
            <p>{dashboard.habitLoop.trigger} -> {dashboard.habitLoop.action} -> {dashboard.habitLoop.reward}</p>
          </article>
        </section>
      )}

      {screen === "timer" && (
        <section className="card page">
          <h2>Study Timer</h2>
          <div className="timer-center">
            <div className="timer-ring big" style={{ ["--ring-fill" as string]: `${timerProgress}%` }}>
              <span>{formatHMS(elapsedSeconds)}</span>
            </div>
          </div>
          <div className="grid two">
            <div>
              <label>Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option>General</option>
                <option>Math</option>
                <option>Science</option>
                <option>DSA</option>
                <option>Programming</option>
                <option>Language</option>
              </select>
            </div>
            <div>
              <label>Session notes</label>
              <textarea rows={3} value={notes} placeholder="What are you covering this session?" onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <label>Why might you stop? (Reflection)</label>
          <select value={stopReason} onChange={(e) => setStopReason(e.target.value)}>
            <option value="">Select reason</option>
            <option value="Tired">Tired</option>
            <option value="Distracted">Distracted</option>
            <option value="Bored">Bored</option>
          </select>
          {timerAlert && <p className="timer-alert">{timerAlert}</p>}
          <p className="muted">Inactive deduction: {Math.round(inactiveSeconds / 60)} min</p>
          <p className="muted">Anti-cheat flags today: {antiCheatFlags}</p>
          <p className="timer-alert">{dashboard.timePressure.message}</p>
          <div className="row wrap">
            <button onClick={handleStart} disabled={Boolean(activeSession)}>Start</button>
            <button onClick={handlePauseResume} disabled={!activeSession}>{activeSession?.status === "paused" ? "Resume" : "Pause"}</button>
            <button onClick={handleReset} disabled={!activeSession}>Reset</button>
            <button onClick={handleEnd} disabled={!activeSession}>Finish</button>
          </div>
        </section>
      )}

      {screen === "analytics" && (
        <section className="card page">
          <h2>Analytics</h2>
          <p className="muted">Smart calendar heatmap (GitHub style)</p>
          <div className="calendar-grid">
            {dashboard.history.slice(-56).map((day) => (
              <span key={day.date} className={`heat ${day.color}`} title={`${day.date}: ${day.studiedMinutes} min`} />
            ))}
          </div>

          <div className="trend-grid">
            {dashboard.history.slice(-14).map((day) => (
              <div key={day.date} className="trend-col" title={`${day.studiedMinutes} min`}>
                <div className={day.completed ? "target-bar ok" : "target-bar bad"}>
                  <span style={{ height: `${Math.min(100, day.completionPercent)}%` }} />
                </div>
                <p>{compactDate(day.date)}</p>
              </div>
            ))}
          </div>

          <div className="kpi-grid analytics-kpis">
            <article><p>Total Hours</p><h3>{dashboard.totals.totalStudyHours}h</h3></article>
            <article><p>Best Study Time</p><h3>{dashboard.deepAnalytics.bestStudyTime}</h3></article>
            <article><p>Avg Session</p><h3>{dashboard.deepAnalytics.averageSessionLength} min</h3></article>
            <article><p>Trend</p><h3>{dashboard.deepAnalytics.trendDirection}</h3></article>
            <article className="missed"><p>Missed Goals</p><h3>{dashboard.streak.missed}</h3></article>
          </div>

          <h3>Subject Tracking</h3>
          <ul className="stats">
            {dashboard.subjectTracking.subjects.map((s) => (
              <li key={s.subject}>{s.subject}: {s.hours}h</li>
            ))}
          </ul>
          {dashboard.subjectTracking.weakAlerts.length > 0 && (
            <p className="timer-alert">Weak alert: {dashboard.subjectTracking.weakAlerts[0]}</p>
          )}

          {dashboard.distractionReflection.reasons.length > 0 && (
            <article className="card">
              <h3>Distraction Reflection</h3>
              <p>Top quit reason: {dashboard.distractionReflection.topReason}</p>
              <ul className="stats">
                {dashboard.distractionReflection.reasons.map((r) => (
                  <li key={r.reason}>{r.reason}: {r.count}</li>
                ))}
              </ul>
            </article>
          )}

          {dashboard.premiumHooks.lockedAnalytics && (
            <article className="card premium-tease">
              <h3>Premium Insight Locked</h3>
              <p>Unlock deep trend forecasting and monthly consistency projections.</p>
            </article>
          )}
        </section>
      )}

      {screen === "streak" && (
        <section className="card page">
          <h2>Streak & Motivation</h2>
          <div className="kpi-grid">
            <article><p>Current</p><h3>{dashboard.streak.current} days</h3></article>
            <article><p>Longest</p><h3>{dashboard.streak.longest} days</h3></article>
            <article><p>Badges</p><h3>{dashboard.gamification.badges.length}</h3></article>
          </div>

          <div className="badges">
            {dashboard.gamification.badges.length === 0 && <span className="badge">No badges yet</span>}
            {dashboard.gamification.badges.map((b) => <span key={b} className="badge unlocked">{b}</span>)}
          </div>

          <p className="motivation">
            {dashboard.streak.current > 0
              ? `${dashboard.streak.current} days strong. Don't mess it up.`
              : "You broke your streak. Start again."}
          </p>

          <h3>Weekly Challenges</h3>
          <div className="stats">
            {dashboard.challenges.map((c) => (
              <p key={c.id}>
                {c.title}: {c.value}/{c.target} {c.completed ? "(Completed)" : "(In progress)"}
              </p>
            ))}
          </div>

          <h3>AI Coach</h3>
          <ul className="stats">
            {dashboard.aiCoach.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
          {dashboard.premiumHooks.lockedAiInsights && (
            <p className="muted">Premium: unlock advanced AI strategy plans.</p>
          )}

          <div className="streak-protection">
            <p>Streak protection (once/week): {streakProtectedThisWeek ? "Used" : "Available"}</p>
            <button onClick={useStreakProtection} disabled={streakProtectedThisWeek}>Use Protection</button>
          </div>
        </section>
      )}

      {screen === "settings" && (
        <section className="card page">
          <h2>Settings</h2>
          <div className="settings-grid">
            <label>
              Daily goal (minutes)
              <input type="number" min={30} max={960} value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} />
            </label>
            <label>
              Weekly target (minutes)
              <input type="number" min={60} max={6000} value={goalWeekly} onChange={(e) => setGoalWeekly(Number(e.target.value))} />
            </label>
            <label>
              Weekly session target
              <input type="number" min={1} max={50} value={goalSessions} onChange={(e) => setGoalSessions(Number(e.target.value))} />
            </label>
            <button onClick={handleGoalUpdate}>Apply Goal Types</button>
            <label className="toggle-row">Enable punishment mode
              <input type="checkbox" checked={settings.punishmentMode} onChange={(e) => saveSettings({ punishmentMode: e.target.checked })} />
            </label>
            <label className="toggle-row">Dark mode
              <input type="checkbox" checked={settings.darkMode} onChange={(e) => saveSettings({ darkMode: e.target.checked })} />
            </label>
            <label className="toggle-row">Notifications
              <input type="checkbox" checked={settings.notifications} onChange={(e) => saveSettings({ notifications: e.target.checked })} />
            </label>
            <label className="toggle-row">Roast mode
              <input type="checkbox" checked={settings.roastMode} onChange={(e) => handleRoastMode(e.target.checked)} />
            </label>
            <label>
              Identity type
              <select value={identityType} onChange={(e) => setIdentityType(e.target.value as "Casual" | "Serious" | "Hardcore")}>
                <option value="Casual">Casual</option>
                <option value="Serious">Serious</option>
                <option value="Hardcore">Hardcore</option>
              </select>
            </label>
            <label>
              Why are you studying?
              <input value={motivationWhy} onChange={(e) => setMotivationWhy(e.target.value)} placeholder="Job / Exam / Skill / salary target" />
            </label>
            <button onClick={handleIdentityUpdate}>Update Identity & Motivation</button>
            <label>
              Preferred study time
              <input type="time" value={settings.preferredStudyTime} onChange={(e) => saveSettings({ preferredStudyTime: e.target.value })} />
            </label>
          </div>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
