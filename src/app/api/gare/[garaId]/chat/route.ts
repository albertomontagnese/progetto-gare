import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc } from '@/lib/firestore';
import { normalizeOutputJson, defaultOutputForGara, runChatAndOutputUpdate, sanitizeGaraId } from '@/lib/gara-logic';
import { requireSession } from '@/lib/session';
import type { ChatMessage } from '@/lib/types';

export async function POST(request: Request, { params }: { params: Promise<{ garaId: string }> }) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    if (!message) return NextResponse.json({ error: 'Messaggio mancante' }, { status: 400 });

    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists ? normalizeOutputJson(garaId, garaSnap.data()) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const convoSnap = await conversationDoc(session.tenantId, garaId).get();
    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    conversation.push({ role: 'user', text: message, created_at: new Date().toISOString() });

    const llmResult = await runChatAndOutputUpdate({ garaId, message, currentOutput, conversation });
    await garaDoc(session.tenantId, garaId).set(llmResult.output_json);
    conversation.push({ role: 'assistant', text: llmResult.assistant_reply, created_at: new Date().toISOString() });
    await conversationDoc(session.tenantId, garaId).set({ messages: conversation });

    return NextResponse.json({ assistant_reply: llmResult.assistant_reply, output_json: llmResult.output_json, conversation });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('Chat error:', error);
    return NextResponse.json({ error: `Errore chat: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
