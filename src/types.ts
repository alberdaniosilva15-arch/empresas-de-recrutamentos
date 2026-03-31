/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CandidateStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export type Plan = 'free' | 'premium' | 'elite';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'recruiter' | 'candidate';
  companyId?: string; // Only for recruiters
  plan: Plan;
  boosts: number;
  trustScore: number;
  visibilityScore: number;
  expiresAt?: any;
  createdAt: any;
  updatedAt: any;
  loginStreak: number;
  lastLogin?: any;
  activityHigh?: boolean;
  isNearHire?: boolean;
  hasUsedBoostBefore?: boolean;
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
  isPremium?: boolean; // Only for premium users
  createdAt: any;
  updatedAt: any;
  expiresAt: any;
  bids?: { userId: string; amount: number }[];
  boostCount?: number;
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
  score: number; // AI Score
  confidenceScore?: number; // Backend heuristic score
  finalScore?: number; // Weighted combination (Visibility Engine)
  planMultiplier?: number;
  boostMultiplier?: number;
  flags?: string[]; // Security or quality flags
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
  plan?: Plan;
  isBoosted?: boolean;
  bidAmount?: number;
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
  confidenceScore?: number;
  finalScore?: number;
  planMultiplier?: number;
  boostMultiplier?: number;
  aiAnalysis?: string;
  appliedAt: any;
  updatedAt: any;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  type: 'SCORE_MANIPULATION' | 'SUSPICIOUS_CONTENT' | 'RATE_LIMIT_EXCEEDED';
  details: any;
  originalScore?: number;
  sanitizedScore?: number;
  correlationId?: string;
  timestamp: any;
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
