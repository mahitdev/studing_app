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
  fetchAnalytics,
  clearAuthSession
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
  AlertTriangle,
  Swords,
  Camera,
  Play,
  Pause
} from "lucide-react";

type Screen = "dashboard" | "timer" | "analytics" | "streak" | "settings" | "colosseum";

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
  if (!session || !session.startedAt) return 0;
  
  const startedMs = new Date(session.startedAt).getTime();
  if (isNaN(startedMs)) return 0;

  const totalMs = Math.max(0, nowMs - startedMs);
  const pausedMs = (session.pauses || []).reduce((sum, pause) => {
    if (!pause.startedAt) return sum;
    const pauseStart = new Date(pause.startedAt).getTime();
    if (isNaN(pauseStart)) return sum;
    
    const pauseEnd = pause.endedAt ? new Date(pause.endedAt).getTime() : nowMs;
    const validEnd = isNaN(pauseEnd) ? nowMs : pauseEnd;
    
    return sum + Math.max(0, validEnd - pauseStart);
  }, 0);
  
  const res = Math.max(0, Math.floor((totalMs - pausedMs) / 1000));
  return isNaN(res) ? 0 : res;
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
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
  const [lastSyncAt, setLastSyncAt] = useState<number>(Date.now());
  
  // New "Premium" Features States
  const [microTasks, setMicroTasks] = useState<{ id: string; label: string; done: boolean }[]>([]);
  const [newMicroTask, setNewMicroTask] = useState("");
  const [ambientTrack, setAmbientTrack] = useState<string>("none");
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync ambient play state with real audio element events
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onplay = () => setAmbientPlaying(true);
      audioRef.current.onpause = () => setAmbientPlaying(false);
    }
  }, [ambientTrack]);

  const hiddenAt = useRef<number | null>(null);
  const lastActivityAt = useRef<number>(Date.now());

  const userKey = "study-tracker-user-id";
  const authTokenKey = "study-tracker-auth-token";
  const settingsKey = "study-tracker-settings";
  const offlineQueueKey = "study-tracker-offline-session-queue";
  const ritualKey = `study-tracker-ritual-${new Date().toISOString().slice(0, 10)}`;

  const refreshAll = async (userId: string) => {
    try {
      // Parallel fetch but catch individual failures to avoid failing the whole refresh
      const [dash, todaySessions, live] = await Promise.all([
        fetchDashboard(userId).catch(e => { console.error("Dash fail:", e); return null; }),
        getTodaySessions(userId).catch(e => { console.error("Session fail:", e); return { sessions: [] }; }),
        getLiveFriends(userId).catch(() => ({ friends: [], studyingNowCount: 0, liveMessage: "" }))
      ]);

      if (dash) {
        setDashboard(dash);
        setUser(dash.user);
        setGoalDaily(dash.goalTypes.dailyMinutes);
        setGoalWeekly(dash.goalTypes.weeklyTargetMinutes);
        setGoalSessions(dash.goalTypes.weeklySessionTarget);
        setIdentityType(dash.identity.type);
        if (dash.user.email && !summaryEmail) setSummaryEmail(dash.user.email);
      }

      if (todaySessions) {
        const sessionList = todaySessions.sessions || [];
        setSessions(sessionList);
        
        const running = sessionList.find((s: StudySession) => s.status === "running" || s.status === "paused") || null;
        setActiveSession(running);
        if (running?.subject) setSubject(running.subject);
        if (running?.studyMode) setStudyMode(running.studyMode);
        if (running?.plannedDurationMinutes) setPlannedDuration(running.plannedDurationMinutes);
        if (typeof running?.riskMode === "boolean") setRiskMode(Boolean(running.riskMode));
      }

      if (live) {
        setLiveFriends(live.friends || []);
        setLiveMessage(live.liveMessage || "");
      }
      
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const handleManualOffline = () => {
    localStorage.setItem("study-tracker-pref-mock", "true");
    setError("");
    window.location.reload();
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

    // Load session-local state from storage to prevent data loss on refresh
    const sessionStateKey = "gl-session-state";
    const savedState = sessionStorage.getItem(sessionStateKey);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.inactiveSeconds) setInactiveSeconds(parsed.inactiveSeconds);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.antiCheatFlags) setAntiCheatFlags(parsed.antiCheatFlags);
        if (parsed.microTasks) setMicroTasks(parsed.microTasks);
      } catch (e) { console.error("Session state recovery failed", e); }
    }

    if ("Notification" in window) {
      Notification.requestPermission().then(setNotificationPermission);
    }

    const init = async () => {
      try {
        setIsInitializing(true);
        const userId = localStorage.getItem(userKey);
        const authToken = localStorage.getItem(authTokenKey);
        if (!userId || !authToken) {
          setIsInitializing(false);
          return;
        }

        await refreshAll(userId);
      } catch (err) {
        console.warn("Bootstrap sync failed:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  // Persist session-local state
  useEffect(() => {
    if (activeSession) {
      sessionStorage.setItem("gl-session-state", JSON.stringify({
        inactiveSeconds,
        notes,
        subject,
        antiCheatFlags,
        microTasks
      }));
    } else {
      sessionStorage.removeItem("gl-session-state");
      setMicroTasks([]); // Clear micro-tasks when session ends
    }
  }, [activeSession, inactiveSeconds, notes, subject, antiCheatFlags, microTasks]);

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
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("GrindLock Protocol", { body: "You switched tabs. Focus lost. Penalty applied." });
          }
        } catch {
          setTimerAlert("Focus lost. Resume manually.");
        }
      }

      if (!document.hidden && hiddenAt.current) {
        const delta = Math.round((Date.now() - hiddenAt.current) / 1000);
        // Only increment inactiveSeconds if the session was NOT paused.
        // If it was paused, the time is already accounted for in pauseSeconds.
        if (activeSession.status === "running") {
           setInactiveSeconds((prev) => prev + Math.max(0, delta));
        }
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

    const handleMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", record);
      window.removeEventListener("keydown", record);
      window.removeEventListener("click", record);
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running" || !user) return;
    const idleTimer = setInterval(async () => {
      const idleFor = Math.floor((Date.now() - lastActivityAt.current) / 1000);
      if (idleFor >= 120 && activeSession.status === "running") {
        try {
          const { session } = await pauseSession(user._id, activeSession._id, "idle-detected");
          setActiveSession(session);
          setTimerAlert("Paused due to inactivity.");
          setAntiCheatFlags((prev) => prev + 1);
        } catch {
          // ignore
        }
      }
      
      // Heartbeat: keep dashboard fresh and prevent session expiration
      if (Date.now() - lastSyncAt > 60000) {
        refreshAll(user._id);
        setLastSyncAt(Date.now());
      }
    }, 15000);

    return () => clearInterval(idleTimer);
  }, [activeSession, user, lastSyncAt]);

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

  // Webcam Presence Tracking
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (webcamEnabled && activeSession?.status === "running") {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => {
          setTimerAlert("CAMERA ACCESS DENIED. PRESENCE MODE FAILED.");
          setWebcamEnabled(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [webcamEnabled, activeSession?.status]);

  const handleStart = async () => {
    if (!user || isActionLoading) return;
    try {
      setIsActionLoading(true);
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      const { session } = await startSession(user._id, subject, studyMode, modeMinutes, riskMode);
      
      setActiveSession(session);
      setInactiveSeconds(0);
      setIsOfflineSession(false);
      setTimerAlert("");
      
      await refreshAll(user._id);
      setScreen("timer");
    } catch (err) {
      console.error("Failed to start session:", err);
      setTimerAlert("System Fault: Protocol Rejection.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!user || !activeSession || isActionLoading) return;
    try {
      setIsActionLoading(true);
      if (activeSession.status === "running") {
        const { session } = await pauseSession(user._id, activeSession._id, "manual");
        setActiveSession(session);
      } else {
        const { session } = await resumeSession(user._id, activeSession._id);
        setActiveSession(session);
        setTimerAlert("");
      }
    } catch (err) {
      setError("Transmission Failure.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!user || !activeSession || isActionLoading) return;
    try {
      setIsActionLoading(true);
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
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGoalUpdate = async () => {
    if (!user || isActionLoading) return;
    try {
      setIsActionLoading(true);
      setError("");
      const { dashboard: updated } = await setGoalConfig(user._id, {
        dailyMinutes: goalDaily,
        weeklyTargetMinutes: goalWeekly,
        weeklySessionTarget: goalSessions
      });
      if (updated) setDashboard(updated);
    } catch (err) {
      setError("Failed to update goals.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleIdentityUpdate = async () => {
    if (!user || isActionLoading) return;
    try {
      setIsActionLoading(true);
      setError("");
      const { dashboard: updated } = await setModes(user._id, settings.roastMode, identityType, motivationWhy);
      if (updated) setDashboard(updated);
    } catch (err) {
      setError("Failed to update identity.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user || !friendEmail.trim() || isActionLoading) return;
    try {
      setIsActionLoading(true);
      setError("");
      await addFriend(user._id, friendEmail);
      setFriendEmail("");
      await refreshAll(user._id);
    } catch (err) {
      setError("Could not find operative to sync.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user || !summaryEmail.trim() || isActionLoading) return;
    try {
      setIsActionLoading(true);
      setEmailStatus("transmitting");
      const result = await sendProgressEmail(user._id, summaryEmail);
      setEmailStatus("delivered");
      setTimeout(() => setEmailStatus(""), 3000);
    } catch (err) {
      console.error(err);
      setEmailStatus("failed");
      setTimeout(() => setEmailStatus(""), 3000);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isInitializing && !user) return (
    <div className="auth-wrapper relative z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-xs font-black tracking-widest text-accent animate-pulse uppercase">Synchronizing OS...</p>
      </div>
    </div>
  );

  if (!user || !dashboard) return (
    <div className="auth-wrapper">
      <div className="auth-form text-center">
        <h1 className="display-lg mb-4">Internal System Offline</h1>
        <p className="text-muted mb-8 italic">
          {error || "Could not synchronize with central intelligence. Attempting fallback..."}
        </p>
        <div className="flex flex-col gap-4">
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry Sync</button>
          <button className="nav-btn justify-center" onClick={() => { clearAuthSession(); window.location.href = '/signin'; }}>Sign Out</button>
        </div>
      </div>
    </div>
  );

  const navItems: Array<{ id: Screen; label: string; icon: any }> = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "timer", label: "Focus Timer", icon: Timer },
    { id: "analytics", label: "Neural Engine", icon: BarChart3 },
    { id: "streak", label: "Momentum", icon: Flame },
    { id: "colosseum", label: "Colosseum", icon: Swords },
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
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-[10px] text-muted uppercase tracking-widest">Lvl {dashboard?.gamification?.level || 1}</p>
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
              System Health: <span className="text-success blink">Optimal</span> • Last Sync: {new Date(lastSyncAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">XP Points</p>
              <p className="text-xl font-black">{dashboard?.gamification?.xp || 0}</p>
            </div>
            <button 
              className={`btn-primary text-xs py-2 px-6 transition-all ${activeSession ? "bg-danger/20 border-danger/40 text-danger hover:bg-danger/30" : ""}`} 
              onClick={() => {
                if (activeSession) {
                  setScreen("timer");
                } else {
                  handleStart();
                  setScreen("timer");
                }
              }}
            >
              {activeSession ? "EN ROUTE" : "LOCKED IN"}
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
                    <h3 className="display-md text-2xl">{dashboard?.startRitual?.title || "START PROTOCOL"}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <ChevronRight className="text-accent" />
                  </div>
                </button>
              )}

              <div className="stats-grid">
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Target size={14} /> Today's Mission</div>
                  <div className="value">{dashboard?.todayGoal?.targetMinutes || 0}m</div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted uppercase">Progress</p>
                    <p className="text-xs font-bold text-accent">{dashboard?.todayGoal?.completionPercent || 0}%</p>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${dashboard?.todayGoal?.completionPercent || 0}%` }}
                      className="h-full bg-accent"
                    />
                  </div>
                </article>
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Flame size={14} /> Current Streak</div>
                  <div className="value">{dashboard?.streak?.current || 0}d</div>
                  <p className="text-xs text-muted mt-2 font-medium">Record: {dashboard?.streak?.longest || 0} days</p>
                </article>
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Activity size={14} /> Focus Score</div>
                  <div className="value">{dashboard?.focusScore?.score || 0}%</div>
                  <p className="text-xs text-muted mt-2 font-medium">State: <span className="text-success capitalize">{dashboard?.focusScore?.label || "Analyzing"}</span></p>
                </article>
                <article className="stat-card">
                  <div className="label flex items-center gap-2"><Zap size={14} /> Resilience</div>
                  <div className="value">{dashboard?.momentum?.score || 0}%</div>
                  <p className="text-xs text-muted mt-2 font-medium">{dashboard?.momentum?.message || "Steady state"}</p>
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
                      <p className="text-lg font-medium leading-relaxed">{dashboard?.timePressure?.message || "Analyzing mission status..."}</p>
                      <p className="text-sm text-muted mt-2 italic">"{dashboard?.futureYouReminder || "The future depends on your current discipline."}"</p>
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
                    <button className="btn-primary text-xs py-3" onClick={handleAddFriend}>Add Entity</button>
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
                    <label className="flex items-center justify-between p-3 glass-light rounded-xl cursor-pointer hover:border-accent/30 transition-colors border border-transparent">
                      <span className="text-[10px] font-black tracking-widest flex items-center gap-2"><Camera size={12}/> PRESENCE</span>
                      <input type="checkbox" className="w-auto" checked={webcamEnabled} onChange={(e) => setWebcamEnabled(e.target.checked)} />
                    </label>
                  </div>
                </div>
                  
                  <div className="space-y-2 mb-8">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted">Ambient Engine</label>
                     <div className="flex gap-2">
                       <select className="flex-1" value={ambientTrack} onChange={(e) => setAmbientTrack(e.target.value)}>
                         <option value="none">Disabled</option>
                         <option value="brown">Brown Noise</option>
                         <option value="lofi">Lo-Fi Frequencies</option>
                       </select>
                       <button className="btn-primary px-6" onClick={() => { 
                         if(audioRef.current) { 
                           if (audioRef.current.paused) {
                             audioRef.current.play().catch(e => console.warn("Autoplay blocked", e));
                           } else {
                             audioRef.current.pause();
                           }
                         } 
                       }}>
                         {ambientPlaying ? <Pause size={14}/> : <Play size={14}/>}
                       </button>
                     </div>
                  </div>

                  <div className="mb-8 p-6 glass-light rounded-2xl relative overflow-hidden group">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-accent mb-4"><Target size={14} /> Micro-Tasks</h4>
                    <div className="space-y-3 mb-4">
                      {microTasks.length === 0 && <p className="text-xs text-muted font-medium">Stack tasks to maximize dopamine upon completion.</p>}
                      {microTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 bg-black/20 p-2 pl-3 rounded-lg border border-white/5 relative overflow-hidden">
                          {task.done && <motion.div layoutId="strike" className="absolute left-0 w-full h-[2px] bg-accent top-1/2 opacity-50" />}
                          <input type="checkbox" checked={task.done} className="w-4 h-4 accent-accent" onChange={() => setMicroTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t))} />
                          <span className={`text-sm flex-1 truncate ${task.done ? "text-muted" : "font-semibold"} transition-colors`}>{task.label}</span>
                          <button className="text-danger/50 hover:text-danger transition-colors px-2" onClick={() => setMicroTasks(prev => prev.filter(t => t.id !== task.id))}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 relative z-10">
                      <input type="text" className="flex-1 bg-black/50 text-sm border-white/10" placeholder="Add micro-task..." value={newMicroTask} onChange={(e) => setNewMicroTask(e.target.value)} onKeyDown={(e) => {
                        if (e.key === 'Enter' && newMicroTask.trim()) {
                          setMicroTasks(prev => [...prev, { id: Date.now().toString(), label: newMicroTask.trim(), done: false }]);
                          setNewMicroTask("");
                        }
                      }} />
                      <button className="btn-primary font-black px-4" onClick={() => {
                        if (newMicroTask.trim()) {
                          setMicroTasks(prev => [...prev, { id: Date.now().toString(), label: newMicroTask.trim(), done: false }]);
                          setNewMicroTask("");
                        }
                      }}>+</button>
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

              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Transmission Protocol</h3>
                <div className="glass-card p-6 border-l-4 border-l-accent space-y-4">
                  <p className="text-xs font-medium text-white/70 italic">Transmit your current progress summary to your command center (email).</p>
                  <div className="flex gap-3">
                    <input 
                      type="email" 
                      placeholder="commander@example.com" 
                      value={summaryEmail} 
                      onChange={(e) => setSummaryEmail(e.target.value)}
                      className="flex-1"
                    />
                    <button 
                      className={`px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                        emailStatus === "delivered" ? "bg-success text-white" : 
                        emailStatus === "failed" ? "bg-danger text-white" : 
                        "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      onClick={handleSendEmail}
                      disabled={emailStatus === "transmitting"}
                    >
                      {emailStatus === "transmitting" ? "SENDING..." : 
                       emailStatus === "delivered" ? "SENT" : 
                       emailStatus === "failed" ? "RETRY" : "TRANSMIT"}
                    </button>
                  </div>
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
             <h2 className="display-lg text-7xl mb-4">{dashboard?.streak?.current || 0}</h2>
             <p className="text-xs font-black tracking-[0.5em] uppercase text-accent mb-12">Consecutive Cycles</p>
             
             <div className="flex gap-12">
               <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Longest Link</p>
                 <p className="text-3xl font-black">{dashboard?.streak?.longest || 0}d</p>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Consistency</p>
                 <p className="text-3xl font-black">{dashboard?.consistencyScore7d || 0}%</p>
               </div>
             </div>
           </motion.div>
          )}

          {screen === "colosseum" && (
            <motion.div key="colosseum" className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between">
                <h3 className="display-sm text-3xl uppercase tracking-tighter">Live Arena</h3>
                <span className="px-4 py-1.5 bg-success/10 text-success text-xs font-bold rounded-full tracking-widest uppercase">
                  {liveFriends.filter(f => f.studyingNow).length} / {liveFriends.length} Comrades Active
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveFriends.length > 0 ? liveFriends.map(friend => (
                  <div key={friend.userId} className="glass-card p-6 flex justify-between items-center border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <Users size={16} className="text-white/50" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{friend.name}</p>
                        <p className="text-xs text-muted tracking-widest uppercase font-black">Lvl {friend.level}</p>
                      </div>
                    </div>
                    {friend.studyingNow ? (
                      <span className="px-3 py-1 bg-success/20 text-success text-xs font-black rounded-full animate-pulse-timer border border-success/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]">IN ZONE</span>
                    ) : (
                      <span className="px-3 py-1 bg-white/5 text-white/30 text-[10px] font-black tracking-widest uppercase rounded-md">Resting</span>
                    )}
                  </div>
                )) : (
                  <div className="col-span-1 md:col-span-2 glass-light p-10 text-center rounded-2xl">
                    <p className="text-muted text-sm font-medium tracking-widest uppercase mb-4">No comrades spotted in the arena.</p>
                    <button className="btn-primary px-8 py-3 text-xs" onClick={() => setScreen("settings")}>Recruit Friends</button>
                  </div>
                )}
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
                  <p className="text-xs font-black uppercase tracking-widest text-danger mb-1">System Liaison Error</p>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button 
                  className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10"
                  onClick={handleManualOffline}
                >
                  Force Offline Mode
                </button>
                <button 
                  className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 px-3 py-2"
                  onClick={() => setError("")}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Ambient Audio & Hardcore Presence Elements */}
        {ambientTrack !== "none" && (
          <audio 
            ref={audioRef} 
            src={ambientTrack === "brown" ? "https://cdn.pixabay.com/download/audio/2021/04/10/audio_50b0b8c6ab.mp3?filename=brown-noise-10-minutes-76077.mp3" : "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"} 
            loop 
            className="hidden" 
          />
        )}
        <div className={`fixed bottom-6 right-6 w-48 rounded-xl overflow-hidden shadow-2xl border ${webcamEnabled && activeSession?.status === "running" ? "border-danger opacity-100" : "border-white/5 opacity-0 pointer-events-none"} transition-opacity duration-1000 z-50`}>
          <div className="absolute top-0 left-0 w-full bg-danger/80 text-[8px] font-black tracking-[0.2em] uppercase px-2 py-1 flex items-center justify-between z-10 backdrop-blur-md">
            <span>Presence Scanner</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto grayscale opacity-80" />
        </div>
      </main>
    </div>
  );
}

function PremiumTimer({ activeSession, studyMode, plannedDuration }: { activeSession: StudySession | null, studyMode: string, plannedDuration: number }) {
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      setProgress(0);
      notifiedRef.current = false;
      return;
    }

    // Use wall-clock calculation instead of simple increment to prevent drift
    const updateTime = () => {
      setElapsed(elapsedForSession(activeSession));
    };

    updateTime();

    if (activeSession.status !== "running") return;

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    const totalSecs = (activeSession?.plannedDurationMinutes || (studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration)) * 60;
    setProgress(Math.min(100, (elapsed / Math.max(1, totalSecs)) * 100));

    if (elapsed >= totalSecs && totalSecs > 0 && !notifiedRef.current) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("GrindLock Alert", { body: "Target duration reached. Take a break or lock in for overtime." });
      }
      notifiedRef.current = true;
    }
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
    </div>
  );
}
