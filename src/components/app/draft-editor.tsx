'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileOutput, ChevronDown, GripVertical, Save, Download, Loader2,
  Building2, Users, Shield, ClipboardList, TrendingUp, Wrench,
  AlertTriangle, FileText, Clock, BookOpen, Plus, Trash2, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GaraOutput, ChecklistItem } from '@/lib/types';

interface DraftSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  source: string; // which part of output this maps to
  locked: boolean;
}

interface DraftEditorProps {
  garaId: string | null;
  output: GaraOutput | null;
  onSaveDraft: (sections: DraftSection[]) => void;
  onGenerateSection: (sectionId: string) => void;
  saving: boolean;
  generating: string | null; // which section is being generated
}

const DEFAULT_SECTIONS: Omit<DraftSection, 'content'>[] = [
  { id: 'profilo_impresa', title: 'Profilo dell\'Impresa', icon: <Building2 className="w-4 h-4" />, source: 'anagrafica', locked: false },
  { id: 'esperienza_referenze', title: 'Esperienza e Referenze', icon: <ClipboardList className="w-4 h-4" />, source: 'referenze', locked: false },
  { id: 'team_progetto', title: 'Team di Progetto', icon: <Users className="w-4 h-4" />, source: 'team_cv', locked: false },
  { id: 'metodologia', title: 'Metodologia e Approccio Tecnico', icon: <Wrench className="w-4 h-4" />, source: 'metodologia', locked: false },
  { id: 'piano_lavori', title: 'Piano dei Lavori e Cronoprogramma', icon: <Clock className="w-4 h-4" />, source: 'timeline', locked: false },
  { id: 'qualita_sicurezza', title: 'Sistema Qualita, Sicurezza e Ambiente', icon: <Shield className="w-4 h-4" />, source: 'hse', locked: false },
  { id: 'gestione_rischi', title: 'Gestione Rischi e Criticita', icon: <AlertTriangle className="w-4 h-4" />, source: 'rischi_red_flags', locked: false },
  { id: 'offerta_economica', title: 'Offerta Economica (Sintesi)', icon: <TrendingUp className="w-4 h-4" />, source: 'economica', locked: false },
  { id: 'allegati', title: 'Elenco Allegati', icon: <FileText className="w-4 h-4" />, source: 'output_finale', locked: false },
];

