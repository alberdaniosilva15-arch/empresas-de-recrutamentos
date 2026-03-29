/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CandidateStatus = 'Novo' | 'Triagem' | 'Entrevista' | 'Teste Técnico' | 'Proposta' | 'Contratado' | 'Rejeitado';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'recruiter' | 'candidate';
  companyId?: string; // Only for recruiters
  createdAt: any;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  createdAt: any;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract';
  status: 'open' | 'closed' | 'expired';
  companyId: string;
  requiredSkills: string[];
  createdAt: any;
  expiresAt: any;
}

export interface StatusHistoryEntry {
  status: CandidateStatus;
  timestamp: any;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  cvText: string;
  cvUrl?: string;
  skills: string[];
  experienceKeywords: string[];
  score: number;
  scoreBreakdown: {
    skills: number;
    experience: number;
    education: number;
  };
  classification: 'baixo' | 'médio' | 'alto';
  status: CandidateStatus;
  statusHistory?: StatusHistoryEntry[];
  jobId: string; // Primary job applied to
  companyId: string;
  createdAt: any;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  companyId: string;
  status: CandidateStatus;
  compatibilityScore: number;
  appliedAt: any;
}
