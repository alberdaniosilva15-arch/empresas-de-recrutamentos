import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, RefreshCw, UserPlus } from "lucide-react";

export const Diagnostics = () => {
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/check-firebase-env");
      const data = await res.json();
      setEnvStatus(data);
    } catch (error) {
      console.error("Failed to fetch env status:", error);
    } finally {
      setLoading(false);
    }
  };

  const testCreateUser = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-create-user", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    if (status.includes("✅")) return <CheckCircle2 className="text-emerald-500" size={20} />;
    if (status.includes("⚠️")) return <AlertTriangle className="text-amber-500" size={20} />;
    return <XCircle className="text-red-500" size={20} />;
  };

  const allOk = envStatus && Object.values(envStatus).every((s: any) => s.includes("✅") || s.includes("⚠️"));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gold tracking-tighter mb-2">Diagnóstico do Sistema</h1>
          <p className="text-slate-500 font-medium">Verificação de integridade das variáveis de ambiente e conexão Firebase.</p>
        </div>
        <button 
          onClick={fetchStatus}
          className="p-3 bg-premium-gray rounded-2xl text-gold hover:bg-premium-border transition-colors border border-premium-border"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-premium-gray p-6 rounded-3xl border border-premium-border"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-lg font-bold text-gold">Variáveis de Ambiente</h2>
          </div>

          <div className="space-y-4">
            {envStatus ? Object.entries(envStatus).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-premium-black/40 rounded-2xl border border-premium-border/50">
                <span className="text-sm font-bold text-slate-400">{key}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{value.split(" ")[1]}</span>
                  {getStatusIcon(value)}
                </div>
              </div>
            )) : (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-pulse text-slate-600 font-bold">Carregando...</div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-premium-gray p-6 rounded-3xl border border-premium-border flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
              <UserPlus size={24} />
            </div>
            <h2 className="text-lg font-bold text-gold">Teste de Criação de Usuário</h2>
          </div>

          <p className="text-sm text-slate-500 mb-6 font-medium">
            Tenta criar um usuário de teste no Firebase Auth para validar as permissões da Private Key.
          </p>

          <button
            onClick={testCreateUser}
            disabled={!allOk || testing}
            className={`mt-auto w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 ${
              allOk 
                ? "bg-gold text-premium-black hover:scale-[1.02] shadow-lg shadow-gold/20" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {testing ? <RefreshCw className="animate-spin" size={18} /> : <UserPlus size={18} />}
            {testing ? "Testando..." : "Executar Teste"}
          </button>

          {!allOk && !loading && (
            <p className="text-[10px] text-red-400 font-bold mt-4 text-center uppercase tracking-widest">
              Corrija as variáveis acima antes de testar
            </p>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-6 rounded-3xl border ${
              testResult.success 
                ? "bg-emerald-500/5 border-emerald-500/20" 
                : "bg-red-500/5 border-red-500/20"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {testResult.success ? (
                <CheckCircle2 className="text-emerald-500" size={24} />
              ) : (
                <XCircle className="text-red-500" size={24} />
              )}
              <h3 className={`text-lg font-bold ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                {testResult.success ? "Sucesso!" : "Falha no Teste"}
              </h3>
            </div>
            
            <pre className="bg-premium-black/60 p-4 rounded-2xl text-xs font-mono text-slate-300 overflow-x-auto border border-premium-border/50">
              {JSON.stringify(testResult, null, 2)}
            </pre>
            
            {testResult.success ? (
              <p className="mt-4 text-sm text-emerald-500/80 font-bold">
                O Firebase Admin está configurado corretamente e tem permissões para gerenciar usuários.
              </p>
            ) : (
              <p className="mt-4 text-sm text-red-500/80 font-bold">
                Houve um erro ao tentar criar o usuário. Verifique os logs do servidor para mais detalhes.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
