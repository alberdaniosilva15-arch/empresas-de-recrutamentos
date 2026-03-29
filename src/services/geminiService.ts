/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeCV(cvText: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise o seguinte CV de um candidato e forneça um resumo executivo de 3 frases, destacando as principais competências e experiências relevantes para a vaga: \n\n ${cvText}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing CV:", error);
    return "Erro ao analisar CV com IA.";
  }
}

export async function chatWithAI(message: string, context: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é Lukeni, o assistente inteligente do GoldTalent, um sistema de recrutamento premium para todas as áreas de atuação.
      
      Sua missão é ajudar o recrutador a tomar decisões baseadas em dados. Você tem acesso ao contexto atual da empresa, incluindo vagas abertas e candidatos no pipeline.
      
      Contexto da Empresa:
      ${context}
      
      Instruções Críticas:
      1. Seja extremamente OBJETIVO e DIRETO.
      2. Não dê mensagens longas se não for estritamente necessário.
      3. Forneça recomendações baseadas nos dados reais fornecidos no contexto.
      4. Atenda a pedidos sobre QUALQUER tipo de vaga, não se limitando a logística.
      5. Se o usuário perguntar sobre candidatos, analise os status e sugira próximos passos.
      6. Mantenha um tom profissional e focado em eficiência.
      
      Pergunta do usuário: ${message}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error in AI chat:", error);
    return "Desculpe, tive um problema ao processar sua mensagem.";
  }
}
