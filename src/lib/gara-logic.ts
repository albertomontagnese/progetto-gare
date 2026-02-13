import type {
  GaraOutput,
  ChecklistItem,
  CompanyProfile,
  GaraDocument,
  GuidedQuestion,
  DocumentCategory,
  RenderModelSection,
  ChatMessage,
} from './types';
import { DOCUMENT_CATEGORIES } from './types';
import { callOpenAI, extractResponseText, tryParseJson, getModel } from './openai';

/* ───────── Constants ───────── */

const REQUIRED_BASELINE_SECTIONS = [
  'overview_gara',
  'anagrafica_gara',
  'timeline',
  'documenti',
  'checklist_operativa',
];

/* ───────── Default Factories ───────── */

export function defaultOutputForGara(garaId: string): GaraOutput {
  return {
    overview_gara: { gara_id: garaId, stato: 'iniziale', ultimo_aggiornamento: new Date().toISOString(), summary: [] },
    anagrafica_gara: { gara_id: garaId, cig: '', cup: '', stazione_appaltante: '', procedura: '', criterio_aggiudicazione: '', base_asta: '', oneri_sicurezza: '', stato: 'iniziale', ultimo_aggiornamento: new Date().toISOString() },
    timeline: { data_pubblicazione: '', termine_quesiti: '', sopralluogo: '', scadenza_offerta: '', prima_seduta: '', chiarimenti: [] },
    documenti: { elenco: [], revisioni: [], mancanti: [] },
    requisiti_ammissione: { economico_finanziari: [], tecnico_professionali: [], certificazioni: [], soglie_minime: [] },
    requisiti_valutativi: { criteri: [], sottocriteri: [], soglie_sbarramento: [] },
    checklist_compliance: { totale_item: 0, completati: 0, mancanti: 0, dettagli: [] },
    team_cv: { ruoli_obbligatori: [], cv_associati: [], gap: [] },
    rti_subappalto: { previsto: '', quote: [], limiti: [], dichiarazioni: [], note: [] },
    economica: { formula_punteggio_prezzo: '', ribasso_massimo: '', costi_non_ribassabili: '', vincoli: [] },
    rischi_red_flags: { elenco: [], gravita: [], azioni_mitigazione: [] },
    qa: { quesiti_aperti: [], risposte_ufficiali: [], impatti: [] },
    azioni_operative: { task: [] },
    output_finale: { sezioni_offerta: [], allegati_pronti: [], gap_residui: [], stato_prontezza: '' },
    checklist_operativa: { formato: 'requisito_fonte_tipo_owner_stato_evidenza', items: [], ultimo_aggiornamento: '' },
  };
}

export function defaultCompanyProfile(): CompanyProfile {
  return {
    azienda: { nome: '', descrizione: '', fatturato: '', settore: '' },
    certificazioni: [],
    referenze: [],
    cv: [],
    procedure: [],
    evidenze: [],
  };
}

