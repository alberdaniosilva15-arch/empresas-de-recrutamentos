/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CandidateStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'recruiter' | 'candidate';
  companyId?: string; // Only for recruiters
  createdAt: any;
  updatedAt: any;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
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
  salaryRange?: string;
  createdAt: any;
  updatedAt: any;
  expiresAt: any;
}

export interface StatusHistoryEntry {
  status: CandidateStatus;
  timestamp: any;
  comment?: string;
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
  education?: string;
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
  updatedAt: any;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  companyId: string;
  status: CandidateStatus;
  compatibilityScore: number;
  aiAnalysis?: string;
  appliedAt: any;
  updatedAt: any;
}

export interface Conversation {
  id: string;
  participantIds: string[]; // [candidateId, recruiterId] or [candidateId, 'system']
  lastMessageAt: any;
  status: 'active' | 'archived';
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'system' | 'ai';
  metadata?: any;
  createdAt: any;
}

export interface AILog {
  id: string;
  type: 'cv_parsing' | 'matching' | 'conversation' | 'scoring';
  input: any;
  output: any;
  correlationId: string;
  timestamp: any;
}
