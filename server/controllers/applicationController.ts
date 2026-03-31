import { Request, Response } from "express";
import { adminDb, adminTimestamp } from "../firebase-admin";
import { MatchingEngine } from "../core/matchingEngine";
import { Application, Candidate, Job } from "../../src/types";
import { SecurityValidator } from "../core/securityValidator";

export class ApplicationController {
  static async create(req: Request, res: Response) {
    const correlationId = (req as any).correlationId;
    const { candidateId, jobId, matchResult } = req.body;
    const user = (req as any).user;

    console.log(`[${correlationId}] [ApplicationController] Creating application for candidate ${candidateId} and job ${jobId}`);

    try {
      // 0. Get User Plan and Boosts
      const userDoc = await adminDb.collection("users").doc(user.id).get();
      const userData = userDoc.data() || { plan: 'free', boosts: 0 };
      const plan = userData.plan || 'free';
      const boosts = userData.boosts || 0;

      // 1. Get Candidate and Job
      const candidateDoc = await adminDb.collection("candidates").doc(candidateId).get();
      const jobDoc = await adminDb.collection("jobs").doc(jobId).get();

      if (!candidateDoc.exists || !jobDoc.exists) {
        return res.status(404).json({ error: "Candidate or Job not found" });
      }

      const candidate = candidateDoc.data() as Candidate;
      const job = jobDoc.data() as Job;

      // 2. Scarcity Check (Application Limit)
      if (plan === 'free') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const applicationsToday = await adminDb.collection("applications")
          .where("candidateId", "==", candidateId)
          .where("appliedAt", ">=", today)
          .get();
        
        if (applicationsToday.size >= 3) {
          return res.status(403).json({ 
            error: "Limite diário de candidaturas atingido (3/3). Faça upgrade para Premium para candidaturas ilimitadas.",
            code: 'LIMIT_REACHED'
          });
        }
      }

      // 3. Premium Job Check
      if (job.isPremium && plan === 'free') {
        return res.status(403).json({ 
          error: "Esta vaga é exclusiva para utilizadores Premium.",
          code: 'PREMIUM_ONLY'
        });
      }

      // 4. Sanitize and Validate matchResult from frontend
      const match = SecurityValidator.sanitizeMatchResult(matchResult || {});
      
      // 5. Perform Sanity Check against Job
      const sanity = SecurityValidator.performSanityCheck(candidate, job, match.finalScore);
      
      if (sanity.isSuspicious) {
        await SecurityValidator.logSecurityEvent({
          userId: user.id,
          type: 'SCORE_MANIPULATION',
          originalScore: matchResult?.finalScore,
          sanitizedScore: match.finalScore,
          correlationId,
          details: { reason: sanity.reason, candidateId, jobId }
        });
      }

      // 6. Calculate Confidence and Final Score (Visibility Engine)
      const confidenceScore = SecurityValidator.calculateConfidence(candidate.cvText, job);
      const finalScore = SecurityValidator.calculateFinalScore(match.finalScore, confidenceScore, sanity.isSuspicious, plan, boosts);
      const flags = SecurityValidator.getFlags(confidenceScore, sanity.isSuspicious);

      // 7. Create Application
      const applicationRef = adminDb.collection("applications").doc();
      const applicationData: Application = {
        id: applicationRef.id,
        candidateId,
        jobId,
        companyId: job.companyId,
        status: 'applied',
        compatibilityScore: match.finalScore,
        confidenceScore,
        finalScore,
        planMultiplier: plan === 'elite' ? 1.8 : (plan === 'premium' ? 1.3 : 1),
        boostMultiplier: boosts > 0 ? 2 : 1,
        aiAnalysis: match.aiAnalysis || match.analysis,
        appliedAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
      };

      await applicationRef.set(applicationData);

      // 8. Update Candidate with scores, classification and flags
      await adminDb.collection("candidates").doc(candidateId).update({
        score: match.finalScore,
        confidenceScore,
        finalScore,
        flags,
        planMultiplier: applicationData.planMultiplier,
        boostMultiplier: applicationData.boostMultiplier,
        scoreBreakdown: {
          skills: match.skillsMatch || match.scoreBreakdown?.skills || 0,
          experience: match.experienceMatch || match.scoreBreakdown?.experience || 0,
          education: match.scoreBreakdown?.education || 0
        },
        classification: match.classification,
        updatedAt: adminTimestamp(),
      });

      res.status(201).json({ success: true, application: applicationData });
    } catch (error: any) {
      console.error(`[${correlationId}] [ApplicationController] Create failed:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async listByJob(req: Request, res: Response) {
    const { jobId } = req.params;
    try {
      const snapshot = await adminDb.collection("applications").where("jobId", "==", jobId).get();
      const applications = snapshot.docs.map(doc => doc.data());
      res.json(applications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