/* ───────── Normalization ───────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function merge(templateNode: any, sourceNode: any): any {
  if (Array.isArray(templateNode)) return Array.isArray(sourceNode) ? sourceNode : [];
  if (templateNode && typeof templateNode === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: Record<string, any> = {};
    const src = sourceNode && typeof sourceNode === 'object' ? sourceNode : {};
    for (const key of Object.keys(templateNode)) {
      out[key] = merge(templateNode[key], src[key]);
    }
    for (const [k, v] of Object.entries(src)) {
      if (!(k in out)) out[k] = v;
    }
    return out;
  }
  return sourceNode === undefined || sourceNode === null ? templateNode : sourceNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOutputJson(garaId: string, candidate: any): GaraOutput {
  const template = defaultOutputForGara(garaId);
  const source = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {};
  const merged = merge(template, source);
  merged.overview_gara = {
    ...(merged.overview_gara || {}),
    gara_id: merged.overview_gara?.gara_id || garaId,
    stato: merged.overview_gara?.stato || 'iniziale',
    ultimo_aggiornamento: new Date().toISOString(),
    summary: Array.isArray(merged.overview_gara?.summary)
      ? merged.overview_gara.summary
      : merged.overview_gara?.summary ? [String(merged.overview_gara.summary)] : [],
  };
  return merged as GaraOutput;
}

/* ───────── Checklist helpers ───────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeChecklistItem(item: any = {}): ChecklistItem {
  const progressRaw = String(item.progress || item.progresso || '').toLowerCase();
  const progress = (['todo', 'wip', 'done'] as const).includes(progressRaw as 'todo' | 'wip' | 'done')
    ? (progressRaw as 'todo' | 'wip' | 'done')
    : 'todo';
  return {
    requisito: typeof item.requisito === 'string' ? item.requisito : '',
    fonte: typeof item.fonte === 'string' ? item.fonte : '',
    tipo: typeof item.tipo === 'string' ? item.tipo : '',
    owner_proposta: typeof item.owner_proposta === 'string' ? item.owner_proposta : '',
    stato: typeof item.stato === 'string' ? item.stato : '',
    evidenza_proposta: typeof item.evidenza_proposta === 'string' ? item.evidenza_proposta : '',
    allegati: Array.isArray(item.allegati) ? item.allegati.map((a: unknown) => String(a || '')) : [],
    progress,
    esito_copertura: typeof item.esito_copertura === 'string' ? item.esito_copertura : '',
    gap_informativi: Array.isArray(item.gap_informativi) ? item.gap_informativi.map((g: unknown) => String(g || '')) : [],
  };
}

function canonicalRequirementKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function collectKnownRequirementsFromOutput(outputJson: GaraOutput) {
  const out = outputJson && typeof outputJson === 'object' ? outputJson : ({} as GaraOutput);
  const rows: Array<{ requisito: string; fonte: string; tipo: string }> = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function pushRows(values: any[], source: string, tipo = 'obbligatorio') {
    if (!Array.isArray(values)) return;
    for (const entry of values) {
      if (typeof entry === 'string' && entry.trim()) {
        rows.push({ requisito: entry.trim(), fonte: source, tipo });
      } else if (entry && typeof entry === 'object') {
        for (const [k, v] of Object.entries(entry)) {
          const text = typeof v === 'string' ? v : `${k}: ${JSON.stringify(v)}`;
          if (text.trim()) rows.push({ requisito: text.trim(), fonte: source, tipo });
        }
      }
    }
  }

  pushRows(out?.requisiti_ammissione?.economico_finanziari as unknown[], 'requisiti_ammissione.economico_finanziari', 'obbligatorio');
  pushRows(out?.requisiti_ammissione?.tecnico_professionali as unknown[], 'requisiti_ammissione.tecnico_professionali', 'obbligatorio');
  pushRows(out?.requisiti_ammissione?.certificazioni as unknown[], 'requisiti_ammissione.certificazioni', 'obbligatorio');
  pushRows(out?.requisiti_ammissione?.soglie_minime as unknown[], 'requisiti_ammissione.soglie_minime', 'obbligatorio');
  pushRows(out?.requisiti_valutativi?.criteri as unknown[], 'requisiti_valutativi.criteri', 'valutativo');
  pushRows(out?.requisiti_valutativi?.sottocriteri as unknown[], 'requisiti_valutativi.sottocriteri', 'valutativo');
  pushRows(out?.requisiti_valutativi?.soglie_sbarramento as unknown[], 'requisiti_valutativi.soglie_sbarramento', 'valutativo');
  return rows;
}

export function sanitizeChecklistItems(items: ChecklistItem[], outputJson: GaraOutput): ChecklistItem[] {
  const raw = Array.isArray(items) ? items.map(normalizeChecklistItem) : [];
  const knownRequirements = collectKnownRequirementsFromOutput(outputJson);
  const knownMap = new Map<string, { requisito: string; fonte: string; tipo: string }>();
  for (const row of knownRequirements) {
    const key = canonicalRequirementKey(row.requisito);
    if (!key || knownMap.has(key)) continue;
    knownMap.set(key, row);
  }

  const bannedPatterns = [/messaggio utente/i, /bozza/i, /todo/i, /task/i, /^verifica contenuti documento/i];
  const out: ChecklistItem[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const req = String(item.requisito || '').trim();
    if (!req) continue;
    if (bannedPatterns.some((p) => p.test(req))) continue;
    const key = canonicalRequirementKey(req);
    if (!key || seen.has(key)) continue;
    if (knownMap.size > 0 && !knownMap.has(key)) continue;
    const known = knownMap.get(key);
    out.push(normalizeChecklistItem({
      ...item,
      fonte: item.fonte || known?.fonte || 'Fonte da confermare',
      tipo: item.tipo || known?.tipo || 'obbligatorio',
      owner_proposta: item.owner_proposta || 'ufficio_gare',
      stato: item.stato || 'non_coperto',
    }));
    seen.add(key);
  }

  for (const [key, req] of knownMap.entries()) {
    if (seen.has(key)) continue;
    out.push(normalizeChecklistItem({
      requisito: req.requisito,
      fonte: req.fonte || 'Fonte da confermare',
      tipo: req.tipo || 'obbligatorio',
      owner_proposta: 'ufficio_gare',
      stato: 'non_coperto',
      evidenza_proposta: '',
    }));
  }
  return out;
}

export function getChecklistItems(outputJson: GaraOutput): ChecklistItem[] {
  if (!outputJson || typeof outputJson !== 'object') return [];
  return Array.isArray(outputJson?.checklist_operativa?.items)
    ? outputJson.checklist_operativa.items.map(normalizeChecklistItem)
    : [];
}

export function applyChecklistToOutput(garaId: string, outputJson: GaraOutput, checklistItems: ChecklistItem[]): GaraOutput {
  const base = normalizeOutputJson(garaId, outputJson);
  const items = Array.isArray(checklistItems) ? checklistItems.map(normalizeChecklistItem) : [];
  return normalizeOutputJson(garaId, {
    ...base,
    checklist_operativa: {
      ...(base.checklist_operativa || {}),
      formato: 'requisito_fonte_tipo_owner_stato_evidenza',
      items,
      ultimo_aggiornamento: new Date().toISOString(),
    },
  });
}

export function fallbackChecklistFromOutput(outputJson: GaraOutput, documents: GaraDocument[] = []): ChecklistItem[] {
  const out = outputJson && typeof outputJson === 'object' ? outputJson : ({} as GaraOutput);
  const known = collectKnownRequirementsFromOutput(out);
  if (known.length) {
    return sanitizeChecklistItems(known.map((k) => normalizeChecklistItem({
      requisito: k.requisito, fonte: k.fonte, tipo: k.tipo,
      owner_proposta: 'ufficio_gare', stato: 'non_coperto', evidenza_proposta: '',
    })), out);
  }
  const docsFromOutput = Array.isArray(out?.documenti?.elenco) ? out.documenti.elenco : [];
  const docsFromInput = Array.isArray(documents) ? documents : [];
  const docs = docsFromOutput.length ? docsFromOutput : docsFromInput;
  const rows = docs.slice(0, 12).map((doc) => normalizeChecklistItem({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requisito: `Verifica contenuti documento: ${(doc as any).nome || (doc as any).name || (doc as any).filename || 'documento'}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fonte: `${(doc as any).nome || (doc as any).name || (doc as any).filename || 'documento'} (pagina da confermare)`,
    tipo: 'obbligatorio', owner_proposta: 'ufficio_gare', stato: 'non coperto', evidenza_proposta: '',
  }));
  if (rows.length) return rows;
  return [normalizeChecklistItem({
    requisito: 'Verifica requisiti principali della gara',
    fonte: 'Documentazione di gara',
    tipo: 'obbligatorio', owner_proposta: 'ufficio_gare', stato: 'non coperto', evidenza_proposta: '',
  })];
}

/* ───────── Evidence helpers ───────── */

