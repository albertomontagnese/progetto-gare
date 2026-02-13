import { NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/auth-db';
import { sendMagicLinkEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }

    const token = await createMagicLink(email);
    const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
    const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;

    await sendMagicLinkEmail(email, magicLink);

    return NextResponse.json({ ok: true, message: 'Magic link inviato' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: `Errore invio email: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
