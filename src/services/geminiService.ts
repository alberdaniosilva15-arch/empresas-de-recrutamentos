/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

export async function analyzeCV(cvText: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analise o seguinte CV de um candidato e forneça um resumo executivo de 3 frases, destacando as principais competências e experiências relevantes para a vaga: \n\n ${cvText}`
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing CV:", error);
    return "Erro ao analisar CV com IA.";
  }
}

export async function generateJobDescription(title: string, requirements: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Gere uma descrição de vaga premium e atraente para o cargo de "${title}". 
      Requisitos fornecidos: ${requirements}.
      A descrição deve incluir:
      1. Sobre a vaga
      2. Responsabilidades
      3. Requisitos (técnicos e comportamentais)
      4. Diferenciais
      Use um tom profissional, moderno e inspirador.`
    });
    return response.text;
  } catch (error) {
    console.error("Error generating job description:", error);
    return "Erro ao gerar descrição de vaga.";
  }
}

export async function suggestJobsForCandidate(candidateProfile: string, availableJobs: any[]) {
  try {
    const ai = getAI();
    const jobsContext = availableJobs.map(j => `${j.title} (ID: ${j.id})`).join(", ");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Com base no perfil do candidato: "${candidateProfile}", sugira as 3 melhores vagas entre as seguintes opções: ${jobsContext}.
      Justifique brevemente cada sugestão com base no "match" de competências.`
    });
    return response.text;
  } catch (error) {
    console.error("Error suggesting jobs:", error);
    return "Erro ao sugerir vagas.";
  }
}

export async function parseCV(cvText: string) {
  try {
    const ai = getAI();
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing CV:", error);
    throw error;
  }
}

export async function scoreCandidate(cvText: string, jobDescription: string) {
  try {
    const ai = getAI();
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error scoring candidate:", error);
    throw error;
  }
}

export async function interpretMessage(message: string, context: any) {
  try {
    const ai = getAI();
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error interpreting message:", error);
    throw error;
  }
}

export async function evaluateCandidate(candidate: any, job: any) {
  try {
    const ai = getAI();
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error evaluating candidate:", error);
    throw error;
  }
}

export async function chatWithAI(message: string, context: string, userPlan: string = 'free', userRank?: number) {
  try {
    const ai = getAI();
    
    const salesContext = `
      --- DIRETRIZES DE MONETIZAÇÃO (SISTEMA LUKENI - NÍVEL ABSURDO) ---
      Usuário plano: ${userPlan.toUpperCase()}
      Ranking atual: ${userRank || 'N/A'}

      PRINCÍPIOS DE VENDA:
      1. Vende VANTAGEM COMPETITIVA, não apenas acesso.
      2. Usa o gatilho "QUASE GANHOU": Se o ranking for bom (ex: Top 10), diz: "Estás muito perto de ser selecionado. O 1º lugar tem Boost e Plano Elite. Queres ultrapassá-lo agora?"
      3. Explica a FÓRMULA DE VISIBILIDADE: finalRankScore = (aiScore * 0.5) + (confidenceScore * 0.2) + (planMultiplier * 0.2) + (boostMultiplier * 0.1) + bidAmount.
      4. Multiplicadores de Plano: Free (1x), Premium (1.3x), Elite (1.8x).
      5. Boost: Dá um salto imediato de 2x na visibilidade.
      6. Escassez: Menciona que as vagas Elite são limitadas por setor.

      TONALIDADE:
      - Career Strategist de Elite.
      - Focado em Kz (Kwanza) e Resultados Reais.
      - Persuasivo, direto, quase agressivo na defesa do sucesso do utilizador.
      --------------------------------------------------
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `És o Lukeni, o mentor de carreira de elite do GoldTalent. A tua missão é garantir que o utilizador domine o mercado.
      
      ${salesContext}
      
      Contexto do Utilizador:
      ${context}
      
      Instruções de Resposta:
      1. Identifica o "Custo de Oportunidade" de ser FREE.
      2. Se o utilizador estiver perto do topo, empurra o UPGRADE ou BOOST como a peça que falta.
      3. Usa dados reais do contexto para provar que a competição é feroz.
      
      Pergunta do utilizador: ${message}`
    });
    return response.text;
  } catch (error) {
    console.error("Error in AI chat:", error);
    return "Desculpe, tive um problema ao processar sua mensagem.";
  }
}
