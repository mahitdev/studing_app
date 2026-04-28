"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  socket,
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
  syncDuelProgress
} from "../lib/api";
import { Dashboard, LiveFriend, StudySession, User } from "../lib/types";
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
  // If the server clock is ahead, we might get 0. Return 0 and let it catch up.
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
  const [showChamber, setShowChamber] = useState(false);
  const [walletConnected, setWalletConnected] = useState(!!user?.ethAddress);

  const handleConnectWallet = async () => {
    setIsActionLoading(true);
    setTimerAlert("Initializing neural wallet handshake...");
    // Simulate Web3 Connection
    setTimeout(async () => {
      try {
        const mockAddress = "0x" + Math.random().toString(16).slice(2, 10) + "..." + Math.random().toString(16).slice(2, 6);
        if (user) await setModes(user._id, settings.roastMode, identityType as any, motivationWhy, mockAddress);
        setWalletConnected(true);
        setTimerAlert("Wallet synchronized. NFT badges unlocked.");
      } catch {
        setError("Neural handshake failed.");
      } finally {
        setIsActionLoading(false);
      }
    }, 2000);
  };
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [duels, setDuels] = useState<any[]>([]);
  const [activeDuel, setActiveDuel] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  
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
        
        // Prevent race condition: don't overwrite if we have a valid local active session and the server is empty/stale
        if (activeSession && !running) {
           // Wait for next sync, don't kill the local session yet
        } else if (!activeSession || (running && (running._id !== activeSession._id || running.status !== activeSession.status))) {
           setActiveSession(running);
        }
        
        if (running) {
          if (running.subject) setSubject(running.subject);
          if (running.studyMode) setStudyMode(running.studyMode);
          if (running.plannedDurationMinutes) setPlannedDuration(running.plannedDurationMinutes);
          if (typeof running.riskMode === "boolean") setRiskMode(Boolean(running.riskMode));
        }
      }

      if (live) {
        setLiveFriends(live.friends || []);
        setLiveMessage(live.liveMessage || "");
      }
      setLastSyncAt(Date.now());
    } catch (err) {
      console.error("[GrindLock] Core Sync Failure:", err);
      setError("Protocol sync interrupted. Running in isolated mode.");
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
        console.error("[GrindLock] Bootstrap critical failure:", err);
        setError("Neural link severed. Attempting local override.");
      } finally {
        setIsInitializing(false);
      }
    };

    const handleError = (e: PromiseRejectionEvent) => {
      console.error("[GrindLock] Unhandled Protocol Error:", e.reason);
      setTimerAlert(`System Warning: ${e.reason?.message || "Unknown Fault"}`);
    };
    window.addEventListener("unhandledrejection", handleError);

    init();
    return () => window.removeEventListener("unhandledrejection", handleError);
  }, []);

  // Real-Time Neural Link (Socket.io)

  const loadRooms = async () => {
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch (err) {
      console.error("Room sync failed", err);
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    try {
      setIsActionLoading(true);
      const room = await createRoom(user._id, { name: `${user.name}'s Focus Hub`, ambientSettings: "default" });
      setRooms(prev => [...prev, room]);
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
      setTimerAlert(`Synchronized with ${room.name}.`);
    } catch {
      setError("Neutral connection to room failed.");
    }
  };



  const loadDuels = async () => {
    if (!user) return;
    try {
      const data = await fetchDuels(user._id);
      setDuels(data);
    } catch (err) {
      console.error("Duel sync failed", err);
    }
  };

  useEffect(() => {
    loadDuels();
    const interval = setInterval(loadDuels, 15000); // Poll for new challenges
    return () => clearInterval(interval);
  }, [])

  const handleChallenge = async (opponentId: string) => {
    if (!user) return;
    try {
      setIsActionLoading(true);
      await challengeDuel(user._id, opponentId, 25);
      setTimerAlert("Duel challenge transmitted.");
      loadDuels();
    } catch {
      setError("Challenge transmission failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }
    const updateTime = () => setElapsed(elapsedForSession(activeSession));
    updateTime();
    if (activeSession.status !== "running") return;
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeSession?._id, activeSession?.status]);

  useEffect(() => {
    if (!user) return;
    if (activeSession && activeDuel) {
      const prog = (elapsed / (activeDuel.durationMinutes * 60)) * 100;
      syncDuelProgress(activeDuel._id, user._id, Math.min(100, prog));
    }
  }, [elapsed, activeSession, activeDuel, user]);

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit("authenticate", user._id);
      
      socket.on("friend-update", (data: any) => {
        console.log("[GrindLock] Real-time pulse received:", data);
        if (data.userId !== user._id) {
          if (data.action === "started") {
            setTimerAlert(`${data.subject} session started by an operative.`);
            setTimeout(() => setTimerAlert(""), 5000);
          }
          refreshAll(user._id);
        }
      });

      return () => {
        socket.off("friend-update");
        socket.disconnect();
      };
    }
  }, [user]);

  // Voice Commands Intelligence
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("[GrindLock] Voice Command Received:", command);

        if (command.includes("start session")) handleStart();
        if (command.includes("pause session") || command.includes("resume session")) handlePauseResume();
        if (command.includes("end session") || command.includes("terminate session")) handleEnd();
        
        setTimerAlert(`Voice command: "${command}" processed.`);
        setTimeout(() => setTimerAlert(""), 3000);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => { if (isListening) recognition.start(); };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setTimerAlert("Voice link unavailable in this environment.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setTimerAlert("Neural voice link active. Listening for commands...");
    }
  };
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
          if (data?.burnout?.risk === "CRITICAL") {
            setTimerAlert("CRITICAL BURNOUT DETECTED. Emergency Pause Broadcasting to Squad!");
            socket.emit("room-action", { action: "burnout-alert", roomId: currentRoom?._id, message: "Operative Burnout Detected. Requesting support." });
          } else if (data?.burnout?.risk === "MODERATE") {
            setTimerAlert("AI Coach: " + data.burnout.intervention);
          }
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
    }, 30000);
    return () => clearInterval(idleTimer);
  }, [activeSession?._id, activeSession?.status, user?._id, lastSyncAt]);

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
      console.log("[GrindLock] Initializing session protocol...");
      setScreen("timer"); 
      
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      const { session } = await startSession(user._id, subject, studyMode, modeMinutes, riskMode);
      
      console.log("[GrindLock] Session started/resumed:", session._id);
      setActiveSession(session);
      setInactiveSeconds(0);
      setIsOfflineSession(false);
      setTimerAlert("");
      
      await refreshAll(user._id);
    } catch (err) {
      console.error("[GrindLock] Session start failure:", err);
      setTimerAlert("System Fault: Protocol Rejection.");
      setScreen("dashboard");
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

  if (!user) return (
    <div className="auth-wrapper">
      <div className="auth-form text-center">
        <h1 className="display-lg mb-4">Authentication Required</h1>
        <p className="text-muted mb-8 italic">
          {error || "Protocol identity not confirmed. Please sign in to proceed."}
        </p>
        <div className="flex flex-col gap-4">
          <button className="btn-primary" onClick={() => window.location.href = '/signin'}>Go to Sign In</button>
        </div>
      </div>
    </div>
  );

  const navItems = [
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
              onClick={() => setScreen(item.id as Screen)}
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
            <button 
              className={`p-2 rounded-lg transition-all ${isCoachOpen ? "bg-accent/20 text-accent" : "nav-btn hover:bg-white/5"}`}
              onClick={() => setIsCoachOpen(true)}
              title="Neural Coach"
            >
              <MessageSquare size={16} />
            </button>
            <button 
              className={`p-2 rounded-lg transition-all ${showChamber ? "bg-accent text-white" : "nav-btn hover:bg-white/5"}`}
              onClick={() => setShowChamber(true)}
              title="Live Study Chamber"
            >
              <Video size={16} />
            </button>
            <button 
              className={`p-2 rounded-lg transition-all ${isListening ? "bg-accent/20 text-accent animate-pulse" : "nav-btn hover:bg-white/5"}`}
              onClick={toggleVoice}
              title="Neural Voice Link"
            >
              {isListening ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <button 
              className="nav-btn p-2 hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => user && refreshAll(user._id)}
              title="Force System Sync"
            >
              <RefreshCw size={16} className={isActionLoading ? "animate-spin" : ""} />
            </button>
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

        <AnimatePresence>
          <NeuralCoach userId={user._id} isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />
          
          {pythonAnalytics?.burnout?.risk !== "Low" && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 py-3 bg-danger/10 border border-danger/20 rounded-2xl mb-6 flex items-center gap-4"
            >
              <AlertTriangle className="text-danger" size={16} />
              <p className="text-xs font-bold text-danger uppercase tracking-widest">{pythonAnalytics.burnout.intervention}</p>
            </motion.div>
          )}

          {screen === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {!dashboard ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <RefreshCw className="animate-spin mb-4" size={32} />
                  <p className="text-xs font-black tracking-widest uppercase">Fetching Mission Data...</p>
                </div>
              ) : (
                <>
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

                <div className="glass-card p-8 border-none bg-gradient-to-br from-accent/10 to-transparent">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted mb-6 flex items-center justify-between">
                    Network Intelligence 
                    <span className="text-[10px] font-bold text-accent">{duels.length} Duels</span>
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Active Duels */}
                    {duels.map(duel => (
                      <div key={duel._id} className="p-4 bg-accent/5 rounded-2xl border border-accent/20 flex items-center justify-between group hover:bg-accent/10 transition-all">
                        <div>
                          <p className="text-sm font-bold text-accent">{duel.challengerId._id === user._id ? duel.opponentId.name : duel.challengerId.name}</p>
                          <p className="text-[10px] text-muted uppercase tracking-widest">DUEL ACTIVE • {duel.xpPrize} XP</p>
                        </div>
                        <button 
                          className="px-3 py-1.5 bg-accent/20 text-accent text-[10px] font-black uppercase tracking-widest rounded-lg"
                          onClick={() => { setActiveDuel(duel); setScreen("timer"); handleStart(); }}
                        >
                          ENGAGE
                        </button>
                      </div>
                    ))}

                    {/* Friend Sync */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      {liveFriends.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold">
                              {f.name.charAt(0)}
                            </div>
                            <p className="text-sm font-bold">{f.name}</p>
                          </div>
                          <button onClick={() => handleChallenge(f.userId)} title="Challenge to Duel">
                            <Swords size={14} className="text-muted hover:text-accent transition-colors" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4">
                    <button className="w-full py-3 glass rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                      <Box size={14} /> Spatial Analytics
                    </button>
                  </div>
                </div>
              </div>
                </>
              )}
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
                elapsed={elapsed}
                progress={progress}
                setProgress={setProgress}
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
                          if (!audioRef.current || ambientTrack === "none") {
                            setTimerAlert("Select an ambient track first.");
                            return;
                          }
                          if (ambientPlaying) audioRef.current.pause();
                          else audioRef.current.play().catch(e => {
                            console.error("Audio playback blocked:", e);
                            setTimerAlert("Playback blocked by browser. Click again.");
                          });
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="display-lg">Neural Analytics</h2>
                  <p className="text-muted font-medium mt-1">Advanced cognitive performance intelligence.</p>
                </div>
                <div className="p-4 glass-light rounded-2xl border-none">
                  <p className="text-[10px] font-black tracking-widest text-muted uppercase mb-1">Status</p>
                  <p className="text-xs font-bold text-accent">Active Protocol</p>
                </div>
              </div>
              <NeuralAnalytics data={pythonAnalytics} />
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
            <motion.div 
              key="colosseum"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="display-lg">The Colosseum</h2>
                  <p className="text-muted font-medium mt-1">Live Study Clusters • Synchronized Discipline</p>
                </div>
                <button className="btn-primary flex items-center gap-2 px-6" onClick={handleCreateRoom}>
                  <Plus size={16} /> Create Cluster
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rooms.map((room) => (
                  <div key={room._id} className="glass-card p-8 group hover:border-accent/40 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <div className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
                        {room.activeSubject}
                      </div>
                      <div className="flex items-center gap-2 text-muted">
                        <Users size={12} />
                        <span className="text-xs font-bold">{room.members?.length || 0}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                    <p className="text-xs text-muted mb-8 line-clamp-2 italic">Commanded by {room.ownerId?.name || "Unknown Agent"}</p>
                    <button 
                      className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        currentRoom?._id === room._id ? "bg-success/20 text-success border border-success/40" : "bg-white/5 hover:bg-white/10 text-white"
                      }`}
                      onClick={() => handleJoinRoom(room._id)}
                    >
                      {currentRoom?._id === room._id ? "SYNCHRONIZED" : "JOIN CLUSTER"}
                    </button>
                  </div>
                ))}
                {rooms.length === 0 && (
                  <div className="col-span-full glass-light p-20 text-center rounded-3xl opacity-50">
                    <Swords className="mx-auto mb-6 text-muted" size={48} />
                    <p className="text-sm font-black tracking-[0.3em] uppercase">No active clusters found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentRoom && (
            <LiveStudyChamber 
              onClose={() => setCurrentRoom(null)} 
              room={currentRoom}
              socket={socket}
              userId={user?._id}
            />
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

function NeuralAnalytics({ data }: { data: any }) {
  if (!data || data.error || data.isSynthetic) {
    return (
      <div className="flex flex-col items-center justify-center py-20 glass-card">
        <Zap className="text-accent mb-4 animate-pulse" size={48} />
        <h3 className="display-sm mb-2 uppercase tracking-widest">Neural Link Offline</h3>
        <p className="text-muted text-sm font-medium italic">"{data?.message || "Real-time analytics requires active mission history."}"</p>
      </div>
    );
  }

  const chartData = {
    labels: data.dailyTrend?.labels || ["M", "T", "W", "T", "F", "S", "S"],
    datasets: [{
      label: "Focus Minutes",
      data: data.dailyTrend?.values || [0, 0, 0, 0, 0, 0, 0],
      borderColor: "#3e63dd",
      backgroundColor: "rgba(62, 99, 221, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: "#3e63dd"
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleFont: { family: "Inter", weight: "bold" },
        bodyFont: { family: "Inter" },
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#666" } },
      x: { grid: { display: false }, ticks: { color: "#666" } }
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-8">
        <div className="glass-card p-8">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-8">Productivity Pulse (7D)</h4>
          <div className="h-64">
            <Line data={chartData} options={options as any} />
          </div>
        </div>
        <div className="glass-card p-8">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-8">Neural Distribution</h4>
          <div className="space-y-6">
            {data.insights?.map((insight: string, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-accent/30 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                  <Activity size={14} className="text-accent" />
                </div>
                <p className="text-sm font-medium leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



function NeuralCoach({ userId, isOpen, onClose }: { userId: string, isOpen: boolean, onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'coach', text: string }>>([
    { role: 'coach', text: "Neural link established. I am your AI Focus Strategist. How can I optimize your session?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const { reply } = await getAICoachReply(userId, userMsg);
      setMessages(prev => [...prev, { role: 'coach', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: "Neural transmission failed. Re-syncing..." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="fixed top-0 right-0 h-full w-96 z-[110] glass-card border-l border-white/5 flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-widest">Neural Strategist</h3>
            </div>
            <button onClick={onClose} className="nav-btn text-muted p-1">×</button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  m.role === 'user' ? "bg-accent/10 border border-accent/20" : "bg-white/5 border border-white/10"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-[10px] text-muted animate-pulse italic">Neural engine processing...</div>}
          </div>
          <div className="p-6 border-t border-white/5">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Talk to your coach..."
                className="flex-1 bg-black/40 border-white/5 rounded-xl px-4 py-3 text-sm focus:border-accent/50 outline-none transition-all"
              />
              <button onClick={handleSend} className="p-3 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all">
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LiveStudyChamber({ onClose, room, socket, userId }: { onClose: () => void, room: any, socket: any, userId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [messages, setMessages] = useState<{user: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [ambientSetting, setAmbientSetting] = useState(room?.ambientSettings || "default");

  useEffect(() => {
    async function startVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.error("Camera access failed", err);
      }
    }
    startVideo();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleRoomUpdate = (data: any) => {
      if (data.action === "chat") {
        setMessages((prev) => [...prev, { user: data.sender || "Unknown", text: data.message }]);
      }
      if (data.action === "ambient-vote") {
        setAmbientSetting(data.setting);
      }
    };
    socket.on("room-action", handleRoomUpdate);
    return () => { socket.off("room-action", handleRoomUpdate); };
  }, [socket]);

  const sendChat = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("room-action", { action: "chat", roomId: room?._id, message: chatInput, sender: userId });
    setChatInput("");
  };

  const voteAmbient = (setting: string) => {
    if (!socket) return;
    socket.emit("room-action", { action: "ambient-vote", roomId: room?._id, setting });
    setAmbientSetting(setting);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-black/80 backdrop-blur-xl"
    >
      <div className="w-full max-w-6xl h-[80vh] glass-card overflow-hidden flex">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col relative border-r border-white/5 bg-black/40">
          <div className="absolute top-0 w-full p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
              <h3 className="display-sm text-xl uppercase tracking-tighter">Live Neural Chamber <span className="text-muted text-sm ml-2">{room?.name || "#0432"}</span></h3>
            </div>
            <button onClick={onClose} className="nav-btn text-danger">DISCONNECT</button>
          </div>

          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-all ${ambientSetting === "focus-deep" ? "grayscale contrast-150" : ambientSetting === "neon" ? "sepia hue-rotate-90 saturate-200" : ""}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* Ambient Controls */}
          <div className="absolute top-20 right-6 flex flex-col gap-2 z-10 bg-black/40 p-2 rounded-xl border border-white/10 backdrop-blur-md">
            <p className="text-[10px] text-muted text-center font-bold tracking-widest mb-1">ENV</p>
            {['default', 'focus-deep', 'neon'].map(s => (
              <button 
                key={s} 
                onClick={() => voteAmbient(s)}
                className={`text-[10px] px-2 py-1 rounded uppercase tracking-widest border ${ambientSetting === s ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
          
          <div className="absolute bottom-10 left-10 flex items-center gap-6 z-10">
            <div className="p-4 glass-light rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <p className="text-xs font-bold tracking-widest uppercase">Global Accountability Active</p>
            </div>
          </div>
        </div>

        {/* Sidebar: Participants & Spectator Chat */}
        <div className="w-80 flex flex-col bg-[#050505]">
          <div className="p-6 border-b border-white/5">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted">Squad & Spectators</h4>
          </div>
          <div className="p-4 border-b border-white/5 grid grid-cols-2 gap-2">
            <div className="aspect-square glass-light rounded-xl overflow-hidden relative">
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-[10px] font-black text-accent mb-2">USER_881</span>
                 <div className="w-full px-2">
                   <div className="h-1 bg-white/10 rounded-full w-full"><div className="h-full bg-accent rounded-full" style={{ width: '45%' }}/></div>
                 </div>
               </div>
            </div>
            <div className="aspect-square glass-light rounded-xl overflow-hidden relative">
               <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-muted italic">AWAITING...</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
             {messages.map((m, i) => (
               <div key={i} className="text-xs">
                 <span className="text-accent font-bold uppercase tracking-wider">{m.user}: </span>
                 <span className="opacity-80">{m.text}</span>
               </div>
             ))}
          </div>

          <div className="p-4 border-t border-white/5 flex gap-2">
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Send hype..." 
              className="flex-1 bg-white/5 rounded px-3 py-2 text-xs focus:outline-none focus:border-accent border border-transparent transition-colors"
            />
            <button onClick={sendChat} className="bg-white/10 hover:bg-accent hover:text-black transition-colors px-3 py-2 rounded text-xs font-bold uppercase">Send</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PremiumTimer({ activeSession, studyMode, plannedDuration, elapsed, progress, setProgress }: { activeSession: StudySession | null, studyMode: string, plannedDuration: number, elapsed: number, progress: number, setProgress: (p: number) => void }) {
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!activeSession) {
      setProgress(0);
      notifiedRef.current = false;
      return;
    }
  }, [activeSession?._id]);

  useEffect(() => {
    const totalSecs = Math.max(1, (activeSession?.plannedDurationMinutes || (studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration)) * 60);
    setProgress(Math.min(100, (elapsed / totalSecs) * 100));

    if (activeSession?.status === "running" && elapsed >= totalSecs && !notifiedRef.current) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("GrindLock Alert", { 
          body: "Target duration reached. Take a break or lock in for overtime.",
          icon: "/favicon.ico"
        });
      }
      notifiedRef.current = true;
    }
  }, [elapsed, activeSession, studyMode, plannedDuration, setProgress]);

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

