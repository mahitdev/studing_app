import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, Activity, Flame, MessageSquare, Brain } from "lucide-react";
import { Dashboard, User } from "../../lib/types";
import PetPanel from "../ui/PetPanel";
import ChallengeList from "../ui/ChallengeList";

interface DashboardViewProps {
  user: User;
  dashboard: Dashboard | null;
  goalDaily: number;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, dashboard, goalDaily }) => {
  const stats = [
    { label: "Neural XP", value: dashboard?.gamification?.xp || user.xp || 0, icon: <TrendingUp size={20} />, color: "text-accent" },
    { label: "Neural Level", value: dashboard?.gamification?.level || user.level || 1, icon: <Activity size={20} />, color: "text-success" },
    { label: "Mission Streak", value: `${dashboard?.streak?.current || user.streak?.current || 0} Days`, icon: <Flame size={20} />, color: "text-warning" },
    { label: "Goal Progress", value: `${dashboard?.todayGoal?.completionPercent || 0}%`, icon: <Target size={20} />, color: "text-danger" },
  ];

  return (
    <div className="space-y-12">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>{stat.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">{stat.label}</span>
            </div>
            <p className="display-sm text-3xl font-black relative z-10">{stat.value}</p>
            <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
               {stat.icon}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Left/Center Column: Challenges & Analytics */}
        <div className="xl:col-span-2 space-y-12">
          <section aria-labelledby="challenges-heading">
            <h2 id="challenges-heading" className="sr-only">Active Challenges</h2>
            <ChallengeList challenges={(dashboard as any)?.challenges || []} />
          </section>

          {/* AI Coach Suggestion Card */}
          <div className="glass-card p-8 bg-gradient-to-r from-accent/10 via-transparent to-transparent border-accent/20">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-accent/20 rounded-2xl">
                <Brain size={32} className="text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-accent mb-4">Neural Advisor Feedback</h3>
                <div className="space-y-3">
                  {(dashboard?.aiCoach || []).map((msg: string, i: number) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-3 text-xs font-bold text-white/80"
                    >
                      <div className="w-1 h-1 rounded-full bg-accent" />
                      {msg}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pet & Social */}
        <div className="space-y-12">
          <section aria-labelledby="pet-heading">
            <h2 id="pet-heading" className="text-xs font-black uppercase tracking-widest text-muted mb-6 flex items-center gap-2">
              <Activity size={14} className="text-success" /> Neural Companion
            </h2>
            <PetPanel pet={(dashboard?.user as any)?.pet || user.pet} xp={dashboard?.gamification?.xp || user.xp} />
          </section>

          <div className="glass-card p-8 text-center bg-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">Daily Momentum</h3>
            <div className="flex justify-center gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${i < (dashboard?.streak?.current || 0) ? 'bg-warning text-black' : 'bg-white/5 text-muted'}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-6">
              {7 - (dashboard?.streak?.current || 0)} Days to Unstoppable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
