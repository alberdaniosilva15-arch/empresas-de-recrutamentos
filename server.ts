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
      plan: 'free',
      boosts: 0,
      trustScore: 100,
      visibilityScore: 0,
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
        const { adminAuth } = await import("./server/firebase-admin");
        await adminAuth.deleteUser(uid);
      } catch (deleteError) {
        console.error("Critical: Rollback failed (Auth user not deleted):", deleteError);
      }
    }

    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ error: "Este email já está em uso." });
    }

    res.status(500).json({ error: error.message || "Falha no registo" });
  }
});

// Dynamic Pricing & Bidding Endpoints
app.get("/api/boost-price/:userId", async (req, res) => {
  const { userId } = req.params;
  const { adminDb } = await import("./server/firebase-admin");
  
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    
    const user = userDoc.data();
    let base = 500; // Kz

    // Event Check: Happy Hour (e.g., between 18:00 and 19:00)
    const now = new Date();
    const isHappyHour = now.getHours() === 18;
    if (isHappyHour) base *= 0.5;

    if (user.activityHigh) base *= 1.3;
    if (user.isNearHire) base *= 1.5;
    if (user.hasUsedBoostBefore) base *= 1.2;

    res.json({ price: Math.round(base), isHappyHour });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/jobs/:jobId/bid", async (req, res) => {
  const { jobId } = req.params;
  const { userId, amount } = req.body;
  const { adminDb, adminTimestamp, adminFieldValue } = await import("./server/firebase-admin");

  try {
    const jobRef = adminDb.collection("jobs").doc(jobId);
    await jobRef.update({
      bids: adminFieldValue.arrayUnion({ userId, amount, timestamp: Date.now() })
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/update-streak/:userId", async (req, res) => {
  const { userId } = req.params;
  const { adminDb, adminTimestamp, adminFieldValue } = await import("./server/firebase-admin");

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    const now = new Date();
    const lastLogin = userData?.lastLogin?.toDate() || new Date(0);
    const diffDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = userData?.loginStreak || 0;
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }

    await userRef.update({
      loginStreak: newStreak,
      lastLogin: adminTimestamp(),
      visibilityScore: adminFieldValue.increment(newStreak > 5 ? 10 : 0)
    });

    res.json({ streak: newStreak });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/jobs/:jobId/stats/:userId", async (req, res) => {
  const { jobId, userId } = req.params;
  const { adminDb } = await import("./server/firebase-admin");

  try {
    const candidatesSnap = await adminDb.collection("candidates")
      .where("jobId", "==", jobId)
      .orderBy("finalRank", "desc")
      .get();

    const candidates = candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    const userCandidate = candidates.find((c: any) => c.email === userId || c.phone === userId); // Simplified lookup
    const rank = userCandidate ? candidates.indexOf(userCandidate) + 1 : 0;
    
    const boostCount = candidates.filter((c: any) => c.isBoosted).length;

    res.json({ 
      rank, 
      total: candidates.length,
      boostCount,
      topThreeAdvantage: "5x" 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Simulated Background Task: Invisibility Penalty
// In a real app, this would be a Cloud Function or Cron Job
app.post("/api/system/apply-inactivity-penalty", async (req, res) => {
  const { adminDb, adminTimestamp, adminFieldValue } = await import("./server/firebase-admin");
  
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    const inactiveUsersSnap = await adminDb.collection("users")
      .where("lastLogin", "<", threeDaysAgo)
      .get();

    const batch = adminDb.batch();
    inactiveUsersSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        visibilityScore: adminFieldValue.increment(-5),
        updatedAt: adminTimestamp()
      });
    });

    await batch.commit();
    res.json({ processed: inactiveUsersSnap.size });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
} else if (!process.env.VERCEL) {
  // Production static serving (only if NOT on Vercel, as Vercel handles static via vercel.json)
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`GoldTalent Production Server running on http://localhost:${PORT}`);
  });
}

export default app;
