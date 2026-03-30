import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccountText = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (!serviceAccountText) {
    throw new Error("ERRO: FIREBASE_SERVICE_ACCOUNT não encontrada!");
  }

  // Correção crítica para as quebras de linha da chave privada na Vercel
  const serviceAccount = JSON.parse(serviceAccountText);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin inicializado com sucesso!");
}

export const adminAuth = admin.auth();
export const adminDb = getFirestore();
export const adminTimestamp = FieldValue.serverTimestamp;
