import { Request, Response } from "express";
import { adminDb, adminTimestamp } from "../firebase-admin";
import { Job } from "../../src/types";

export class JobController {
  static async create(req: Request, res: Response) {
    const { title, description, location, type, requiredSkills, salaryRange, expiresAt } = req.body;
    const user = (req as any).user;

    try {
      const jobRef = adminDb.collection("jobs").doc();
      const jobData: Job = {
        id: jobRef.id,
        title,
        description,
        location,
        type,
        status: 'open',
        companyId: user.companyId || "",
        requiredSkills: requiredSkills || [],
        salaryRange,
        createdAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
        expiresAt: expiresAt || adminTimestamp(),
      };

      await jobRef.set(jobData);

      res.status(201).json({ success: true, job: jobData });
    } catch (error: any) {
      console.error("[JobController] Create failed:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    const user = (req as any).user;
    const { companyId } = req.query;

    try {
      let query = adminDb.collection("jobs").where("status", "==", "open");
      if (companyId) {
        query = query.where("companyId", "==", companyId);
      } else if (user.companyId) {
        query = query.where("companyId", "==", user.companyId);
      }

      const snapshot = await query.get();
      const jobs = snapshot.docs.map(doc => doc.data());
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const jobDoc = await adminDb.collection("jobs").doc(id).get();
      if (!jobDoc.exists) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(jobDoc.data());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
