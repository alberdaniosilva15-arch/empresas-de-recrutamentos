/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-pro";

const getAI = () => {
  // Tenta buscar de VITE_ ou process.env para compatibilidade
  const apiKey = (import.meta.env?.VITE_GEMINI_API_KEY as string) || (process.env.GEMINI_API_KEY as string) || "";
  return new GoogleGenerativeAI(apiKey);
};

export async function analyzeCV(cvText: string) {
  try {
    const genAI = getAI();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(`Analise o seguinte CV de um candidato e forneça um resumo executivo de 3 frases, destacando as principais competências e experiências relevantes para a vaga: \n\n ${cvText}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error analyzing CV:", error);
    return "Erro ao analisar CV com IA.";
  }
}

export async function generateJobDescription(title: string, requirements: string) {
  try {
    const genAI = getAI();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(`Gere uma descrição de vaga premium e atraente para o cargo de "${title}". 
      Requisitos fornecidos: ${requirements}.
      A descrição deve incluir:
      1. Sobre a vaga
      2. Responsabilidades
      3. Requisitos (técnicos e comportamentais)
      4. Diferenciais
      Use um tom profissional, moderno e inspirador.`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating job description:", error);
    return "Erro ao gerar descrição de vaga.";
  }
}

export async function suggestJobsForCandidate(candidateProfile: string, availableJobs: any[]) {
  try {
    const genAI = getAI();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const jobsContext = availableJobs.map(j => `${j.title} (ID: ${j.id})`).join(", ");
    const result = await model.generateContent(`Com base no perfil do candidato: "${candidateProfile}", sugira as 3 melhores vagas entre as seguintes opções: ${jobsContext}.
      Justifique brevemente cada sugestão com base no "match" de competências.`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error suggesting jobs:", error);
    return "Erro ao sugerir vagas.";
  }
}

export async function chatWithAI(message: string, context: string) {
  try {
    const genAI = getAI();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(`Você é Lukeni, o assistente inteligente do GoldTalent, um sistema de recrutamento premium para todas as áreas de atuação.
      
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
      
      Pergunta do usuário: ${message}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error in AI chat:", error);
    return "Desculpe, tive um problema ao processar sua mensagem.";
  }
}
