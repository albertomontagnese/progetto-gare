import { NextResponse } from 'next/server';
import { getUser, createUser, createTenant } from '@/lib/auth-db';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import type { AppUser } from '@/lib/auth-db';

/**
 * Dev login bypass — creates a user+tenant directly without magic link.
 * POST /api/auth/dev-login { email, name, companyName }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const name = String(body?.name || '').trim();
    const companyName = String(body?.companyName || '').trim();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email e nome obbligatori' }, { status: 400 });
    }

    // Check if user already exists
    let user = await getUser(email);
    if (user) {
      const sessionToken = await createSessionToken(user);
      await setSessionCookie(sessionToken);
      return NextResponse.json({ ok: true, user, message: 'Utente esistente - sessione creata' });
    }

    // Create tenant + user
    const tenant = await createTenant(companyName || `${name}'s Company`, email);
    user = {
      email,
      name,
      tenantId: tenant.id,
      role: 'admin',
      createdAt: new Date().toISOString(),
      emailVerified: true,
    } as AppUser;

    await createUser(user);
    const sessionToken = await createSessionToken(user);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ ok: true, user, tenant, message: 'Utente e azienda creati' });
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json({ error: String((error as Error).message || 'Errore') }, { status: 500 });
  }
}
