import React from "react";
import { Zap, LogOut, LayoutDashboard, Timer, BarChart3, Flame, Swords, Settings } from "lucide-react";
import { User, Dashboard } from "../../lib/types";

interface SidebarProps {
  user: User | null;
  dashboard: Dashboard | null;
  activeScreen: string;
  onScreenChange: (screen: any) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, dashboard, activeScreen, onScreenChange, onLogout }) => {
  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "timer", label: "Focus Timer", icon: Timer },
    { id: "analytics", label: "Neural Engine", icon: BarChart3 },
    { id: "streak", label: "Momentum", icon: Flame },
    { id: "colosseum", label: "Colosseum", icon: Swords },
    { id: "settings", label: "System Config", icon: Settings },
  ];

  return (
    <aside className="w-80 h-screen fixed left-0 top-0 glass-card border-r border-white/5 flex flex-col p-8 z-50">
      <div className="flex items-center gap-3 mb-16">
        <div className="p-2 bg-accent/20 rounded-xl">
          <Zap className="text-accent" size={24} />
        </div>
        <h1 className="display-sm text-xl tracking-tighter uppercase font-black">GrindLock<span className="text-accent">.</span></h1>
      </div>

      <nav className="space-y-2 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onScreenChange(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 ${
              activeScreen === item.id 
                ? "bg-accent/10 text-accent font-bold" 
                : "text-muted hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon size={18} strokeWidth={activeScreen === item.id ? 2.5 : 2} />
            <span className="text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center font-bold text-white uppercase">
            {user?.name ? user.name.charAt(0) : 'G'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{user?.name}</p>
            <p className="text-[10px] text-muted uppercase tracking-widest">Lvl {dashboard?.gamification?.level || 1}</p>
          </div>
        </div>
        <button onClick={onLogout} className="nav-btn w-full opacity-50 hover:opacity-100 flex items-center gap-3">
          <LogOut size={16} />
          <span className="text-[10px] uppercase tracking-widest">Eject</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
