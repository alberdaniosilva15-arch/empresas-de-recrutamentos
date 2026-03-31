import { Router } from "express";
import candidateRoutes from "./candidateRoutes";
import jobRoutes from "./jobRoutes";
import applicationRoutes from "./applicationRoutes";
import { ConversationEngine } from "../core/conversationEngine";
import { addCorrelationId } from "../middlewares/auth";
import { adminAuth, adminDb, adminTimestamp, adminIncrement } from "../firebase-admin";

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

router.get("/check-firebase-env", (_req, res) => {
  const requiredVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
  const status: any = {};

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      status[varName] = "❌ ausente";
    } else {
      let detail = "✅ definido";
      if (varName === "FIREBASE_CLIENT_EMAIL" && !value.includes("@")) {
        detail = "❌ inválido (faltando @)";
      } else if (varName === "FIREBASE_PRIVATE_KEY") {
        if (!value.includes("BEGIN PRIVATE KEY") || !value.includes("END PRIVATE KEY")) {
          detail = "❌ inválido (faltando BEGIN/END)";
        } else if (!value.includes("\\n")) {
          detail = "⚠️ definido (sem \\n escapado)";
        }
      }
      status[varName] = detail;
    }
  }

  res.json(status);
});

router.post("/upgrade-plan", async (req, res) => {
  const { userId, plan } = req.body;
  try {
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.update({
      plan,
      updatedAt: adminTimestamp()
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/activate-boost", async (req, res) => {
  const { userId, boostType } = req.body;
  try {
    const userRef = adminDb.collection("users").doc(userId);
    // In a real app, we would calculate expiration time
    await userRef.update({
      boosts: adminIncrement(1),
      updatedAt: adminTimestamp()
    });
    res.json({ success: true });
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
