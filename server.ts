import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "GoldTalent API", vercel: !!process.env.VERCEL });
});

// AI CV Scoring & Analysis
app.post("/api/score-cv", async (req, res) => {
  const { text, jobDescription } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Analyze this CV text against the job description.
      CV: ${text}
      Job: ${jobDescription || "Profissional qualificado"}
      
      Return JSON with:
      - score (0-100)
      - scoreBreakdown (object with skills, experience, education scores 0-100)
      - classification ("baixo", "médio", "alto")
      - skills (array of extracted skills)
      - experienceKeywords (array of key experience terms)
      - summary (brief analysis)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();
    
    // Limpeza simples caso a IA mande ```json ... ```
    const cleanJson = jsonText.replace(/```json|```/g, "");
    res.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error("AI Analysis failed:", error);
    res.status(500).json({ error: "AI Analysis failed" });
  }
});

// Test WhatsApp endpoint
app.post("/api/test-whatsapp", async (req, res) => {
  const { phone, message } = req.body;
  const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;

  if (!webhookUrl) {
    return res.status(400).json({ error: "N8N_WHATSAPP_WEBHOOK_URL not configured" });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone || "+351900000000",
        message: message || "Teste de integração GoldTalent",
        type: "test"
      }),
    });

    if (!response.ok) throw new Error(`n8n error: ${response.status}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// n8n Webhook Proxy
app.post("/api/notify-whatsapp", async (req, res) => {
  const { data } = req.body;
  const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("N8N_WHATSAPP_WEBHOOK_URL not configured, skipping WhatsApp notification.");
    console.log("Simulated data for n8n:", data);
    return res.json({ success: true, message: "Notification simulated (no webhook URL)" });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`n8n responded with ${response.status}`);
    }

    res.json({ success: true, message: "Notification sent to n8n" });
  } catch (error) {
    console.error("Failed to notify n8n:", error);
    res.status(500).json({ error: "Failed to notify n8n" });
  }
});

// Email Sending Route
app.post("/api/send-email", async (req, res) => {
  const { to, candidateName, status, jobTitle } = req.body;
  try {
    const { sendCandidateEmail } = await import("./server/email");
    await sendCandidateEmail(to, candidateName, status, jobTitle);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Failed to send email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Professional Atomic Registration Endpoint
app.post("/api/register-user", async (req, res) => {
  const { email, password, name, role, companyName } = req.body;
  
  // 1. Server-side Validation
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }

  if (!["candidate", "recruiter"].includes(role)) {
    return res.status(400).json({ error: "Tipo de utilizador inválido" });
  }

  if (name.length > 100 || name.length < 2) {
    return res.status(400).json({ error: "Nome inválido (2-100 caracteres)" });
  }

  if (role === "recruiter" && (!companyName || companyName.length < 2)) {
    return res.status(400).json({ error: "Nome da empresa é obrigatório para recrutadores" });
  }

  const { adminAuth, adminDb, adminTimestamp } = await import("./server/firebase-admin");
  let uid = "";

  try {
    // 2. Create User in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    uid = userRecord.uid;

    // 3. Atomic Firestore Operations using Batch
    const batch = adminDb.batch();
    let companyId = "";

    if (role === "recruiter") {
      const companyRef = adminDb.collection("companies").doc();
      companyId = companyRef.id;
      batch.set(companyRef, {
        name: companyName,
        createdAt: adminTimestamp(),
        ownerId: uid
      });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userData = {
      id: uid,
      email,
      name,
      role,
      companyId: role === "recruiter" ? companyId : null,
      createdAt: adminTimestamp(),
    };

    // Remove undefined/null values explicitly
    const cleanUserData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => v !== undefined && v !== null)
    );

    batch.set(userRef, cleanUserData);

    // 4. Commit Firestore Batch
    await batch.commit();

    res.json({ success: true, uid });
  } catch (error: any) {
    console.error("Registration failed:", error);

    // 5. Rollback: If Firestore fails, delete the Auth user
    if (uid) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (deleteError) {
        console.error("Critical: Rollback failed (Auth user not deleted):", deleteError);
        // 6. Log critical failure for reconciliation
        await adminDb.collection("system_errors").add({
          type: "REGISTRATION_ROLLBACK_FAILURE",
          uid,
          email,
          error: error.message,
          timestamp: adminTimestamp(),
        });
      }
    }

    // Handle common Firebase Auth errors
    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ error: "Este email já está em uso." });
    }

    res.status(500).json({ error: error.message || "Falha no registo" });
  }
});

// Handle development server
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const startServer = async () => {
    const PORT = process.env.PORT || 3000;
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`GoldTalent Server running on http://localhost:${PORT}`);
    });
  };
  startServer();
}

export default app;
