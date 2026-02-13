import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, applyGuidedAnswerToOutput } from '@/lib/gara-logic';
import type { ChatMessage } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const question = body?.question && typeof body.question === 'object' ? body.question : {};
    const answer = String(body?.answer || '').trim();
    if (!answer) return NextResponse.json({ error: 'Risposta mancante' }, { status: 400 });

    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists ? normalizeOutputJson(garaId, garaSnap.data()) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const nextOutput = applyGuidedAnswerToOutput({
      garaId, outputJson: currentOutput, question, answer,
      meta: { source: 'manuale', sufficienza_dati: 'sufficienti', gap_informativi: [] },
    });
    await garaDoc(session.tenantId, garaId).set(nextOutput);

    const convoSnap = await conversationDoc(session.tenantId, garaId).get();
    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    conversation.push({ role: 'user', text: `[Q/A guidata] ${question?.domanda || question?.requisito || 'Domanda QA'}\nRisposta: ${answer}`, created_at: new Date().toISOString() });
    conversation.push({ role: 'assistant', text: 'Risposta ricevuta. Ho aggiornato checklist operativa e sezione QA.', created_at: new Date().toISOString() });
    await conversationDoc(session.tenantId, garaId).set({ messages: conversation });

    return NextResponse.json({ garaId, assistant_reply: 'Risposta registrata e checklist aggiornata.', output_json: nextOutput, conversation });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST qa/answer error:', error);
    return NextResponse.json({ error: `Errore risposta QA: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
