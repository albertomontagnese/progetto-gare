import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc, companyProfileDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import {
  normalizeOutputJson, defaultOutputForGara, sanitizeGaraId,
  getChecklistItems, applyGuidedAnswerToOutput, buildAutoAnswerForRequirement, defaultCompanyProfile,
} from '@/lib/gara-logic';
import type { ChatMessage, CompanyProfile } from '@/lib/types';

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
    if (!Number.isInteger(itemIndex) || itemIndex < 0) return NextResponse.json({ error: 'item_index non valido' }, { status: 400 });

    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists ? normalizeOutputJson(garaId, garaSnap.data()) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const checklist = getChecklistItems(currentOutput);
    const item = checklist[itemIndex];
    if (!item) return NextResponse.json({ error: 'Requisito non trovato' }, { status: 404 });

    const question = {
      id: `qa_auto_${itemIndex}`, item_index: itemIndex,
      requisito: item.requisito || `Requisito ${itemIndex + 1}`,
      domanda: `Proponi una bozza di copertura per: ${item.requisito || `Requisito ${itemIndex + 1}`}`,
      suggerimento_ai: '', owner_proposta: item.owner_proposta || 'ufficio_gare',
    };

    const convoSnap = await conversationDoc(session.tenantId, garaId).get();
    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    const profileSnap = await companyProfileDoc(session.tenantId).get();
    const companyProfile: CompanyProfile = profileSnap.exists ? profileSnap.data() as CompanyProfile : defaultCompanyProfile();

    const autoResult = await buildAutoAnswerForRequirement({ garaId, outputJson: currentOutput, question, conversation, companyProfile });
    const nextOutput = applyGuidedAnswerToOutput({
      garaId, outputJson: currentOutput, question, answer: autoResult.answer,
      meta: { source: 'auto', sufficienza_dati: autoResult.sufficienza_dati, gap_informativi: autoResult.gap_informativi },
    });
    await garaDoc(session.tenantId, garaId).set(nextOutput);

    conversation.push({ role: 'assistant', text: `[Q/A auto] ${question.requisito}\nBozza proposta: ${autoResult.answer}`, created_at: new Date().toISOString() });
    await conversationDoc(session.tenantId, garaId).set({ messages: conversation });

    return NextResponse.json({
      garaId, assistant_reply: autoResult.sufficienza_dati === 'insufficienti' ? 'Bozza generata, ma dati aziendali insufficienti.' : 'Bozza automatica generata.',
      output_json: nextOutput, conversation, question, answer: autoResult.answer,
      sufficienza_dati: autoResult.sufficienza_dati, gap_informativi: autoResult.gap_informativi,
    });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST qa/autofill error:', error);
    return NextResponse.json({ error: `Errore autofill QA: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
