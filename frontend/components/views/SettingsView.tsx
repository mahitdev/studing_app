import React from "react";
import { User, Dashboard } from "../../lib/types";

interface SettingsViewProps {
  user: User | null;
  dashboard: Dashboard | null;
  goalDaily: number;
  goalWeekly: number;
  identityType: string;
  motivationWhy: string;
  summaryEmail: string;
  emailStatus: string;
  setGoalDaily: (val: number) => void;
  setGoalWeekly: (val: number) => void;
  setIdentityType: (val: any) => void;
  setMotivationWhy: (val: string) => void;
  setSummaryEmail: (val: string) => void;
  onGoalUpdate: () => void;
  onIdentityUpdate: () => void;
  onSendEmail: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  goalDaily,
  goalWeekly,
  identityType,
  motivationWhy,
  summaryEmail,
  emailStatus,
  setGoalDaily,
  setGoalWeekly,
  setIdentityType,
  setMotivationWhy,
  setSummaryEmail,
  onGoalUpdate,
  onIdentityUpdate,
  onSendEmail
}) => {
  return (
    <div className="max-w-2xl space-y-12 pb-20">
      <section className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Mission Config</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Daily Target (Min)</label>
            <input type="number" className="w-full bg-white/5 border-white/10" value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Weekly Quota (Min)</label>
            <input type="number" className="w-full bg-white/5 border-white/10" value={goalWeekly} onChange={(e) => setGoalWeekly(Number(e.target.value))} />
          </div>
        </div>
        <button className="btn-primary px-8 py-3 rounded-xl font-bold text-xs" onClick={onGoalUpdate}>Sync Config</button>
      </section>

      <section className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Identity Profile</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Commitment Level</label>
            <select className="w-full bg-white/5 border-white/10" value={identityType} onChange={(e) => setIdentityType(e.target.value as any)}>
              <option value="Casual">Casual</option>
              <option value="Serious">Serious</option>
              <option value="Hardcore">Hardcore</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Motivation Core (The "Why")</label>
            <textarea className="w-full bg-white/5 border-white/10 p-4 rounded-xl" value={motivationWhy} onChange={(e) => setMotivationWhy(e.target.value)} rows={3} />
          </div>
          <button className="btn-primary px-8 py-3 rounded-xl font-bold text-xs" onClick={onIdentityUpdate}>Update Identity</button>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Transmission Protocol</h3>
        <div className="glass-card p-8 border-l-4 border-l-accent space-y-6 border border-white/5">
          <p className="text-xs font-medium text-white/70 italic uppercase tracking-wider leading-relaxed">Transmit your current progress summary to your command center (email).</p>
          <div className="flex gap-3">
            <input 
              type="email" 
              placeholder="commander@example.com" 
              value={summaryEmail} 
              onChange={(e) => setSummaryEmail(e.target.value)}
              className="flex-1 bg-black/40 border-white/10"
            />
            <button 
              className={`px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                emailStatus === "delivered" ? "bg-success text-white" : 
                emailStatus === "failed" ? "bg-danger text-white" : 
                "bg-white/10 hover:bg-white/20 text-white"
              }`}
              onClick={onSendEmail}
              disabled={emailStatus === "transmitting"}
            >
              {emailStatus === "transmitting" ? "SENDING..." : 
               emailStatus === "delivered" ? "SENT" : 
               emailStatus === "failed" ? "RETRY" : "TRANSMIT"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
