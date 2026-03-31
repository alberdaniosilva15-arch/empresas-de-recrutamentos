import { Candidate, Job, SecurityEvent } from "../../src/types";
import { adminDb, adminTimestamp } from "../firebase-admin";

export class SecurityValidator {
  /**
   * Layer 1: Basic range and type validation
   */
  static validateScore(score: number): number {
    if (typeof score !== 'number' || isNaN(score)) return 0;
    return Math.max(0, Math.min(100, score));
  }

  static validateClassification(classification: string): string {
    const valid = ['baixo', 'médio', 'alto'];
    return valid.includes(classification?.toLowerCase()) ? classification.toLowerCase() : 'baixo';
  }

  /**
   * Layer 2: Heuristic Sanity Checks & Confidence Score
   */
  static calculateConfidence(cvText: string, job?: Job): number {
    let confidence = 100;
    const text = cvText || "";

    // 1. Length check
    if (text.length < 100) confidence -= 40;
    else if (text.length < 300) confidence -= 20;

    // 2. Keyword density (if job provided)
    if (job && job.description) {
      const jobKeywords = job.description.toLowerCase().split(/\W+/).filter(w => w.length > 4);
      const cvLower = text.toLowerCase();
      const matchCount = jobKeywords.filter(kw => cvLower.includes(kw)).length;
      
      if (matchCount < 3) confidence -= 30;
      else if (matchCount < 6) confidence -= 15;
    }

    return Math.max(0, confidence);
  }

  /**
   * Layer 3: Final Ranking Logic (Visibility Engine - Backend Controlled)
   */
  static calculateFinalScore(aiScore: number, confidence: number, isSuspicious: boolean, plan: string = 'free', boosts: number = 0): number {
    const planMultipliers: Record<string, number> = {
      free: 1,
      premium: 1.3,
      elite: 1.8
    };
    
    const planMult = planMultipliers[plan] || 1;
    const boostMult = boosts > 0 ? 2 : 1;

    // Visibility Engine Formula:
    // (aiScore * 0.5) + (confidenceScore * 0.2) + (planMultiplier * 10) + (boostMultiplier * 5)
    // We scale the multipliers by 10 and 5 to make them significant in a 0-100 range
    let final = (aiScore * 0.5) + (confidence * 0.2) + (planMult * 10) + (boostMult * 5);
    
    // Penalization for suspicious behavior (Invisible to user)
    if (isSuspicious) {
      final *= 0.5;
    }

    // Boost Active multiplier (Psychological advantage)
    if (boosts > 0) {
      final *= 1.1; // 10% extra total visibility
    }

    return Math.round(final);
  }

  /**
   * Calculates the User Value Score (Activity + Payments + Success)
   */
  static calculateUserValueScore(activity: number, paymentHistory: number, successRate: number): number {
    return (activity * 0.3) + (paymentHistory * 0.4) + (successRate * 0.3);
  }

  /**
   * Detects suspicious patterns
   */
  static performSanityCheck(candidate: Partial<Candidate>, job?: Job, aiScore?: number): { isValid: boolean; reason?: string; isSuspicious: boolean } {
    const score = aiScore || candidate.score || 0;
    const cvText = candidate.cvText || "";
    
    // 1. Minimum content check vs High Score
    if (cvText.length < 50 && score > 70) {
      return { isValid: false, reason: "CV text too short for such a high score.", isSuspicious: true };
    }

    // 2. Keyword density check vs High Score
    if (job && job.description) {
      const jobKeywords = job.description.toLowerCase().split(/\W+/).filter(w => w.length > 4);
      const cvLower = cvText.toLowerCase();
      const matchCount = jobKeywords.filter(kw => cvLower.includes(kw)).length;
      
      if (matchCount === 0 && score > 80 && jobKeywords.length > 10) {
        return { isValid: false, reason: "No keyword matches found for a very high score.", isSuspicious: true };
      }
    }

    return { isValid: true, isSuspicious: false };
  }

  /**
   * Logs a security event to Firestore
   */
  static async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>) {
    try {
      const eventRef = adminDb.collection("security_events").doc();
      const fullEvent: SecurityEvent = {
        ...event,
        id: eventRef.id,
        timestamp: adminTimestamp()
      };
      await eventRef.set(fullEvent);
      console.log(`[SecurityEvent] ${event.type} logged for user ${event.userId}`);
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Generates flags for the recruiter
   */
  static getFlags(confidence: number, isSuspicious: boolean): string[] {
    const flags: string[] = [];
    if (isSuspicious) flags.push("⚠️ Score suspeito");
    if (confidence < 50) flags.push("Baixa confiabilidade dos dados");
    if (confidence < 30) flags.push("CV com pouca informação");
    return flags;
  }

  /**
   * Sanitizes the parsed CV object from the frontend
   */
  static sanitizeParsedCV(parsedCV: any): any {
    return {
      ...parsedCV,
      score: this.validateScore(parsedCV?.score),
      classification: this.validateClassification(parsedCV?.classification),
      scoreBreakdown: {
        skills: this.validateScore(parsedCV?.scoreBreakdown?.skills),
        experience: this.validateScore(parsedCV?.scoreBreakdown?.experience),
        education: this.validateScore(parsedCV?.scoreBreakdown?.education),
      }
    };
  }

  /**
   * Sanitizes the match result object from the frontend
   */
  static sanitizeMatchResult(match: any): any {
    return {
      ...match,
      finalScore: this.validateScore(match?.finalScore),
      classification: this.validateClassification(match?.classification),
      skillsMatch: this.validateScore(match?.skillsMatch),
      experienceMatch: this.validateScore(match?.experienceMatch),
      scoreBreakdown: {
        skills: this.validateScore(match?.scoreBreakdown?.skills || match?.skillsMatch),
        experience: this.validateScore(match?.scoreBreakdown?.experience || match?.experienceMatch),
        education: this.validateScore(match?.scoreBreakdown?.education || 0),
      }
    };
  }
}
