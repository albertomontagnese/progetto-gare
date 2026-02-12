import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

function getApp(): App {
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  app = initializeApp({
    credential: cert({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  return app;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getApp());
  return db;
}

/* ───────── Collection helpers ───────── */

export function garaCollection() {
  return getDb().collection('gare');
}

export function garaDoc(garaId: string) {
  return garaCollection().doc(garaId);
}

export function conversationDoc(garaId: string) {
  return getDb().collection('conversations').doc(garaId);
}

export function documentsDoc(garaId: string) {
  return getDb().collection('gara_documents').doc(garaId);
}

export function companyProfileDoc() {
  return getDb().collection('workspace').doc('company_profile');
}
