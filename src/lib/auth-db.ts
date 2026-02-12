import { userDoc, usersCollection, invitationsCollection, magicLinksCollection, tenantsCollection } from './firestore';
import crypto from 'crypto';

/* ───────── Types ───────── */

export interface AppUser {
  email: string;
  name: string;
  tenantId: string;
  role: 'admin' | 'user';
  createdAt: string;
  emailVerified: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export interface Invitation {
  id: string;
  email: string;
  tenantId: string;
  tenantName: string;
  role: 'admin' | 'user';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  accepted: boolean;
}

/* ───────── Users ───────── */

export async function getUser(email: string): Promise<AppUser | null> {
  const snap = await userDoc(email).get();
  if (!snap.exists) return null;
  return snap.data() as AppUser;
}

export async function createUser(data: AppUser): Promise<AppUser> {
  await userDoc(data.email).set(data);
  return data;
}

export async function updateUser(email: string, data: Partial<AppUser>): Promise<void> {
  await userDoc(email).update(data);
}

export async function getUsersByTenant(tenantId: string): Promise<AppUser[]> {
  const snap = await usersCollection().where('tenantId', '==', tenantId).get();
  return snap.docs.map((d) => d.data() as AppUser);
}

/* ───────── Tenants ───────── */

export async function createTenant(name: string, createdBy: string): Promise<Tenant> {
  const id = `tenant-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const tenant: Tenant = { id, name, createdAt: new Date().toISOString(), createdBy };
  await tenantsCollection().doc(id).set(tenant);
  return tenant;
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const snap = await tenantsCollection().doc(tenantId).get();
  if (!snap.exists) return null;
  return snap.data() as Tenant;
}

/* ───────── Magic Links ───────── */

export async function createMagicLink(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString(); // 15 min
  await magicLinksCollection().doc(token).set({
    email: email.toLowerCase(),
    expiresAt,
    used: false,
  });
  return token;
}

export async function verifyMagicLink(token: string): Promise<string | null> {
  const snap = await magicLinksCollection().doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.used) return null;
  if (new Date(data.expiresAt) < new Date()) return null;
  await magicLinksCollection().doc(token).update({ used: true });
  return data.email;
}

/* ───────── Invitations ───────── */

export async function createInvitation(data: {
  email: string;
  tenantId: string;
  tenantName: string;
  role: 'admin' | 'user';
  invitedBy: string;
}): Promise<Invitation> {
  const id = crypto.randomBytes(16).toString('hex');
  const invitation: Invitation = {
    id,
    ...data,
    email: data.email.toLowerCase(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(), // 7 days
    accepted: false,
  };
  await invitationsCollection().doc(id).set(invitation);
  return invitation;
}

export async function getInvitation(id: string): Promise<Invitation | null> {
  const snap = await invitationsCollection().doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as Invitation;
}

export async function getPendingInvitationsForEmail(email: string): Promise<Invitation[]> {
  const snap = await invitationsCollection()
    .where('email', '==', email.toLowerCase())
    .where('accepted', '==', false)
    .get();
  return snap.docs.map((d) => d.data() as Invitation).filter((i) => new Date(i.expiresAt) > new Date());
}

export async function getInvitationsByTenant(tenantId: string): Promise<Invitation[]> {
  const snap = await invitationsCollection().where('tenantId', '==', tenantId).get();
  return snap.docs.map((d) => d.data() as Invitation);
}

export async function acceptInvitation(id: string): Promise<void> {
  await invitationsCollection().doc(id).update({ accepted: true });
}
