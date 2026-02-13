import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, buildGuidedQuestionsWithLLM } from '@/lib/gara-logic';
import type { ChatMessage } from '@/lib/types';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const output = garaSnap.exists ? normalizeOutputJson(garaId, garaSnap.data()) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const convoSnap = await conversationDoc(session.tenantId, garaId).get();
    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    const questions = await buildGuidedQuestionsWithLLM({ garaId, outputJson: output, conversation });
    const assistantReply = questions.length ? `Ho generato ${questions.length} domande guidate sui requisiti non coperti.` : 'Non ci sono requisiti non coperti da completare.';
    return NextResponse.json({ garaId, assistant_reply: assistantReply, questions });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST qa/generate error:', error);
    return NextResponse.json({ error: `Errore generazione domande: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