export function buildEvidenceWithAttachmentNames(answerText: string, attachments: string[]): string {
  const text = String(answerText || '').trim();
  const files = Array.isArray(attachments) ? attachments.map((f) => String(f || '').trim()).filter(Boolean) : [];
  if (!files.length) return text;
  const line = `Allegati: ${files.join(', ')}`;
  if (text.includes(line)) return text;
  if (!text) return line;
  return `${text}\n${line}`;
}

/* ───────── Q/A ───────── */

function buildFallbackGuidedQuestions(outputJson: GaraOutput): GuidedQuestion[] {
  const checklist = getChecklistItems(outputJson);
  const unresolved = checklist
    .map((item, index) => ({ ...item, item_index: index }))
    .filter((item) => {
      const stato = String(item.stato || '').toLowerCase();
      return !stato || stato === 'non coperto' || stato === 'non_coperto';
    })
    .slice(0, 6);
  return unresolved.map((item, idx) => ({
    id: `qa_${idx + 1}`,
    item_index: item.item_index,
    requisito: item.requisito || `Requisito ${idx + 1}`,
    domanda: `Fornisci i dettagli per coprire questo requisito: ${item.requisito || `Requisito ${idx + 1}`}`,
    suggerimento_ai: 'Inserisci una risposta sintetica con dati, metodo, risorse e tempi.',
    owner_proposta: item.owner_proposta || 'ufficio_gare',
  }));
}

