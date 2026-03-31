import { Job, Candidate } from "./types";

export const DUMMY_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Gestor de Armazém",
    description: "Responsável pela gestão de stock e equipa de armazém.",
    location: "Lisboa, Portugal",
    type: "Full-time",
    status: "open",
    companyId: "company-1",
    requiredSkills: ["Gestão de Stock", "Liderança", "ERP"],
    expiresAt: "2026-07-28T22:16:34Z",
    createdAt: "2026-03-28T22:16:34Z",
    updatedAt: "2026-03-28T22:16:34Z"
  },
  {
    id: "job-2",
    title: "Analista de Supply Chain",
    description: "Otimização de processos e análise de dados logísticos.",
    location: "Porto, Portugal",
    type: "Full-time",
    status: "open",
    companyId: "company-1",
    requiredSkills: ["Excel Avançado", "Análise de Dados", "Inglês"],
    expiresAt: "2026-07-28T22:16:34Z",
    createdAt: "2026-03-28T22:16:34Z",
    updatedAt: "2026-03-28T22:16:34Z"
  }
];

export const DUMMY_CANDIDATES: Candidate[] = [
  {
    id: "cand-1",
    name: "João Silva",
    email: "joao.silva@email.com",
    phone: "+351 912 345 678",
    cvText: "Experiência de 5 anos em gestão de armazém...",
    score: 85,
    classification: "alto",
    status: "interview",
    jobId: "job-1",
    companyId: "company-1",
    skills: ["Gestão de Stock", "Liderança"],
    experienceKeywords: ["Armazém", "Logística"],
    scoreBreakdown: {
      skills: 90,
      experience: 80,
      education: 85
    },
    createdAt: "2026-03-28T22:16:34Z",
    updatedAt: "2026-03-28T22:16:34Z"
  },
  {
    id: "cand-2",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "+351 923 456 789",
    cvText: "Analista de supply chain com foco em otimização...",
    score: 72,
    classification: "médio",
    status: "screening",
    jobId: "job-2",
    companyId: "company-1",
    skills: ["Excel", "Análise"],
    experienceKeywords: ["Supply Chain", "Processos"],
    scoreBreakdown: {
      skills: 70,
      experience: 75,
      education: 70
    },
    createdAt: "2026-03-28T22:16:34Z",
    updatedAt: "2026-03-28T22:16:34Z"
  }
];
