import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Menu, 
  X,
  ChevronRight,
  User,
  Building2,
  PieChart,
  ClipboardList,
  Phone,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dashboard } from "./components/Dashboard";
import { Candidates } from "./components/Candidates";
import { Jobs } from "./components/Jobs";
import { Kanban } from "./components/Kanban";
import { AIChat } from "./components/AIChat";
import { Auth } from "./components/Auth";
import { Onboarding } from "./components/Onboarding";
import { Diagnostics } from "./components/Diagnostics";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "./lib/api";
import { Plan } from "./types";
import { Toaster } from "sonner";

const PlanBadge = ({ plan }: { plan: Plan }) => {
  const styles = {
    free: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    premium: "bg-gold/10 text-gold border-gold/20 shadow-sm shadow-gold/10",
    elite: "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-sm shadow-purple-500/10"
  };

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${styles[plan]}`}>
      {plan}
    </span>
  );
};

const BoostModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const handleBoost = async (boostType: string) => {
    if (!user) return;
    try {
      await api.post("/api/activate-boost", { userId: user.id, boostType });
      window.location.reload();
    } catch (error) {
      console.error("Boost failed:", error);
    }
  };

  const boosts = [
    { name: "Boost 1h", price: "Kz 2.000", duration: "1 hora", multiplier: "2x", icon: Bell, type: "1h" },
    { name: "Boost 24h", price: "Kz 5.000", duration: "24 horas", multiplier: "2x", icon: Sparkles, highlight: true, type: "24h" },
    { name: "Super Boost", price: "Kz 10.000", duration: "72 horas", multiplier: "3x", icon: ShieldCheck, premium: true, type: "super" }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-premium-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-premium-black border border-premium-border rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl"
      >
        <div className="p-4 md:p-8 border-b border-premium-border flex justify-between items-center bg-premium-gray/30">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gold tracking-tighter">Acelerar Visibilidade</h2>
            <p className="text-slate-500 text-xs md:text-sm font-bold">Fure a fila e apareça no topo para os recrutadores agora.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-premium-gray rounded-xl transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {boosts.map((b) => (
            <div key={b.name} className={`p-6 rounded-3xl border ${b.highlight ? 'border-gold bg-gold/5' : b.premium ? 'border-purple-500/50 bg-purple-500/5' : 'border-premium-border bg-premium-gray/20'} flex flex-col`}>
              <div className="mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${b.highlight ? 'bg-gold text-premium-black' : b.premium ? 'bg-purple-500 text-white' : 'bg-premium-gray text-gold'}`}>
                  <b.icon size={24} />
                </div>
                <h3 className={`text-xl font-black ${b.highlight ? 'text-gold' : b.premium ? 'text-purple-400' : 'text-slate-300'}`}>{b.name}</h3>
                <p className="text-2xl font-black text-white mt-1">{b.price}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <ShieldCheck size={14} className="text-gold shrink-0" />
                  Duração: {b.duration}
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <ShieldCheck size={14} className="text-gold shrink-0" />
                  Multiplicador: {b.multiplier}
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <ShieldCheck size={14} className="text-gold shrink-0" />
                  Prioridade Máxima
                </li>
              </ul>
              <button 
                onClick={() => handleBoost(b.type)}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${b.highlight ? 'bg-gold text-premium-black hover:scale-105 shadow-lg shadow-gold/20' : 'bg-white text-premium-black hover:scale-105'}`}
              >
                Ativar Agora
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-premium-gray/50 border-t border-premium-border text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ativação instantânea via Multicaixa Express</p>
        </div>
      </motion.div>
    </div>
  );
};

const UpgradeModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const handleUpgrade = async (plan: string) => {
    if (!user) return;
    try {
      await api.post("/api/upgrade-plan", { userId: user.id, plan });
      window.location.reload(); // Simple reload to refresh user state
    } catch (error) {
      console.error("Upgrade failed:", error);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "Kz 0",
      features: ["3 candidaturas/dia", "Visibilidade padrão", "Suporte via comunidade"],
      current: true
    },
    {
      name: "Premium",
      price: "Kz 15.000/mês",
      features: ["Candidaturas ilimitadas", "Visibilidade 1.3x", "Acesso a vagas exclusivas", "Suporte prioritário"],
      highlight: true
    },
    {
      name: "Elite",
      price: "Kz 45.000/mês",
      features: ["Domínio total (1.8x)", "Super Boosts incluídos", "Destaque máximo", "Consultoria de carreira IA"],
      premium: true
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-premium-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-premium-black border border-premium-border rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl"
      >
        <div className="p-4 md:p-8 border-b border-premium-border flex justify-between items-center bg-premium-gray/30">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gold tracking-tighter">Upgrade de Carreira</h2>
            <p className="text-slate-500 text-xs md:text-sm font-bold">Escolha o nível de vantagem competitiva que deseja.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-premium-gray rounded-xl transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.name} className={`p-6 rounded-3xl border ${p.highlight ? 'border-gold bg-gold/5' : p.premium ? 'border-purple-500/50 bg-purple-500/5' : 'border-premium-border bg-premium-gray/20'} flex flex-col`}>
              <div className="mb-4">
                <h3 className={`text-xl font-black ${p.highlight ? 'text-gold' : p.premium ? 'text-purple-400' : 'text-slate-300'}`}>{p.name}</h3>
                <p className="text-2xl font-black text-white mt-1">{p.price}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <ShieldCheck size={14} className="text-gold shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => !p.current && handleUpgrade(p.name.toLowerCase())}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${p.current ? 'bg-premium-gray text-slate-500 cursor-default' : p.highlight ? 'bg-gold text-premium-black hover:scale-105 shadow-lg shadow-gold/20' : 'bg-white text-premium-black hover:scale-105'}`}
              >
                {p.current ? 'Plano Atual' : 'Selecionar'}
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-premium-gray/50 border-t border-premium-border text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pagamentos seguros via Multicaixa Express & Unitel Money</p>
        </div>
      </motion.div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, path, active, onClick }: any) => {
  const content = (
    <>
      <Icon size={22} className={active ? "text-premium-black" : "group-hover:scale-110 transition-transform"} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-premium-black"
        />
      )}
    </>
  );

  if (!path) {
    return (
      <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-slate-500 hover:bg-premium-gray hover:text-gold"
      >
        {content}
      </button>
    );
  }

  return (
    <Link 
      to={path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
        active 
          ? "bg-gold text-premium-black shadow-lg shadow-gold/20" 
          : "text-slate-500 hover:bg-premium-gray hover:text-gold"
      }`}
    >
      {content}
    </Link>
  );
};

const Sidebar = ({ isOpen, onClose, onUpgrade, onBoost }: { isOpen: boolean, onClose: () => void, onUpgrade: () => void, onBoost: () => void }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const menuItems = user?.role === 'recruiter' ? [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Briefcase, label: "Vagas", path: "/jobs" },
    { icon: Users, label: "Candidatos", path: "/candidates" },
    { icon: ClipboardList, label: "Pipeline", path: "/kanban" },
    { icon: ShieldCheck, label: "Diagnóstico", path: "/diagnostics" },
    { icon: Sparkles, label: "Lukeni AI", onClick: () => { window.dispatchEvent(new CustomEvent('open-ai-chat')); onClose(); } },
  ] : [
    { icon: Briefcase, label: "Minhas Candidaturas", path: "/" },
    { icon: Search, label: "Procurar Vagas", path: "/search" },
    { icon: User, label: "Meu Perfil", path: "/profile" },
    { icon: Sparkles, label: "Lukeni AI", onClick: () => { window.dispatchEvent(new CustomEvent('open-ai-chat')); onClose(); } },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-premium-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ x: isOpen ? 0 : -300 }}
        className={`fixed top-0 left-0 bottom-0 w-[280px] bg-premium-black border-r border-premium-border z-50 lg:translate-x-0 transition-transform duration-300 ease-out flex flex-col`}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center text-premium-black shadow-lg shadow-gold/20">
              <ClipboardList size={24} />
            </div>
            <h1 className="text-xl font-black text-gold tracking-tighter">GoldTalent</h1>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.path}
                {...item}
                active={location.pathname === item.path}
                onClick={onClose}
              />
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-premium-border">
          {user?.role === 'candidate' && (
            <div className="mb-8 p-4 rounded-2xl bg-gold/5 border border-gold/10">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-black text-gold uppercase tracking-widest">Plano Atual</p>
                <PlanBadge plan={user?.plan || 'free'} />
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart size={14} className="text-gold" />
                  <span className="text-xs font-bold text-slate-300">Visibilidade</span>
                </div>
                <span className="text-xs font-black text-gold">{user?.plan === 'elite' ? '1.8x' : user?.plan === 'premium' ? '1.3x' : '1.0x'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={onUpgrade}
                  className="py-2 rounded-xl bg-gold text-premium-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-gold/20"
                >
                  Upgrade
                </button>
                <button 
                  onClick={onBoost}
                  className="py-2 rounded-xl bg-premium-gray text-gold border border-gold/20 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Boost
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-premium-gray flex items-center justify-center text-gold font-bold border border-premium-border relative">
              {user?.name.charAt(0)}
              {user?.plan !== 'free' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full border-2 border-premium-black flex items-center justify-center">
                  <ShieldCheck size={10} className="text-premium-black" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gold truncate">{user?.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user?.role}</p>
                {user?.boosts > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-orange-500 font-black uppercase">
                    <Bell size={10} /> Boost
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <a 
            href="https://wa.me/244997608404" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-green-600/5 border border-green-600/10 text-green-500 hover:bg-green-600/10 transition-all group mb-4"
          >
            <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Suporte</p>
              <p className="text-xs font-bold">WhatsApp</p>
            </div>
          </a>

          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-400 font-bold text-sm hover:bg-red-900/20 transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            Sair da conta
          </button>
        </div>
      </motion.aside>
    </>
  );
};

const Header = ({ onMenuOpen, onUpgrade }: { onMenuOpen: () => void, onUpgrade: () => void }) => {
  const { user } = useAuth();
  
  return (
    <header className="h-20 bg-premium-black/80 backdrop-blur-md border-b border-premium-border sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={onMenuOpen} className="lg:hidden p-2 text-gold">
          <Menu size={24} />
        </button>

        <div className="hidden lg:flex items-center gap-3 bg-premium-gray px-4 py-2.5 rounded-2xl border border-premium-border w-96">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Pesquisar candidatos, vagas..." 
            className="bg-transparent border-none outline-none text-sm font-medium text-slate-300 w-full placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {user?.role === 'candidate' && user?.plan === 'free' && (
          <button 
            onClick={onUpgrade}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-xl text-gold text-xs font-black uppercase tracking-widest hover:bg-gold/20 transition-all"
          >
            <PieChart size={14} />
            Aumentar Visibilidade
          </button>
        )}
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-premium-gray rounded-full border border-premium-border">
          <Building2 size={14} className="text-gold" />
          <span className="text-xs font-bold text-slate-400">{user?.companyId || "Logística Global"}</span>
        </div>
        
        <button className="relative p-2 text-slate-500 hover:text-gold transition-colors">
          <Bell size={22} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-premium-black"></span>
        </button>
      </div>
    </header>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'recruiter') {
      const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${user.id}`);
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_seen_${user.id}`, 'true');
      setShowOnboarding(false);
    }
  };

  useEffect(() => {
    const handleOpenBoost = () => setShowBoostModal(true);
    const handleOpenUpgrade = () => setShowUpgradeModal(true);
    
    window.addEventListener('open-boost-modal', handleOpenBoost);
    window.addEventListener('open-upgrade-modal', handleOpenUpgrade);
    
    return () => {
      window.removeEventListener('open-boost-modal', handleOpenBoost);
      window.removeEventListener('open-upgrade-modal', handleOpenUpgrade);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-premium-black gap-6">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-gold rounded-3xl flex items-center justify-center text-premium-black shadow-2xl shadow-gold/20"
        >
          <ClipboardList size={40} />
        </motion.div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black text-gold tracking-tighter animate-pulse">GoldTalent</h2>
          <div className="w-48 h-1 bg-premium-gray rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-full h-full bg-gold"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-premium-black flex">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onUpgrade={() => setShowUpgradeModal(true)}
          onBoost={() => setShowBoostModal(true)}
        />
        
        <main className="flex-1 lg:ml-[280px] min-h-screen flex flex-col">
          <Header 
            onMenuOpen={() => setIsSidebarOpen(true)} 
            onUpgrade={() => setShowUpgradeModal(true)}
          />
          
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/candidates" element={<Candidates />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/kanban" element={<Kanban />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </div>
        </main>

        <AIChat userPlan={user?.plan} />
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        <BoostModal isOpen={showBoostModal} onClose={() => setShowBoostModal(false)} />
      </div>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <AppContent />
    </AuthProvider>
  );
}
