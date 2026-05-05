import React from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, Target, Activity } from "lucide-react";
import { Dashboard, User } from "../../lib/types";

interface DashboardViewProps {
  user: User;
  dashboard: Dashboard | null;
  goalDaily: number;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, dashboard, goalDaily }) => {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Neural XP", value: dashboard?.gamification?.xp || 0, icon: <TrendingUp size={20} />, color: "text-accent" },
          { label: "Neural Level", value: dashboard?.gamification?.level || 1, icon: <Activity size={20} />, color: "text-success" },
          { label: "Mission Streak", value: `${dashboard?.stats?.streak || 0} Days`, icon: <Target size={20} />, color: "text-warning" },
          { label: "Sector Rank", value: `#${dashboard?.gamification?.rank || "---"}`, icon: <LayoutDashboard size={20} />, color: "text-danger" },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 border border-white/5"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>{stat.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">{stat.label}</span>
            </div>
            <p className="display-sm text-2xl">{stat.value}</p>
          </motion.div>
        ))}
      </div>
      
      {/* Add more dashboard specific logic here */}
    </div>
  );
};

export default DashboardView;
