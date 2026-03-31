import { AIEngine } from "./aiEngine";
import { adminDb, adminTimestamp } from "../firebase-admin";
import { Message, Conversation } from "../../src/types";
import { eventBus } from "./eventBus";

export class ConversationEngine {
  static async processIncomingMessage(senderId: string, message: string, correlationId: string) {
    console.log(`[${correlationId}] [ConversationEngine] Processing message from ${senderId}: ${message}`);

    // 1. Get or Create Conversation
    const conversationRef = adminDb.collection("conversations")
      .where("participantIds", "array-contains", senderId)
      .limit(1);
    
    const conversationSnap = await conversationRef.get();
    let conversationId: string;
    let conversationData: any;

    if (conversationSnap.empty) {
      const newConvRef = adminDb.collection("conversations").doc();
      conversationId = newConvRef.id;
      conversationData = {
        id: conversationId,
        participantIds: [senderId, 'system'],
        lastMessageAt: adminTimestamp(),
        status: 'active',
        createdAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
        metadata: {
          stage: 'start',
          data: {}
        }
      };
      await newConvRef.set(conversationData);
    } else {
      conversationId = conversationSnap.docs[0].id;
      conversationData = conversationSnap.docs[0].data();
    }

    // 2. Save User Message
    const userMsgRef = adminDb.collection("messages").doc();
    await userMsgRef.set({
      id: userMsgRef.id,
      conversationId,
      senderId,
      text: message,
      type: 'text',
      createdAt: adminTimestamp(),
    });

    // 3. Handle Message based on Stage
    const { response, nextStage, done, candidateData } = await this.handleMessage(message, conversationData.metadata || { stage: 'start', data: {} });

    // 4. Save AI Response
    const aiMsgRef = adminDb.collection("messages").doc();
    await aiMsgRef.set({
      id: aiMsgRef.id,
      conversationId,
      senderId: 'system',
      text: response,
      type: 'ai',
      createdAt: adminTimestamp(),
    });

    // 5. Update Conversation State
    await adminDb.collection("conversations").doc(conversationId).update({
      lastMessageAt: adminTimestamp(),
      updatedAt: adminTimestamp(),
      metadata: {
        stage: nextStage,
        data: candidateData || conversationData.metadata?.data || {}
      }
    });

    // 6. If conversation is done, emit event
    if (done && candidateData) {
      eventBus.emit("conversation.completed", { senderId, candidateData });
    }

    return response;
  }

  private static async handleMessage(message: string, state: any) {
    const stage = state.stage || 'start';
    const data = state.data || {};

    switch (stage) {
      case "start":
        return {
          response: "Olá! Sou o Lukeni, assistente do GoldTalent. Qual é o teu nome completo?",
          nextStage: "collect_name",
          done: false
        };

      case "collect_name":
        data.name = message;
        return {
          response: `Prazer em conhecer-te, ${message}! Quantos anos de experiência tens na área?`,
          nextStage: "collect_experience",
          data,
          done: false
        };

      case "collect_experience":
        data.experience = message;
        return {
          response: "Ótimo. Quais são as tuas principais competências técnicas (skills)? Separa por vírgulas.",
          nextStage: "collect_skills",
          data,
          done: false
        };

      case "collect_skills":
        data.skills = message.split(",").map(s => s.trim());
        return {
          response: "Obrigado pelas informações! Vou analisar o teu perfil agora mesmo.",
          nextStage: "completed",
          candidateData: data,
          done: true
        };

      default:
        return {
          response: "Obrigado! Já registramos o teu interesse. Entraremos em contacto em breve.",
          nextStage: "completed",
          done: false
        };
    }
  }
}
