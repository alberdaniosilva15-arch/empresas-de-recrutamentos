/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MapPin, Clock, Users, Briefcase, Plus, X, ClipboardList, Download, LayoutGrid, List, ExternalLink, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where } from "firebase/firestore";
import { Job, Candidate } from "../types";
import { useAuth } from "../AuthContext";
import { TimeAgo } from "./TimeAgo";
import { generateJobDescription } from "../services/geminiService";
import { api } from "../lib/api";

export const Jobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "Lisboa, Portugal",
    type: "Full-time" as const,
    requiredSkills: ""
  });

  useEffect(() => {
    if (!user) return;
    
    if (!user.companyId) {
      setLoading(false);
      return;
    }

    const qJobs = query(
      collection(db, "jobs"), 
      where("companyId", "==", user.companyId),
      orderBy("createdAt", "desc")
    );
    const unsubscribeJobs = onSnapshot(qJobs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "jobs"));

    const qCandidates = query(
      collection(db, "candidates"),
      where("companyId", "==", user.companyId)
    );
    const unsubscribeCandidates = onSnapshot(qCandidates, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "candidates"));

    return () => {
      unsubscribeJobs();
      unsubscribeCandidates();
    };
  }, [user]);

  const exportToCSV = () => {
    const headers = ["ID", "Título", "Localização", "Tipo", "Status", "Data de Criação"];
    const rows = jobs.map(job => [
      job.id,
      job.title,
      job.location,
      job.type,
      job.status,
      new Date(job.createdAt?.seconds * 1000).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "vagas_ativas.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;

    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 4);

      const result = await api.post("/api/jobs", {
        ...newJob,
        requiredSkills: newJob.requiredSkills.split(",").map(s => s.trim()),
        expiresAt: expiresAt.toISOString()
      });

      if (result.success) {
        setShowModal(false);
        setNewJob({ title: "", description: "", location: "Lisboa, Portugal", type: "Full-time", requiredSkills: "" });
      }
    } catch (error: any) {
      alert(error.message);
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
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gold">Vagas em Aberto</h2>
          <p className="text-slate-500">Gerencie suas vagas e acompanhe o progresso de cada uma.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-premium-gray border border-premium-border text-gold px-4 py-2.5 rounded-xl font-semibold hover:bg-premium-black transition-all"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          {selectedJobId && (
            <button 
              onClick={() => window.location.href = `/jobs/${selectedJobId}`}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
            >
              <ExternalLink size={18} />
              Detalhes da Vaga
            </button>
          )}
          <div className="flex bg-premium-gray border border-premium-border p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-gold text-premium-black" : "text-slate-500 hover:text-gold"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'list' ? "bg-gold text-premium-black" : "text-slate-500 hover:text-gold"
              )}
            >
              <List size={18} />
            </button>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gold text-premium-black px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-gold/20 hover:bg-gold-light transition-all"
          >
            <Plus size={20} />
            Nova Vaga
          </button>
        </div>
      </div>

      <div className={cn(
        "grid gap-8",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {jobs.map((job) => {
          const candidateCount = candidates.filter(c => c.jobId === job.id).length;
          return (
            <motion.div 
              key={job.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedJobId(job.id)}
              className={cn(
                "bg-premium-gray rounded-3xl border border-premium-border shadow-sm hover:shadow-xl hover:shadow-gold/5 transition-all group cursor-pointer",
                selectedJobId === job.id ? "ring-2 ring-gold" : "",
                viewMode === 'grid' ? "p-8" : "p-6 flex items-center gap-6"
              )}
            >
              <div className={cn(
                "flex items-start justify-between",
                viewMode === 'grid' ? "mb-6" : "mb-0"
              )}>
                <div className="w-12 h-12 rounded-2xl bg-premium-black border border-premium-border flex items-center justify-center text-gold font-bold text-xl group-hover:bg-gold group-hover:text-premium-black transition-colors">
                  {job.title.charAt(0)}
                </div>
                {viewMode === 'grid' && (
                  <div className="px-3 py-1 bg-premium-black border border-premium-border rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {job.type}
                  </div>
                )}
              </div>

              <div className={cn(
                "flex-1",
                viewMode === 'list' ? "flex items-center justify-between" : ""
              )}>
                <div>
                  <h3 className="text-xl font-bold text-gold mb-2">{job.title}</h3>
                  {viewMode === 'grid' ? (
                    <p className="text-sm text-slate-400 mb-6 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <MapPin size={14} />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Clock size={14} />
                        <TimeAgo date={job.createdAt} />
                      </div>
                    </div>
                  )}
                </div>

                {viewMode === 'grid' && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {job.requiredSkills?.map((skill, idx) => (
                        <span key={idx} className="text-[10px] bg-premium-black border border-premium-border text-gold px-2 py-1 rounded-md font-bold uppercase">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 mb-8">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-premium-black border border-premium-border px-3 py-1.5 rounded-lg">
                        <MapPin size={14} />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-premium-black border border-premium-border px-3 py-1.5 rounded-lg">
                        <Clock size={14} />
                        <TimeAgo date={job.createdAt} />
                      </div>
                    </div>
                  </>
                )}

                <div className={cn(
                  "flex items-center justify-between",
                  viewMode === 'grid' ? "pt-6 border-t border-premium-border" : "gap-8"
                )}>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-premium-black bg-premium-gray overflow-hidden">
                          <img src={`https://picsum.photos/seed/${job.id}${i}/50/50`} alt="Avatar" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-500">+{candidateCount} candidatos</span>
                  </div>
                  {viewMode === 'list' && (
                    <div className="px-3 py-1 bg-premium-black border border-premium-border rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {job.type}
                    </div>
                  )}
                  <button className="p-2 text-gold hover:bg-premium-black rounded-lg transition-all border border-transparent hover:border-premium-border">
                    <Briefcase size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {jobs.length === 0 && <p className="col-span-full text-center text-slate-500 py-12">Nenhuma vaga aberta.</p>}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-premium-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-premium-gray w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-premium-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gold">Nova Vaga</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-premium-black rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddJob} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                  <input 
                    type="text" 
                    value={newJob.title}
                    onChange={e => setNewJob({...newJob, title: e.target.value})}
                    className="w-full bg-premium-black border border-premium-border text-slate-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-gold outline-none transition-all"
                    placeholder="Ex: Gestor de Supply Chain"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                    Descrição
                    <button 
                      type="button"
                      onClick={async () => {
                        if (!newJob.title) {
                          alert("Por favor, insira o título da vaga primeiro.");
                          return;
                        }
                        setIsGenerating(true);
                        const desc = await generateJobDescription(newJob.title, newJob.description || "Requisitos padrão");
                        setNewJob(prev => ({ ...prev, description: desc }));
                        setIsGenerating(false);
                      }}
                      disabled={isGenerating}
                      className="text-[10px] bg-gold/10 text-gold px-2 py-1 rounded border border-gold/20 hover:bg-gold/20 transition-all flex items-center gap-1"
                    >
                      {isGenerating ? "Gerando..." : <><Sparkles size={10} /> Gerar com IA</>}
                    </button>
                  </label>
                  <textarea 
                    value={newJob.description}
                    onChange={e => setNewJob({...newJob, description: e.target.value})}
                    className="w-full bg-premium-black border border-premium-border text-slate-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-gold outline-none transition-all h-32"
                    placeholder="Descreva as responsabilidades..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills (separadas por vírgula)</label>
                  <input 
                    type="text" 
                    value={newJob.requiredSkills}
                    onChange={e => setNewJob({...newJob, requiredSkills: e.target.value})}
                    className="w-full bg-premium-black border border-premium-border text-slate-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-gold outline-none transition-all"
                    placeholder="SAP, Excel, Gestão de Stock"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Localização</label>
                    <input 
                      type="text" 
                      value={newJob.location}
                      onChange={e => setNewJob({...newJob, location: e.target.value})}
                      className="w-full bg-premium-black border border-premium-border text-slate-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-gold outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
                    <select 
                      value={newJob.type}
                      onChange={e => setNewJob({...newJob, type: e.target.value as any})}
                      className="w-full bg-premium-black border border-premium-border text-slate-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-gold outline-none transition-all"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-gold text-premium-black py-4 rounded-xl font-bold shadow-lg shadow-gold/20 hover:bg-gold-light transition-all mt-4"
                >
                  Publicar Vaga
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

