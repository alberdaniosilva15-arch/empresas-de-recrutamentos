import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// 1. Pegamos o texto que você colou na Vercel (a chave JSON completa)
const serviceAccountText = process.env.FIREBASE_SERVICE_ACCOUNT;

let app;

if (!admin.apps.length) {
  if (!serviceAccountText) {
    throw new Error("ERRO: Variável FIREBASE_SERVICE_ACCOUNT não encontrada na Vercel!");
  }

  // 2. Transformamos o texto em objeto
  const serviceAccount = JSON.parse(serviceAccountText);

  // 3. Inicializamos com a credencial completa (Obrigatório na Vercel)
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Se você usa uma base de dados específica, o ID já vem no JSON da serviceAccount
  });
  console.log("✅ Firebase Admin inicializado com sucesso!");
} else {
  app = admin.app();
}

// 4. Mantemos as suas exportações exatamente como estavam para não quebrar o resto do app
export const adminAuth = admin.auth(app);
export const adminDb = getFirestore(app);
export const adminTimestamp = FieldValue.serverTimestamp;
