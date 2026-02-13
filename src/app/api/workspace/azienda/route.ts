import { NextResponse } from 'next/server';
import { companyProfileDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { defaultCompanyProfile } from '@/lib/gara-logic';
import type { CompanyProfile } from '@/lib/types';

export async function GET() {
  try {
    const session = await requireSession();
    const snap = await companyProfileDoc(session.tenantId).get();
    const profile: CompanyProfile = snap.exists ? snap.data() as CompanyProfile : defaultCompanyProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('GET azienda error:', error);
    return NextResponse.json({ error: `Errore GET azienda: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const profile = body?.profile || body;
    const safe = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : defaultCompanyProfile();
    await companyProfileDoc(session.tenantId).set(safe);
    return NextResponse.json({ ok: true, profile: safe });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST azienda error:', error);
    return NextResponse.json({ error: `Errore POST azienda: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
