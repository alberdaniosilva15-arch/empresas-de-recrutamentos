import { Candidate, Job, CandidateStatus } from "../../src/types";
import { AIEngine } from "./aiEngine";
import { eventBus } from "./eventBus";

export class MatchingEngine {
  static async calculateMatch(candidate: Candidate, job: Job, correlationId: string) {
    console.log(`[${correlationId}] [MatchingEngine] Calculating match for candidate ${candidate.id} and job ${job.id}`);

    try {
      const aiResult = await AIEngine.evaluateCandidate(candidate, job, correlationId);
      
      const finalScore = this.calculateScore(aiResult);

      return {
        ...aiResult,
        finalScore
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
