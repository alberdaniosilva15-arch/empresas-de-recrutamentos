import { Request, Response } from "express";
import { adminDb, adminTimestamp } from "../firebase-admin";
import { MatchingEngine } from "../core/matchingEngine";
import { Application, Candidate, Job } from "../../src/types";

export class ApplicationController {
  static async create(req: Request, res: Response) {
    const correlationId = (req as any).correlationId;
    const { candidateId, jobId } = req.body;
    const user = (req as any).user;

    console.log(`[${correlationId}] [ApplicationController] Creating application for candidate ${candidateId} and job ${jobId}`);

    try {
      // 1. Get Candidate and Job
      const candidateDoc = await adminDb.collection("candidates").doc(candidateId).get();
      const jobDoc = await adminDb.collection("jobs").doc(jobId).get();

      if (!candidateDoc.exists || !jobDoc.exists) {
        return res.status(404).json({ error: "Candidate or Job not found" });
      }

      const candidate = candidateDoc.data() as Candidate;
      const job = jobDoc.data() as Job;

      // 2. Calculate Match
      const match = await MatchingEngine.calculateMatch(candidate, job, correlationId);

      // 3. Create Application
      const applicationRef = adminDb.collection("applications").doc();
      const applicationData: Application = {
        id: applicationRef.id,
        candidateId,
        jobId,
        companyId: job.companyId,
        status: 'applied',
        compatibilityScore: match.finalScore,
        aiAnalysis: match.aiAnalysis,
        appliedAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
      };

      await applicationRef.set(applicationData);

      // 4. Update Candidate with score and classification
      await adminDb.collection("candidates").doc(candidateId).update({
        score: match.finalScore,
        scoreBreakdown: {
          skills: match.skillsMatch,
          experience: match.experienceMatch,
          education: 0 // Placeholder
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