function buildSectionsFromOutput(output: GaraOutput | null): DraftSection[] {
  if (!output) return DEFAULT_SECTIONS.map((s) => ({ ...s, content: '' }));

  const checklist = output.checklist_operativa?.items || [];
  const coveredItems = checklist.filter((i) => i.evidenza_proposta);

  // Build content from output data + requisiti responses
  const buildContent = (source: string): string => {
    switch (source) {
      case 'anagrafica': {
        const a = output.anagrafica_gara;
        if (!a?.stazione_appaltante && !a?.cig) return '';
        return [
          a.stazione_appaltante && `Stazione appaltante: ${a.stazione_appaltante}`,
          a.cig && `CIG: ${a.cig}`,
          a.cup && `CUP: ${a.cup}`,
          a.procedura && `Procedura: ${a.procedura}`,
          a.base_asta && `Base d'asta: ${a.base_asta}`,
        ].filter(Boolean).join('\n');
      }
      case 'referenze': {
        const items = coveredItems.filter((i) => i.tipo === 'obbligatorio' && (i.fonte?.includes('tecnico') || i.fonte?.includes('referenz') || i.requisito?.toLowerCase().includes('esperienza') || i.requisito?.toLowerCase().includes('lavori')));
        if (!items.length) return '';
        return items.map((i) => `${i.requisito}\n${i.evidenza_proposta}`).join('\n\n');
      }
      case 'team_cv': {
        const team = output.team_cv;
        if (!team?.ruoli_obbligatori?.length && !team?.cv_associati?.length) return '';
        const lines = (team.cv_associati || []).map((a) => `- ${a.ruolo}: ${a.cv || 'da assegnare'}`);
        const gaps = (team.gap || []).map((g) => `- ${g}: NON ASSEGNATO`);
        return [...lines, ...gaps].join('\n');
      }
      case 'metodologia': {
        const items = coveredItems.filter((i) => i.tipo === 'valutativo' || i.requisito?.toLowerCase().includes('metodolog') || i.requisito?.toLowerCase().includes('approccio'));
        if (!items.length) return '';
        return items.map((i) => `## ${i.requisito}\n${i.evidenza_proposta}`).join('\n\n');
      }
      case 'timeline': {
        const t = output.timeline;
        if (!t?.scadenza_offerta && !t?.data_pubblicazione) return '';
        return [
          t.data_pubblicazione && `Pubblicazione: ${t.data_pubblicazione}`,
          t.scadenza_offerta && `Scadenza offerta: ${t.scadenza_offerta}`,
          t.termine_quesiti && `Termine quesiti: ${t.termine_quesiti}`,
          t.sopralluogo && `Sopralluogo: ${t.sopralluogo}`,
        ].filter(Boolean).join('\n');
      }
      case 'hse': {
        const items = coveredItems.filter((i) => i.requisito?.toLowerCase().includes('sicur') || i.requisito?.toLowerCase().includes('ambient') || i.requisito?.toLowerCase().includes('iso') || i.requisito?.toLowerCase().includes('hse'));
        if (!items.length) return '';
        return items.map((i) => `## ${i.requisito}\n${i.evidenza_proposta}`).join('\n\n');
      }
      case 'rischi_red_flags': {
        const r = output.rischi_red_flags;
        if (!r?.elenco?.length) return '';
        return r.elenco.map((e, i) => `${i + 1}. ${e}${r.azioni_mitigazione?.[i] ? `\n   Mitigazione: ${r.azioni_mitigazione[i]}` : ''}`).join('\n');
      }
      case 'economica': {
        const e = output.economica;
        if (!e?.formula_punteggio_prezzo && !e?.ribasso_massimo) return '';
        return [
          e.formula_punteggio_prezzo && `Formula punteggio prezzo: ${e.formula_punteggio_prezzo}`,
          e.ribasso_massimo && `Ribasso massimo: ${e.ribasso_massimo}`,
          e.costi_non_ribassabili && `Costi non ribassabili: ${e.costi_non_ribassabili}`,
          ...(e.vincoli || []).map((v) => `Vincolo: ${v}`),
        ].filter(Boolean).join('\n');
      }
      case 'output_finale': {
        const o = output.output_finale;
        const allegati = [...(o?.allegati_pronti || []), ...(o?.gap_residui || []).map((g) => `[MANCANTE] ${g}`)];
        return allegati.length ? allegati.map((a, i) => `${i + 1}. ${a}`).join('\n') : '';
      }
      default:
        return '';
    }
  };

  return DEFAULT_SECTIONS.map((s) => ({ ...s, content: buildContent(s.source) }));
}

