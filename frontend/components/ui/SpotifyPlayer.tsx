import React from 'react';

interface SpotifyPlayerProps {
  playlistId?: string;
}

export default function SpotifyPlayer({ playlistId = "37i9dQZF1DX8Ueb9CidzhR" }: SpotifyPlayerProps) {
  return (
    <div className="glass-card p-2 overflow-hidden h-full min-h-[300px]">
      <iframe 
        style={{ borderRadius: "12px" }}
        src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`} 
        width="100%" 
        height="100%" 
        frameBorder="0" 
        allowFullScreen 
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
        loading="lazy"
      />
    </div>
  );
}
