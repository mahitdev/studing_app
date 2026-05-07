"use client";
// HEARTBEAT: 2026-04-29

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  socket,
  HAS_BACKEND,
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
  clearAuthSession,
  fetchRooms,
  createRoom,
  joinRoom,
  getAICoachReply,
  challengeDuel,
  fetchDuels,
  syncDuelProgress,
  updateRoomNotes,
  voteAmbient,
  broadcastEmergencyAlert,
  submitGroupAIQuery,
  placeXPBet,
  bootstrapUser,
  saveAuthSession
} from "../lib/api";
import { Dashboard, LiveFriend, StudySession, User } from "../lib/types";
import Sidebar from "./ui/Sidebar";
import DashboardView from "./views/DashboardView";
import TimerView from "./views/TimerView";
import ColosseumView from "./views/ColosseumView";
import SettingsView from "./views/SettingsView";
import StreakView from "./views/StreakView";
import { useStore } from "../lib/store";
import { useSocketSync } from "../hooks/useSocketSync";
import { useSessionManager } from "../hooks/useSessionManager";
import NeuralCoach from "./ui/NeuralCoach";
import NeuralAnalytics from "./ui/NeuralAnalytics";
import LiveStudyChamber from "./ui/LiveStudyChamber";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
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
  Camera,
  Play,
  Pause,
  RefreshCw,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Wallet,
  Maximize2,
  MessageSquare,
  Send,
  Plus,
  Swords,
  Trophy,
  Box
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Memoize views for performance
const MemoizedDashboard = React.memo(DashboardView);
const MemoizedTimer = React.memo(TimerView);
const MemoizedColosseum = React.memo(ColosseumView);
const MemoizedSettings = React.memo(SettingsView);
const MemoizedStreak = React.memo(StreakView);

interface AppSettings {
  darkMode: boolean;
  roastMode: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  autoPause: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: true,
  roastMode: true,
  notifications: true,
  soundEnabled: true,
  autoPause: true
};

function formatHMS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v.toString().padStart(2, "0")).join(":");
}

function elapsedForSession(session: StudySession, nowMs = Date.now()) {
  if (!session) return 0;
  let base = session.elapsedSeconds || 0;
  if (session.status === "running" && session.lastStartedAt) {
    const delta = Math.floor((nowMs - new Date(session.lastStartedAt).getTime()) / 1000);
    base += Math.max(0, delta);
  }
  return base;
}

