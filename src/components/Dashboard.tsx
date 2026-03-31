import { useState, useEffect } from "react";
import { Users, Briefcase, Star, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, Search, Bell, Filter, ClipboardList, Sparkles, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import { motion } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { Candidate, Job } from "../types";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";

const StatCard = ({ icon: Icon, label, value, trend, trendValue, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-premium-gray p-4 md:p-8 rounded-3xl border border-premium-border shadow-sm hover:shadow-xl hover:shadow-gold/5 transition-all group"
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
  const [jobStats, setJobStats] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);

  const historyData = [
    { date: "2026-03-30", event: "Novo Candidato: João Silva", type: "candidate" },
    { date: "2026-03-29", event: "Vaga Publicada: Frontend Dev", type: "job" },
    { date: "2026-03-28", event: "Entrevista Marcada: Maria Santos", type: "interview" },
    { date: "2026-03-27", event: "Proposta Aceite: Pedro Lima", type: "offer" },
    { date: "2026-03-25", event: "Novo Candidato: Ana Costa", type: "candidate" },
  ];

  const handleBid = async () => {
    if (!user || !bidAmount) return;
    try {
      const res = await fetch(`/api/jobs/any/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.email, amount: Number(bidAmount) })
      });
      if (res.ok) {
        toast.success("Bid lançado com sucesso! A tua visibilidade será atualizada.");
        setBidAmount("");
      }
    } catch (error) {
      console.error("Failed to place bid:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      if (user.role === 'candidate') {
        try {
          const res = await fetch(`/api/jobs/any/stats/${user.email}`); // Using 'any' for demo
          const data = await res.json();
          setJobStats(data);
        } catch (error) {
          console.error("Failed to fetch job stats:", error);
        }
      }
    };
    fetchStats();

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
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gold tracking-tighter">Olá, {user?.name.split(' ')[0]} 👋</h2>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Aqui está o resumo do seu recrutamento premium hoje.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gold text-premium-black rounded-2xl text-[10px] md:text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20 uppercase tracking-widest"
          >
            <Sparkles size={18} />
            Análise com IA
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-premium-gray border border-premium-border rounded-xl text-[10px] md:text-xs font-black text-gold hover:bg-premium-black transition-all shadow-sm uppercase tracking-widest"
          >
            <Clock size={18} />
            Últimos 30 dias
          </button>
          <a 
            href="https://wa.me/244997608404" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600/10 border border-green-600/20 rounded-xl text-[10px] md:text-xs font-black text-green-500 hover:bg-green-600/20 transition-all shadow-sm uppercase tracking-widest"
          >
            Suporte WhatsApp
          </a>
        </div>
      </div>

      {/* Competitive Pressure Banner */}
      {user?.role === 'candidate' && (
        <div className="space-y-4">
          {jobStats?.isHappyHour && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-500 p-3 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20"
            >
              <Sparkles size={18} className="text-white animate-pulse" />
              <p className="text-xs font-black text-white uppercase tracking-widest">
                🔥 HAPPY HOUR DE BOOST! 50% DE DESCONTO NOS PRÓXIMOS 30 MINUTOS!
              </p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-boost-modal'))}
                className="bg-white text-orange-500 px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
              >
                Aproveitar
              </button>
            </motion.div>
          )}
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gold/10 border border-gold/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6"
          >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center text-premium-black shadow-lg shadow-gold/20">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gold">
                {jobStats?.rank ? `Estás em ${jobStats.rank}º lugar na tua vaga principal` : 'A analisar a tua posição...'}
              </h3>
              <p className="text-slate-400 text-sm font-bold">
                Os Top 3 são vistos {jobStats?.topThreeAdvantage || '5x'} mais rápido pelos recrutadores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atividade da Vaga</p>
              <p className="text-sm font-bold text-white">🔥 {jobStats?.boostCount || 0} candidatos usaram Boost nesta vaga</p>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-boost-modal'))}
              className="px-6 py-3 bg-gold text-premium-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-xl shadow-gold/20 uppercase tracking-widest"
            >
              Subir no Ranking
            </button>
          </div>
        </motion.div>
      </div>
      )}

      {/* Visibility Auction (Bidding) */}
      {user?.role === 'candidate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-premium-gray p-4 md:p-8 rounded-3xl border border-premium-border shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg md:text-xl font-black text-gold tracking-tight flex items-center gap-2">
                Leilão de Visibilidade <Sparkles size={18} className="text-gold" />
              </h3>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nível Extremo</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <p className="text-slate-400 text-sm leading-relaxed">
                  Queres garantir o primeiro lugar? No GoldTalent, o mercado regula-se sozinho. 
                  Adiciona um valor à tua candidatura para ultrapassar a concorrência instantaneamente.
                </p>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-black">Kz</span>
                    <input 
                      type="number" 
                      placeholder="Valor do Bid"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-premium-black border border-premium-border rounded-xl text-gold font-black outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <button 
                    onClick={handleBid}
                    className="px-8 py-3 bg-white text-premium-black rounded-xl text-xs font-black hover:scale-105 transition-all uppercase tracking-widest"
                  >
                    Lançar Bid
                  </button>
                </div>
              </div>
              <div className="w-full md:w-64 p-6 bg-premium-black rounded-2xl border border-gold/20 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Bid Atual Mais Alto</p>
                <p className="text-3xl font-black text-gold tracking-tighter">Kz 2.500</p>
                <p className="text-[10px] font-bold text-green-400 mt-2 uppercase">Vaga: Software Engineer</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gold/5 p-8 rounded-3xl border border-gold/20 flex flex-col justify-center">
            <h4 className="text-sm font-black text-gold uppercase tracking-widest mb-4">Como funciona?</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-xs text-slate-400">
                <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-gold font-black shrink-0">1</div>
                <span>O teu Bid é somado ao teu Score de IA para o Ranking Final.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-slate-400">
                <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-gold font-black shrink-0">2</div>
                <span>Podes aumentar o teu Bid a qualquer momento.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-slate-400">
                <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-gold font-black shrink-0">3</div>
                <span>Garante que o teu perfil é o primeiro que o recrutador vê.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

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
        <div className="lg:col-span-2 bg-premium-gray p-4 md:p-8 rounded-3xl border border-premium-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg md:text-xl font-black text-gold tracking-tight">Fluxo de Candidaturas</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gold rounded-full"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Candidatos Ativos</span>
            </div>
          </div>
          
          <div className="h-[400px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#050505', 
                    border: '1px solid #222', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    color: '#D4AF37'
                  }}
                  itemStyle={{ color: '#D4AF37', fontWeight: 700 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#D4AF37" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-premium-gray p-4 md:p-8 rounded-3xl border border-premium-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg md:text-xl font-black text-gold tracking-tight">Candidatos Recentes</h3>
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

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-premium-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-premium-gray w-full max-w-2xl rounded-[2.5rem] p-8 border border-premium-border shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center text-premium-black shadow-lg shadow-gold/20">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gold tracking-tighter">Histórico de Atividade</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Últimos 30 dias</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-premium-black rounded-xl text-slate-500 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {historyData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-premium-black/50 border border-premium-border rounded-2xl hover:border-gold/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.type === 'candidate' ? 'bg-blue-500/20 text-blue-400' : 
                      item.type === 'job' ? 'bg-green-500/20 text-green-400' : 
                      item.type === 'interview' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.type === 'candidate' ? <Users size={18} /> : 
                       item.type === 'job' ? <Briefcase size={18} /> : 
                       item.type === 'interview' ? <Clock size={18} /> : 
                       <Sparkles size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gold group-hover:text-gold-light transition-colors">{item.event}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{item.date}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={18} className="text-slate-600 group-hover:text-gold transition-all" />
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowHistory(false)}
              className="w-full mt-8 bg-gold text-premium-black py-4 rounded-2xl font-black shadow-xl shadow-gold/20 hover:bg-gold-light transition-all uppercase tracking-widest text-xs"
            >
              Fechar Histórico
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
