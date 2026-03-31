import React, { useState, useEffect } from "react";
import { Search, Filter, Plus, Mail, Phone, MoreVertical, Star, Clock, CheckCircle2, AlertCircle, X, FileText, Download, Trash2, ExternalLink, ClipboardList, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, arrayUnion } from "firebase/firestore";
import { Candidate, CandidateStatus, Job } from "../types";
import { triggerCandidateEmail } from "../lib/email";
import { triggerWhatsAppNotification } from "../lib/whatsapp";
import { api } from "../lib/api";
import { useAuth } from "../AuthContext";
import { suggestJobsForCandidate } from "../services/geminiService";

export const Candidates = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "Todos">("Todos");
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    email: "",
    phone: "",
    jobId: "",
    experience: "",
    education: ""
  });

  useEffect(() => {
    if (!user) return;
    
    if (!user.companyId) {
      setLoading(false);
      return;
    }

    const qCandidates = query(
      collection(db, "candidates"), 
      where("companyId", "==", user.companyId),
      orderBy("createdAt", "desc")
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

  const handleStatusChange = async (id: string, newStatus: CandidateStatus) => {
    try {
      const candidate = candidates.find(c => c.id === id);
      if (!candidate) return;

      await api.patch(`/api/candidates/${id}/status`, { 
        status: newStatus,
        comment: `Status alterado pelo recrutador ${user?.name}`
      });
      
      // Send notifications (these could also be moved to backend)
      const job = jobs.find(j => j.id === candidate.jobId);
      await triggerCandidateEmail(candidate.email, candidate.name, newStatus, job?.title || "Vaga");
      if (candidate.phone) {
        await triggerWhatsAppNotification(candidate.name, candidate.phone, newStatus, job?.title || "Vaga");
      }
      
      if (selectedCandidate?.id === id) {
        setSelectedCandidate({ ...selectedCandidate, status: newStatus });
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Telemóvel", "Vaga", "Status", "Score AI", "Classificação", "Data de Candidatura"];
    const rows = filteredCandidates.map(c => [
      c.name,
      c.email,
      c.phone || "N/A",
      jobs.find(j => j.id === c.jobId)?.title || "Vaga Removida",
      c.status,
      `${c.score}%`,
      c.classification || "N/A",
      new Date(c.createdAt?.seconds * 1000).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "candidatos.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este candidato?")) return;
    try {
      await deleteDoc(doc(db, "candidates", id));
      if (selectedCandidate?.id === id) setSelectedCandidate(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "candidates");
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    setIsAnalyzing(true);

    try {
      const result = await api.post("/api/candidates", {
        cvText: `Experiência: ${newCandidate.experience}\nEducação: ${newCandidate.education}`,
        jobId: newCandidate.jobId
      });

      if (result.success) {
        // Now create the application
        await api.post("/api/applications", {
          candidateId: result.candidate.id,
          jobId: newCandidate.jobId
        });

        // Send initial email (could also be moved to backend)
        const job = jobs.find(j => j.id === newCandidate.jobId);
        await triggerCandidateEmail(newCandidate.email, newCandidate.name, "applied", job?.title || "Vaga");

        setShowModal(false);
        setNewCandidate({ name: "", email: "", phone: "", jobId: "", experience: "", education: "" });
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Todos" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: CandidateStatus) => {
    switch (status) {
      case "applied": return "bg-blue-900/20 text-blue-400 border-blue-900/30";
      case "screening": return "bg-amber-900/20 text-amber-400 border-amber-900/30";
      case "interview": return "bg-indigo-900/20 text-indigo-400 border-indigo-900/30";
      case "offer": return "bg-emerald-900/20 text-emerald-400 border-emerald-900/30";
      case "hired": return "bg-green-900/20 text-green-400 border-green-900/30";
      case "rejected": return "bg-red-900/20 text-red-400 border-red-900/30";
      default: return "bg-slate-900/20 text-slate-400 border-slate-900/30";
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
          <h2 className="text-2xl font-bold text-gold">Base de Candidatos</h2>
          <p className="text-slate-500">Gerencie todos os talentos em um só lugar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-gold transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-premium-gray border border-premium-border rounded-xl text-sm text-slate-300 focus:ring-2 focus:ring-gold outline-none w-64 transition-all placeholder:text-slate-600"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gold" size={18} />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-4 py-2.5 bg-premium-gray border border-premium-border rounded-xl text-sm text-gold focus:ring-2 focus:ring-gold outline-none appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="Todos">Todos Status</option>
              <option value="applied">Novo</option>
              <option value="screening">Triagem</option>
              <option value="interview">Entrevista</option>
              <option value="offer">Proposta</option>
              <option value="hired">Contratado</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-premium-gray border border-premium-border text-gold px-4 py-2.5 rounded-xl font-semibold hover:bg-premium-black transition-all"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gold text-premium-black px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-gold/20 hover:bg-gold-light transition-all"
          >
            <Plus size={20} />
            Adicionar Candidato
          </button>
        </div>
      </div>

      <div className="bg-premium-gray rounded-3xl border border-premium-border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-premium-black border-b border-premium-border">
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Candidato</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vaga</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Score AI</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-premium-border">
            {filteredCandidates.map((candidate) => (
              <motion.tr 
                key={candidate.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-premium-black/50 transition-colors group cursor-pointer"
                onClick={() => setSelectedCandidate(candidate)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-premium-black border border-premium-border flex items-center justify-center text-gold font-bold group-hover:bg-gold group-hover:text-premium-black transition-all">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gold group-hover:text-gold-light transition-colors">{candidate.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                          <Mail size={10} /> {candidate.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black text-gold bg-premium-black border border-premium-border px-2.5 py-1 rounded-lg uppercase tracking-widest">
                    {jobs.find(j => j.id === candidate.jobId)?.title || "Vaga Removida"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest",
                    getStatusColor(candidate.status)
                  )}>
                    {candidate.status === 'applied' ? 'Novo' :
                     candidate.status === 'screening' ? 'Triagem' :
                     candidate.status === 'interview' ? 'Entrevista' :
                     candidate.status === 'offer' ? 'Proposta' :
                     candidate.status === 'hired' ? 'Contratado' :
                     candidate.status === 'rejected' ? 'Rejeitado' : candidate.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-premium-black h-1.5 rounded-full overflow-hidden border border-premium-border">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          candidate.score >= 80 ? "bg-green-500" : candidate.score >= 50 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${candidate.score}%` }}
                    ></div>
                    </div>
                    <span className="text-xs font-black text-gold">{candidate.score}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-500 hover:text-gold hover:bg-premium-black rounded-lg transition-all border border-transparent hover:border-premium-border">
                      <FileText size={18} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(candidate.id);
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all border border-transparent hover:border-red-900/30"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filteredCandidates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold">
                  Nenhum candidato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Candidate Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-premium-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-premium-gray w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-premium-border"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gold tracking-tight">Adicionar Candidato</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-premium-black rounded-full transition-colors text-slate-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddCandidate} className="grid grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      value={newCandidate.name}
                      onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                      className="w-full bg-premium-black border border-premium-border rounded-2xl py-3.5 px-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" 
                      value={newCandidate.email}
                      onChange={e => setNewCandidate({...newCandidate, email: e.target.value})}
                      className="w-full bg-premium-black border border-premium-border rounded-2xl py-3.5 px-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Telemóvel</label>
                    <input 
                      type="tel" 
                      value={newCandidate.phone}
                      onChange={e => setNewCandidate({...newCandidate, phone: e.target.value})}
                      className="w-full bg-premium-black border border-premium-border rounded-2xl py-3.5 px-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Vaga</label>
                    <select 
                      value={newCandidate.jobId}
                      onChange={e => setNewCandidate({...newCandidate, jobId: e.target.value})}
                      className="w-full bg-premium-black border border-premium-border rounded-2xl py-3.5 px-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all"
                      required
                    >
                      <option value="">Selecionar vaga...</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Experiência (Resumo)</label>
                    <textarea 
                      value={newCandidate.experience}
                      onChange={e => setNewCandidate({...newCandidate, experience: e.target.value})}
                      className="w-full bg-premium-black border border-premium-border rounded-2xl py-3.5 px-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all h-32 placeholder:text-slate-600"
                      placeholder="Descreva a experiência relevante..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Educação</label>
                    <textarea 
                      value={newCandidate.education}
                      onChange={e => setNewCandidate({...newCandidate, education: e.target.value})}
                      className="w-full bg-premium-black border border-premium-border rounded-2xl py-3.5 px-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all h-24 placeholder:text-slate-600"
                      placeholder="Formação académica..."
                      required
                    />
                  </div>
                </div>

                <div className="col-span-2 mt-6">
                  <button 
                    type="submit"
                    disabled={isAnalyzing}
                    className="w-full bg-gold text-premium-black py-4 rounded-2xl font-black shadow-xl shadow-gold/20 hover:bg-gold-light transition-all flex items-center justify-center gap-3 disabled:opacity-70 uppercase tracking-widest"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-premium-black border-t-transparent rounded-full animate-spin"></div>
                        Analisando com AI...
                      </>
                    ) : (
                      "Adicionar e Analisar Candidato"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Candidate Detail Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-premium-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-premium-gray w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-premium-border max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <div className="bg-premium-black p-10 text-white relative border-b border-premium-border">
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="absolute top-8 right-8 p-2 hover:bg-premium-gray rounded-full transition-colors text-slate-500 hover:text-gold"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 rounded-3xl bg-gold flex items-center justify-center text-premium-black text-4xl font-black shadow-xl shadow-gold/20">
                    {selectedCandidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gold tracking-tighter">{selectedCandidate.name}</h3>
                    <p className="text-slate-500 font-bold mt-1">{selectedCandidate.email}</p>
                    <div className="flex gap-4 mt-6">
                      <div className="flex items-center gap-2 text-[10px] font-black bg-premium-gray text-gold px-4 py-2 rounded-xl border border-premium-border uppercase tracking-widest cursor-pointer hover:bg-gold hover:text-premium-black transition-all">
                        <Mail size={14} />
                        Enviar Email
                      </div>
                      <div 
                        onClick={() => {
                          const job = jobs.find(j => j.id === selectedCandidate.jobId);
                          triggerWhatsAppNotification(
                            selectedCandidate.name, 
                            selectedCandidate.phone || "", 
                            selectedCandidate.status, 
                            job?.title || "Vaga"
                          ).then(() => alert("Notificação enviada!"));
                        }}
                        className="flex items-center gap-2 text-[10px] font-black bg-premium-gray text-gold px-4 py-2 rounded-xl border border-premium-border uppercase tracking-widest cursor-pointer hover:bg-gold hover:text-premium-black transition-all"
                      >
                        <Phone size={14} />
                        WhatsApp
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 bg-premium-black rounded-3xl border border-premium-border">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Score AI</p>
                    <p className="text-2xl font-black text-gold">{selectedCandidate.score || 0}%</p>
                  </div>
                  <div className="p-6 bg-premium-black rounded-3xl border border-premium-border">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</p>
                    <p className="text-xl font-black text-gold">{selectedCandidate.status}</p>
                  </div>
                  <div className="p-6 bg-premium-black rounded-3xl border border-premium-border">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Classificação</p>
                    <p className="text-xl font-black text-green-400 uppercase tracking-tighter">{selectedCandidate.classification || "N/A"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    Histórico de Status
                    <Clock size={14} className="text-gold" />
                  </h4>
                  <div className="space-y-4">
                    {selectedCandidate.statusHistory?.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-premium-black rounded-2xl border border-premium-border">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          getStatusColor(entry.status).split(' ')[1].replace('text-', 'bg-')
                        )} />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gold">{entry.status}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {new Date(entry.timestamp).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <CheckCircle2 size={16} className="text-slate-700" />
                      </div>
                    ))}
                    {(!selectedCandidate.statusHistory || selectedCandidate.statusHistory.length === 0) && (
                      <p className="text-sm text-slate-500 italic">Nenhum histórico disponível.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">Sugestões de Vagas IA <Sparkles size={14} className="text-gold" /></span>
                    <button 
                      onClick={async () => {
                        if (!selectedCandidate) return;
                        setIsSuggesting(true);
                        const suggestions = await suggestJobsForCandidate(selectedCandidate.cvText || "", jobs);
                        setAiSuggestions(suggestions);
                        setIsSuggesting(false);
                      }}
                      disabled={isSuggesting}
                      className="text-[10px] bg-gold/10 text-gold px-2 py-1 rounded border border-gold/20 hover:bg-gold/20 transition-all"
                    >
                      {isSuggesting ? "Analisando..." : "Sugerir com IA"}
                    </button>
                  </h4>
                  {aiSuggestions ? (
                    <div className="p-6 bg-gold/5 rounded-3xl border border-gold/20 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {aiSuggestions}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic">Clique em "Sugerir com IA" para ver as melhores vagas para este perfil.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    Resumo do CV
                    <ExternalLink size={14} className="text-gold" />
                  </h4>
                  <div className="p-8 bg-premium-black rounded-3xl border border-premium-border text-sm text-slate-400 leading-relaxed italic max-h-48 overflow-y-auto scrollbar-hide">
                    "{selectedCandidate.cvText || "Nenhum texto de CV disponível."}"
                  </div>
                </div>

                <div className="flex gap-6">
                  <select 
                    value={selectedCandidate.status}
                    onChange={(e) => handleStatusChange(selectedCandidate.id, e.target.value as CandidateStatus)}
                    className="flex-1 bg-gold text-premium-black py-4 rounded-2xl font-black shadow-xl shadow-gold/20 hover:bg-gold-light transition-all text-center appearance-none outline-none uppercase tracking-widest text-xs"
                  >
                    <option value="applied">Novo</option>
                    <option value="screening">Triagem</option>
                    <option value="interview">Entrevista</option>
                    <option value="offer">Proposta</option>
                    <option value="hired">Contratado</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                  <button 
                    onClick={() => handleDelete(selectedCandidate.id)}
                    className="flex-1 bg-red-900/20 text-red-400 py-4 rounded-2xl font-black border border-red-900/30 hover:bg-red-900/30 transition-all uppercase tracking-widest text-xs"
                  >
                    Excluir Candidato
                  </button>
                </div>
              </div>
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