export async function buildGuidedQuestionsWithLLM(p: {
  garaId: string; outputJson: GaraOutput; conversation: ChatMessage[];
}): Promise<GuidedQuestion[]> {
  const { garaId, outputJson, conversation } = p;
  if (!process.env.OPENAI_API_KEY) return buildFallbackGuidedQuestions(outputJson);
  const checklist = getChecklistItems(outputJson);
  const unresolved = checklist
    .map((item, index) => ({ ...item, item_index: index }))
    .filter((item) => { const s = String(item.stato || '').toLowerCase(); return !s || s === 'non coperto' || s === 'non_coperto'; })
    .slice(0, 12);
  if (!unresolved.length) return [];

  const prompt = [
    'Genera domande guidate per completare una checklist di gara.',
    'Rispondi SOLO con JSON valido nel formato:',
    '{"questions":[{"id":"qa_1","item_index":0,"requisito":"...","domanda":"...","suggerimento_ai":"...","owner_proposta":"..."}]}',
    'Regole: - Usa solo item ricevuti in input. - Crea al massimo UNA domanda per ciascun item_index. - Crea max 6 domande.',
    '- domanda deve essere operativa e mirata. - suggerimento_ai deve proporre una bozza breve (2-3 frasi).',
  ].join('\n');

  const payload = await callOpenAI({
    model: getModel(), temperature: 0.2,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: prompt }] },
      { role: 'user', content: [{ type: 'input_text', text: `Gara ID: ${garaId}\nChecklist non coperta:\n${JSON.stringify(unresolved, null, 2)}\n\nConversazione recente:\n${JSON.stringify((conversation || []).slice(-10), null, 2)}` }] },
    ],
  });

  const text = extractResponseText(payload);
  const parsed = tryParseJson(text || '') as { questions?: unknown[] } | null;
  if (!parsed || !Array.isArray(parsed.questions)) return buildFallbackGuidedQuestions(outputJson);

  const uniqueByIndex = new Map<number, GuidedQuestion>();
  for (const q of parsed.questions) {
    if (!q || typeof q !== 'object') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qObj = q as any;
    const idx = Number.isInteger(qObj.item_index) ? qObj.item_index : null;
    if (idx === null || uniqueByIndex.has(idx)) continue;
    uniqueByIndex.set(idx, qObj);
  }
  return Array.from(uniqueByIndex.values()).map((q, idx) => ({
    id: typeof q.id === 'string' && q.id.trim() ? q.id.trim() : `qa_${idx + 1}`,
    item_index: Number.isInteger(q.item_index) ? q.item_index : idx,
    requisito: typeof q.requisito === 'string' ? q.requisito : '',
    domanda: typeof q.domanda === 'string' ? q.domanda : '',
    suggerimento_ai: typeof q.suggerimento_ai === 'string' ? q.suggerimento_ai : '',
    owner_proposta: typeof q.owner_proposta === 'string' ? q.owner_proposta : 'ufficio_gare',
  })).filter((q) => q.domanda);
}

export function applyGuidedAnswerToOutput(p: {
  garaId: string; outputJson: GaraOutput; question: GuidedQuestion;
  answer: string; meta: { source: string; sufficienza_dati: string; gap_informativi: string[]; attachments?: string[] };
}): GaraOutput {
  const { garaId, outputJson, question, answer, meta } = p;
  const base = normalizeOutputJson(garaId, outputJson);
  const checklist = getChecklistItems(base);
  const idx = Number(question?.item_index);
  const answerText = String(answer || '').trim();
  const isInsufficient = String(meta?.sufficienza_dati || 'sufficienti').toLowerCase() === 'insufficienti';
  const source = String(meta?.source || 'manuale');
  const gapInformativi = Array.isArray(meta?.gap_informativi) ? meta.gap_informativi.map((g) => String(g || '')) : [];
  const attachments = Array.isArray(meta?.attachments) ? meta.attachments.filter(Boolean) : [];

  if (Number.isInteger(idx) && idx >= 0 && idx < checklist.length && answerText) {
    const prev = normalizeChecklistItem(checklist[idx]);
    const mergedAttachments = Array.from(new Set([...(prev.allegati || []), ...attachments]));
    const answerWithAttachments = buildEvidenceWithAttachmentNames(answerText, mergedAttachments);
    checklist[idx] = normalizeChecklistItem({
      ...prev,
      stato: isInsufficient ? 'non_coperto' : 'coperto_da_approvare',
      evidenza_proposta: answerWithAttachments,
      allegati: mergedAttachments,
      esito_copertura: isInsufficient ? 'insufficiente_dati_azienda' : `ok_${source}`,
      gap_informativi: isInsufficient ? gapInformativi : [],
    });
  }
  const qaBlock = base.qa && typeof base.qa === 'object' ? base.qa : { quesiti_aperti: [], risposte_ufficiali: [], impatti: [] };
  const risposte = Array.isArray(qaBlock.risposte_ufficiali) ? qaBlock.risposte_ufficiali : [];
  const quesiti = Array.isArray(qaBlock.quesiti_aperti) ? qaBlock.quesiti_aperti : [];
  const requisito = String(question?.requisito || '').trim();
  const domanda = String(question?.domanda || '').trim();
  const nextQa = {
    ...qaBlock,
    quesiti_aperti: quesiti.filter((q) => String(q || '').trim() !== requisito),
    risposte_ufficiali: answerText ? [...risposte, `${domanda || requisito}: ${answerText}`] : risposte,
  };
  const withChecklist = applyChecklistToOutput(garaId, base, checklist);
  return normalizeOutputJson(garaId, { ...withChecklist, qa: nextQa });
}

/* ───────── Auto-answer ───────── */

function hasUsefulCompanyData(profile: CompanyProfile | null): boolean {
  if (!profile || typeof profile !== 'object') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number' || typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.some(walk);
    if (typeof value === 'object') return Object.values(value).some(walk);
    return false;
  };
  return walk(profile);
}

