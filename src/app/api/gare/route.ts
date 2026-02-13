import { NextResponse } from 'next/server';
import { garaCollection, garaDoc, conversationDoc, documentsDoc } from '@/lib/firestore';
import { defaultOutputForGara, normalizeOutputJson, sanitizeGaraId, sanitizeChecklistItems, applyChecklistToOutput, fallbackChecklistFromOutput } from '@/lib/gara-logic';
import { requireSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireSession();
    const snapshot = await garaCollection(session.tenantId).get();
    const items = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const garaId = doc.id;
        const convoSnap = await conversationDoc(session.tenantId, garaId).get();
        const docsSnap = await documentsDoc(session.tenantId, garaId).get();
        const conversation = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
        const documents = docsSnap.exists ? docsSnap.data()?.documents || [] : [];
        const checklistItems = Array.isArray(data?.checklist_operativa?.items) ? data.checklist_operativa.items.length : 0;
        return {
          garaId,
          updated_at: data?.overview_gara?.ultimo_aggiornamento || null,
          messages_count: conversation.length,
          documents_count: documents.length,
          checklist_items: checklistItems,
          schema_status: 'current',
        };
      })
    );
    items.sort((a, b) => {
      const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
      const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
      return tb - ta;
    });
    return NextResponse.json({ gare: items });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('GET /api/gare error:', error);
    return NextResponse.json({ error: String((error as Error).message || 'Errore nel recupero gare') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const rawId = body?.garaId || `gara-${Date.now()}`;
    const garaId = sanitizeGaraId(rawId);
    const output = normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const checklistItems = fallbackChecklistFromOutput(output);
    const finalOutput = applyChecklistToOutput(garaId, output, sanitizeChecklistItems(checklistItems, output));
    await garaDoc(session.tenantId, garaId).set(finalOutput);
    await conversationDoc(session.tenantId, garaId).set({ messages: [] });
    await documentsDoc(session.tenantId, garaId).set({ documents: [] });
    return NextResponse.json({ garaId, output: finalOutput });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST /api/gare error:', error);
    return NextResponse.json({ error: String((error as Error).message || 'Errore creazione gara') }, { status: 500 });
  }
}
