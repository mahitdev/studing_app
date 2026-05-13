import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, MessageSquare } from 'lucide-react';
import { getAICoachReply } from '../../lib/api';

interface NeuralCoachProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NeuralCoach({ userId, isOpen, onClose }: NeuralCoachProps) {
  const [messages, setMessages] = useState<{ role: "assistant" | "user", content: string }[]>([
    { role: "assistant", content: "Neural Coach active. Protocol: Maximum Discipline. How can I assist your grind?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const reply = await getAICoachReply(userId, userMsg);
      setMessages(prev => [...prev, { role: "assistant", content: reply.reply }]);
    } catch (err) {
      console.error("Neural Coach Error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Neural transmission failed. Focus on the core mission." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed right-0 top-0 h-full w-96 bg-black/80 backdrop-blur-3xl border-l border-white/5 z-[110] flex flex-col"
        >
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-accent">Neural Coach</h3>
              <p className="text-[8px] font-black tracking-widest text-muted uppercase mt-1">Direct Uplink: Active</p>
            </div>
            <button onClick={onClose} className="nav-btn p-2 hover:bg-white/5"><Plus className="rotate-45" size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "assistant" ? "items-start" : "items-end"}`}>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-2">{m.role === "assistant" ? "COACH" : "OPERATIVE"}</p>
                <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${m.role === "assistant" ? "bg-white/5 border border-white/5 rounded-tl-none" : "bg-accent/20 border border-accent/10 rounded-tr-none"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-[8px] font-black uppercase tracking-widest text-accent animate-pulse">Neural engine processing...</div>}
          </div>

          <div className="p-8 border-t border-white/5 bg-black/20">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Request strategy optimization..." 
                className="flex-1 bg-white/5 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-accent/50"
              />
              <button onClick={sendMessage} className="bg-accent p-3 rounded-xl text-black transition-all hover:scale-105 active:scale-95"><Send size={16} /></button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