export async function buildAutoAnswerForRequirement(p: {
  garaId: string; outputJson: GaraOutput; question: GuidedQuestion;
  conversation: ChatMessage[]; companyProfile: CompanyProfile | null;
}): Promise<{ answer: string; sufficienza_dati: string; gap_informativi: string[] }> {
  const { garaId, outputJson, question, conversation, companyProfile } = p;
  const requisito = String(question?.requisito || '').trim() || 'Requisito';
  const domanda = String(question?.domanda || '').trim() || `Come coprire: ${requisito}`;
  const idx = Number(question?.item_index);
  const hasCompany = hasUsefulCompanyData(companyProfile);

  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: `Bozza preliminare: copertura del requisito "${requisito}" da validare internamente con evidenze documentali.`,
      sufficienza_dati: hasCompany ? 'sufficienti' : 'insufficienti',
      gap_informativi: hasCompany ? [] : ['Profilo aziendale non compilato o incompleto'],
    };
  }

  const payload = await callOpenAI({
    model: getModel(), temperature: 0.2,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: [
        'Sei un assistente ufficio gare.',
        'Genera una risposta BOZZA per coprire un requisito checklist.',
        'Usa prioritariamente le INFORMAZIONI AZIENDALI ricevute.',
        'Rispondi SOLO in JSON valido:',
        '{"answer":"...","sufficienza_dati":"sufficienti|insufficienti","gap_informativi":["..."]}',
      ].join('\n') }] },
      { role: 'user', content: [{ type: 'input_text', text: `Gara ID: ${garaId}\nItem index: ${Number.isFinite(idx) ? idx : 'n/d'}\nRequisito: ${requisito}\nDomanda: ${domanda}\n\nInformazioni aziendali:\n${JSON.stringify(companyProfile || {}, null, 2)}\n\nJSON gara:\n${JSON.stringify(outputJson || {}, null, 2)}\n\nConversazione recente:\n${JSON.stringify((conversation || []).slice(-8), null, 2)}` }] },
    ],
  });
  const text = extractResponseText(payload) || '';
  const parsed = tryParseJson(text) as { answer?: string; sufficienza_dati?: string; gap_informativi?: string[] } | null;
  if (!parsed) return { answer: text.trim() || `Bozza non disponibile per "${requisito}".`, sufficienza_dati: hasCompany ? 'sufficienti' : 'insufficienti', gap_informativi: hasCompany ? [] : ['Informazioni aziendali insufficienti'] };
  return {
    answer: String(parsed.answer || '').trim() || `Bozza non disponibile per "${requisito}".`,
    sufficienza_dati: String(parsed.sufficienza_dati || '').toLowerCase() === 'insufficienti' ? 'insufficienti' : 'sufficienti',
    gap_informativi: Array.isArray(parsed.gap_informativi) ? parsed.gap_informativi.map((g) => String(g || '')) : [],
  };
}

/* ───────── LLM Checklist builder ───────── */

export async function buildChecklistWithLLM(p: {
  garaId: string; outputJson: GaraOutput; documents: GaraDocument[]; conversation: ChatMessage[];
}): Promise<ChecklistItem[]> {
  const { garaId, outputJson, documents, conversation } = p;
  if (!process.env.OPENAI_API_KEY) return fallbackChecklistFromOutput(outputJson, documents);
  const prompt = [
    'Genera checklist operativa gara in JSON.',
    'Formato uscita OBBLIGATORIO: {"items":[...]}',
    'Obiettivo: includere TUTTI e SOLI i requisiti di gara (niente task operativi generici).',
    'Ogni item deve avere esattamente questi campi:',
    '- requisito',
    '- fonte (documento + pagina/paragrafo, se disponibile)',
    '- tipo (obbligatorio|valutativo|allegato|formato)',
    '- owner_proposta',
    '- stato (fatto_automaticamente|non_coperto|coperto_da_approvare|approvato)',
    '- evidenza_proposta',
    'Regole:',
    '- Non inventare requisiti non presenti nei documenti o nel JSON.',
    '- Non omettere requisiti presenti in requisiti_ammissione e requisiti_valutativi.',
    '- Escludi voci generiche (es. "verifica documento", "task interno").',
    'Usa frasi sintetiche e operative. Non inserire testo fuori dal JSON.',
  ].join('\n');
  const payload = await callOpenAI({
    model: getModel(), temperature: 0.1,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: prompt }] },
      { role: 'user', content: [{ type: 'input_text', text: `Gara ID: ${garaId}\nJSON attuale:\n${JSON.stringify(outputJson || {}, null, 2)}\n\nDocumenti:\n${JSON.stringify(documents || [], null, 2)}\n\nConversazione recente:\n${JSON.stringify((conversation || []).slice(-12), null, 2)}` }] },
    ],
  });
  const text = extractResponseText(payload);
  const parsed = tryParseJson(text || '') as { items?: ChecklistItem[] } | null;
  if (!parsed || !Array.isArray(parsed.items)) return fallbackChecklistFromOutput(outputJson, documents);
  return sanitizeChecklistItems(parsed.items, outputJson);
}

