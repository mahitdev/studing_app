import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer as TimerIcon, Play, Pause, RefreshCw, AlertTriangle } from "lucide-react";
import { StudySession } from "../../lib/types";

interface TimerViewProps {
  activeSession: StudySession | null;
  elapsed: number;
  plannedDuration: number;
  status: "running" | "paused" | "idle";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  formatHMS: (s: number) => string;
}

const TimerView: React.FC<TimerViewProps> = ({ 
  activeSession, 
  elapsed, 
  plannedDuration, 
  status,
  onStart,
  onPause,
  onResume,
  onEnd,
  formatHMS
}) => {
  const progress = (elapsed / (plannedDuration * 60)) * 100;
  
  return (
    <div className="max-w-2xl mx-auto text-center space-y-12 py-12">
      <div className="relative inline-block">
        <svg className="w-80 h-80 -rotate-90">
          <circle cx="160" cy="160" r="150" className="stroke-white/5 fill-none" strokeWidth="4" />
          <motion.circle 
            cx="160" cy="160" r="150" 
            className="stroke-accent fill-none" 
            strokeWidth="4" 
            strokeDasharray={942}
            animate={{ strokeDashoffset: 942 - (942 * Math.min(100, progress)) / 100 }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-black tracking-[0.3em] text-muted mb-2 uppercase">Neural Tempo</p>
          <h2 className="display-lg text-6xl tabular-nums">{formatHMS(elapsed)}</h2>
        </div>
      </div>

      <div className="flex justify-center gap-6">
        {status === "idle" ? (
          <button onClick={onStart} className="btn-primary px-12 py-4 rounded-2xl flex items-center gap-3">
            <Play size={20} fill="currentColor" /> INITIALIZE MISSION
          </button>
        ) : (
          <>
            {status === "running" ? (
              <button onClick={onPause} className="nav-btn p-6 rounded-2xl bg-white/5">
                <Pause size={24} fill="currentColor" />
              </button>
            ) : (
              <button onClick={onResume} className="nav-btn p-6 rounded-2xl bg-accent text-black">
                <Play size={24} fill="currentColor" />
              </button>
            )}
            <button onClick={onEnd} className="btn-danger px-12 py-4 rounded-2xl flex items-center gap-3">
              <RefreshCw size={20} /> TERMINATE MISSION
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TimerView;