export default function StudyTrackerApp() {
  const router = useRouter();
  const {
    screen, setScreen,
    user, setUser,
    dashboard, setDashboard,
    sessions, setSessions,
    activeSession, setActiveSession,
    isInitializing, setIsInitializing,
    isActionLoading, setIsActionLoading,
    error, setError,
    subject, setSubject,
    studyMode, setStudyMode,
    plannedDuration, setPlannedDuration,
    riskMode, setRiskMode,
    rooms, setRooms,
    currentRoom, setCurrentRoom,
    duels, setDuels,
    activeDuel, setActiveDuel,
    liveFriends, setLiveFriends,
    liveMessage, setLiveMessage,
    lastSyncAt, setLastSyncAt
  } = useStore();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [friendEmail, setFriendEmail] = useState("");
  const [walletConnected, setWalletConnected] = useState(!!user?.ethAddress);
  const [timerAlert, setTimerAlert] = useState("");
  const [goalDaily, setGoalDaily] = useState(180);
  const [goalWeekly, setGoalWeekly] = useState(1200);
  const [goalSessions, setGoalSessions] = useState(7);
  const [summaryEmail, setSummaryEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [identityType, setIdentityType] = useState<"Casual" | "Serious" | "Hardcore">("Serious");
  const [motivationWhy, setMotivationWhy] = useState("");
  const [ritualDoneToday, setRitualDoneToday] = useState(false);
  const [stopReason, setStopReason] = useState("");
  const [sessionQualityTag, setSessionQualityTag] = useState<"deep" | "average" | "distracted" | "">("");
  const [pythonAnalytics, setPythonAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [ambientTrack, setAmbientTrack] = useState<string>("none");
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize custom hooks to handle complex logic
  useSocketSync();
  const { 
    elapsed, 
    handleStart, 
    handlePauseResume, 
    handleEnd,
    inactiveSeconds,
    setInactiveSeconds 
  } = useSessionManager();

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
      const results = await Promise.allSettled([
        fetchDashboard(userId),
        getTodaySessions(userId),
        getLiveFriends(userId)
      ]);

      const [dashRes, sessionsRes, liveRes] = results;

      if (dashRes.status === "fulfilled" && dashRes.value) {
        const dash = dashRes.value;
        setDashboard(dash);
        setUser(dash.user);
        setGoalDaily(dash.goalTypes.dailyMinutes);
        setGoalWeekly(dash.goalTypes.weeklyTargetMinutes);
        setGoalSessions(dash.goalTypes.weeklySessionTarget);
        setIdentityType(dash.identity.type);
        if (dash.user.email && !summaryEmail) setSummaryEmail(dash.user.email);
      } else if (dashRes.status === "rejected") {
        setError("Failed to synchronize dashboard. Neural link unstable.");
      }

      if (sessionsRes.status === "fulfilled" && sessionsRes.value) {
        const { sessions: sessionList, serverTime } = sessionsRes.value;
        setSessions(sessionList);
        if (serverTime) {
          const skew = Date.now() - new Date(serverTime).getTime();
          (window as any).__grindlock_skew = skew;
        }
        setSessions(sessionList);
        
        const running = sessionList.find((s: StudySession) => s.status === "running" || s.status === "paused") || null;
        setActiveSession((currentActive: StudySession | null) => {
          const next = running || (currentActive?.status === "running" ? currentActive : null);
          if (next) localStorage.setItem("gl-active-session", JSON.stringify(next));
          else localStorage.removeItem("gl-active-session");
          return next;
        });

        if (running) {
          if (running.subject) setSubject(running.subject);
          if (running.studyMode) setStudyMode(running.studyMode);
          if (running.plannedDurationMinutes) setPlannedDuration(running.plannedDurationMinutes);
          if (typeof running.riskMode === "boolean") setRiskMode(Boolean(running.riskMode));
        }
      }

      if (liveRes.status === "fulfilled" && liveRes.value) {
        setLiveFriends(liveRes.value.friends || []);
        setLiveMessage(liveRes.value.liveMessage || "");
      }

      setLastSyncAt(Date.now());
    } catch (err: any) {
      setError("Critical telemetry failure. Protocol: Manual Refresh.");
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
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) }); } catch {}
    }

    if ("Notification" in window) {
      Notification.requestPermission().then(setNotificationPermission);
    }

    const init = async () => {
      try {
        setIsInitializing(true);
        const userId = localStorage.getItem(userKey);
        if (!userId) {
          setIsInitializing(false);
          return;
        }
        await refreshAll(userId);
      } catch (err) {
        setError("Neural link severed.");
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleCreateRoom = async () => {
    if (!user) return;
    try {
      setIsActionLoading(true);
      const room = await createRoom(user._id, { name: `${user.name}'s Focus Hub` });
      setRooms([...rooms, room]);
      handleJoinRoom(room._id);
    } catch {
      setError("Failed to initialize cluster.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    try {
      const room = await joinRoom(user._id, roomId);
      setCurrentRoom(room);
    } catch {
      setError("Neutral connection to room failed.");
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    window.location.reload();
  };

  const handleGuestLogin = async () => {
    try {
      setIsActionLoading(true);
      const response = await bootstrapUser("Focused Student", "General", "Serious", "Skill");
      saveAuthSession(response.user._id, response.token);
      setUser(response.user);
      refreshAll(response.user._id);
    } catch {
      setError("Guest protocol failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    document.body.dataset.theme = settings.darkMode ? "dark" : "light";
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const onInactive = () => {
      if (activeSession?.status === "running" && !hiddenAt.current) {
        hiddenAt.current = Date.now();
      }
    };

    const onActive = () => {
      if (activeSession?.status === "running" && hiddenAt.current) {
        const delta = Math.round((Date.now() - hiddenAt.current) / 1000);
        setInactiveSeconds((prev) => prev + Math.max(0, delta));
        hiddenAt.current = null;
      }
    };

    window.addEventListener("blur", onInactive);
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) onInactive();
      else onActive();
    });

    return () => {
      window.removeEventListener("blur", onInactive);
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", onActive);
    };
  }, [activeSession, user, setInactiveSeconds]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd': setScreen('dashboard'); break;
          case 't': setScreen('timer'); break;
          case 'a': setScreen('analytics'); break;
          case 'm': setScreen('streak'); break;
          case 'c': setScreen('colosseum'); break;
          case 's': setScreen('settings'); break;
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [setScreen]);

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard, aria: "Navigate to Dashboard (Alt+D)" },
    { id: "timer", label: "Focus Timer", icon: Timer, aria: "Navigate to Focus Timer (Alt+T)" },
    { id: "analytics", label: "Neural Engine", icon: BarChart3, aria: "Navigate to Analytics (Alt+A)" },
    { id: "streak", label: "Momentum", icon: Flame, aria: "View Momentum and Streaks" },
    { id: "colosseum", label: "Colosseum", icon: Swords, aria: "Enter Colosseum Duels" },
    { id: "settings", label: "Config", icon: Settings, aria: "Navigate to Settings (Alt+S)" }
  ];

  if (isInitializing && !user) return (
    <div className="auth-wrapper relative z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-xs font-black tracking-widest text-accent animate-pulse uppercase">Synchronizing OS...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="auth-wrapper relative z-[200]">
      <div className="auth-form text-center p-12 glass-card border-none shadow-2xl">
        <Zap size={48} className="text-accent mx-auto mb-8 animate-pulse" />
        <h1 className="display-lg mb-4">Neural Auth Required</h1>
        <p className="text-muted mb-8 italic">{error || "Protocol identity not confirmed."}</p>
        <button onClick={() => router.push("/signin")} className="btn-primary w-full py-4 font-bold tracking-widest">INITIALIZE NEURAL LINK</button>
        <button onClick={handleGuestLogin} disabled={isActionLoading} className="w-full mt-4 py-3 text-xs font-black uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5 transition-all">ENTER AS GUEST</button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-[#050505] min-h-screen text-white selection:bg-accent selection:text-black font-sans">
      <Sidebar 
        user={user!} 
        dashboard={dashboard} 
        activeScreen={screen as any} 
        onScreenChange={setScreen as any} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 ml-80 p-12">
        <header className="flex items-center justify-between mb-16">
          <div>
            <h2 className="display-md text-4xl uppercase tracking-tighter">{navItems.find(n => n.id === screen)?.label}</h2>
            <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-2">
              System Health: <span className="text-success animate-pulse">Optimal</span> • Last Sync: {new Date(lastSyncAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">XP Points</p>
              <p className="text-xl font-black">{dashboard?.gamification?.xp || 0}</p>
            </div>
            <button 
              className={`p-2 rounded-lg transition-all ${isCoachOpen ? "bg-accent/20 text-accent" : "nav-btn hover:bg-white/5"}`}
              onClick={() => setIsCoachOpen(true)}
            >
              <MessageSquare size={20} />
            </button>
            <button 
              className={`btn-primary text-xs py-2 px-6 transition-all ${activeSession ? "bg-danger/20 border-danger/40 text-danger hover:bg-danger/30" : ""}`} 
              onClick={() => {
                if (activeSession) setScreen("timer");
                else { handleStart(); setScreen("timer"); }
              }}
            >
              {activeSession ? "EN ROUTE" : "LOCKED IN"}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {screen === "dashboard" && <MemoizedDashboard user={user!} dashboard={dashboard} goalDaily={goalDaily} />}
            {screen === "timer" && (
              <MemoizedTimer 
                activeSession={activeSession}
                elapsed={elapsed}
                plannedDuration={plannedDuration}
                status={activeSession ? (activeSession.status === "paused" ? "paused" : "running") : "idle"}
                onStart={handleStart}
                onPause={handlePauseResume}
                onResume={handlePauseResume}
                onEnd={handleEnd}
                formatHMS={formatHMS}
              />
            )}
            {screen === "analytics" && <NeuralAnalytics data={pythonAnalytics} />}
            {screen === "streak" && <MemoizedStreak dashboard={dashboard} />}
            {screen === "colosseum" && (
              <MemoizedColosseum 
                rooms={rooms} 
                currentRoom={currentRoom} 
                onJoinRoom={handleJoinRoom} 
                onCreateRoom={handleCreateRoom} 
              />
            )}
            {screen === "settings" && (
              <MemoizedSettings 
                user={user!}
                dashboard={dashboard}
                goalDaily={goalDaily}
                goalWeekly={goalWeekly}
                identityType={identityType}
                motivationWhy={motivationWhy}
                summaryEmail={summaryEmail}
                emailStatus={emailStatus}
                setGoalDaily={setGoalDaily}
                setGoalWeekly={setGoalWeekly}
                setIdentityType={setIdentityType}
                setMotivationWhy={setMotivationWhy}
                setSummaryEmail={setSummaryEmail}
                onGoalUpdate={handleGoalUpdate}
                onIdentityUpdate={handleIdentityUpdate}
                onSendEmail={handleSendEmail}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {currentRoom && (
          <LiveStudyChamber 
            onClose={() => setCurrentRoom(null)} 
            room={currentRoom}
            socket={socket}
            userId={user!._id}
          />
        )}

        {isCoachOpen && <NeuralCoach userId={user!._id} isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />}

        {error && (
          <div className="fixed bottom-10 right-10 z-[100] max-w-sm">
            <div className="p-6 glass border-l-4 border-l-danger shadow-2xl">
              <div className="flex gap-4">
                <AlertTriangle className="text-danger shrink-0" size={20} />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-danger mb-1">System Liaison Error</p>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
              <button onClick={() => setError("")} className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100">Dismiss</button>
            </div>
          </div>
        )}

        {webcamEnabled && activeSession?.status === "running" && (
          <div className="fixed bottom-6 right-6 w-48 rounded-xl overflow-hidden shadow-2xl border border-danger z-50">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto grayscale opacity-80" />
          </div>
        )}
      </main>

      {ambientTrack !== "none" && (
        <audio 
          ref={audioRef} 
          src={ambientTrack === "brown" ? "https://cdn.pixabay.com/download/audio/2021/04/10/audio_50b0b8c6ab.mp3?filename=brown-noise-10-minutes-76077.mp3" : "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"} 
          loop 
          className="hidden" 
        />
      )}
    </div>
  );
}