/* ───────── Dashboard JSON contract ───────── */

function buildDashboardJsonContract(garaId: string): string {
  const schema = defaultOutputForGara(garaId);
  return [
    'OBIETTIVO: creare un JSON estremamente dettagliato della gara, dinamico, in sezioni e sottosezioni.',
    'VINCOLI DI COMPATIBILITA DASHBOARD:',
    '- Rispondi SOLO con JSON valido (nessun markdown, nessun testo extra).',
    '- Mantieni SEMPRE le sezioni baseline dello schema e aggiungi liberamente altre sezioni top-level quando utile.',
    '- Struttura i contenuti in sezioni/sottosezioni con oggetti annidati e array.',
    '- Ogni valore deve rispettare il tipo atteso: stringa, numero, array o oggetto coerente.',
    '- Per informazioni descrittive usa ELENCHI PUNTATI: preferisci array di stringhe oppure array di oggetti.',
    '- Evita paragrafi lunghi in un solo campo stringa.',
    '- Ogni lista deve contenere voci atomiche e leggibili come bullet points.',
    '- Se un dato non e disponibile, usa stringa vuota oppure array vuoto.',
    '- Non rimuovere sezioni o campi gia presenti; aggiorna e completa progressivamente.',
    '- Aggiorna overview_gara.ultimo_aggiornamento in ISO-8601.',
    '- Includi informazioni note attuali e aggiungi nuove sezioni se emergono dai documenti/conversazione.',
    '- Mantieni e popola checklist_operativa.items con voci granulari di requisito.',
    'SCHEMA BASE MINIMO:',
    JSON.stringify(schema, null, 2),
  ].join('\n');
}

/* ───────── Chat + Output update ───────── */

export async function runChatAndOutputUpdate(p: {
  garaId: string; message: string; currentOutput: GaraOutput; conversation: ChatMessage[];
}): Promise<{ assistant_reply: string; output_json: GaraOutput }> {
  const { garaId, message, currentOutput, conversation } = p;
  if (!process.env.OPENAI_API_KEY) {
    const base = normalizeOutputJson(garaId, currentOutput);
    const checklistItems = fallbackChecklistFromOutput(base);
    return {
      assistant_reply: 'OPENAI_API_KEY non configurata.',
      output_json: applyChecklistToOutput(garaId, base, checklistItems),
    };
  }
  const contract = buildDashboardJsonContract(garaId);
  const prompt = ['Aggiorna lo stato strutturato di una gara in formato JSON compatibile dashboard.', contract, 'Rispondi SOLO con JSON valido: {"assistant_reply":"...", "output_json": { ...schema aggiornato... }}'].join('\n');
  const payload = await callOpenAI({
    model: getModel(), temperature: 0.2,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: prompt }] },
      { role: 'user', content: [{ type: 'input_text', text: `Gara ID: ${garaId}\nStorico:\n${JSON.stringify((conversation || []).slice(-16), null, 2)}\n\nMessaggio utente:\n${message}\n\nJSON attuale:\n${JSON.stringify(currentOutput, null, 2)}` }] },
    ],
  });
  const text = extractResponseText(payload);
  const parsed = tryParseJson(text || '') as { assistant_reply?: string; output_json?: GaraOutput } | null;
  if (!parsed) return { assistant_reply: 'Aggiornamento parziale.', output_json: currentOutput };
  const assistant_reply = typeof parsed.assistant_reply === 'string' && parsed.assistant_reply.trim() ? parsed.assistant_reply.trim() : 'Aggiornamento completato.';
  const output_json = parsed.output_json && typeof parsed.output_json === 'object' && !Array.isArray(parsed.output_json)
    ? normalizeOutputJson(garaId, parsed.output_json) : normalizeOutputJson(garaId, currentOutput);
  const checklistItems = await buildChecklistWithLLM({ garaId, outputJson: output_json, documents: [], conversation });
  return { assistant_reply, output_json: applyChecklistToOutput(garaId, output_json, checklistItems) };
}

/* ───────── Document classification ───────── */

function guessCategoryByName(name: string): DocumentCategory {
  const n = String(name || '').toLowerCase();
  if (n.includes('bando')) return 'bando';
  if (n.includes('disciplinare')) return 'disciplinare';
  if (n.includes('capitolato')) return 'capitolato';
  if (n.includes('modulo') || n.includes('allegato a') || n.includes('dichiarazione')) return 'moduli_ufficiali';
  if (n.includes('faq') || n.includes('chiarimenti')) return 'faq_chiarimenti';
  if (n.includes('addendum') || n.includes('rettifica')) return 'addendum';
  if (n.includes('offerta') && n.includes('tecnica')) return 'offerta_tecnica_schema';
  if (n.includes('offerta') && n.includes('economica')) return 'offerta_economica_schema';
  if (n.includes('tavola') || n.includes('computo') || n.includes('allegato tecnico')) return 'allegati_tecnici';
  return 'altro';
}

