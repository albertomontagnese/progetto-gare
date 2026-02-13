import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc, documentsDoc, companyProfileDoc } from '@/lib/firestore';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, defaultCompanyProfile } from '@/lib/gara-logic';
import { callOpenAI, extractResponseText, tryParseJson, getModel } from '@/lib/openai';
import { requireSession } from '@/lib/session';
import type { ChatMessage, GaraOutput, GaraDocument, CompanyProfile } from '@/lib/types';

export async function POST(request: Request, { params }: { params: Promise<{ garaId: string }> }) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    if (!message) return NextResponse.json({ error: 'Messaggio mancante' }, { status: 400 });

    // Load all context
    const [garaSnap, convoSnap, docsSnap, profileSnap] = await Promise.all([
      garaDoc(session.tenantId, garaId).get(),
      conversationDoc(session.tenantId, garaId).get(),
      documentsDoc(session.tenantId, garaId).get(),
      companyProfileDoc(session.tenantId).get(),
    ]);

    const currentOutput: GaraOutput = garaSnap.exists
      ? normalizeOutputJson(garaId, garaSnap.data())
      : normalizeOutputJson(garaId, defaultOutputForGara(garaId));

    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    conversation.push({ role: 'user', text: message, created_at: new Date().toISOString() });

    const documents: GaraDocument[] = docsSnap.exists ? docsSnap.data()?.documents || [] : [];
    const companyProfile: CompanyProfile = profileSnap.exists ? profileSnap.data() as CompanyProfile : defaultCompanyProfile();

    // Build rich context-aware prompt
    const systemPrompt = buildContextAwareChatPrompt(garaId, currentOutput, documents, companyProfile);

    if (!process.env.OPENAI_API_KEY) {
      conversation.push({ role: 'assistant', text: 'OPENAI_API_KEY non configurata.', created_at: new Date().toISOString() });
      await conversationDoc(session.tenantId, garaId).set({ messages: conversation });
      return NextResponse.json({ assistant_reply: 'OPENAI_API_KEY non configurata.', output_json: currentOutput, conversation });
    }

    const payload = await callOpenAI({
      model: getModel(), temperature: 0.3,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: `Messaggio utente:\n${message}\n\nStorico conversazione (ultimi messaggi):\n${JSON.stringify(conversation.slice(-12), null, 2)}` }] },
      ],
    });

    const text = extractResponseText(payload);

    // Try to parse as JSON with output update, otherwise treat as plain text reply
    const parsed = tryParseJson(text || '') as { assistant_reply?: string; output_json?: GaraOutput } | null;

    let assistant_reply: string;
    let output_json: GaraOutput;

    if (parsed?.assistant_reply && parsed?.output_json) {
      assistant_reply = parsed.assistant_reply;
      output_json = normalizeOutputJson(garaId, parsed.output_json);
    } else {
      // Plain text response — don't modify the output
      assistant_reply = text || 'Nessuna risposta.';
      output_json = currentOutput;
    }

    await garaDoc(session.tenantId, garaId).set(output_json);
    conversation.push({ role: 'assistant', text: assistant_reply, created_at: new Date().toISOString() });
    await conversationDoc(session.tenantId, garaId).set({ messages: conversation });

    return NextResponse.json({ assistant_reply, output_json, conversation });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('Chat error:', error);
    return NextResponse.json({ error: `Errore chat: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}

function buildContextAwareChatPrompt(
  garaId: string,
  output: GaraOutput,
  documents: GaraDocument[],
  companyProfile: CompanyProfile,
): string {
  const docList = documents.map((d) =>
    `- ${d.name} (${d.category}, ${d.confirmed ? 'confermato' : 'da confermare'})`
  ).join('\n') || 'Nessun documento caricato.';

  const requisiti = output.checklist_operativa?.items?.map((item, i) =>
    `${i + 1}. [${item.progress}] ${item.requisito} — stato: ${item.stato}, fonte: ${item.fonte}`
  ).join('\n') || 'Nessun requisito estratto.';

  const reqAmm = output.requisiti_ammissione;
  const reqVal = output.requisiti_valutativi;
  const reqAmmStr = Object.entries(reqAmm || {}).map(([k, v]) =>
    Array.isArray(v) && v.length > 0 ? `  ${k}: ${v.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join('; ')}` : ''
  ).filter(Boolean).join('\n') || '  Nessuno estratto.';
  const reqValStr = Object.entries(reqVal || {}).map(([k, v]) =>
    Array.isArray(v) && v.length > 0 ? `  ${k}: ${v.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join('; ')}` : ''
  ).filter(Boolean).join('\n') || '  Nessuno estratto.';

  const anagrafica = output.anagrafica_gara;
  const timeline = output.timeline;

  const companyDocs = (companyProfile.company_documents || []).map((d) =>
    `- ${d.name} (${d.category}): ${(d.key_facts || []).slice(0, 3).join('; ')}`
  ).join('\n') || 'Nessun documento aziendale.';

  return `Sei un assistente esperto di gare d'appalto italiane. Stai lavorando sulla gara "${garaId}".

CONTESTO GARA:
- Stazione appaltante: ${anagrafica?.stazione_appaltante || 'non specificata'}
- CIG: ${anagrafica?.cig || 'n/d'}, CUP: ${anagrafica?.cup || 'n/d'}
- Base d'asta: ${anagrafica?.base_asta || 'n/d'}
- Procedura: ${anagrafica?.procedura || 'n/d'}
- Criterio: ${anagrafica?.criterio_aggiudicazione || 'n/d'}
- Scadenza offerta: ${timeline?.scadenza_offerta || 'n/d'}
- Stato: ${output.overview_gara?.stato || 'iniziale'}

DOCUMENTI CARICATI:
${docList}

REQUISITI DI AMMISSIONE (estratti dal bando):
${reqAmmStr}

REQUISITI VALUTATIVI (criteri di aggiudicazione):
${reqValStr}

CHECKLIST REQUISITI (${output.checklist_operativa?.items?.length || 0} items):
${requisiti}

PROFILO AZIENDA:
- Nome: ${companyProfile.azienda?.nome || 'non compilato'}
- Settore: ${companyProfile.azienda?.settore || 'n/d'}
- Fatturato: ${companyProfile.azienda?.fatturato || 'n/d'}
- Certificazioni: ${(companyProfile.certificazioni || []).join(', ') || 'nessuna'}

DOCUMENTI AZIENDALI:
${companyDocs}

ISTRUZIONI:
- Rispondi in italiano, in modo operativo e concreto.
- Se l'utente chiede dei requisiti, elencali in modo chiaro basandoti sui dati sopra.
- Se l'utente chiede di aggiornare i dati strutturati, rispondi con JSON:
  {"assistant_reply":"...", "output_json": { ...JSON aggiornato... }}
- Se l'utente fa domande informative (quali requisiti, cosa dice il bando, ecc.), rispondi in testo naturale SENZA JSON.
- Cita sempre le fonti quando possibile (documento, sezione, pagina).
- Sii proattivo: segnala criticità, scadenze vicine, requisiti mancanti.`;
}
