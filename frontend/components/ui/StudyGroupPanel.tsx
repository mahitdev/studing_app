import React from 'react';
import { Users, Plus, Target, MessageSquare, ArrowRight } from 'lucide-react';

interface StudyGroup {
  _id: string;
  name: string;
  members: any[];
  sharedGoals: any[];
}

interface StudyGroupPanelProps {
  groups: StudyGroup[];
}

export const StudyGroupPanel: React.FC<StudyGroupPanelProps> = ({ groups }) => {
  return (
    <div className="p-6 glass rounded-2xl border border-white/5 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Users className="text-primary" size={20} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Neural Coalitions</h2>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5">
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group._id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide group-hover:text-primary transition-colors">{group.name}</h3>
                <p className="text-[10px] text-white/50 uppercase">{group.members.length} Operatives Active</p>
              </div>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </div>

            <div className="space-y-2">
              {group.sharedGoals.slice(0, 1).map((goal, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span className="text-white/60">{goal.title}</span>
                    <span className="text-primary">{Math.round((goal.currentMinutes / goal.targetMinutes) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                      style={{ width: `${Math.min(100, (goal.currentMinutes / goal.targetMinutes) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
                <Target size={12} /> Sync Goal
              </button>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
                <MessageSquare size={12} /> Intel Feed
              </button>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="py-12 text-center opacity-30 border-2 border-dashed border-white/5 rounded-xl">
            <p className="text-xs uppercase tracking-widest">No coalitions joined.</p>
            <button className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary underline">Initialize New Sector</button>
          </div>
        )}
      </div>
    </div>
  );
};
