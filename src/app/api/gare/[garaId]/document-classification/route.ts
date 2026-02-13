import { NextResponse } from 'next/server';
import { documentsDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { sanitizeGaraId } from '@/lib/gara-logic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const snap = await documentsDoc(session.tenantId, garaId).get();
    const documents = snap.exists ? snap.data()?.documents || [] : [];
    return NextResponse.json({
      garaId,
      documents,
      pending: documents.filter((d: { confirmed: boolean }) => !d.confirmed).length,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('GET doc classification error:', error);
    return NextResponse.json({ error: `Errore classificazione documenti: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
