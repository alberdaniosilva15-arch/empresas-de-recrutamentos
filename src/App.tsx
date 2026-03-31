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
  ShieldCheck
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

const SidebarItem = ({ icon: Icon, label, path, active, onClick }: any) => (
  <Link 
    to={path}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
      active 
        ? "bg-gold text-premium-black shadow-lg shadow-gold/20" 
        : "text-slate-500 hover:bg-premium-gray hover:text-gold"
    }`}
  >
    <Icon size={22} className={active ? "text-premium-black" : "group-hover:scale-110 transition-transform"} />
    <span className="font-bold text-sm tracking-tight">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-pill"
        className="ml-auto w-1.5 h-1.5 rounded-full bg-premium-black"
      />
    )}
  </Link>
);

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const menuItems = user?.role === 'recruiter' ? [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Briefcase, label: "Vagas", path: "/jobs" },
    { icon: Users, label: "Candidatos", path: "/candidates" },
    { icon: ClipboardList, label: "Pipeline", path: "/kanban" },
    { icon: ShieldCheck, label: "Diagnóstico", path: "/diagnostics" },
  ] : [
    { icon: Briefcase, label: "Minhas Candidaturas", path: "/" },
    { icon: Search, label: "Procurar Vagas", path: "/search" },
    { icon: User, label: "Meu Perfil", path: "/profile" },
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
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-premium-gray flex items-center justify-center text-gold font-bold border border-premium-border">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gold truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user?.role}</p>
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

const Header = ({ onMenuOpen }: { onMenuOpen: () => void }) => {
  const { user } = useAuth();
  
  return (
    <header className="h-20 bg-premium-black/80 backdrop-blur-md border-b border-premium-border sticky top-0 z-30 px-8 flex items-center justify-between">
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

      <div className="flex items-center gap-6">
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

  useEffect(() => {
    if (user?.role === 'recruiter') {
      const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${user.uid}`);
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_seen_${user.uid}`, 'true');
      setShowOnboarding(false);
    }
  };

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
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <main className="flex-1 lg:ml-[280px] min-h-screen flex flex-col">
          <Header onMenuOpen={() => setIsSidebarOpen(true)} />
          
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

        <AIChat />
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      </div>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
