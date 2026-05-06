import React, { useEffect, useRef } from 'react';
import { StudySession } from '../../lib/types';

interface PremiumTimerProps {
  activeSession: StudySession | null;
  studyMode: string;
  plannedDuration: number;
  elapsed: number;
  formatHMS: (s: number) => string;
}

export default function PremiumTimer({ 
  activeSession, 
  studyMode, 
  plannedDuration, 
  elapsed, 
  formatHMS 
}: PremiumTimerProps) {
  const notifiedRef = useRef(false);
  const [progress, setProgress] = React.useState(0);

  useEffect(() => {
    if (!activeSession) {
      setProgress(0);
      notifiedRef.current = false;
      return;
    }
  }, [activeSession?._id]);

  useEffect(() => {
    const totalSecs = Math.max(1, (activeSession?.plannedDurationMinutes || (studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration)) * 60);
    const p = Math.min(100, (elapsed / totalSecs) * 100);
    setProgress(isNaN(p) ? 0 : p);

    if (activeSession?.status === "running" && elapsed >= totalSecs && !notifiedRef.current) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("GrindLock Alert", { 
          body: "Target duration reached. Take a break or lock in for overtime.",
          icon: "/favicon.ico"
        });
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
