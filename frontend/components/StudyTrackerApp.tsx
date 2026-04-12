"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  addFriend,
  endSession,
  fetchDashboard,
  getLiveFriends,
  getTodaySessions,
  pauseSession,
  resetSession,
  resumeSession,
  sendProgressEmail,
  setGoalConfig,
  setModes,
  startSession,
  syncOfflineSessions,
  fetchAnalytics
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

function elapsedForSession(session: StudySession, nowMs = Date.now()) {
  const startedMs = new Date(session.startedAt).getTime();
  const totalMs = Math.max(0, nowMs - startedMs);
  const pausedMs = (session.pauses || []).reduce((sum, pause) => {
    const pauseStart = new Date(pause.startedAt).getTime();
    const pauseEnd = pause.endedAt ? new Date(pause.endedAt).getTime() : nowMs;
    return sum + Math.max(0, pauseEnd - pauseStart);
  }, 0);
  return Math.max(0, Math.floor((totalMs - pausedMs) / 1000));
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
  const [summaryEmail, setSummaryEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [identityType, setIdentityType] = useState<"Casual" | "Serious" | "Hardcore">("Serious");
  const [motivationWhy, setMotivationWhy] = useState("");
  const [ritualDoneToday, setRitualDoneToday] = useState(false);
  const [antiCheatFlags, setAntiCheatFlags] = useState(0);
  const [stopReason, setStopReason] = useState("");
  const [sessionQualityTag, setSessionQualityTag] = useState<"deep" | "average" | "distracted" | "">("");
  const [error, setError] = useState("");
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [pythonAnalytics, setPythonAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

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
    if (screen === "analytics" && user && !analyticsLoaded && !loadingAnalytics) {
      setLoadingAnalytics(true);
      fetchAnalytics(user._id)
        .then((data) => {
          setPythonAnalytics(data);
          setAnalyticsLoaded(true);
        })
        .catch((err) => {
          console.error("Analytics fetch error:", err);
          setPythonAnalytics({ error: true, message: "Currently offline." });
          setAnalyticsLoaded(true);
        })
        .finally(() => setLoadingAnalytics(false));
    }
  }, [screen, user, analyticsLoaded, loadingAnalytics]);


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

    const initialElapsed = elapsedForSession(activeSession);
    setElapsedSeconds(initialElapsed);

    if (activeSession.status !== "running") return undefined;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

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
    const onMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--mx", `${x}%`);
      document.documentElement.style.setProperty("--my", `${y}%`);
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    const onClickRipple = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest("button, .cta, .nav-btn") as HTMLElement | null;
      if (!button) return;

      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const rect = button.getBoundingClientRect();
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 500);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClickRipple);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClickRipple);
    };
  }, []);

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
      const message = (err as Error).message || "";
      if (message.toLowerCase().includes("already active")) {
        setTimerAlert("You already have an active session. Resume or finish it first.");
        await refreshAll(user._id);
        return;
      }
      if (
        message.toLowerCase().includes("authentication required") ||
        message.toLowerCase().includes("invalid or expired token")
      ) {
        setError("Session expired. Please sign in again.");
        return;
      }

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

  const handleEmailSummary = async () => {
    if (!user) return;
    try {
      setEmailStatus("");
      const res = await sendProgressEmail(user._id, summaryEmail.trim());
      setEmailStatus(res.message);
    } catch (err) {
      setEmailStatus((err as Error).message || "Could not send email right now.");
    }
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
    } catch (err) {
      const message = (err as Error).message || "";
      if (message.toLowerCase().includes("already active")) {
        setTimerAlert("You already have an active session. Resume or finish it first.");
        await refreshAll(user._id);
        return;
      }
      if (
        message.toLowerCase().includes("authentication required") ||
        message.toLowerCase().includes("invalid or expired token")
      ) {
        setError("Session expired. Please sign in again.");
        return;
      }

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

  if (loading) {
    return (
      <main className="shell shimmer-wrap">
        <div className="shimmer-block" />
        <div className="shimmer-block" />
        <div className="shimmer-block" />
      </main>
    );
  }

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
  const activeDurationMinutes = activeSession?.plannedDurationMinutes || (studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration);
  const timerProgress = Math.min(100, Math.round((elapsedSeconds / Math.max(1, activeDurationMinutes * 60)) * 100));
  const nav: Array<{ id: Screen; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "timer", label: "Timer" },
    { id: "analytics", label: "Analytics" },
    { id: "streak", label: "Streak" },
    { id: "settings", label: "Settings" }
  ];

  return (
    <main className={`shell app-shell ${punishmentActive ? "punishment-screen" : ""}`}>
      <div className="cursor-glow" aria-hidden />
      <aside className="card sidebar">
        <h1>GrindLock</h1>
        <p className="muted">Discipline Driven OS</p>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <button key={item.id} className={screen === item.id ? "nav-btn active" : "nav-btn"} onClick={() => setScreen(item.id)}>{item.label}</button>
          ))}
          <Link href="/signout" className="nav-btn">Sign Out</Link>
        </nav>
      </aside>

      <div className="main-column">
        <header className="topbar card">
          <div>
            <h2>Performance Console</h2>
            <p className="muted">Stay locked in. No excuses.</p>
          </div>
          <div className="topbar-stats">
            <span>XP: {dashboard.gamification.xp}</span>
            <span>Level: {dashboard.gamification.level}</span>
            <button onClick={quickStartPomodoro}>Start 25m Focus</button>
          </div>
        </header>

        <div className="page-stage">
          <AnimatePresence mode="wait">
            {screen === "dashboard" && (
              <motion.section
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="page screen-panel"
              >
                {!ritualDoneToday && (
                  <button className="ritual-cta" onClick={handleStartRitual}>
                    {dashboard.startRitual.title}
                  </button>
                )}
                
                <div className="goal-ring-wrap">
                  <div className="goal-ring" style={{ ["--ring-fill" as string]: `${progressPercent}%` }}>
                    <span>{progressPercent}%</span>
                    <small>Completed</small>
                  </div>
                </div>

                <div className="kpi-grid">
                  <article>
                    <p>Daily Goal</p>
                    <h3>{dashboard.todayGoal.targetMinutes}m</h3>
                  </article>
                  <article>
                    <p>Focus Time</p>
                    <h3>{dashboard.todayGoal.studiedMinutes}m</h3>
                  </article>
                  <article>
                    <p>Momentum</p>
                    <h3>{dashboard.momentum.score}%</h3>
                  </article>
                  <article>
                    <p>Focus Score</p>
                    <h3>{dashboard.focusScore.score}%</h3>
                  </article>
                </div>

                <div className="card pressure-box">
                  <p className="accent-text uppercase text-[10px] font-bold tracking-widest mb-2">System Status</p>
                  <p className="text-lg font-medium">{dashboard.timePressure.message}</p>
                </div>

                {dashboard.pressureNotifications?.length ? (
                  <div className="flex flex-col gap-4">
                    {dashboard.pressureNotifications.map((item, idx) => (
                      <article key={`${item}-${idx}`} className="alert-card">
                        <span className="pulse-dot" />
                        <p>{item}</p>
                      </article>
                    ))}
                  </div>
                ) : null}

                <div className="card glass-panel mt-4">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-2xl">👥</span>
                    <div>
                      <h3 className="text-sm font-bold">Network Synergy</h3>
                      <p className="text-xs muted">{liveMessage || "No active sync partners"}</p>
                    </div>
                  </div>
                  <div className="row wrap">
                    <input 
                      placeholder="Partner's Email (e.g. rival@study.com)" 
                      className="flex-1"
                      value={friendEmail} 
                      onChange={(e) => setFriendEmail(e.target.value)} 
                    />
                    <button onClick={handleAddFriend}>Add</button>
                  </div>
                </div>
              </motion.section>
            )}

            {screen === "timer" && (
              <motion.section
                key="timer"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="page screen-panel timer-screen"
              >
                <div className="timer-center">
                  <div 
                    className={`timer-ring big ${activeSession?.status === "running" ? "pulse-active" : ""}`} 
                    style={{ ["--ring-fill" as string]: `${timerProgress}%` }}
                  >
                    <span>{formatHMS(elapsedSeconds)}</span>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-8 w-full max-w-2xl mx-auto">
                  <div className="row justify-center gap-4">
                    <button 
                      className={studyMode === "pomodoro" ? "nav-btn active" : "nav-btn"} 
                      onClick={() => { setStudyMode("pomodoro"); setPlannedDuration(25); }}
                    >
                      Pomodoro (25)
                    </button>
                    <button 
                      className={studyMode === "deep" ? "nav-btn active" : "nav-btn"} 
                      onClick={() => { setStudyMode("deep"); setPlannedDuration(50); }}
                    >
                      Deep Work (50)
                    </button>
                    <button 
                      className={studyMode === "custom" ? "nav-btn active" : "nav-btn"} 
                      onClick={() => setStudyMode("custom")}
                    >
                      Custom
                    </button>
                  </div>

                  <div className="grid two gap-6">
                    <div className="flex flex-col gap-2 text-left">
                      <label>Subject Focus</label>
                      <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                        <option>General</option>
                        <option>Math</option>
                        <option>Science</option>
                        <option>Programming</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-2 text-left">
                      <label>Session Type</label>
                      <label className="toggle-row glass p-3 rounded-xl border border-white/5">
                        <span className="text-xs font-bold uppercase tracking-wider">Risk Mode</span>
                        <input type="checkbox" checked={riskMode} onChange={(e) => setRiskMode(e.target.checked)} />
                      </label>
                    </div>
                  </div>

                  <div className="row wrap justify-center gap-4">
                    <button className="primary-glow px-12" onClick={handleStart} disabled={Boolean(activeSession)}>Initialize Session</button>
                    <button className="secondary ghost" onClick={handlePauseResume} disabled={!activeSession}>
                      {activeSession?.status === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button className="danger ghost" onClick={handleEnd} disabled={!activeSession}>Terminate</button>
                  </div>
                  
                  {timerAlert && <p className="timer-alert">{timerAlert}</p>}
                </div>
              </motion.section>
            )}

            {screen === "analytics" && (
              <motion.section
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="page screen-panel python-analytics-panel"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter gradient-text">DEEP ENGINE.</h2>
                    <p className="muted text-xs font-bold tracking-[0.2em] uppercase">Neural Performance Analytics</p>
                  </div>
                  <div className="px-4 py-2 glass-light rounded-full text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    System Live
                  </div>
                </div>
                
                {loadingAnalytics ? (
                  <div className="shimmer-wrap">
                    <div className="shimmer-block" style={{ height: "120px" }} />
                    <div className="shimmer-block" style={{ height: "400px" }} />
                  </div>
                ) : pythonAnalytics && !pythonAnalytics.error ? (
                  <div className="flex flex-col gap-8">
                    <div className="kpi-grid">
                      <article className="stat-card blue">
                        <p>Efficiency</p>
                        <h3>{pythonAnalytics.consistency_score}%</h3>
                      </article>
                      <article className="stat-card purple">
                        <p>Avg Session</p>
                        <h3>{pythonAnalytics.average_study_time}m</h3>
                      </article>
                      <article className="stat-card pink">
                        <p>Focus Peak</p>
                        <h3>{pythonAnalytics.focus_score}%</h3>
                      </article>
                    </div>

                    <div className="grid two gap-6">
                      <article className="card insight-card border-l-4 border-accent">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-accent mb-4">Neural Insight</h4>
                        <p className="text-lg font-medium leading-relaxed">{pythonAnalytics.message}</p>
                      </article>
                      <article className="card insight-card border-l-4 border-danger">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-danger mb-4">Performance Leak</h4>
                        <p className="text-lg font-medium leading-relaxed">{pythonAnalytics.weak_pattern}</p>
                      </article>
                    </div>

                    {pythonAnalytics.graphs?.focus_trend && (
                      <article className="card p-4 overflow-hidden">
                        <img 
                          src={`data:image/png;base64,${pythonAnalytics.graphs.focus_trend}`} 
                          alt="Trend" 
                          className="w-full h-auto rounded-xl opacity-90 transition-opacity hover:opacity-100" 
                        />
                      </article>
                    )}
                  </div>
                ) : (
                  <article className="card border-l-4 border-danger">
                    <h3 className="text-xl font-bold mb-2">Offline.</h3>
                    <p className="muted">Neural engine is currently unreachable. Check back when online.</p>
                  </article>
                )}
              </motion.section>
            )}

            {screen === "streak" && (
              <motion.section
                key="streak"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="page screen-panel text-center"
              >
                <div className="streak-flame">🔥</div>
                <h2 className="text-5xl font-black mb-12 uppercase tracking-tighter">Day {dashboard.streak.current}</h2>
                <div className="kpi-grid">
                  <article><p>Best Streak</p><h3>{dashboard.streak.longest}d</h3></article>
                  <article><p>Consistency</p><h3>{dashboard.consistencyScore7d}%</h3></article>
                </div>
                <div className="badges mt-12 overflow-x-auto pb-4">
                  {(dashboard.gamification.badges || []).map((badge) => (
                    <div key={badge} className="badge unlocked min-w-[120px]">{badge}</div>
                  ))}
                </div>
              </motion.section>
            )}

            {screen === "settings" && (
              <motion.section
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="page screen-panel max-w-2xl"
              >
                <h2 className="text-3xl font-black mb-8 uppercase tracking-tighter">System Config</h2>
                <div className="grid gap-8">
                  <div className="grid two gap-6">
                    <div className="flex flex-col gap-2">
                      <label>Daily Mission (Min)</label>
                      <input type="number" value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label>Weekly Sprint (Min)</label>
                      <input type="number" value={goalWeekly} onChange={(e) => setGoalWeekly(Number(e.target.value))} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label>Self Identity</label>
                    <select value={identityType} onChange={(e) => setIdentityType(e.target.value as any)}>
                      <option value="Casual">Casual</option>
                      <option value="Serious">Serious (Recommended)</option>
                      <option value="Hardcore">Hardcore</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label>The "Why" (Motivation)</label>
                    <textarea value={motivationWhy} onChange={(e) => setMotivationWhy(e.target.value)} rows={3} />
                  </div>

                  <div className="row wrap mt-4">
                    <button className="primary-glow" onClick={handleGoalUpdate}>Sync Configuration</button>
                    <button className="secondary ghost" onClick={handleIdentityUpdate}>Update Identity</button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
          {error && (
            <div className="mt-8">
              <article className="alert-card animate-pulse">
                <span className="pulse-dot" />
                <p className="text-danger font-bold uppercase tracking-wider text-xs">System Fault Detected</p>
                <p className="flex-1">{error}</p>
                <div className="flex gap-4">
                  <button className="text-[10px] uppercase font-bold underline" onClick={() => { localStorage.setItem("study-tracker-pref-mock", "true"); window.location.reload(); }}>Switch to Standalone Mode</button>
                  <button className="text-[10px] uppercase font-bold underline" onClick={() => setError("")}>Dismiss</button>
                </div>
              </article>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
