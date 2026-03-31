import { Request, Response } from "express";
import { adminDb, adminTimestamp } from "../firebase-admin";
import { AIEngine } from "../core/aiEngine";
import { Candidate } from "../../src/types";

export class CandidateController {
  static async create(req: Request, res: Response) {
    const correlationId = (req as any).correlationId;
    const { cvText, jobId } = req.body;
    const user = (req as any).user;

    console.log(`[${correlationId}] [CandidateController] Creating candidate for job ${jobId}`);

    try {
      // 1. Parse CV with AI
      const parsedCV = await AIEngine.parseCV(cvText, correlationId);

      // 2. Prepare Candidate Data
      const candidateRef = adminDb.collection("candidates").doc();
      const candidateData: Candidate = {
        id: candidateRef.id,
        name: parsedCV.name || user.name,
        email: parsedCV.email || user.email,
        phone: parsedCV.phone || "",
        cvText,
        skills: parsedCV.skills || [],
        experienceKeywords: parsedCV.experienceKeywords || [],
        education: parsedCV.education || "",
        score: 0, // Will be calculated by matching engine
        scoreBreakdown: { skills: 0, experience: 0, education: 0 },
        classification: 'baixo',
        status: 'applied',
        jobId,
        companyId: user.companyId || "", // If recruiter is creating
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
