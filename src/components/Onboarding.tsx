import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Briefcase, Users, Filter, X } from "lucide-react";

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Bem-vindo ao GoldTalent!",
      description: "A plataforma inteligente para recrutamento premium em todas as áreas.",
      icon: Briefcase,
      color: "bg-blue-500"
    },
    {
      title: "Crie sua primeira vaga",
      description: "Defina o cargo, responsabilidades e as competências necessárias para qualquer setor.",
      icon: PlusIcon,
      color: "bg-[#00C48C]"
    },
    {
      title: "Analise com Lukeni",
      description: "Nossa IA Lukeni analisa os CVs de forma objetiva e dá um score de compatibilidade automático.",
      icon: StarIcon,
      color: "bg-amber-500"
    },
    {
      title: "Gerencie o Pipeline",
      description: "Mova os candidatos entre as fases do recrutamento com um simples arrastar e soltar.",
      icon: Users,
      color: "bg-purple-500"
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const CurrentIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-premium-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-premium-gray w-full max-w-md rounded-[2.5rem] p-6 md:p-10 text-center shadow-2xl border border-premium-border"
      >
        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl ${steps[step].color} flex items-center justify-center text-white mx-auto mb-8 md:mb-10 shadow-xl shadow-current/20`}>
          <CurrentIcon size={40} className="md:w-12 md:h-12" />
        </div>
        
        <h3 className="text-2xl md:text-3xl font-black text-gold mb-4 tracking-tight">{steps[step].title}</h3>
        <p className="text-slate-500 text-sm md:text-base mb-8 md:mb-12 leading-relaxed font-medium">{steps[step].description}</p>
        
        <div className="flex gap-3 justify-center mb-8 md:mb-12">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-10 bg-gold" : "w-3 bg-premium-black border border-premium-border"}`}></div>
          ))}
        </div>

        <button 
          onClick={nextStep}
          className="w-full bg-gold text-premium-black py-5 rounded-2xl font-black shadow-xl shadow-gold/20 hover:bg-gold-light transition-all uppercase tracking-widest text-sm"
        >
          {step === steps.length - 1 ? "Começar Agora" : "Próximo"}
        </button>
      </motion.div>
    </div>
  );
};

const PlusIcon = (props: any) => <Plus {...props} />;
const StarIcon = (props: any) => <Star {...props} />;

import { Plus, Star } from "lucide-react";
