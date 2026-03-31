import { GoogleGenerativeAI } from "@google/generative-ai";
import { AILog } from "../../src/types";
import { adminDb, adminTimestamp } from "../firebase-admin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

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
    const prompt = `
      Analise o seguinte texto de um CV e extraia as informações estruturadas em JSON:
      Texto: ${cvText}

      Retorne APENAS o JSON com:
      - name (string)
      - email (string)
      - phone (string)
      - skills (array de strings)
      - experienceKeywords (array de strings)
      - education (string)
      - summary (string, resumo de 3 frases)
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "");
      const parsed = JSON.parse(text);
      
      await this.log('cv_parsing', { cvText }, parsed, correlationId);
      return parsed;
    } catch (error) {
      console.error(`[${correlationId}] [AIEngine] CV Parsing failed:`, error);
      throw error;
    }
  }

  static async scoreCandidate(cvText: string, jobDescription: string, correlationId: string) {
    const prompt = `
      Analise o CV do candidato em relação à descrição da vaga.
      CV: ${cvText}
      Vaga: ${jobDescription}

      Retorne APENAS o JSON com:
      - score (number, 0-100)
      - scoreBreakdown (object: { skills: number, experience: number, education: number })
      - classification (string: "baixo", "médio", "alto")
      - analysis (string: justificativa detalhada)
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "");
      const parsed = JSON.parse(text);

      await this.log('scoring', { cvText, jobDescription }, parsed, correlationId);
      return parsed;
    } catch (error) {
      console.error(`[${correlationId}] [AIEngine] Scoring failed:`, error);
      throw error;
    }
  }

  static async interpretMessage(message: string, context: any, correlationId: string) {
    const prompt = `
      Você é o assistente Lukeni. Interprete a mensagem do candidato no contexto do recrutamento.
      Mensagem: ${message}
      Contexto: ${JSON.stringify(context)}

      Identifique a intenção e extraia dados se houver.
      Retorne JSON com:
      - intent (string: "apply", "question", "update_status", "other")
      - extractedData (object)
      - response (string: resposta sugerida para o candidato)
      - nextStep (string: ação recomendada no sistema)
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "");
      const parsed = JSON.parse(text);

      await this.log('conversation', { message, context }, parsed, correlationId);
      return parsed;
    } catch (error) {
      console.error(`[${correlationId}] [AIEngine] Message interpretation failed:`, error);
      throw error;
    }
  }

  static async evaluateCandidate(candidate: any, job: any, correlationId: string) {
    const prompt = `
      Avalie este candidato para a vaga.
      Candidato: ${JSON.stringify(candidate)}
      Vaga: ${JSON.stringify(job)}

      Retorne APENAS o JSON com:
      - skillsMatch (number: 0-100)
      - experienceMatch (number: 0-100)
      - semanticMatch (number: 0-100)
      - finalScore (number: 0-100)
      - decision (string: "reject" | "consider" | "interview")
      - reason (string: explicação curta)
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "");
      const parsed = JSON.parse(text);

      await this.log('matching', { candidateId: candidate.id, jobId: job.id }, parsed, correlationId);
      return parsed;
    } catch (error) {
      console.error(`[${correlationId}] [AIEngine] Candidate evaluation failed:`, error);
      throw error;
    }
  }
}