export async function classifyDocumentsWithLLM(p: { garaId: string; documents: GaraDocument[] }): Promise<GaraDocument[]> {
  const { garaId, documents } = p;
  const docs = Array.isArray(documents) ? documents : [];
  if (!docs.length) return [];
  if (!process.env.OPENAI_API_KEY) {
    return docs.map((doc) => ({ ...doc, category: guessCategoryByName(doc.name), confidence: 0.55, rationale: 'Classificazione euristica.', confirmed: false }));
  }
  const payload = await callOpenAI({
    model: getModel(), temperature: 0.1,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: `Classifica i documenti gara. Categorie: ${DOCUMENT_CATEGORIES.join(', ')}. Rispondi SOLO JSON: {"documents":[{"stored_as":"...","category":"...","confidence":0.0,"rationale":"..."}]}` }] },
      { role: 'user', content: [{ type: 'input_text', text: `Gara ID: ${garaId}\nDocumenti:\n${JSON.stringify(docs, null, 2)}` }] },
    ],
  });
  const text = extractResponseText(payload);
  const parsed = tryParseJson(text || '') as { documents?: Array<{ stored_as: string; category: string; confidence: number; rationale: string }> } | null;
  const classified = Array.isArray(parsed?.documents) ? parsed!.documents : [];
  const byStoredAs = new Map(classified.map((d) => [String(d?.stored_as || ''), d]));
  return docs.map((doc) => {
    const row = byStoredAs.get(String(doc.stored_as)) || {} as { category?: string; confidence?: number; rationale?: string };
    const category = DOCUMENT_CATEGORIES.includes(row.category as DocumentCategory) ? (row.category as DocumentCategory) : guessCategoryByName(doc.name);
    const confidence = Number.isFinite(Number(row.confidence)) ? Math.max(0, Math.min(1, Number(row.confidence))) : 0.6;
    return { ...doc, category, confidence, rationale: typeof row.rationale === 'string' ? row.rationale : 'Classificazione automatica AI.', confirmed: false };
  });
}

/* ───────── Initial extraction from documents ───────── */

export async function runInitialOutputFromDocuments(p: {
  garaId: string; documents: GaraDocument[]; currentOutput: GaraOutput;
  rawFiles?: Array<{ name: string; type: string; size: number; content_base64: string }>;
}): Promise<{ assistant_reply: string; output_json: GaraOutput }> {
  const { garaId, documents, currentOutput, rawFiles } = p;
  const safeDocs = Array.isArray(documents) ? documents : [];
  if (!process.env.OPENAI_API_KEY) {
    const base = normalizeOutputJson(garaId, currentOutput);
    const interimOutput = normalizeOutputJson(garaId, {
      ...base,
      overview_gara: { ...(base.overview_gara || {}), gara_id: garaId, stato: 'documenti_caricati', ultimo_aggiornamento: new Date().toISOString() },
      documenti: { ...(base.documenti || {}), elenco: safeDocs.map((d) => ({ nome: d.name, tipo: d.type || 'n/d', dimensione: d.size })) },
    });
    const checklistItems = fallbackChecklistFromOutput(interimOutput);
    return { assistant_reply: 'Documenti ricevuti. OPENAI_API_KEY non configurata.', output_json: applyChecklistToOutput(garaId, interimOutput, checklistItems) };
  }

  const contract = buildDashboardJsonContract(garaId);
  const prompt = ['Sei un assistente gare.', 'Estrai le informazioni dai documenti e genera il primo JSON strutturato completo.', contract, 'Rispondi SOLO con JSON valido: {"assistant_reply":"...", "output_json": { ... }}'].join('\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [{ type: 'input_text', text: `Gara ID: ${garaId}\n\nJSON attuale:\n${JSON.stringify(currentOutput || {}, null, 2)}\n\nDocumenti:\n${JSON.stringify(safeDocs, null, 2)}\n\nAnalizza i file allegati.` }];
  const candidateFiles = Array.isArray(rawFiles) ? rawFiles.slice(0, 6) : [];
  for (const file of candidateFiles) {
    const fileData = String(file?.content_base64 || '').trim();
    if (!fileData) continue;
    content.push({ type: 'input_file', filename: file.name || 'documento', file_data: `data:${file.type || 'application/octet-stream'};base64,${fileData}` });
  }

  const payload = await callOpenAI({
    model: getModel(), temperature: 0.2,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: prompt }] },
      { role: 'user', content },
    ],
  });

  const text = extractResponseText(payload);
  const parsed = tryParseJson(text || '') as { assistant_reply?: string; output_json?: GaraOutput } | null;
  if (!parsed) {
    const fallbackBase = normalizeOutputJson(garaId, currentOutput);
    const checklistItems = fallbackChecklistFromOutput(fallbackBase, safeDocs);
    return { assistant_reply: 'Documenti caricati. Output iniziale parziale.', output_json: applyChecklistToOutput(garaId, fallbackBase, checklistItems) };
  }
  const extractedOutput = parsed.output_json && typeof parsed.output_json === 'object' && !Array.isArray(parsed.output_json)
    ? normalizeOutputJson(garaId, parsed.output_json) : normalizeOutputJson(garaId, currentOutput);
  const checklistItems = await buildChecklistWithLLM({ garaId, outputJson: extractedOutput, documents: safeDocs, conversation: [] });
  return {
    assistant_reply: typeof parsed.assistant_reply === 'string' && parsed.assistant_reply.trim() ? parsed.assistant_reply.trim() : 'Documenti caricati e JSON generato.',
    output_json: applyChecklistToOutput(garaId, extractedOutput, checklistItems),
  };
}

