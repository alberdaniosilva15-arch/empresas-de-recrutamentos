import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/generative-ai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "GoldTalent API", env: process.env.NODE_ENV });
  });

  // AI CV Scoring & Analysis
  app.post("/api/score-cv", async (req, res) => {
    const { text, jobDescription } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this CV text against the job description.
        CV: ${text}
        Job: ${jobDescription || "Profissional qualificado"}
        
        Return JSON with:
        - score (0-100)
        - scoreBreakdown (object with skills, experience, education scores 0-100)
        - classification ("baixo", "médio", "alto")
        - skills (array of extracted skills)
        - experienceKeywords (array of key experience terms)
        - summary (brief analysis)`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(response.text);
      res.json(result);
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
      return res.json({ success: true, message: "Notification simulated (no webhook URL)" });
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error(`n8n responded with ${response.status}`);
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
      const { sendCandidateEmail } = await import("./server/email.js");
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
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    try {
      // Import dinâmico do admin para evitar erros de inicialização na Vercel
      const { adminAuth, adminDb, adminTimestamp } = await import("./server/firebase-admin.js");
      
      let uid = "";

      // Create User in Firebase Authentication
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
      uid = userRecord.uid;

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

      const cleanUserData = Object.fromEntries(
        Object.entries(userData).filter(([_, v]) => v !== undefined && v !== null)
      );

      batch.set(userRef, cleanUserData);
      await batch.commit();

      res.json({ success: true, uid });
    } catch (error: any) {
      console.error("Registration failed:", error);
      res.status(500).json({ error: error.message || "Falha no registo" });
    }
  });

  // CONFIGURAÇÃO VERCEL / VITE
  const isVercel = process.env.VERCEL === "1";
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd && !isVercel) {
    // Só carrega o Vite em ambiente de desenvolvimento local
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Em produção ou na Vercel, serve os arquivos estáticos da pasta 'dist'
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Na Vercel, o app.listen não é estritamente necessário, mas mantemos para local
  if (!isVercel) {
    app.listen(PORT, () => {
      console.log(`GoldTalent Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
