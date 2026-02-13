import { NextResponse } from 'next/server';
import { getUser, createUser, createTenant, getInvitation, acceptInvitation } from '@/lib/auth-db';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import type { AppUser } from '@/lib/auth-db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const name = String(body?.name || '').trim();
    const companyName = String(body?.companyName || '').trim();
    const invitationId = String(body?.invitationId || '').trim();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email e nome sono obbligatori' }, { status: 400 });
    }

    // Check user doesn't already exist
    const existing = await getUser(email);
    if (existing) {
      const sessionToken = await createSessionToken(existing);
      await setSessionCookie(sessionToken);
      return NextResponse.json({ ok: true, user: existing });
    }

    let tenantId: string;
    let role: 'admin' | 'user' = 'admin';

    if (invitationId) {
      // Accept invitation
      const invitation = await getInvitation(invitationId);
      if (!invitation || invitation.accepted || new Date(invitation.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Invito non valido o scaduto' }, { status: 400 });
      }
      if (invitation.email !== email) {
        return NextResponse.json({ error: 'Email non corrisponde all\'invito' }, { status: 400 });
      }
      tenantId = invitation.tenantId;
      role = invitation.role;
      await acceptInvitation(invitationId);
    } else {
      // Create new company/tenant
      if (!companyName) {
        return NextResponse.json({ error: 'Nome azienda obbligatorio per nuova registrazione' }, { status: 400 });
      }
      const tenant = await createTenant(companyName, email);
      tenantId = tenant.id;
      role = 'admin';
    }

    const user: AppUser = {
      email,
      name,
      tenantId,
      role,
      createdAt: new Date().toISOString(),
      emailVerified: true,
    };

    await createUser(user);
    const sessionToken = await createSessionToken(user);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: `Errore registrazione: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
