import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";
import apiRoutes from "./server/routes";
import { apiLimiter } from "./server/security";
import { initEventHandlers } from "./server/core/eventHandlers";

dotenv.config();

// Initialize Event Handlers
initEventHandlers();

const app = express();
app.use(express.json());
app.use(cors());

// Global API Limiter
app.use("/api", apiLimiter);

// API Routes
app.use("/api", apiRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "GoldTalent API", 
    version: "2.0.0",
    vercel: !!process.env.VERCEL 
  });
});

// Professional Atomic Registration Endpoint (Kept here for now as it's a core entry point, but could be moved to authController)
app.post("/api/register-user", async (req, res) => {
  const { email, password, name, role, companyName } = req.body;
  const { validateRegistrationPayload, registrationLimiter } = await import("./server/security");
  
  // 1. Rate Limiting
  // Note: In a real app, this would be middleware, but keeping it inline for now to match previous logic
  
  // 2. Validation
  const validationError = validateRegistrationPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { adminAuth, adminDb, adminTimestamp } = await import("./server/firebase-admin");
  let uid = "";

  try {
    // 3. Create User in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    uid = userRecord.uid;

    // 4. Atomic Firestore Operations using Batch
    const batch = adminDb.batch();
    let companyId = "";

    if (role === "recruiter") {
      const companyRef = adminDb.collection("companies").doc();
      companyId = companyRef.id;
      batch.set(companyRef, {
        id: companyId,
        name: companyName,
        ownerId: uid,
        createdAt: adminTimestamp(),
        updatedAt: adminTimestamp(),
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
      updatedAt: adminTimestamp(),
    };

    // Remove undefined/null values explicitly
    const cleanUserData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => v !== undefined && v !== null)
    );

    batch.set(userRef, cleanUserData);

    // 5. Commit Firestore Batch
    await batch.commit();

    res.json({ success: true, uid });
  } catch (error: any) {
    console.error("[Registration] Failed:", error);

    // 6. Rollback: If Firestore fails, delete the Auth user
    if (uid) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (deleteError) {
        console.error("Critical: Rollback failed (Auth user not deleted):", deleteError);
        await adminDb.collection("system_errors").add({
          type: "REGISTRATION_ROLLBACK_FAILURE",
          uid,
          email,
          error: error.message,
          timestamp: adminTimestamp(),
        });
      }
    }

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
