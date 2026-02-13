/* ───────────────────────── Domain Types ───────────────────────── */

export const DOCUMENT_CATEGORIES = [
  'bando',
  'disciplinare',
  'capitolato',
  'moduli_ufficiali',
  'allegati_tecnici',
  'faq_chiarimenti',
  'addendum',
  'offerta_tecnica_schema',
  'offerta_economica_schema',
  'altro',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface GaraDocument {
  name: string;
  stored_as: string;
  size: number;
  type: string;
  preview: string;
  category: DocumentCategory;
  confidence: number;
  rationale: string;
  confirmed: boolean;
  gcs_path?: string;
  /** Base64-encoded file content, stored in Firestore for AI extraction when GCS is unavailable */
  content_base64?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
}

export interface ChecklistItem {
  requisito: string;
  fonte: string;
  tipo: string;
  owner_proposta: string;
  stato: string;
  evidenza_proposta: string;
  allegati: string[];
  progress: 'todo' | 'wip' | 'done';
  esito_copertura: string;
  gap_informativi: string[];
}

export interface GaraOutput {
  overview_gara: {
    gara_id: string;
    stato: string;
    ultimo_aggiornamento: string;
    summary: string[];
  };
  anagrafica_gara: {
    gara_id: string;
    cig: string;
    cup: string;
    stazione_appaltante: string;
    procedura: string;
    criterio_aggiudicazione: string;
    base_asta: string;
    oneri_sicurezza: string;
    stato: string;
    ultimo_aggiornamento: string;
  };
  timeline: {
    data_pubblicazione: string;
    termine_quesiti: string;
    sopralluogo: string;
    scadenza_offerta: string;
    prima_seduta: string;
    chiarimenti: string[];
  };
  documenti: {
    elenco: Array<Record<string, unknown>>;
    revisioni: string[];
    mancanti: string[];
    classificazione_stato?: string;
  };
  requisiti_ammissione: {
    economico_finanziari: Array<string | Record<string, unknown>>;
    tecnico_professionali: Array<string | Record<string, unknown>>;
    certificazioni: Array<string | Record<string, unknown>>;
    soglie_minime: Array<string | Record<string, unknown>>;
  };
  requisiti_valutativi: {
    criteri: Array<string | Record<string, unknown>>;
    sottocriteri: Array<string | Record<string, unknown>>;
    soglie_sbarramento: Array<string | Record<string, unknown>>;
  };
  checklist_compliance: {
    totale_item: number;
    completati: number;
    mancanti: number;
    dettagli: Array<Record<string, unknown>>;
  };
  team_cv: {
    ruoli_obbligatori: string[];
    cv_associati: Array<{ ruolo: string; cv: string }>;
    gap: string[];
  };
  rti_subappalto: {
    previsto: string;
    quote: string[];
    limiti: string[];
    dichiarazioni: string[];
    note: string[];
  };
  economica: {
    formula_punteggio_prezzo: string;
    ribasso_massimo: string;
    costi_non_ribassabili: string;
    vincoli: string[];
  };
  rischi_red_flags: {
    elenco: string[];
    gravita: string[];
    azioni_mitigazione: string[];
  };
  qa: {
    quesiti_aperti: string[];
    risposte_ufficiali: string[];
    impatti: string[];
  };
  azioni_operative: {
    task: Array<Record<string, unknown>>;
  };
  output_finale: {
    sezioni_offerta: string[];
    allegati_pronti: string[];
    gap_residui: string[];
    stato_prontezza: string;
  };
  checklist_operativa: {
    formato: string;
    items: ChecklistItem[];
    ultimo_aggiornamento: string;
  };
  [key: string]: unknown; // allow dynamic extra sections
}

export interface CompanyProfile {
  azienda: {
    nome: string;
    descrizione: string;
    fatturato: string;
    settore: string;
  };
  certificazioni: string[];
  referenze: Array<Record<string, unknown>>;
  cv: string[];
  procedure: string[];
  evidenze: string[];
}

export interface GaraSummary {
  garaId: string;
  updated_at: string | null;
  messages_count: number;
  documents_count: number;
  checklist_items: number;
  schema_status: string;
}

export interface GuidedQuestion {
  id: string;
  item_index: number;
  requisito: string;
  domanda: string;
  suggerimento_ai: string;
  owner_proposta: string;
}

export interface RenderModelSection {
  title: string;
  items: Array<{
    label: string;
    value: unknown;
    source_path: string[];
  }>;
  notes?: Array<{
    text: string | string[];
    source_path: string[];
  }>;
}
