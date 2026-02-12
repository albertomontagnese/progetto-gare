import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AppUser } from './auth-db';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'progetto-gare-secret-key-min-32ch');
const COOKIE_NAME = 'pg_session';

export interface SessionPayload {
  email: string;
  name: string;
  tenantId: string;
  role: 'admin' | 'user';
}

export async function createSessionToken(user: AppUser): Promise<string> {
  const payload: SessionPayload = {
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    role: user.role,
  };
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Get session or throw 401 - use in API routes */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}
