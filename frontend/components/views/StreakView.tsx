import React from "react";
import { motion } from "framer-motion";
import { Dashboard } from "../../lib/types";

interface StreakViewProps {
  dashboard: Dashboard | null;
}

const StreakView: React.FC<StreakViewProps> = ({ dashboard }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-20 text-center min-h-[60vh]"
    >
      <div className="text-8xl mb-8 filter drop-shadow-[0_0_40px_rgba(255,80,0,0.5)] animate-pulse">🔥</div>
      <h2 className="display-lg text-8xl mb-4 font-black">{dashboard?.streak?.current || 0}</h2>
      <p className="text-xs font-black tracking-[0.5em] uppercase text-accent mb-16">Consecutive Mission Days</p>
      
      <div className="flex gap-20">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Neural Record</p>
          <p className="text-4xl font-black">{dashboard?.streak?.longest || 0}d</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Sync Consistency</p>
          <p className="text-4xl font-black">{dashboard?.consistencyScore7d || 0}%</p>
        </div>
      </div>
    </motion.div>
  );
};

export default StreakView;
