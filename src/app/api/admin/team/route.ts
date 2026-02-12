import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getUsersByTenant, getInvitationsByTenant } from '@/lib/auth-db';

export async function GET() {
  try {
    const session = await requireSession();
    const [users, invitations] = await Promise.all([
      getUsersByTenant(session.tenantId),
      getInvitationsByTenant(session.tenantId),
    ]);
    return NextResponse.json({
      users: users.map((u) => ({ email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })),
      invitations: invitations
        .filter((i) => !i.accepted)
        .map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.createdAt, expiresAt: i.expiresAt })),
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    console.error('Team error:', error);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
