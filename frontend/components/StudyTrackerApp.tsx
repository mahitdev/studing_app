"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { 
  LayoutDashboard, 
  Timer, 
  BarChart3, 
  Flame, 
  Settings, 
  LogOut, 
  Zap, 
  TrendingUp, 
  Target, 
  Activity,
  Users,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

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

  const userKey = "study-tracker-user-id";
  const authTokenKey = "study-tracker-auth-token";
  const settingsKey = "study-tracker-settings";
  const offlineQueueKey = "study-tracker-offline-session-queue";
  const ritualKey = `study-tracker-ritual-${new Date().toISOString().slice(0, 10)}`;

  const refreshAll = async (userId: string) => {
    try {
      const [dash, todaySessions, live] = await Promise.all([
        fetchDashboard(userId),
        getTodaySessions(userId),
        getLiveFriends(userId).catch(() => ({ friends: [], studyingNowCount: 0, liveMessage: "" }))
      ]);

      setDashboard(dash);
      setUser(dash.user);
      setGoalDaily(dash.goalTypes.dailyMinutes);
      setGoalWeekly(dash.goalTypes.weeklyTargetMinutes);
      setGoalSessions(dash.goalTypes.weeklySessionTarget);
      setIdentityType(dash.identity.type);
      setSessions(todaySessions.sessions || []);
      setLiveFriends(live.friends || []);
      setLiveMessage(live.liveMessage || "");

      const running = (todaySessions.sessions || []).find((s: StudySession) => s.status === "running" || s.status === "paused") || null;
      setActiveSession(running);
      if (running?.subject) setSubject(running.subject);
      if (running?.studyMode) setStudyMode(running.studyMode);
      if (running?.plannedDurationMinutes) setPlannedDuration(running.plannedDurationMinutes);
      if (typeof running?.riskMode === "boolean") setRiskMode(Boolean(running.riskMode));
    } catch (err) {
      console.error("Refresh failed:", err);
      setError("Sync failed. Check connection.");
    }
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

        await refreshAll(userId);
      } catch (err) {
        setError((err as Error).message || "Failed to initialize app");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

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
          setPythonAnalytics({ error: true, message: "Analytics engine is currently unavailable." });
          setAnalyticsLoaded(true);
        })
        .finally(() => setLoadingAnalytics(false));
    }
  }, [screen, user, analyticsLoaded, loadingAnalytics]);

  useEffect(() => {
    document.body.dataset.theme = settings.darkMode ? "dark" : "light";
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setRitualDoneToday(localStorage.getItem(ritualKey) === "done");
  }, [ritualKey]);

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
          setTimerAlert("Focus lost. Resume manually.");
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
    const record = () => { lastActivityAt.current = Date.now(); };
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
          setTimerAlert("Paused due to inactivity.");
          setAntiCheatFlags((prev) => prev + 1);
        } catch {
          // ignore
        }
      }
    }, 15000);

    return () => clearInterval(idleTimer);
  }, [activeSession, user]);

  useEffect(() => {
    let rafId: number;
    const onMove = (event: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mx", `${event.clientX}px`);
        document.documentElement.style.setProperty("--my", `${event.clientY}px`);
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const handleStart = async () => {
    if (!user) return;
    try {
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      const { session } = await startSession(user._id, subject, studyMode, modeMinutes, riskMode);
      setActiveSession(session);
      setInactiveSeconds(0);
      setIsOfflineSession(false);
      setTimerAlert("");
      await refreshAll(user._id);
    } catch (err) {
      setError("Could not start session.");
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
    } catch (err) {
      setError("Update failed.");
    }
  };

  const handleEnd = async () => {
    if (!user || !activeSession) return;
    try {
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
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
      await refreshAll(user._id);
    } catch (err) {
      setError("Failed to end session properly.");
    }
  };

  const handleGoalUpdate = async () => {
    if (!user) return;
    try {
      const { dashboard: updated } = await setGoalConfig(user._id, {
        dailyMinutes: goalDaily,
        weeklyTargetMinutes: goalWeekly,
        weeklySessionTarget: goalSessions
      });
      setDashboard(updated);
      setError("");
    } catch (err) {
      setError("Failed to update goals.");
    }
  };

  const handleIdentityUpdate = async () => {
    if (!user) return;
    try {
      const { dashboard: updated } = await setModes(user._id, settings.roastMode, identityType, motivationWhy);
      setDashboard(updated);
      setError("");
    } catch (err) {
      setError("Failed to update identity.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-vh-100 bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-[0.3em] uppercase opacity-50">Initializing OS...</p>
      </div>
    </div>
  );

  if (!user || !dashboard) return (
    <div className="auth-wrapper">
      <div className="auth-form text-center">
        <h1 className="display-lg mb-4">Unauthorized</h1>
        <p className="text-muted mb-8">System access requires active authentication.</p>
        <Link href="/signin" className="btn-primary inline-block">Renew Access</Link>
      </div>
    </div>
  );

  const navItems: Array<{ id: Screen; label: string; icon: any }> = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "timer", label: "Focus Timer", icon: Timer },
    { id: "analytics", label: "Neural Engine", icon: BarChart3 },
    { id: "streak", label: "Momentum", icon: Flame },
    { id: "settings", label: "Config", icon: Settings }
  ];

  return (
    <div className="app-container">
      <div className="cursor-glow" />
      
      <aside className="sidebar">
        <div className="mb-12">
          <h1 className="display-md text-2xl tracking-tighter">GRINDLOCK<span className="text-accent">.</span></h1>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Discipline Hub</p>
        </div>

        <nav className="flex-1">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              className={`nav-btn w-full ${screen === item.id ? "active" : ""}`}
              onClick={() => setScreen(item.id)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] text-muted uppercase tracking-widest">Lvl {dashboard.gamification.level}</p>
            </div>
          </div>
          <Link href="/signout" className="nav-btn opacity-50 hover:opacity-100">
            <LogOut size={16} />
            Eject
          </Link>
        </div>
      </aside>

      <main className="main-view">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h2 className="display-md text-3xl">{navItems.find(n => n.id === screen)?.label}</h2>
            <p className="text-xs text-muted font-medium mt-1">
              System Health: <span className="text-success">Optimal</span>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">XP Points</p>
              <p className="text-xl font-black">{dashboard.gamification.xp}</p>
            </div>
            <button className="btn-primary text-xs py-2 px-6" onClick={() => setScreen("timer")}>
              LOCKED IN
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {screen === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {!ritualDoneToday && (
                <button 
                  className="w-full p-8 glass-card border-none flex items-center justify-between group hover:scale-[1.01] transition-all"
                  onClick={() => { localStorage.setItem(ritualKey, "done"); setRitualDoneToday(true); setScreen("timer"); }}
                >
                  <div className="text-left">
                    <p className="text-xs font-black tracking-[0.2em] text-accent uppercase mb-2">Protocol Pending</p>
                    <h3 className="display-md text-2xl">{dashboard.startRitual.title || "START PROTOCOL"}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <ChevronRight className="text-accent" />
                  </div>
                </button>
              )}

              <div className="stats-grid">
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Target size={14} /> Today's Mission</div>
                  <div className="value">{dashboard.todayGoal.targetMinutes}m</div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted uppercase">Progress</p>
                    <p className="text-xs font-bold text-accent">{dashboard.todayGoal.completionPercent}%</p>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${dashboard.todayGoal.completionPercent}%` }}
                      className="h-full bg-accent"
                    />
                  </div>
                </article>
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Flame size={14} /> Current Streak</div>
                  <div className="value">{dashboard.streak.current}d</div>
                  <p className="text-xs text-muted mt-2 font-medium">Record: {dashboard.streak.longest} days</p>
                </article>
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Activity size={14} /> Focus Score</div>
                  <div className="value">{dashboard.focusScore.score}%</div>
                  <p className="text-xs text-muted mt-2 font-medium">State: <span className="text-success capitalize">{dashboard.focusScore.label}</span></p>
                </article>
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Zap size={14} /> Resilience</div>
                  <div className="value">{dashboard.momentum.score}%</div>
                  <p className="text-xs text-muted mt-2 font-medium">{dashboard.momentum.message}</p>
                </article>
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 glass-card p-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted mb-6">Status Intelligence</h3>
                  <div className="flex items-start gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="text-accent" />
                    </div>
                    <div>
                      <p className="text-lg font-medium leading-relaxed">{dashboard.timePressure.message}</p>
                      <p className="text-sm text-muted mt-2 italic">"{dashboard.futureYouReminder}"</p>
                    </div>
                  </div>
                  
                  {dashboard.pressureNotifications?.length ? (
                    <div className="mt-6 flex flex-col gap-3">
                      {dashboard.pressureNotifications.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 glass-light rounded-2xl border-l-2 border-danger">
                          <AlertTriangle size={14} className="text-danger" />
                          <p className="text-sm font-medium">{item}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="glass-card p-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted mb-6">Network Sync</h3>
                  {liveFriends.length > 0 ? (
                    <div className="space-y-4">
                      {liveFriends.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold">
                              {f.name.charAt(0)}
                            </div>
                            <p className="text-sm font-bold">{f.name}</p>
                          </div>
                          {f.studyingNow && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-muted">No synchronization active.</p>}
                  
                  <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4">
                    <input 
                      placeholder="Partner Email" 
                      className="text-xs" 
                      value={friendEmail}
                      onChange={(e) => setFriendEmail(e.target.value)}
                    />
                    <button className="btn-primary text-xs py-3" onClick={() => { addFriend(user._id, friendEmail); setFriendEmail(""); refreshAll(user._id); }}>Add Entity</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {screen === "timer" && (
            <motion.div 
              key="timer" 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="timer-container"
            >
              <div className="mb-12 flex gap-4">
                <button 
                  className={`nav-btn px-6 ${studyMode === "pomodoro" ? "active" : ""}`}
                  onClick={() => { setStudyMode("pomodoro"); setPlannedDuration(25); }}
                >
                  Pomodoro
                </button>
                <button 
                  className={`nav-btn px-6 ${studyMode === "deep" ? "active" : ""}`}
                  onClick={() => { setStudyMode("deep"); setPlannedDuration(50); }}
                >
                  Deep Work
                </button>
                <button 
                  className={`nav-btn px-6 ${studyMode === "custom" ? "active" : ""}`}
                  onClick={() => setStudyMode("custom")}
                >
                  Custom
                </button>
              </div>

              <PremiumTimer 
                activeSession={activeSession}
                studyMode={studyMode}
                plannedDuration={plannedDuration}
              />

              <div className="mt-16 glass-card p-10 w-full max-w-xl">
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Subject Focus</label>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                      <option>General</option>
                      <option>Math</option>
                      <option>Science</option>
                      <option>Programming</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Session Rules</label>
                    <label className="flex items-center justify-between p-3 glass-light rounded-xl cursor-pointer">
                      <span className="text-xs font-bold">RISK MODE</span>
                      <input type="checkbox" className="w-auto" checked={riskMode} onChange={(e) => setRiskMode(e.target.checked)} />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {!activeSession ? (
                    <button className="btn-primary flex-1 py-4 text-sm tracking-widest" onClick={handleStart}>INITIALIZE</button>
                  ) : (
                    <>
                      <button className="flex-1 py-4 glass text-sm font-bold tracking-widest hover:bg-white/5 transition-colors" onClick={handlePauseResume}>
                        {activeSession.status === "paused" ? "REENGAGE" : "PAUSE"}
                      </button>
                      <button className="flex-1 py-4 bg-danger/10 text-danger border border-danger/20 text-sm font-bold tracking-widest hover:bg-danger/20 transition-colors" onClick={handleEnd}>TERMINATE</button>
                    </>
                  )}
                </div>
                {timerAlert && <p className="mt-6 text-center text-xs font-bold text-danger uppercase tracking-widest animate-pulse">{timerAlert}</p>}
              </div>
            </motion.div>
          )}

          {screen === "analytics" && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {loadingAnalytics ? (
                <div className="loading-shimmer h-96 rounded-3xl" />
              ) : pythonAnalytics && !pythonAnalytics.error ? (
                <>
                  <div className="stats-grid">
                    <article className="stat-card">
                      <div className="label">Neural Efficiency</div>
                      <div className="value">{pythonAnalytics.consistency_score}%</div>
                    </article>
                    <article className="stat-card">
                      <div className="label">Avg Focus Block</div>
                      <div className="value">{pythonAnalytics.average_study_time}m</div>
                    </article>
                    <article className="stat-card">
                      <div className="label">Cognitive Load Peak</div>
                      <div className="value">{pythonAnalytics.focus_score}%</div>
                    </article>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="glass-card p-8 border-l-4 border-l-accent">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-4">Core Insight</h4>
                      <p className="text-xl font-medium leading-relaxed">{pythonAnalytics.message}</p>
                    </div>
                    <div className="glass-card p-8 border-l-4 border-l-danger">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-danger mb-4">Performance Leak</h4>
                      <p className="text-xl font-medium leading-relaxed">{pythonAnalytics.weak_pattern}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="glass-card p-12 text-center">
                  <h3 className="text-xl font-bold mb-2">Engine Offline</h3>
                  <p className="text-muted">Currently unable to process neural data patterns.</p>
                </div>
              )}
            </motion.div>
          )}

          {screen === "settings" && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl space-y-12"
            >
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Mission Config</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold">Daily Target (Min)</label>
                    <input type="number" value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold">Weekly Quota (Min)</label>
                    <input type="number" value={goalWeekly} onChange={(e) => setGoalWeekly(Number(e.target.value))} />
                  </div>
                </div>
                <button className="btn-primary" onClick={handleGoalUpdate}>Sync Config</button>
              </section>

              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Identity Profile</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold">Commitment Level</label>
                    <select value={identityType} onChange={(e) => setIdentityType(e.target.value as any)}>
                      <option value="Casual">Casual</option>
                      <option value="Serious">Serious</option>
                      <option value="Hardcore">Hardcore</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold">Motivation Core (The "Why")</label>
                    <textarea value={motivationWhy} onChange={(e) => setMotivationWhy(e.target.value)} rows={3} />
                  </div>
                  <button className="btn-primary" onClick={handleIdentityUpdate}>Update Identity</button>
                </div>
              </section>
            </motion.div>
          )}

          {screen === "streak" && (
             <motion.div 
             key="streak"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="flex flex-col items-center justify-center p-20 text-center"
           >
             <div className="text-8xl mb-8 filter drop-shadow-[0_0_30px_rgba(255,80,0,0.4)]">🔥</div>
             <h2 className="display-lg text-7xl mb-4">{dashboard.streak.current}</h2>
             <p className="text-xs font-black tracking-[0.5em] uppercase text-accent mb-12">Consecutive Cycles</p>
             
             <div className="flex gap-12">
               <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Longest Link</p>
                 <p className="text-3xl font-black">{dashboard.streak.longest}d</p>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Consistency</p>
                 <p className="text-3xl font-black">{dashboard.consistencyScore7d}%</p>
               </div>
             </div>
           </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="fixed bottom-10 right-10 z-[100] max-w-sm">
            <div className="p-6 glass border-l-4 border-l-danger shadow-2xl animate-bounce-short">
              <div className="flex gap-4">
                <AlertTriangle className="text-danger shrink-0" size={20} />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-danger mb-1">System Error</p>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
              <button 
                className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PremiumTimer({ activeSession, studyMode, plannedDuration }: { activeSession: StudySession | null, studyMode: string, plannedDuration: number }) {
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      setProgress(0);
      return;
    }

    const init = elapsedForSession(activeSession);
    setElapsed(init);

    if (activeSession.status !== "running") return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    const totalSecs = (activeSession?.plannedDurationMinutes || (studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration)) * 60;
    setProgress(Math.min(100, (elapsed / Math.max(1, totalSecs)) * 100));
  }, [elapsed, activeSession, studyMode, plannedDuration]);

  return (
    <div className="relative flex items-center justify-center">
      <div 
        className="timer-circle" 
        style={{ ["--progress" as string]: `${progress}%` }} 
      />
      <div className={`timer-display ${activeSession?.status === "running" ? "animate-pulse-timer" : ""}`}>
        {formatHMS(elapsed)}
      </div>
      {activeSession?.status === "running" && (
        <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping opacity-20" />
      )}
    </div>
  );
}
  );
}
