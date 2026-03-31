import { AILog } from "../../src/types";
import { adminDb, adminTimestamp } from "../firebase-admin";

// Note: Gemini API calls MUST be made from the frontend per platform rules.
// This backend engine is now just for logging or other non-AI logic.

export class AIEngine {
  private static async log(type: AILog['type'], input: any, output: any, correlationId: string) {
    try {
      await adminDb.collection("ai_logs").add({
        type,
        input,
        output,
        correlationId,
        timestamp: adminTimestamp(),
      });
    } catch (error) {
      console.error("[AIEngine] Failed to log AI operation:", error);
    }
  }

  static async parseCV(cvText: string, correlationId: string) {
    console.warn("[AIEngine] parseCV called on backend. This should happen on frontend.");
    return { error: "AI calls must be made from frontend" };
  }

  static async scoreCandidate(cvText: string, jobDescription: string, correlationId: string) {
    console.warn("[AIEngine] scoreCandidate called on backend. This should happen on frontend.");
    return { error: "AI calls must be made from frontend" };
  }

  static async interpretMessage(message: string, context: any, correlationId: string) {
    console.warn("[AIEngine] interpretMessage called on backend. This should happen on frontend.");
    return { error: "AI calls must be made from frontend" };
  }

  static async evaluateCandidate(candidate: any, job: any, correlationId: string) {
    console.warn("[AIEngine] evaluateCandidate called on backend. This should happen on frontend.");
    return { error: "AI calls must be made from frontend" };
  }
}
