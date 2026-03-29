import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = !admin.apps.length 
  ? admin.initializeApp({ projectId: firebaseConfig.projectId })
  : admin.app();

export const adminAuth = admin.auth(app);
export const adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const adminTimestamp = FieldValue.serverTimestamp;
