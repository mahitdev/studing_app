"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addFriend,
  endSession,
  fetchDashboard,
  getLiveFriends,
  getTodaySessions,
  pauseSession,
  resetSession,
  resumeSession,
  setGoalConfig,
  setModes,
  startSession,
  syncOfflineSessions
} from "../lib/api";
import { Dashboard, LiveFriend, StudySession, User } from "../lib/types";

type Screen = "dashboard" | "timer" | "analytics" | "streak" | "settings";

type AppSettings = {
  preferredStudyTime: string;
  punishmentMode: boolean;
  darkMode: boolean;
  notifications: boolean;
  streakProtectionWeek: string;
  streakProtectionUsed: boolean;
  roastMode: boolean;
};

type OfflineSessionPayload = {
  startedAt: string;
  endedAt: string;
  focusedMinutes: number;
  inactiveSeconds?: number;
  pauseCount?: number;
  subject?: string;
  studyMode?: "pomodoro" | "deep" | "custom";
  plannedDurationMinutes?: number;
  riskMode?: boolean;
  notes?: string;
  stopReason?: string;
  sessionQualityTag?: "deep" | "average" | "distracted" | "";
  date?: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  preferredStudyTime: "20:00",
  punishmentMode: true,
  darkMode: true,
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
  const [studyMode, setStudyMode] = useState<"pomodoro" | "deep" | "custom">("custom");
  const [plannedDuration, setPlannedDuration] = useState(45);
  const [riskMode, setRiskMode] = useState(false);
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
  const [sessionQualityTag, setSessionQualityTag] = useState<"deep" | "average" | "distracted" | "">("");
  const [error, setError] = useState("");
  const [isOfflineSession, setIsOfflineSession] = useState(false);

  const hiddenAt = useRef<number | null>(null);
  const lastActivityAt = useRef<number>(Date.now());

  const userKey = useMemo(() => "study-tracker-user-id", []);
  const authTokenKey = useMemo(() => "study-tracker-auth-token", []);
  const settingsKey = useMemo(() => "study-tracker-settings", []);
  const offlineQueueKey = useMemo(() => "study-tracker-offline-session-queue", []);
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
    if (running?.studyMode) setStudyMode(running.studyMode);
    if (running?.plannedDurationMinutes) setPlannedDuration(running.plannedDurationMinutes);
    if (typeof running?.riskMode === "boolean") setRiskMode(Boolean(running.riskMode));
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
        const authToken = localStorage.getItem(authTokenKey);
        if (!userId || !authToken) {
          setLoading(false);
          return;
        }

        const pseudoUser = { _id: userId, name: "Focused Student", college: "General" };
        setUser(pseudoUser);
        await refreshAll(userId);
      } catch (err) {
        setError((err as Error).message || "Failed to initialize app");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [authTokenKey, settingsKey, userKey]);

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

    return () => clearInterval(idleTimer);
  }, [activeSession, user]);

  useEffect(() => {
    if (!dashboard || !settings.notifications || typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const pushPressure = async () => {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return;

      const first = dashboard.pressureNotifications?.[0];
      if (first) {
        new Notification("FocusFlow Pressure", { body: first });
      }
    };

    pushPressure();
  }, [dashboard, settings.notifications]);

  useEffect(() => {
    if (!user) return;
    const flush = async () => {
      try {
        const raw = localStorage.getItem(offlineQueueKey);
        if (!raw) return;
        const pending = JSON.parse(raw) as OfflineSessionPayload[];
        if (!pending.length) return;
        const { dashboard: updated } = await syncOfflineSessions(user._id, pending);
        setDashboard(updated);
        localStorage.removeItem(offlineQueueKey);
        setTimerAlert("Offline sessions synced successfully.");
      } catch {
        // keep queue for next online event
      }
    };

    const handleOnline = () => {
      flush();
    };

    window.addEventListener("online", handleOnline);
    flush();
    return () => window.removeEventListener("online", handleOnline);
  }, [offlineQueueKey, user]);

  const saveSettings = (next: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
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
      if (dashboard?.softLockMode.active) {
        const proceed = window.confirm(dashboard.softLockMode.message || "You planned to study. Continue?");
        if (!proceed) return;
      }
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      const { session } = await startSession(user._id, subject, studyMode, modeMinutes, riskMode);
      setActiveSession(session);
      setInactiveSeconds(0);
      setIsOfflineSession(false);
      setTimerAlert("");
      await refreshAll(user._id);
    } catch (err) {
      const offlineId = `offline-${Date.now()}`;
      const startedAt = new Date().toISOString();
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      setActiveSession({
        _id: offlineId,
        status: "running",
        startedAt,
        focusedMinutes: 0,
        pauseCount: 0,
        inactiveSeconds: 0,
        subject,
        studyMode,
        plannedDurationMinutes: modeMinutes,
        riskMode,
        date: startedAt.slice(0, 10)
      });
      setElapsedSeconds(0);
      setInactiveSeconds(0);
      setIsOfflineSession(true);
      setTimerAlert("Offline mode active. Session will sync when internet is back.");
    }
  };

  const handlePauseResume = async () => {
    if (!user || !activeSession) return;
    if (isOfflineSession) {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return { ...prev, status: prev.status === "running" ? "paused" : "running" };
      });
      return;
    }

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
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      if (isOfflineSession) {
        const started = new Date(activeSession.startedAt).getTime();
        const endedAt = new Date().toISOString();
        const focusedMinutes = Math.max(0, Math.round((Date.now() - started) / 60000) - Math.round(inactiveSeconds / 60));
        const raw = localStorage.getItem(offlineQueueKey);
        const queue = (raw ? JSON.parse(raw) : []) as OfflineSessionPayload[];
        queue.push({
          startedAt: activeSession.startedAt,
          endedAt,
          focusedMinutes,
          inactiveSeconds,
          pauseCount: activeSession.pauseCount || 0,
          subject,
          studyMode,
          plannedDurationMinutes: modeMinutes,
          riskMode,
          notes,
          stopReason,
          sessionQualityTag,
          date: activeSession.date
        });
        localStorage.setItem(offlineQueueKey, JSON.stringify(queue));
        setActiveSession(null);
        setInactiveSeconds(0);
        setAntiCheatFlags(0);
        setNotes("");
        setStopReason("");
        setSessionQualityTag("");
        setIsOfflineSession(false);
        setTimerAlert("Offline session saved. It will sync automatically.");
        return;
      }

      const { dashboard: updated } = await endSession(
        user._id,
        activeSession._id,
        inactiveSeconds,
        notes,
        subject,
        stopReason,
        antiCheatFlags,
        sessionQualityTag,
        studyMode,
        modeMinutes,
        riskMode
      );
      setDashboard(updated);
      setActiveSession(null);
      setInactiveSeconds(0);
      setAntiCheatFlags(0);
      setNotes("");
      setStopReason("");
      setSessionQualityTag("");
      setIsOfflineSession(false);
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleReset = async () => {
    if (!user || !activeSession) return;
    if (isOfflineSession) {
      setActiveSession(null);
      setElapsedSeconds(0);
      setInactiveSeconds(0);
      setAntiCheatFlags(0);
      setNotes("");
      setStopReason("");
      setSessionQualityTag("");
      setIsOfflineSession(false);
      return;
    }
    const { dashboard: updated } = await resetSession(user._id, activeSession._id, stopReason);
    setDashboard(updated);
    setActiveSession(null);
    setElapsedSeconds(0);
    setInactiveSeconds(0);
    setAntiCheatFlags(0);
    setNotes("");
    setStopReason("");
    setSessionQualityTag("");
    setIsOfflineSession(false);
    await refreshAll(user._id);
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

  const handleIdentityUpdate = async () => {
    if (!user) return;
    const { dashboard: updated } = await setModes(user._id, settings.roastMode, identityType, motivationWhy);
    setDashboard(updated);
  };

  const handleStartRitual = () => {
    localStorage.setItem(ritualKey, "done");
    setRitualDoneToday(true);
    setScreen("timer");
  };

  const quickStartPomodoro = async () => {
    setStudyMode("pomodoro");
    setPlannedDuration(25);
    setScreen("timer");
    if (!user) return;
    try {
      const { session } = await startSession(user._id, subject, "pomodoro", 25, riskMode);
      setActiveSession(session);
      setInactiveSeconds(0);
      setIsOfflineSession(false);
      setTimerAlert("");
      await refreshAll(user._id);
    } catch {
      const startedAt = new Date().toISOString();
      setActiveSession({
        _id: `offline-${Date.now()}`,
        status: "running",
        startedAt,
        focusedMinutes: 0,
        pauseCount: 0,
        inactiveSeconds: 0,
        subject,
        studyMode: "pomodoro",
        plannedDurationMinutes: 25,
        riskMode,
        date: startedAt.slice(0, 10)
      });
      setElapsedSeconds(0);
      setInactiveSeconds(0);
      setIsOfflineSession(true);
      setTimerAlert("Offline mode active. Session will sync when internet is back.");
    }
  };

  if (loading) return <main className="shell">Loading...</main>;

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Sign in required</h1>
          <p>Use proper auth pages to continue.</p>
          <div className="row wrap">
            <Link href="/signin" className="cta">Sign In</Link>
            <Link href="/signup" className="ghost">Sign Up</Link>
          </div>
        </section>
      </main>
    );
  }

  if (!dashboard) return <main className="shell">Unable to load data. {error}</main>;

  const punishmentActive = settings.punishmentMode && dashboard.punishmentActive;
  const progressPercent = dashboard.todayGoal.completionPercent;
  const timerProgress = Math.min(100, Math.round((elapsedSeconds / Math.max(1, dashboard.todayGoal.targetMinutes * 60)) * 100));
  const nav: Array<{ id: Screen; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "timer", label: "Timer" },
    { id: "analytics", label: "Analytics" },
    { id: "streak", label: "Streak" },
    { id: "settings", label: "Settings" }
  ];

  return (
    <main className={`shell ${punishmentActive ? "punishment-screen" : ""}`}>
      <header className="top-nav card">
        <h1>Study Dashboard</h1>
        <nav>
          {nav.map((item) => (
            <button key={item.id} className={screen === item.id ? "nav-btn active" : "nav-btn"} onClick={() => setScreen(item.id)}>{item.label}</button>
          ))}
          <Link href="/signout" className="nav-btn">Sign Out</Link>
        </nav>
      </header>

      {screen === "dashboard" && (
        <section className="card page">
          {!ritualDoneToday && <button onClick={handleStartRitual}>{dashboard.startRitual.title}</button>}
          <button onClick={quickStartPomodoro}>Start 25 min focus</button>
          <div className="kpi-grid">
            <article><p>Goal</p><h3>{dashboard.todayGoal.targetMinutes} min</h3></article>
            <article><p>Studied</p><h3>{dashboard.todayGoal.studiedMinutes} min</h3></article>
            <article><p>Momentum</p><h3>{dashboard.momentum.score}%</h3></article>
            <article><p>Focus</p><h3>{dashboard.focusScore.score}%</h3></article>
          </div>
          <div className="progress"><span style={{ width: `${progressPercent}%` }} /></div>
          <p className="muted">{dashboard.timePressure.message}</p>
          {dashboard.recovery?.eligible && <p className="timer-alert">{dashboard.recovery.message}</p>}
          {dashboard.identityReminder && <p>{dashboard.identityReminder}</p>}
          {dashboard.pressureNotifications?.length ? (
            <article className="card">
              <h3>Pressure</h3>
              <div className="stats">
                {dashboard.pressureNotifications.map((item, idx) => <p key={`${item}-${idx}`}>{item}</p>)}
              </div>
            </article>
          ) : null}
          <div className="row wrap">
            <input placeholder="Add friend by email" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} />
            <button onClick={handleAddFriend}>Add Friend</button>
          </div>
          <p className="muted">{liveMessage}</p>
          <p>{dashboard.futureYouReminder}</p>
        </section>
      )}

      {screen === "timer" && (
        <section className="card page">
          <div className="timer-center">
            <div className="timer-ring big" style={{ ["--ring-fill" as string]: `${timerProgress}%` }}><span>{formatHMS(elapsedSeconds)}</span></div>
          </div>
          <div className="row wrap">
            <button type="button" className={studyMode === "pomodoro" ? "nav-btn active" : "nav-btn"} onClick={() => { setStudyMode("pomodoro"); setPlannedDuration(25); }}>25m Pomodoro</button>
            <button type="button" className={studyMode === "deep" ? "nav-btn active" : "nav-btn"} onClick={() => { setStudyMode("deep"); setPlannedDuration(50); }}>50m Deep Work</button>
            <button type="button" className={studyMode === "custom" ? "nav-btn active" : "nav-btn"} onClick={() => setStudyMode("custom")}>Custom</button>
          </div>
          {studyMode === "custom" && (
            <label>Custom duration (minutes)<input type="number" min={10} max={240} value={plannedDuration} onChange={(e) => setPlannedDuration(Number(e.target.value))} /></label>
          )}
          <label className="toggle-row">Risk mode (double XP if completed)<input type="checkbox" checked={riskMode} onChange={(e) => setRiskMode(e.target.checked)} /></label>
          <div className="grid two">
            <div><label>Subject</label><select value={subject} onChange={(e) => setSubject(e.target.value)}><option>General</option><option>Math</option><option>Science</option><option>Programming</option></select></div>
            <div><label>Notes</label><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <label>Session quality</label>
          <select value={sessionQualityTag} onChange={(e) => setSessionQualityTag(e.target.value as "deep" | "average" | "distracted" | "") }>
            <option value="">Select</option><option value="deep">Deep focus</option><option value="average">Average</option><option value="distracted">Distracted</option>
          </select>
          <div className="row wrap">
            <button onClick={handleStart} disabled={Boolean(activeSession)}>Start</button>
            <button onClick={handlePauseResume} disabled={!activeSession}>{activeSession?.status === "paused" ? "Resume" : "Pause"}</button>
            <button onClick={handleReset} disabled={!activeSession}>Reset</button>
            <button onClick={handleEnd} disabled={!activeSession}>Finish</button>
          </div>
          {timerAlert && <p className="timer-alert">{timerAlert}</p>}
        </section>
      )}

      {screen === "analytics" && (
        <section className="card page">
          <div className="calendar-grid">
            {dashboard.history.slice(-56).map((day) => (
              <span key={day.date} className={`heat ${day.color}`} title={`${day.date}: ${day.studiedMinutes} min`} />
            ))}
          </div>
          <div className="trend-grid">
            {dashboard.history.slice(-14).map((day) => (
              <div key={day.date} className="trend-col"><div className={day.completed ? "target-bar ok" : "target-bar bad"}><span style={{ height: `${Math.min(100, day.completionPercent)}%` }} /></div><p>{compactDate(day.date)}</p></div>
            ))}
          </div>
          {dashboard.effortVsResult && <article className="card"><h3>Effort vs Result</h3><p>{dashboard.effortVsResult.message}</p></article>}
          {dashboard.weakDayDetection && <article className="card"><h3>Weak Day Detection</h3><p>{dashboard.weakDayDetection.reminder}</p></article>}
          {dashboard.lazyPattern && <article className="card"><h3>Lazy Pattern</h3><p>{dashboard.lazyPattern.message}</p></article>}
          {dashboard.longTermProgress && <article className="card"><h3>Long-Term Progress</h3><p>{`This month: ${dashboard.longTermProgress.monthlyHours}h | Growth: ${dashboard.longTermProgress.growthPercent}%`}</p></article>}
          {dashboard.sessionReplay?.length ? (
            <article className="card">
              <h3>Session History Replay</h3>
              <div className="stats">
                {dashboard.sessionReplay.map((s) => (
                  <p key={s.sessionId}>
                    {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {s.minutes}m - {s.subject} - {s.studyMode}{s.riskMode ? " (Risk)" : ""}
                  </p>
                ))}
              </div>
            </article>
          ) : null}
          <article className="card"><h3>Energy Pattern</h3><p>{dashboard.energyPatternTracking.message}</p></article>
        </section>
      )}

      {screen === "streak" && (
        <section className="card page">
          <div className="kpi-grid">
            <article><p>Current Streak</p><h3>{dashboard.streak.current}</h3></article>
            <article><p>Longest</p><h3>{dashboard.streak.longest}</h3></article>
            <article><p>Consistency</p><h3>{dashboard.consistencyScore7d}%</h3></article>
          </div>
          <article className="card"><h3>Auto Habit Builder</h3><p>{dashboard.autoHabitBuilder.message}</p></article>
          {dashboard.weeklySelfRank && <article className="card"><h3>Weekly Rank (Self)</h3><p>{`${dashboard.weeklySelfRank.rank} rank - ${dashboard.weeklySelfRank.message}`}</p></article>}
        </section>
      )}

      {screen === "settings" && (
        <section className="card page">
          <label>Daily goal<input type="number" value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} /></label>
          <label>Weekly target<input type="number" value={goalWeekly} onChange={(e) => setGoalWeekly(Number(e.target.value))} /></label>
          <label>Session target<input type="number" value={goalSessions} onChange={(e) => setGoalSessions(Number(e.target.value))} /></label>
          <label className="toggle-row">Dark mode<input type="checkbox" checked={settings.darkMode} onChange={(e) => saveSettings({ darkMode: e.target.checked })} /></label>
          <label className="toggle-row">Pressure notifications<input type="checkbox" checked={settings.notifications} onChange={(e) => saveSettings({ notifications: e.target.checked })} /></label>
          <label>Identity<select value={identityType} onChange={(e) => setIdentityType(e.target.value as "Casual" | "Serious" | "Hardcore")}><option value="Casual">Casual</option><option value="Serious">Serious</option><option value="Hardcore">Hardcore</option></select></label>
          <label>Motivation<input value={motivationWhy} onChange={(e) => setMotivationWhy(e.target.value)} /></label>
          <button onClick={handleGoalUpdate}>Apply Goals</button>
          <button onClick={handleIdentityUpdate}>Apply Profile</button>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