function SectionEditor({ section, onChange, onGenerate, generating }: {
  section: DraftSection; onChange: (content: string) => void;
  onGenerate: () => void; generating: boolean;
}) {
  const [open, setOpen] = useState(!!section.content);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-slate-50/80 transition-colors text-left">
        <GripVertical className="w-4 h-4 text-slate-300 shrink-0 cursor-grab" />
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          {section.icon}
        </div>
        <span className="text-[13px] font-semibold text-slate-800 flex-1">{section.title}</span>
        {section.content ? (
          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 shrink-0">Compilato</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-slate-400 shrink-0">Vuoto</Badge>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-0 space-y-2">
              <textarea
                value={section.content}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Scrivi il contenuto per "${section.title}"...\nOppure usa Auto-genera per compilare da AI.`}
                className="w-full min-h-[120px] text-[13px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 font-mono"
              />
              <div className="flex gap-2">
                <button onClick={onGenerate} disabled={generating}
                  className="text-[11px] font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generating ? 'Generazione...' : 'Auto-genera con AI'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DraftEditor({ garaId, output, onSaveDraft, onGenerateSection, saving, generating }: DraftEditorProps) {
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [customSectionTitle, setCustomSectionTitle] = useState('');

  useEffect(() => {
    setSections((prev) => {
      // Rebuild from output but preserve user edits
      const fresh = buildSectionsFromOutput(output);
      if (prev.length === 0) return fresh;
      // Merge: keep user content if they edited, update from output if empty
      return fresh.map((f) => {
        const existing = prev.find((p) => p.id === f.id);
        if (existing && existing.content && existing.content !== f.content) {
          return existing; // preserve user edit
        }
        return f;
      });
    });
  }, [output]);

  const updateSection = useCallback((id: string, content: string) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, content } : s));
  }, []);

  const addCustomSection = useCallback(() => {
    if (!customSectionTitle.trim()) return;
    const id = `custom_${Date.now()}`;
    setSections((prev) => [...prev, {
      id, title: customSectionTitle.trim(), icon: <BookOpen className="w-4 h-4" />,
      content: '', source: 'custom', locked: false,
    }]);
    setCustomSectionTitle('');
  }, [customSectionTitle]);

  const removeSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const exportAsText = useCallback(() => {
    const text = sections.map((s) => `${'='.repeat(60)}\n${s.title.toUpperCase()}\n${'='.repeat(60)}\n\n${s.content || '[Sezione vuota]'}\n`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offerta_tecnica_${garaId || 'gara'}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sections, garaId]);

  const exportAsHtml = useCallback(() => {
    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Offerta Tecnica - ${garaId}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a;line-height:1.7}
h1{font-size:24px;border-bottom:2px solid #1a1a1a;padding-bottom:8px}
h2{font-size:18px;color:#2563eb;margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:4px}
p,li{font-size:14px}pre{background:#f5f5f5;padding:16px;border-radius:8px;font-size:13px;white-space:pre-wrap}</style></head>
<body><h1>OFFERTA TECNICA</h1><p>Gara: ${garaId}</p><p>Data: ${new Date().toLocaleDateString('it-IT')}</p>
${sections.map((s) => `<h2>${s.title}</h2><pre>${s.content || '[Sezione da compilare]'}</pre>`).join('\n')}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offerta_tecnica_${garaId || 'gara'}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sections, garaId]);

  if (!garaId) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="text-center px-8">
          <FileOutput className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Seleziona una gara</p>
          <p className="text-xs text-slate-400 mt-1">La bozza dell&apos;offerta tecnica apparira qui</p>
        </div>
      </div>
    );
  }

  const filledCount = sections.filter((s) => s.content).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-50/80 to-white min-w-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileOutput className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-[15px] text-slate-900">Bozza Offerta Tecnica</h3>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => onSaveDraft(sections)} disabled={saving} className="h-7 text-[11px] gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salva
            </Button>
            <Button variant="outline" size="sm" onClick={exportAsHtml} className="h-7 text-[11px] gap-1">
              <Download className="w-3 h-3" /> HTML
            </Button>
            <Button variant="outline" size="sm" onClick={exportAsText} className="h-7 text-[11px] gap-1">
              <Download className="w-3 h-3" /> TXT
            </Button>
          </div>
        </div>
        <div className="flex gap-2 text-[11px] text-slate-500">
          <span>{filledCount}/{sections.length} sezioni compilate</span>
          <span>&middot;</span>
          <span>{sections.reduce((acc, s) => acc + s.content.length, 0).toLocaleString()} caratteri</span>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto min-h-0 min-w-0">
        <div className="p-3 space-y-2">
          {sections.map((section) => (
            <SectionEditor key={section.id} section={section}
              onChange={(content) => updateSection(section.id, content)}
              onGenerate={() => onGenerateSection(section.id)}
              generating={generating === section.id}
            />
          ))}

          {/* Add custom section */}
          <div className="flex gap-1.5 mt-3">
            <input value={customSectionTitle} onChange={(e) => setCustomSectionTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustomSection(); }}
              placeholder="Aggiungi sezione personalizzata..."
              className="flex-1 text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300" />
            <button onClick={addCustomSection} disabled={!customSectionTitle.trim()}
              className="text-[10px] font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg px-3 py-1.5 disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
