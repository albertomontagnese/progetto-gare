import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/session';
import { getUser, getTenant } from '@/lib/auth-db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }
    // Refresh user data from Firestore
    const user = await getUser(session.email);
    if (!user) {
      await clearSessionCookie();
      return NextResponse.json({ user: null });
    }
    const tenant = await getTenant(user.tenantId);
    return NextResponse.json({ user, tenant });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Errore logout' }, { status: 500 });
  }
}
