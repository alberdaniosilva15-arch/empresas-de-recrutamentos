import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "GoldTalent API" });
  });

  // AI CV Scoring & Analysis
  app.post("/api/score-cv", async (req, res) => {
    const { text, jobDescription } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GoldTalent Server running on http://localhost:${PORT}`);
  });
}

startServer();
