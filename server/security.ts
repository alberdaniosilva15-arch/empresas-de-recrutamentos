import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { adminAuth, adminDb, adminTimestamp } from "./firebase-admin";

// 1. Rate Limiting by IP
export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registrations per window
  message: { error: "Muitas tentativas de registo. Por favor, tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: { error: "Muitas solicitações. Por favor, aguarde um momento." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Firebase App Check Verification Middleware
export async function verifyAppCheck(req: Request, res: Response, next: NextFunction) {
  const appCheckToken = req.header("X-Firebase-AppCheck");

  if (!appCheckToken) {
    await logSecurityEvent("MISSING_APP_CHECK_TOKEN", { ip: req.ip, path: req.path });
    return res.status(401).json({ error: "Unauthorized: App Check token missing" });
  }

  try {
    const { appCheck } = await import("firebase-admin");
    await appCheck().verifyToken(appCheckToken);
    next();
  } catch (err: any) {
    await logSecurityEvent("INVALID_APP_CHECK_TOKEN", { ip: req.ip, path: req.path, error: err.message });
    return res.status(401).json({ error: "Unauthorized: Invalid App Check token" });
  }
}

// 3. Deep Payload Validation
export function validateRegistrationPayload(payload: any) {
  const { email, password, name, role, companyName } = payload;

  // Type & Existence Checks
  if (typeof email !== "string" || !email.includes("@")) return "Email inválido";
  if (typeof password !== "string" || password.length < 6) return "Palavra-passe deve ter pelo menos 6 caracteres";
  if (typeof name !== "string" || name.length < 2 || name.length > 100) return "Nome inválido (2-100 caracteres)";
  if (!["candidate", "recruiter"].includes(role)) return "Tipo de utilizador inválido";

  // Role-specific checks
  if (role === "recruiter") {
    if (typeof companyName !== "string" || companyName.length < 2 || companyName.length > 100) {
      return "Nome da empresa inválido (2-100 caracteres)";
    }
  }

  // Structure check (no unexpected fields)
  const allowedFields = ["email", "password", "name", "role", "companyName"];
  const extraFields = Object.keys(payload).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    return `Campos não permitidos: ${extraFields.join(", ")}`;
  }

  return null;
}

// 4. Security Logging
export async function logSecurityEvent(type: string, data: any) {
  console.warn(`[SECURITY_EVENT] ${type}:`, JSON.stringify(data));
  try {
    await adminDb.collection("security_logs").add({
      type,
      data,
      timestamp: adminTimestamp(),
    });
  } catch (err) {
    console.error("Failed to log security event to Firestore:", err);
  }
}

// 5. Automatic Reconciliation Job (Can be called via endpoint or cron)
export async function runReconciliation() {
  console.log("[RECONCILIATION] Starting job...");
  const usersAuth = await adminAuth.listUsers(1000);
  let cleanedCount = 0;

  for (const userRecord of usersAuth.users) {
    const userDoc = await adminDb.collection("users").doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      // User exists in Auth but not in Firestore - Potential "Ghost" user
      const createdAt = new Date(userRecord.metadata.creationTime);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      // Only delete if created more than 30 minutes ago (to avoid deleting users currently registering)
      if (diffMinutes > 30) {
        console.warn(`[RECONCILIATION] Deleting ghost user: ${userRecord.uid} (${userRecord.email})`);
        await adminAuth.deleteUser(userRecord.uid);
        cleanedCount++;
      }
    }
  }

  console.log(`[RECONCILIATION] Job finished. Cleaned ${cleanedCount} ghost users.`);
  return cleanedCount;
}
