import { Request, Response } from "express";
import { adminDb, adminTimestamp } from "../firebase-admin";
import { AIEngine } from "../core/aiEngine";
import { Candidate } from "../../src/types";
import { SecurityValidator } from "../core/securityValidator";

export class CandidateController {
  static async create(req: Request, res: Response) {
    const correlationId = (req as any).correlationId;
    const { cvText, jobId, parsedCV } = req.body;
    const user = (req as any).user;

    console.log(`[${correlationId}] [CandidateController] Creating candidate for job ${jobId}`);

    try {
      // 0. Get User Plan and Boosts
      const userDoc = await adminDb.collection("users").doc(user.id).get();
      const userData = userDoc.data() || { plan: 'free', boosts: 0 };
      const plan = userData.plan || 'free';
      const boosts = userData.boosts || 0;

      // 1. Sanitize and Validate parsedCV from frontend
      const sanitizedCV = SecurityValidator.sanitizeParsedCV(parsedCV);
      
      // 2. Perform Sanity Check
      const sanity = SecurityValidator.performSanityCheck({ cvText, score: sanitizedCV.score });
      
      if (sanity.isSuspicious) {
        await SecurityValidator.logSecurityEvent({
          userId: user.id,
          type: 'SCORE_MANIPULATION',
          originalScore: parsedCV?.score,
          sanitizedScore: sanitizedCV.score,
          correlationId,
          details: { reason: sanity.reason, cvLength: cvText.length }
        });
      }

      // 3. Calculate Confidence and Final Score (Visibility Engine)
      const confidenceScore = SecurityValidator.calculateConfidence(cvText);
      const finalScore = SecurityValidator.calculateFinalScore(sanitizedCV.score, confidenceScore, sanity.isSuspicious, plan, boosts);
      const flags = SecurityValidator.getFlags(confidenceScore, sanity.isSuspicious);

      // 4. Prepare Candidate Data
      const candidateRef = adminDb.collection("candidates").doc();
      const candidateData: Candidate = {
        id: candidateRef.id,
        name: sanitizedCV?.name || user.name,
        email: sanitizedCV?.email || user.email,
        phone: sanitizedCV?.phone || "",
        cvText,
        skills: sanitizedCV?.skills || [],
        experienceKeywords: sanitizedCV?.experienceKeywords || [],
        education: sanitizedCV?.education || "",
        score: sanitizedCV?.score || 0,
        confidenceScore,
        finalScore,
        planMultiplier: plan === 'elite' ? 1.8 : (plan === 'premium' ? 1.3 : 1),
        boostMultiplier: boosts > 0 ? 2 : 1,
        flags,
        scoreBreakdown: sanitizedCV?.scoreBreakdown || { skills: 0, experience: 0, education: 0 },
        classification: sanitizedCV?.classification || 'baixo',
        status: 'applied',
        jobId,
        companyId: user.companyId || "",
        createdAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
      };

      await candidateRef.set(candidateData);

      res.status(201).json({ success: true, candidate: candidateData });
    } catch (error: any) {
      console.error(`[${correlationId}] [CandidateController] Create failed:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    const user = (req as any).user;
    const { jobId } = req.query;

    try {
      let query = adminDb.collection("candidates").where("companyId", "==", user.companyId);
      if (jobId) {
        query = query.where("jobId", "==", jobId);
      }

      const snapshot = await query.get();
      const candidates = snapshot.docs.map(doc => doc.data());
      res.json(candidates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status, comment } = req.body;
    const user = (req as any).user;

    try {
      const candidateRef = adminDb.collection("candidates").doc(id);
      const candidateSnap = await candidateRef.get();
      
      if (!candidateSnap.exists) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const candidate = candidateSnap.data();
      const history = candidate.statusHistory || [];
      history.push({ status, timestamp: adminTimestamp(), comment });

      await candidateRef.update({
        status,
        statusHistory: history,
        updatedAt: adminTimestamp(),
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
