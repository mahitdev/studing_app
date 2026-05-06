import React from 'react';
import { RefreshCw } from 'lucide-react';

interface NeuralAnalyticsProps {
  data: any;
}

export default function NeuralAnalytics({ data }: NeuralAnalyticsProps) {
  if (!data || data.error) return (
    <div className="p-20 text-center opacity-40">
      <RefreshCw className="mx-auto mb-4 animate-spin" size={32} />
      <p className="text-xs font-black uppercase tracking-widest">Neural Link Synchronizing...</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-10">
      <div className="space-y-10">
        <div className="grid grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Efficiency Rating</p>
            <p className="text-3xl font-black">{data.focus_score}%</p>
          </div>
          <div className="glass-card p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Consistency Index</p>
            <p className="text-3xl font-black">{data.consistency_score}%</p>
          </div>
        </div>
        <div className="glass-card p-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">ML Focus Trajectory</h3>
          {data.graphs?.focus_trend ? (
            <img src={`data:image/png;base64,${data.graphs.focus_trend}`} className="w-full rounded-xl border border-white/5" />
          ) : (
             <div className="h-48 bg-white/5 rounded-xl animate-pulse flex items-center justify-center text-[10px] font-black uppercase text-muted">Awaiting Neural Map...</div>
          )}
        </div>
      </div>

      <div className="space-y-10">
        <div className="glass-card p-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">Knowledge Cluster Distribution</h3>
          {data.graphs?.subject_distribution ? (
            <img src={`data:image/png;base64,${data.graphs.subject_distribution}`} className="w-full max-w-[300px] mx-auto" />
          ) : (
            <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
          )}
        </div>

        <div className="glass-card p-8 bg-gradient-to-br from-accent/20 to-transparent border-none">
           <h3 className="text-xs font-black uppercase tracking-widest text-accent mb-4">Neural Insight</h3>
           <p className="text-sm font-bold italic leading-relaxed text-white">"{data.message}"</p>
        </div>
      </div>
    </div>
  );
}
