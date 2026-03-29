import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/generative-ai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // --- API ROUTES ---

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      service: "GoldTalent API", 
      env: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL 
    });
  });

  app.post("/api/score-cv", async (req, res) => {
    const { text, jobDescription } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Analyze this CV text against the job description.
        CV: ${text}
        Job: ${jobDescription || "Profissional qualificado"}
        
        Return JSON with:
        - score (0-100)
        - scoreBreakdown (object with skills, experience, education scores 0-100)
        - classification ("baixo", "médio", "alto")
        - skills (array of extracted skills)
        - experienceKeywords (array of key experience terms)
        - summary (brief analysis)` }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(response.response.text()));
    } catch (error) {
      console.error("AI Analysis failed:", error);
      res.status(500).json({ error: "AI Analysis failed" });
    }
  });

  app.post("/api/test-whatsapp", async (req, res) => {
    const { phone, message } = req.body;
    const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;

    if (!webhookUrl) return res.status(400).json({ error: "Webhook not configured" });

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message, type: "test" }),
      });
      res.json({ success: response.ok });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/send-email", async (req, res) => {
    const { to, candidateName, status, jobTitle } = req.body;
    try {
      // Import dinâmico com fallback de extensão para ambiente Node/Vercel
      const { sendCandidateEmail } = await import("./server/email.js");
      await sendCandidateEmail(to, candidateName, status, jobTitle);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/register-user", async (req, res) => {
    const { email, password, name, role, companyName } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ error: "Missing fields" });

    try {
      const { adminAuth, adminDb, adminTimestamp } = await import("./server/firebase-admin.js");
      const userRecord = await adminAuth.createUser({ email, password, displayName: name });
      const uid = userRecord.uid;

      const batch = adminDb.batch();
      if (role === "recruiter") {
        const companyRef = adminDb.collection("companies").doc();
        batch.set(companyRef, { name: companyName, createdAt: adminTimestamp(), ownerId: uid });
      }

      batch.set(adminDb.collection("users").doc(uid), {
        id: uid, email, name, role, createdAt: adminTimestamp()
      });

      await batch.commit();
      res.json({ success: true, uid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- CONFIGURAÇÃO DE AMBIENTE (VERCEL / VITE) ---

  const isVercel = process.env.VERCEL === "1";
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd && !isVercel) {
    // Ambiente Local: Usa o Middleware do Vite
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Ambiente Produção/Vercel: Serve ficheiros da pasta 'dist'
    const distPath = path.resolve(process.cwd(), "dist");
    
    // IMPORTANTE: Servir estáticos antes do catch-all (*) para evitar erro de MIME type
    app.use(express.static(distPath, { index: false }));

    app.get("*", (req, res) => {
      // Se for uma rota de API que não existe, não envia o HTML
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!isVercel) {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  }
}

startServer().catch(console.error);
