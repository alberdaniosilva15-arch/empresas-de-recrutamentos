import { eventBus } from "./eventBus";
import { MatchingEngine } from "./matchingEngine";
import { adminDb, adminTimestamp } from "../firebase-admin";
import { Candidate, Job } from "../../src/types";

export function initEventHandlers() {
  console.log("[EventHandlers] Initializing event handlers...");

  // 1. When a conversation is completed, create a candidate and start matching
  eventBus.on("conversation.completed", async (data: { senderId: string, candidateData: any }) => {
    const { senderId, candidateData } = data;
    const correlationId = `conv_${Date.now()}`;
    console.log(`[EventHandlers] [${correlationId}] Conversation completed for ${senderId}. Creating candidate...`);

    try {
      // Create Candidate
      const candidateRef = adminDb.collection("candidates").doc();
      const candidateId = candidateRef.id;
      const candidate: Candidate = {
        id: candidateId,
        name: candidateData.name,
        email: `${senderId}@whatsapp.com`, // Placeholder email
        phone: senderId,
        cvText: `Experiência: ${candidateData.experience}. Skills: ${candidateData.skills.join(", ")}`,
        skills: candidateData.skills,
        experienceKeywords: [candidateData.experience],
        score: 0,
        scoreBreakdown: { skills: 0, experience: 0, education: 0 },
        classification: 'médio',
        status: 'applied',
        jobId: 'any', // Default or first available job
        companyId: 'system', // Placeholder company
        createdAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
      };

      await candidateRef.set(candidate);
      eventBus.emit("candidate.created", { candidate, correlationId });

      // Find first available job for matching (demo purposes)
      const jobSnap = await adminDb.collection("jobs").limit(1).get();
      if (!jobSnap.empty) {
        const job = jobSnap.docs[0].data() as Job;
        await MatchingEngine.processCandidate(candidate, job, correlationId);
      }
    } catch (error) {
      console.error(`[EventHandlers] [${correlationId}] Error processing completed conversation:`, error);
    }
  });

  // 2. When a candidate is matched, update their stage and notify via WhatsApp
  eventBus.on("candidate.matched", async (data: { candidateId: string, jobId: string, result: any, stage: string }) => {
    const { candidateId, result, stage } = data;
    console.log(`[EventHandlers] Candidate ${candidateId} matched. Result: ${result.decision}. Stage: ${stage}`);

    try {
      // Update Candidate Stage in Firestore
      await adminDb.collection("candidates").doc(candidateId).update({
        status: stage,
        score: result.finalScore,
        finalRank: result.finalRank,
        classification: result.decision === 'reject' ? 'baixo' : (result.decision === 'interview' ? 'alto' : 'médio'),
        updatedAt: adminTimestamp(),
      });

      // 3. Monetization Logic: Set isNearHire and Trigger Upgrade Prompts
      const candidateSnap = await adminDb.collection("candidates").doc(candidateId).get();
      const candidate = candidateSnap.data() as Candidate;
      
      // Find associated user
      const userSnap = await adminDb.collection("users").where("email", "==", candidate.email).limit(1).get();
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();
        
        const updates: any = { updatedAt: adminTimestamp() };
        
        if (stage === 'interview' || stage === 'offer') {
          updates.isNearHire = true;
        }

        // "Almost Won" Trigger: if rank is high but user is free
        // Note: For demo, we'll assume rank <= 5 is "near win"
        // In a real app, we'd calculate rank relative to other candidates
        if (result.finalRank >= 70 && userData.plan === 'free') {
          console.log(`[Monetization] Triggering upgrade prompt for user ${userDoc.id}: Estás muito perto de ser selecionado.`);
          // We could send a notification here
        }

        await userDoc.ref.update(updates);
      }

      // Notify Candidate via WhatsApp (Simulated)
      let message = "";
      if (stage === 'rejected') {
        message = "Obrigado pelo teu interesse. De momento não temos uma vaga que se ajuste perfeitamente ao teu perfil, mas guardaremos o teu CV.";
      } else if (stage === 'interview') {
        message = "Boas notícias! O teu perfil foi selecionado para uma entrevista. Entraremos em contacto em breve para agendar.";
      } else {
        message = "O teu perfil está a ser analisado pela nossa equipa de recrutamento. Fica atento!";
      }

      console.log(`[WhatsApp Notification] To: ${candidate.phone}. Message: ${message}`);
      // Here you would call your WhatsApp API (n8n, Twilio, etc.)
    } catch (error) {
      console.error(`[EventHandlers] Error processing candidate match:`, error);
    }
  });
}