/* ───────── Render model ───────── */

export function buildFallbackRenderModel(outputJson: GaraOutput): { sections: RenderModelSection[] } {
  const root = outputJson && typeof outputJson === 'object' ? outputJson : ({} as GaraOutput);
  const sections: RenderModelSection[] = [];
  for (const [key, value] of Object.entries(root)) {
    const items: RenderModelSection['items'] = [];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        items.push({ label: childKey, value: childValue, source_path: [key, childKey] });
      }
    } else {
      items.push({ label: key, value, source_path: [key] });
    }
    sections.push({ title: key, items, notes: [] });
  }
  return { sections };
}

export async function buildRenderModelFromOutput(p: { garaId: string; outputJson: GaraOutput }): Promise<{ sections: RenderModelSection[] }> {
  const { garaId, outputJson } = p;
  if (!process.env.OPENAI_API_KEY) return buildFallbackRenderModel(outputJson);
  const prompt = [
    'Interpreta il JSON di una gara e produci SOLO un modello UI JSON per renderizzare i campi.',
    'Rispondi SOLO con JSON valido: {"sections":[{"title":"string","items":[{"label":"string","value":"string|array|object","source_path":["path","to","field"]}],"notes":[]}]}',
  ].join('\n');
  const payload = await callOpenAI({
    model: getModel(), temperature: 0.1,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: prompt }] },
      { role: 'user', content: [{ type: 'input_text', text: `Gara ID: ${garaId}\nJSON:\n${JSON.stringify(outputJson || {}, null, 2)}` }] },
    ],
  });
  const text = extractResponseText(payload);
  const parsed = tryParseJson(text || '') as { sections?: RenderModelSection[] } | null;
  if (!parsed || !Array.isArray(parsed.sections)) return buildFallbackRenderModel(outputJson);
  return { sections: parsed.sections };
}

/* ───────── Structured analysis ───────── */

export async function runStructuredAnalysis(input: {
  prompt?: string; elementName?: string; elementValue?: string; sectionTitle?: string;
}): Promise<string> {
  const elementName = String(input?.elementName || 'Elemento non specificato');
  const elementValue = String(input?.elementValue || 'n/d');
  const sectionTitle = String(input?.sectionTitle || 'Output Strutturato');
  const promptText = String(input?.prompt || '').trim();
  if (!process.env.OPENAI_API_KEY) return `Analisi locale\nElemento: ${elementName}\nValore: ${elementValue}`;
  const payload = await callOpenAI({
    model: getModel(), temperature: 0.2,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'Sei un assistente per analisi gare. Rispondi in italiano, sintetico e operativo.' }] },
      { role: 'user', content: [{ type: 'input_text', text: `Sezione: ${sectionTitle}\nElemento: ${elementName}\nValore: ${elementValue}\n\nRichiesta:\n${promptText}` }] },
    ],
  });
  return extractResponseText(payload) || 'Nessun risultato disponibile.';
}

/* ───────── Merge documents into output ───────── */

export function mergeDocumentsIntoOutput(output: GaraOutput, documents: GaraDocument[], status = 'da_confermare'): GaraOutput {
  const base = normalizeOutputJson(output?.overview_gara?.gara_id || 'gara', output || {});
  return normalizeOutputJson(base?.overview_gara?.gara_id || 'gara', {
    ...base,
    documenti: {
      ...(base.documenti || {}),
      classificazione_stato: status,
      elenco: Array.isArray(documents) ? documents.map((d) => ({
        nome: d.name, stored_as: d.stored_as, tipo_file: d.type || '',
        categoria: d.category || 'altro', confidenza: d.confidence ?? 0,
        rationale: d.rationale || '', confermato: Boolean(d.confirmed),
      })) : [],
    },
  });
}

/* ───────── Utility ───────── */

export function sanitizeGaraId(value: string): string {
  const cleaned = String(value || 'nuova-gara').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'nuova-gara';
}

export function sanitizeFileName(name: string): string {
  const cleaned = String(name || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(0, 180) || 'documento';
}

export { REQUIRED_BASELINE_SECTIONS };
