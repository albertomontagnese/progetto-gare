import { NextResponse } from 'next/server';
import { conversationDoc } from '@/lib/firestore';
import { sanitizeGaraId } from '@/lib/gara-logic';
import { requireSession } from '@/lib/session';

export async function GET(_request: Request, { params }: { params: Promise<{ garaId: string }> }) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const snap = await conversationDoc(session.tenantId, garaId).get();
    const conversation = snap.exists ? snap.data()?.messages || [] : [];
    return NextResponse.json({ garaId, conversation });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    return NextResponse.json({ error: `Errore conversazione: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
