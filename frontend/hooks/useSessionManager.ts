import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useStore } from '../lib/store';
import { 
  startSession, 
  pauseSession, 
  resumeSession, 
  endSession, 
  fetchDashboard,
  getTodaySessions
} from '../lib/api';

const SessionSchema = z.object({
  _id: z.string(),
  status: z.enum(["running", "paused", "completed"]),
  startedAt: z.string(),
  lastStartedAt: z.string().optional(),
  elapsedSeconds: z.number().default(0),
  focusedMinutes: z.number().default(0),
  pauseCount: z.number().default(0),
  inactiveSeconds: z.number().default(0),
  subject: z.string().default("General"),
  studyMode: z.enum(["pomodoro", "deep", "custom"]).default("custom"),
  plannedDurationMinutes: z.number().default(0),
  riskMode: z.boolean().default(false),
  pauses: z.array(z.any()).default([]),
  date: z.string().default(() => new Date().toISOString().slice(0, 10))
});

export function useSessionManager() {
  const {
    user,
    activeSession,
    setActiveSession,
    setDashboard,
    setSessions,
    subject,
    studyMode,
    plannedDuration,
    riskMode,
    setIsActionLoading,
    setError
  } = useStore();

  const [elapsed, setElapsed] = useState(0);
  const [inactiveSeconds, setInactiveSeconds] = useState(0);
  const lastSyncAt = useRef(Date.now());

  // Timer logic
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }

    const calculateElapsed = () => {
      let base = Number(activeSession.elapsedSeconds) || 0;
      if (activeSession.status === "running" && activeSession.lastStartedAt) {
        const startTime = new Date(activeSession.lastStartedAt).getTime();
        if (!isNaN(startTime)) {
          // Use window.__grindlock_skew if available to correct for client/server clock drift
          const skew = (window as any).__grindlock_skew || 0;
          const delta = Math.floor((Date.now() - skew - startTime) / 1000);
          base += Math.max(0, delta);
        }
      }
      return isNaN(base) ? 0 : base;
    };

    setElapsed(calculateElapsed());

    if (activeSession.status !== "running") return;

    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStart = async () => {
    if (!user) return;
    try {
      setIsActionLoading(true);
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      const { session } = await startSession(user._id, subject, studyMode, modeMinutes, riskMode);
      const validated = SessionSchema.parse(session);
      setActiveSession(validated);
      localStorage.setItem("gl-active-session", JSON.stringify(validated));
    } catch (err: any) {
      setError(err.message || "Session initialization failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!user || !activeSession) return;
    try {
      setIsActionLoading(true);
      if (activeSession.status === "running") {
        const { session } = await pauseSession(user._id, activeSession._id, "manual");
        const validated = SessionSchema.parse(session);
        setActiveSession(validated);
      } else {
        const { session } = await resumeSession(user._id, activeSession._id);
        const validated = SessionSchema.parse(session);
        setActiveSession(validated);
      }
    } catch (err: any) {
      setError(err.message || "Neural link interruption.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEnd = async (notes = "", antiCheatFlags = 0) => {
    if (!user || !activeSession) return;
    try {
      setIsActionLoading(true);
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
      const { dashboard: updated } = await endSession(
        user._id,
        activeSession._id,
        inactiveSeconds,
        notes,
        subject,
        "manual",
        antiCheatFlags,
        "",
        studyMode,
        modeMinutes,
        riskMode
      );
      setDashboard(updated);
      setActiveSession(null);
      localStorage.removeItem("gl-active-session");
      
      const { sessions: sessionList } = await getTodaySessions(user._id);
      setSessions(sessionList);
    } catch (err: any) {
      setError(err.message || "Telemetry upload failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    elapsed,
    inactiveSeconds,
    setInactiveSeconds,
    handleStart,
    handlePauseResume,
    handleEnd
  };
}
