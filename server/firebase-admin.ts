import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

function validateFirebaseEnv() {
  const requiredVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
  let hasErrors = false;

  console.log("🔍 Verificando variáveis de ambiente do Firebase...");

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      console.error(`❌ ${varName} ausente`);
      hasErrors = true;
    } else if (varName === "FIREBASE_CLIENT_EMAIL" && !value.includes("@")) {
      console.error(`❌ FIREBASE_CLIENT_EMAIL parece inválido: ${value}`);
      hasErrors = true;
    } else if (varName === "FIREBASE_PRIVATE_KEY") {
      if (!value.includes("BEGIN PRIVATE KEY") || !value.includes("END PRIVATE KEY")) {
        console.error("❌ FIREBASE_PRIVATE_KEY parece inválido (faltando BEGIN/END)");
        hasErrors = true;
      }
      if (!value.includes("\\n")) {
        console.warn("⚠️ FIREBASE_PRIVATE_KEY não tem \\n escapado (pode causar erros na Vercel)");
      }
    }
  }

  if (hasErrors) {
    console.error("⛔ Erro crítico na configuração do Firebase. O backend pode não funcionar corretamente.");
  } else {
    console.log("✅ Checagem final do Firebase concluída");
  }
}

// Executa a validação no carregamento do módulo
validateFirebaseEnv();

if (!admin.apps.length) {
  // Tenta ler das variáveis de ambiente da Vercel primeiro
  let projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Resiliência: Se o projectId parece um hash ou está ausente, tenta extrair do email
  if (clientEmail && (!projectId || projectId.length > 30 || /^[a-f0-9]+$/.test(projectId))) {
    const parts = clientEmail.split('@');
    if (parts.length > 1) {
      const domainParts = parts[1].split('.');
      if (domainParts.length > 0) {
        projectId = domainParts[0];
        console.log(`💡 Extraindo Project ID do email: ${projectId}`);
      }
    }
  }

  if (projectId) {
    projectId = projectId.trim().replace(/[^a-zA-Z0-9-]/g, '');
  }

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
export const adminIncrement = admin.firestore.FieldValue.increment;
export const adminFieldValue = admin.firestore.FieldValue;
