import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
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
    // Fallback for environment without explicit credentials (e.g., local dev or Cloud Run)
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore();
adminDb.settings({ databaseId: process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId });
export const adminTimestamp = admin.firestore.FieldValue.serverTimestamp;
