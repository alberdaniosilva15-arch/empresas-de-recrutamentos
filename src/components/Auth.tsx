import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { Mail, Lock, User as UserIcon, Building2, Briefcase, UserCircle, ClipboardList } from 'lucide-react';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'recruiter' | 'candidate'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isOver18, setIsOver18] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const getErrorMessage = (error: any) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este email já está em uso. Por favor, tente entrar com a sua conta.';
      case 'auth/invalid-email':
        return 'O endereço de email fornecido é inválido.';
      case 'auth/weak-password':
        return 'A palavra-passe é demasiado fraca. Deve ter pelo menos 6 caracteres.';
      case 'auth/user-disabled':
        return 'Esta conta de utilizador foi desativada.';
      case 'auth/user-not-found':
        return 'Não foi encontrado nenhum utilizador com este email.';
      case 'auth/wrong-password':
        return 'A palavra-passe está incorreta.';
      case 'auth/invalid-credential':
        return 'Credenciais inválidas. Verifique o seu email e palavra-passe.';
      case 'auth/network-request-failed':
        return 'Erro de rede. Verifique a sua ligação à internet.';
      case 'permission-denied':
      case 'firestore/permission-denied':
        return 'Erro de permissão ao salvar dados. Por favor, contacte o suporte.';
      default:
        return error.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isLogin && (!agreedToTerms || !isOver18)) {
      setError('Você deve ter mais de 18 anos e aceitar os termos e condições.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name, role, companyName);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-premium-black flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-premium-gray w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-premium-border relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center text-premium-black mx-auto mb-6 shadow-xl shadow-gold/20">
            <ClipboardList size={32} />
          </div>
          <h1 className="text-4xl font-black text-gold mb-2 tracking-tighter">GoldTalent</h1>
          <p className="text-slate-500 font-medium">
            {isLogin ? 'Bem-vindo ao recrutamento premium' : 'Inicie sua jornada profissional'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-2xl text-red-400 text-xs font-bold text-center"
          >
            {error}
          </motion.div>
        )}

        {!isLogin && (
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setRole('candidate')}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${
                role === 'candidate' ? 'border-gold bg-gold/5 text-gold' : 'border-premium-border text-slate-500 hover:border-gold/30'
              }`}
            >
              <UserCircle size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Candidato</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('recruiter')}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${
                role === 'recruiter' ? 'border-gold bg-gold/5 text-gold' : 'border-premium-border text-slate-500 hover:border-gold/30'
              }`}
            >
              <Briefcase size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Recrutador</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold transition-colors" size={20} />
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-premium-black border border-premium-border rounded-2xl py-4 pl-12 pr-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>
          )}

          {!isLogin && role === 'recruiter' && (
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold transition-colors" size={20} />
              <input
                type="text"
                placeholder="Nome da Empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-premium-black border border-premium-border rounded-2xl py-4 pl-12 pr-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold transition-colors" size={20} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-premium-black border border-premium-border rounded-2xl py-4 pl-12 pr-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold transition-colors" size={20} />
            <input
              type="password"
              placeholder="Palavra-passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-premium-black border border-premium-border rounded-2xl py-4 pl-12 pr-4 text-slate-300 focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>

          {isLogin && (
            <div className="text-right">
              <button 
                type="button"
                onClick={async () => {
                  if (!email) {
                    setError('Por favor, insira o seu email primeiro.');
                    return;
                  }
                  try {
                    const { sendPasswordResetEmail } = await import('firebase/auth');
                    await sendPasswordResetEmail(auth, email);
                    setError(null);
                    alert('Email de recuperação enviado! Verifique a sua caixa de entrada.');
                  } catch (err: any) {
                    setError(getErrorMessage(err));
                  }
                }}
                className="text-[10px] font-black text-slate-500 hover:text-gold transition-colors uppercase tracking-widest"
              >
                Esqueceu a palavra-passe?
              </button>
            </div>
          )}

          {!isLogin && (
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isOver18}
                  onChange={(e) => setIsOver18(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-premium-border bg-premium-black text-gold focus:ring-gold"
                />
                <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                  Confirmo que tenho mais de 18 anos de idade.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-premium-border bg-premium-black text-gold focus:ring-gold"
                />
                <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                  Aceito os <button type="button" className="text-gold hover:underline">Termos e Condições</button> e a Política de Privacidade.
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-premium-black py-4 rounded-2xl font-black shadow-xl shadow-gold/20 hover:bg-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm mt-4"
          >
            {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-red-900/10 border border-red-900/20 rounded-2xl">
          <p className="text-[10px] text-red-400 font-bold text-center leading-relaxed">
            ⚠️ AVISO: Tenha cuidado com burlas. A GoldTalent não se responsabiliza por terceiros que tentem pedir dinheiro. Nunca pague por entrevistas ou vagas.
          </p>
        </div>

        <div className="mt-8 text-center space-y-4">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs font-black text-gold hover:text-gold-light transition-colors uppercase tracking-widest"
          >
            {isLogin ? 'Não tem conta? Registe-se' : 'Já tem conta? Entre aqui'}
          </button>
          
          <div className="pt-4 border-t border-premium-border">
            <a 
              href="https://wa.me/244997608404" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-black text-slate-500 hover:text-gold transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
            >
              Entre em contacto pelo WhatsApp: 997608404
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
