/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, User, Sparkles, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { chatWithAI } from "../services/geminiService";
import { api } from "../lib/api";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, increment } from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { Candidate, Job } from "../types";

export const AIChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
    { role: 'ai', text: 'Olá! Sou Lukeni, o assistente inteligente do GoldTalent. Como posso ajudar com o seu recrutamento hoje?' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dailyLimit, setDailyLimit] = useState(10);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const usageId = `${user.uid}_${today}`;
    const usageRef = doc(db, "usage", usageId);

    const unsubscribe = onSnapshot(usageRef, (docSnap) => {
      if (docSnap.exists()) {
        const used = docSnap.data().count || 0;
        setDailyLimit(10 - used);
      } else {
        setDailyLimit(10);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user?.companyId) return;

    const qCandidates = query(collection(db, "candidates"), where("companyId", "==", user.companyId));
    const unsubscribeCandidates = onSnapshot(qCandidates, (snapshot) => {
      setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
    });

    const qJobs = query(collection(db, "jobs"), where("companyId", "==", user.companyId));
    const unsubscribeJobs = onSnapshot(qJobs, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
    });

    return () => {
      unsubscribeCandidates();
      unsubscribeJobs();
    };
  }, [user]);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (dailyLimit <= 0) {
      setMessages(prev => [...prev, { role: 'ai', text: "Você atingiu seu limite diário de 10 conversas com Lukeni. Por favor, tente novamente amanhã." }]);
      return;
    }

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const result = await api.post("/api/chat", {
        message: userMsg,
        context: {
          userName: user?.name,
          companyId: user?.companyId,
          jobCount: jobs.length,
          candidateCount: candidates.length,
          activeJobs: jobs.map(j => ({ title: j.title, location: j.location })),
          pipelineSummary: candidates.map(c => ({ name: c.name, status: c.status }))
        }
      });

      if (result.success) {
        setMessages(prev => [...prev, { role: 'ai', text: result.response }]);
        setDailyLimit(prev => prev - 1);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "Desculpe, Lukeni está temporariamente indisponível. Por favor, tente novamente mais tarde." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'recruiter') return null;

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-premium-black/90 backdrop-blur-2xl w-[400px] h-[600px] rounded-[32px] shadow-2xl border border-premium-border flex flex-col overflow-hidden mb-6"
          >
            <div className="bg-premium-gray/50 p-6 border-b border-premium-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center text-premium-black shadow-lg shadow-gold/20">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="font-black text-gold text-sm tracking-tight">Lukeni AI</h4>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    {dailyLimit > 0 ? `${dailyLimit} mensagens restantes hoje` : "Limite diário atingido"}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-premium-black rounded-xl text-slate-500 hover:text-gold transition-all">
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-premium-black scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gold text-premium-black rounded-tr-none shadow-lg shadow-gold/10' 
                      : 'bg-premium-gray text-slate-300 border border-premium-border rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-premium-gray p-4 rounded-2xl rounded-tl-none border border-premium-border flex gap-1.5">
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 bg-gold rounded-full"></motion.span>
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-gold rounded-full"></motion.span>
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-gold rounded-full"></motion.span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-premium-gray/50 border-t border-premium-border">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pergunte sobre candidatos ou vagas..." 
                  className="w-full pl-5 pr-14 py-4 bg-premium-black/50 border border-premium-border rounded-2xl text-sm font-medium text-slate-300 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gold text-premium-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-gold/20"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[9px] text-center text-slate-600 mt-3 font-black uppercase tracking-[0.2em]">Powered by GoldTalent AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-gold text-premium-black rounded-2xl shadow-2xl shadow-gold/20 flex items-center justify-center hover:rotate-6 transition-all"
      >
        {isOpen ? <X size={28} /> : <Sparkles size={28} />}
      </motion.button>
    </div>
  );
};
