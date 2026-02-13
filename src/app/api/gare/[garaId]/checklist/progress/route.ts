import { NextResponse } from 'next/server';
import { garaDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, getChecklistItems, normalizeChecklistItem, applyChecklistToOutput } from '@/lib/gara-logic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const itemIndex = Number(body?.item_index);
    const progress = String(body?.progress || '').toLowerCase();
    if (!Number.isInteger(itemIndex) || itemIndex < 0) return NextResponse.json({ error: 'item_index non valido' }, { status: 400 });
    if (!['todo', 'wip', 'done'].includes(progress)) return NextResponse.json({ error: 'progress non valido' }, { status: 400 });

    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists ? normalizeOutputJson(garaId, garaSnap.data()) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const checklist = getChecklistItems(currentOutput);
    if (!checklist[itemIndex]) return NextResponse.json({ error: 'Requisito non trovato' }, { status: 404 });
    checklist[itemIndex] = normalizeChecklistItem({ ...checklist[itemIndex], progress });
    const nextOutput = applyChecklistToOutput(garaId, currentOutput, checklist);
    await garaDoc(session.tenantId, garaId).set(nextOutput);
    return NextResponse.json({ garaId, assistant_reply: 'Progresso requisito aggiornato.', output_json: nextOutput });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST checklist/progress error:', error);
    return NextResponse.json({ error: `Errore progresso checklist: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
