import { NextResponse } from 'next/server';
import { garaDoc } from '@/lib/firestore';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, normalizeChecklistItem, applyChecklistToOutput, getChecklistItems } from '@/lib/gara-logic';
import { requireSession } from '@/lib/session';

/**
 * Edit checklist: add, update, or delete individual requisiti.
 * POST body: { action: 'add' | 'update' | 'delete', item_index?: number, item?: Partial<ChecklistItem> }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim();

    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists
      ? normalizeOutputJson(garaId, garaSnap.data())
      : normalizeOutputJson(garaId, defaultOutputForGara(garaId));

    const checklist = getChecklistItems(currentOutput);

    if (action === 'add') {
      const newItem = normalizeChecklistItem({
        requisito: String(body?.item?.requisito || 'Nuovo requisito'),
        fonte: String(body?.item?.fonte || 'Aggiunto manualmente'),
        tipo: String(body?.item?.tipo || 'obbligatorio'),
        owner_proposta: String(body?.item?.owner_proposta || 'ufficio_gare'),
        stato: 'non_coperto',
        evidenza_proposta: '',
        progress: 'todo',
      });
      checklist.push(newItem);
    } else if (action === 'update') {
      const idx = Number(body?.item_index);
      if (!Number.isInteger(idx) || idx < 0 || idx >= checklist.length) {
        return NextResponse.json({ error: 'item_index non valido' }, { status: 400 });
      }
      const updates = body?.item || {};
      checklist[idx] = normalizeChecklistItem({ ...checklist[idx], ...updates });
    } else if (action === 'delete') {
      const idx = Number(body?.item_index);
      if (!Number.isInteger(idx) || idx < 0 || idx >= checklist.length) {
        return NextResponse.json({ error: 'item_index non valido' }, { status: 400 });
      }
      checklist.splice(idx, 1);
    } else {
      return NextResponse.json({ error: 'action deve essere add, update, o delete' }, { status: 400 });
    }

    const nextOutput = applyChecklistToOutput(garaId, currentOutput, checklist);
    await garaDoc(session.tenantId, garaId).set(nextOutput);

    return NextResponse.json({ ok: true, output_json: nextOutput });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    return NextResponse.json({ error: `Errore edit checklist: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
