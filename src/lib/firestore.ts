import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

function getApp(): App {
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  // Handle escaped newlines from env vars (Vercel stores them literally)
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  // Strip surrounding quotes if present
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n');
  }

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

/* ───────── Tenant-scoped helpers ───────── */

export function tenantDoc(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId);
}

export function garaCollection(tenantId: string) {
  return tenantDoc(tenantId).collection('gare');
}

export function garaDoc(tenantId: string, garaId: string) {
  return garaCollection(tenantId).doc(garaId);
}

export function conversationDoc(tenantId: string, garaId: string) {
  return tenantDoc(tenantId).collection('conversations').doc(garaId);
}

export function documentsDoc(tenantId: string, garaId: string) {
  return tenantDoc(tenantId).collection('gara_documents').doc(garaId);
}

export function companyProfileDoc(tenantId: string) {
  return tenantDoc(tenantId).collection('workspace').doc('company_profile');
}

/* ───────── Auth collections (global) ───────── */

export function usersCollection() {
  return getDb().collection('users');
}

export function userDoc(email: string) {
  return usersCollection().doc(email.toLowerCase());
}

export function invitationsCollection() {
  return getDb().collection('invitations');
}

export function magicLinksCollection() {
  return getDb().collection('magic_links');
}

export function tenantsCollection() {
  return getDb().collection('tenants');
}
