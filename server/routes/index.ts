import { Router } from "express";
import candidateRoutes from "./candidateRoutes";
import jobRoutes from "./jobRoutes";
import applicationRoutes from "./applicationRoutes";
import { ConversationEngine } from "../core/conversationEngine";
import { addCorrelationId } from "../middlewares/auth";
import { adminAuth } from "../firebase-admin";

const router = Router();

router.post("/test-create-user", async (_req, res) => {
  try {
    const user = await adminAuth.createUser({
      email: "alberdaniosilva15@gmail.com",
      password: "1JM9RDJAHQY520013105"
    });
    res.json({ success: true, user });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.use("/candidates", candidateRoutes);
router.use("/jobs", jobRoutes);
router.use("/applications", applicationRoutes);

// WhatsApp / Chat Webhook
router.post("/webhook/whatsapp", addCorrelationId, async (req, res) => {
  const { senderId, message } = req.body;
  const correlationId = (req as any).correlationId;

  try {
    const response = await ConversationEngine.processIncomingMessage(senderId, message, correlationId);
    res.json({ success: true, response });
  } catch (error: any) {
    console.error(`[${correlationId}] [Webhook] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
