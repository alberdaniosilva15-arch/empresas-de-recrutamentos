import { Candidate, Job, CandidateStatus } from "../../src/types";
import { AIEngine } from "./aiEngine";
import { eventBus } from "./eventBus";

export class MatchingEngine {
  static async calculateMatch(candidate: Candidate, job: Job, correlationId: string) {
    console.log(`[${correlationId}] [MatchingEngine] Calculating match for candidate ${candidate.id} and job ${job.id}`);

    try {
      const aiResult = await AIEngine.evaluateCandidate(candidate, job, correlationId);
      
      const aiScore = this.calculateScore(aiResult);
      const confidenceScore = candidate.confidenceScore || 70; // Default confidence
      
      // Multipliers based on Plan
      const planMultiplierMap: Record<string, number> = {
        free: 1,
        premium: 1.3,
        elite: 1.8
      };
      const planMultiplier = planMultiplierMap[candidate.plan || 'free'] || 1;
      
      // Boost Multiplier
      const boostMultiplier = candidate.isBoosted ? 2 : 1;
      
      // Visibility Auction (Bid Amount)
      const bidAmount = candidate.bidAmount || 0;

      /**
       * FINAL RANKING FORMULA (NÍVEL ABSURDO)
       * finalRankScore = (aiScore * 0.5) + (confidenceScore * 0.2) + (planMultiplier * 10) + (boostMultiplier * 5) + bidAmount
       */
      const finalRank = (aiScore * 0.5) + (confidenceScore * 0.2) + (planMultiplier * 10) + (boostMultiplier * 5) + bidAmount;

      return {
        ...aiResult,
        aiScore,
        confidenceScore,
        finalScore: aiScore, // The "raw" AI score
        finalRank: Math.round(finalRank) // The "boosted" ranking score
      };
    } catch (error) {
      console.error(`[${correlationId}] [MatchingEngine] AI Scoring failed:`, error);
      throw error;
    }
  }

  private static calculateScore(aiResult: any) {
    return Math.round(
      (aiResult.skillsMatch * 0.4) +
      (aiResult.experienceMatch * 0.3) +
      (aiResult.semanticMatch * 0.3)
    );
  }

  static async processCandidate(candidate: Candidate, job: Job, correlationId: string) {
    console.log(`[${correlationId}] [MatchingEngine] Processing candidate ${candidate.id} for job ${job.id}`);
    
    const result = await this.calculateMatch(candidate, job, correlationId);

    let stage: CandidateStatus = "applied";

    if (result.finalScore >= 80) stage = "interview";
    else if (result.finalScore >= 60) stage = "screening";
    else stage = "rejected";

    eventBus.emit("candidate.matched", { candidateId: candidate.id, jobId: job.id, result, stage });

    return {
      score: result,
      nextStage: stage
    };
  }
}
