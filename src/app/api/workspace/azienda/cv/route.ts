import { NextResponse } from 'next/server';
import { companyProfileDoc } from '@/lib/firestore';
import { uploadFile } from '@/lib/gcs';
import { requireSession } from '@/lib/session';
import { sanitizeFileName, defaultCompanyProfile } from '@/lib/gara-logic';
import type { CompanyProfile } from '@/lib/types';

export async function GET() {
  try {
    const session = await requireSession();
    const snap = await companyProfileDoc(session.tenantId).get();
    const profile: CompanyProfile = snap.exists ? snap.data() as CompanyProfile : defaultCompanyProfile();
    return NextResponse.json({ cv_files: Array.isArray(profile.cv) ? profile.cv : [] });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('GET cv error:', error);
    return NextResponse.json({ error: `Errore GET CV: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const files = Array.isArray(body?.files) ? body.files : [];
    if (!files.length) return NextResponse.json({ error: 'Nessun CV ricevuto' }, { status: 400 });

    const saved: string[] = [];
    for (const file of files) {
      const originalName = sanitizeFileName(file?.name || 'cv.pdf');
      const encoded = String(file?.content_base64 || '');
      if (!encoded) continue;
      const buffer = Buffer.from(encoded, 'base64');
      const targetName = `${Date.now()}_${originalName}`;
      const gcsPath = `workspace/cv/${targetName}`;
      await uploadFile(buffer, gcsPath, file?.type);
      saved.push(targetName);
    }

    const snap = await companyProfileDoc(session.tenantId).get();
    const profile: CompanyProfile = snap.exists ? snap.data() as CompanyProfile : defaultCompanyProfile();
    const currentCv = Array.isArray(profile.cv) ? profile.cv : [];
    profile.cv = Array.from(new Set([...currentCv, ...saved]));
    await companyProfileDoc(session.tenantId).set(profile);

    return NextResponse.json({ assistant_reply: 'CV aziendali caricati.', uploaded_files: saved, cv_files: profile.cv });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST cv error:', error);
    return NextResponse.json({ error: `Errore POST CV: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
