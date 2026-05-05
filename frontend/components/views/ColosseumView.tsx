import React from "react";
import { motion } from "framer-motion";
import { Plus, Users, Swords } from "lucide-react";

interface ColosseumViewProps {
  rooms: any[];
  currentRoom: any;
  onJoinRoom: (id: string) => void;
  onCreateRoom: () => void;
}

const ColosseumView: React.FC<ColosseumViewProps> = ({ rooms, currentRoom, onJoinRoom, onCreateRoom }) => {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-lg text-4xl">The Colosseum</h2>
          <p className="text-muted font-medium mt-1 uppercase tracking-widest text-[10px]">Live Study Clusters • Synchronized Discipline</p>
        </div>
        <button className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs" onClick={onCreateRoom}>
          <Plus size={16} /> Create Cluster
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.map((room) => (
          <div key={room._id} className="glass-card p-8 group hover:border-accent/40 transition-all border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
                {room.activeSubject || "General"}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Users size={12} />
                <span className="text-xs font-bold">{room.members?.length || 0}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{room.name}</h3>
            <p className="text-[10px] text-muted mb-8 line-clamp-2 italic uppercase tracking-widest font-black">Commanded by {room.ownerId?.name || "Unknown Agent"}</p>
            <button 
              className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                currentRoom?._id === room._id ? "bg-success/20 text-success border border-success/40" : "bg-white/5 hover:bg-white/10 text-white"
              }`}
              onClick={() => onJoinRoom(room._id)}
            >
              {currentRoom?._id === room._id ? "SYNCHRONIZED" : "JOIN CLUSTER"}
            </button>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="col-span-full glass-light p-20 text-center rounded-3xl opacity-50 border border-dashed border-white/10">
            <Swords className="mx-auto mb-6 text-muted" size={48} />
            <p className="text-sm font-black tracking-[0.3em] uppercase">No active clusters found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColosseumView;
