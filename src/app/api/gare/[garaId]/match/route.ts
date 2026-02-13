import { NextResponse } from 'next/server';
import { garaDoc, companyProfileDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, getChecklistItems } from '@/lib/gara-logic';
import { callOpenAI, extractResponseText, tryParseJson, getModel } from '@/lib/openai';
import type { CompanyProfile } from '@/lib/types';
import { defaultCompanyProfile } from '@/lib/gara-logic';

export interface MatchResult {
  requisito: string;
  item_index: number;
  match_status: 'coperto' | 'parziale' | 'non_coperto';
  confidence: number;
  evidence_source: string;
  evidence_text: string;
  gap_note: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  let step = 'init';
  try {
    step = 'auth';
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);

    // Load gara output
    step = 'load-gara';
    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const output = garaSnap.exists
      ? normalizeOutputJson(garaId, garaSnap.data())
      : normalizeOutputJson(garaId, defaultOutputForGara(garaId));

    const checklist = getChecklistItems(output);
    if (!checklist.length) {
      return NextResponse.json({ matches: [], message: 'Nessun requisito da matchare. Carica documenti di gara prima.' });
    }

    // Load company data
    step = 'load-company';
    const profileSnap = await companyProfileDoc(session.tenantId).get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile: any = profileSnap.exists ? profileSnap.data() : defaultCompanyProfile();
    const companyDocs = Array.isArray(profile.company_documents) ? profile.company_documents : [];

    // Collect all company evidence
    const companyEvidence = {
      profilo: profile.azienda || {},
      certificazioni: profile.certificazioni || [],
      referenze: profile.referenze || [],
      cv: profile.cv || [],
      documenti: companyDocs.map((d: { name: string; category: string; key_facts: string[] }) => ({
        name: d.name,
        category: d.category,
        key_facts: d.key_facts || [],
      })),
      all_key_facts: companyDocs.flatMap((d: { key_facts?: string[] }) => d.key_facts || []),
    };

    if (companyDocs.length === 0 && !profile.azienda?.nome) {
      return NextResponse.json({
        matches: checklist.map((item, i) => ({
          requisito: item.requisito,
          item_index: i,
          match_status: 'non_coperto' as const,
          confidence: 0,
          evidence_source: '',
          evidence_text: '',
          gap_note: 'Nessun documento aziendale caricato. Carica documenti nel Profilo Azienda.',
        })),
        message: 'Nessun documento aziendale. Carica documenti aziendali per abilitare il matching.',
      });
    }

    // Run AI matching
    step = 'ai-match';
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        matches: checklist.map((item, i) => ({
          requisito: item.requisito, item_index: i,
          match_status: 'non_coperto' as const, confidence: 0,
          evidence_source: '', evidence_text: '', gap_note: 'OPENAI_API_KEY non configurata.',
        })),
        message: 'Matching non disponibile senza API key.',
      });
    }

    const payload = await callOpenAI({
      model: getModel(), temperature: 0.1,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: `Sei un esperto di gare d'appalto. Devi matchare i requisiti di una gara con le evidenze aziendali disponibili.
Per ogni requisito, determina:
- match_status: "coperto" (evidenza chiara), "parziale" (evidenza parziale), "non_coperto" (nessuna evidenza)
- confidence: 0.0-1.0
- evidence_source: nome documento/sezione che fornisce l'evidenza
- evidence_text: frase specifica dall'evidenza aziendale che copre il requisito
- gap_note: cosa manca se non coperto o parziale

Rispondi SOLO JSON: {"matches":[{"item_index":0,"match_status":"coperto","confidence":0.9,"evidence_source":"...","evidence_text":"...","gap_note":""}]}` }] },
        { role: 'user', content: [{ type: 'input_text', text: `REQUISITI GARA (da matchare):
${JSON.stringify(checklist.map((item, i) => ({ item_index: i, requisito: item.requisito, tipo: item.tipo, fonte: item.fonte })), null, 2)}

EVIDENZE AZIENDALI DISPONIBILI:
${JSON.stringify(companyEvidence, null, 2)}` }] },
      ],
    });

    const text = extractResponseText(payload);
    const parsed = tryParseJson(text || '') as { matches?: Array<{
      item_index: number; match_status: string; confidence: number;
      evidence_source: string; evidence_text: string; gap_note: string;
    }> } | null;

    step = 'build-results';
    const aiMatches = Array.isArray(parsed?.matches) ? parsed!.matches : [];
    const matchMap = new Map(aiMatches.map((m) => [m.item_index, m]));

    const matches: MatchResult[] = checklist.map((item, i) => {
      const m = matchMap.get(i);
      return {
        requisito: item.requisito,
        item_index: i,
        match_status: (['coperto', 'parziale', 'non_coperto'].includes(m?.match_status || '') ? m!.match_status : 'non_coperto') as MatchResult['match_status'],
        confidence: Number.isFinite(m?.confidence) ? Math.max(0, Math.min(1, m!.confidence)) : 0,
        evidence_source: typeof m?.evidence_source === 'string' ? m.evidence_source : '',
        evidence_text: typeof m?.evidence_text === 'string' ? m.evidence_text : '',
        gap_note: typeof m?.gap_note === 'string' ? m.gap_note : '',
      };
    });

    const covered = matches.filter((m) => m.match_status === 'coperto').length;
    const partial = matches.filter((m) => m.match_status === 'parziale').length;
    const uncovered = matches.filter((m) => m.match_status === 'non_coperto').length;

    // Also update the checklist items with match results
    step = 'update-output';
    const updatedChecklist = checklist.map((item, i) => {
      const m = matchMap.get(i);
      if (!m) return item;
      return {
        ...item,
        stato: m.match_status === 'coperto' ? 'coperto_da_approvare'
          : m.match_status === 'parziale' ? 'parziale'
          : 'non_coperto',
        evidenza_proposta: m.evidence_text || item.evidenza_proposta,
        esito_copertura: m.match_status === 'coperto' ? 'ok_match_aziendale' : m.match_status === 'parziale' ? 'parziale_match' : 'non_coperto',
        gap_informativi: m.gap_note ? [m.gap_note] : [],
      };
    });

    const updatedOutput = normalizeOutputJson(garaId, {
      ...output,
      checklist_operativa: {
        ...output.checklist_operativa,
        items: updatedChecklist,
        ultimo_aggiornamento: new Date().toISOString(),
      },
    });
    await garaDoc(session.tenantId, garaId).set(updatedOutput);

    return NextResponse.json({
      matches,
      summary: { total: matches.length, covered, partial, uncovered },
      message: `Matching completato: ${covered} coperti, ${partial} parziali, ${uncovered} non coperti.`,
      output_json: updatedOutput,
    });
  } catch (error) {
    const msg = (error as Error).message || 'Errore sconosciuto';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error(`[match] Failed at step="${step}":`, error);
    return NextResponse.json({ error: `Errore matching (step: ${step}): ${msg}` }, { status: 500 });
  }
}
