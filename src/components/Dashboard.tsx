import { useState, useEffect } from "react";
import { Users, Briefcase, Star, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, Search, Bell, Filter, ClipboardList, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import { motion } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { Candidate, Job } from "../types";
import { useAuth } from "../AuthContext";

const StatCard = ({ icon: Icon, label, value, trend, trendValue, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-premium-gray p-8 rounded-3xl border border-premium-border shadow-sm hover:shadow-xl hover:shadow-gold/5 transition-all group"
  >
    <div className="flex items-start justify-between mb-6">
      <div className={`w-14 h-14 rounded-2xl bg-premium-black border border-premium-border flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-premium-black transition-all duration-500 shadow-lg shadow-gold/5`}>
        <Icon size={28} />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${trend === 'up' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'} border border-current/20 uppercase tracking-widest`}>
        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trendValue}
      </div>
    </div>
    <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-3xl font-black text-gold tracking-tighter">{value}</h3>
  </motion.div>
);

export const Dashboard = () => {
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

  const chartData = [
    { name: "Novos", value: candidates.filter(c => c.status === "Novo").length, color: "#D4AF37" },
    { name: "Triagem", value: candidates.filter(c => c.status === "Triagem").length, color: "#F1D592" },
    { name: "Teste", value: candidates.filter(c => c.status === "Teste Técnico").length, color: "#9A7B2C" },
    { name: "Entrevista", value: candidates.filter(c => c.status === "Entrevista").length, color: "#D4AF37" },
    { name: "Proposta", value: candidates.filter(c => c.status === "Proposta").length, color: "#F1D592" },
  ];

  const avgScore = candidates.length > 0 
    ? Math.round(candidates.reduce((acc, c) => acc + (c.score || 0), 0) / candidates.length) 
    : 0;

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
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gold tracking-tighter">Olá, {user?.name.split(' ')[0]} 👋</h2>
          <p className="text-slate-500 font-medium mt-1">Aqui está o resumo do seu recrutamento premium hoje.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-premium-black rounded-2xl text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20 uppercase tracking-widest"
          >
            <Sparkles size={18} />
            Análise com IA
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-premium-gray border border-premium-border rounded-xl text-xs font-black text-gold hover:bg-premium-black transition-all shadow-sm uppercase tracking-widest">
            <Clock size={18} />
            Últimos 30 dias
          </button>
          <a 
            href="https://wa.me/244997608404" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600/10 border border-green-600/20 rounded-xl text-xs font-black text-green-500 hover:bg-green-600/20 transition-all shadow-sm uppercase tracking-widest"
          >
            Suporte WhatsApp
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          icon={Users} 
          label="Total de Candidatos" 
          value={candidates.length} 
          trend="up" 
          trendValue="+12%" 
          color="bg-gold"
        />
        <StatCard 
          icon={Briefcase} 
          label="Vagas Ativas" 
          value={jobs.filter(j => j.status === 'open').length} 
          trend="up" 
          trendValue="+2" 
          color="bg-gold"
        />
        <StatCard 
          icon={Star} 
          label="Score Médio" 
          value={`${avgScore}%`} 
          trend="up" 
          trendValue="+5%" 
          color="bg-gold"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Taxa de Contratação" 
          value="18%" 
          trend="down" 
          trendValue="-2%" 
          color="bg-gold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-premium-gray p-8 rounded-3xl border border-premium-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gold tracking-tight">Pipeline de Recrutamento</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gold rounded-full"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Candidatos Ativos</span>
            </div>
          </div>
          <div className="h-[400px] w-full min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: '#050505' }}
                  contentStyle={{ 
                    backgroundColor: '#050505', 
                    border: '1px solid #222', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    color: '#D4AF37'
                  }}
                  itemStyle={{ color: '#D4AF37', fontWeight: 700 }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-premium-gray p-8 rounded-3xl border border-premium-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gold tracking-tight">Candidatos Recentes</h3>
            <button className="text-[10px] font-black text-gold hover:underline uppercase tracking-widest">Ver todos</button>
          </div>
          <div className="space-y-6">
            {candidates.slice(0, 5).map((candidate) => (
              <div key={candidate.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-premium-black border border-premium-border flex items-center justify-center text-gold font-bold group-hover:bg-gold group-hover:text-premium-black transition-all">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gold group-hover:text-gold-light transition-colors">{candidate.name}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{candidate.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gold">{candidate.score}%</p>
                  <div className="w-16 h-1.5 bg-premium-black border border-premium-border rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gold`}
                      style={{ width: `${candidate.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {candidates.length === 0 && <p className="text-center text-slate-500 py-8">Nenhum candidato recente.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
