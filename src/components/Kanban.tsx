import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MoreVertical, Mail, Phone, Star, Clock, Plus, X, ClipboardList } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import { Candidate, CandidateStatus, Job } from "../types";
import { useAuth } from "../AuthContext";
import { triggerCandidateEmail } from "../lib/email";
import { triggerWhatsAppNotification } from "../lib/whatsapp";
import { api } from "../lib/api";
import { toast } from "sonner";

const STAGES: { id: CandidateStatus; label: string; color: string }[] = [
  { id: "applied", label: "Novos", color: "bg-blue-500" },
  { id: "screening", label: "Triagem", color: "bg-purple-500" },
  { id: "interview", label: "Entrevista", color: "bg-orange-500" },
  { id: "offer", label: "Proposta", color: "bg-emerald-500" },
  { id: "hired", label: "Contratado", color: "bg-gold" },
  { id: "rejected", label: "Rejeitados", color: "bg-red-500" },
];

export const Kanban = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    if (!user.companyId) {
      setLoading(false);
      return;
    }

    const qCandidates = query(
      collection(db, "candidates"),
      where("companyId", "==", user.companyId)
    );
    const unsubscribeCandidates = onSnapshot(qCandidates, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "candidates"));

    const qJobs = query(
      collection(db, "jobs"),
      where("companyId", "==", user.companyId)
    );
    const unsubscribeJobs = onSnapshot(qJobs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "jobs"));

    return () => {
      unsubscribeCandidates();
      unsubscribeJobs();
    };
  }, [user]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("candidateId", id);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: CandidateStatus) => {
    const id = e.dataTransfer.getData("candidateId");
    const candidate = candidates.find(c => c.id === id);
    if (!candidate || candidate.status === newStatus) return;

    try {
      await api.patch(`/api/candidates/${id}/status`, { 
        status: newStatus,
        comment: `Status alterado via Kanban pelo recrutador ${user?.name}`
      });
      
      const job = jobs.find(j => j.id === candidate.jobId);
      await triggerCandidateEmail(candidate.email, candidate.name, newStatus, job?.title || "Vaga");
      if (candidate.phone) {
        await triggerWhatsAppNotification(candidate.name, candidate.phone, newStatus, job?.title || "Vaga");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full bg-premium-black gap-6">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center text-premium-black shadow-xl shadow-gold/10"
        >
          <ClipboardList size={32} />
        </motion.div>
        <div className="w-32 h-1 bg-premium-gray rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-full h-full bg-gold"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gold">Pipeline de Recrutamento</h2>
          <p className="text-slate-500 text-sm">Acompanhe o progresso dos candidatos em tempo real.</p>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
        {STAGES.map((stage) => (
          <div 
            key={stage.id} 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, stage.id)}
            className="flex-shrink-0 w-80"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                <h4 className="font-bold text-gold">{stage.label}</h4>
                <span className="bg-premium-black text-gold px-2 py-0.5 rounded-full text-[10px] font-black border border-premium-border uppercase tracking-widest">
                  {candidates.filter(c => c.status === stage.id).length}
                </span>
              </div>
            </div>
            
            <div className="bg-premium-gray/30 p-3 rounded-3xl min-h-[600px] space-y-4 border border-premium-border/50">
              {candidates.filter(c => c.status === stage.id).map((candidate) => (
                <motion.div
                  key={candidate.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  layoutId={candidate.id}
                  className="bg-premium-gray p-5 rounded-2xl border border-premium-border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-xl hover:shadow-gold/5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-premium-black border border-premium-border flex items-center justify-center text-gold font-bold text-sm group-hover:bg-gold group-hover:text-premium-black transition-all">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-gold line-clamp-1 group-hover:text-gold-light transition-colors">{candidate.name}</h5>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                          {jobs.find(j => j.id === candidate.jobId)?.title || "Vaga"}
                        </p>
                      </div>
                    </div>
                    <button className="p-1.5 text-slate-600 hover:text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gold">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-black">{candidate.score}%</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      candidate.classification === 'alto' ? 'bg-green-900/20 text-green-400 border-green-900/30' :
                      candidate.classification === 'médio' ? 'bg-blue-900/20 text-blue-400 border-blue-900/30' :
                      'bg-orange-900/20 text-orange-400 border-orange-900/30'
                    }`}>
                      {candidate.classification}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
