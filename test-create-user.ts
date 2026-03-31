
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Variáveis ausentes");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  const auth = admin.auth();
  const email = "alberdaniosilva15@gmail.com";
  const password = "1JM9RDJAHQY520013105";

  auth.createUser({
    email,
    password
  }).then(user => {
    console.log(JSON.stringify({ success: true, user }, null, 2));
    process.exit(0);
  }).catch(e => {
    console.error(JSON.stringify({ success: false, error: e.message }, null, 2));
    process.exit(1);
  });
} catch (error: any) {
  console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  process.exit(1);
}
