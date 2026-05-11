import React from 'react';

interface SpotifyPlayerProps {
  playlistId?: string;
}

export default function SpotifyPlayer({ playlistId = "37i9dQZF1DX8Ueb9CidzhR" }: SpotifyPlayerProps) {
  return (
    <div className="glass-card p-2 overflow-hidden h-full min-h-[300px] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(48,164,108,0.5)]" />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted">Neural Audio Uplink Active</span>
        </div>
        <div className="text-[8px] font-bold text-success uppercase tracking-[0.2em]">High Fidelity</div>
      </div>
      <div className="flex-1 min-h-[300px]">
        <iframe 
          style={{ borderRadius: "0 0 12px 12px" }}
          src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
        />
      </div>
    </div>
  );
}
