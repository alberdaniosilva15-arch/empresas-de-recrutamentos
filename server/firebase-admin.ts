import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
  // Tenta ler das variáveis de ambiente da Vercel primeiro
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Fallback apenas para desenvolvimento local (se as variáveis estiverem no .env)
    admin.initializeApp();
  }
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore();

// MUITO IMPORTANTE: Garante que esta variável está na Vercel!
if (process.env.FIREBASE_DATABASE_ID) {
  adminDb.settings({ databaseId: process.env.FIREBASE_DATABASE_ID });
}

export const adminTimestamp = admin.firestore.FieldValue.serverTimestamp;
