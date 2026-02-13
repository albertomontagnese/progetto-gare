import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { createInvitation, getUser, getTenant } from '@/lib/auth-db';
import { sendInvitationEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Solo gli admin possono invitare utenti' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const role = body?.role === 'admin' ? 'admin' : 'user';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }

    // Check user doesn't already exist in this tenant
    const existingUser = await getUser(email);
    if (existingUser && existingUser.tenantId === session.tenantId) {
      return NextResponse.json({ error: 'Utente già presente nel team' }, { status: 400 });
    }

    const tenant = await getTenant(session.tenantId);
    const tenantName = tenant?.name || 'Team';

    const invitation = await createInvitation({
      email,
      tenantId: session.tenantId,
      tenantName,
      role: role as 'admin' | 'user',
      invitedBy: session.email,
    });

    const baseUrl = process.env.NEXTAUTH_URL || '';
    const inviteLink = `${baseUrl}/login?invitation=${invitation.id}`;

    await sendInvitationEmail(email, session.name, tenantName, inviteLink);

    return NextResponse.json({ ok: true, invitation });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    console.error('Invite error:', error);
    return NextResponse.json({ error: `Errore invio invito: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
