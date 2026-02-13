'use client';

import { useState, useCallback } from 'react';
import { FileText, Upload, CheckCircle2, Clock, Loader2, Plus, Building2, FolderOpen, Shield, BarChart3, Users, HardHat, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GaraDocument } from '@/lib/types';

interface CompanyDoc {
  name: string;
  stored_as: string;
  category: string;
  key_facts: string[];
  size: number;
}

interface DocumentsPanelProps {
  garaId: string | null;
  garaDocs: GaraDocument[];
  companyDocs: CompanyDoc[];
  onUploadGaraDocs: (files: File[]) => void;
  onUploadCompanyDocs: (files: File[]) => void;
  uploading: boolean;
  onConfirmClassification: (docs: GaraDocument[]) => void;
  classificationPending: boolean;
}

const catIcons: Record<string, React.ReactNode> = {
  bando: <FileText className="w-3.5 h-3.5 text-red-500" />,
  disciplinare: <FileText className="w-3.5 h-3.5 text-orange-500" />,
  capitolato: <FileText className="w-3.5 h-3.5 text-blue-500" />,
  moduli_ufficiali: <FileText className="w-3.5 h-3.5 text-purple-500" />,
  allegati_tecnici: <FileText className="w-3.5 h-3.5 text-cyan-500" />,
  faq_chiarimenti: <FileText className="w-3.5 h-3.5 text-green-500" />,
  offerta_tecnica_schema: <FileText className="w-3.5 h-3.5 text-indigo-500" />,
  profilo_aziendale: <Building2 className="w-3.5 h-3.5 text-blue-600" />,
  bilancio: <BarChart3 className="w-3.5 h-3.5 text-green-600" />,
  certificazioni: <Shield className="w-3.5 h-3.5 text-purple-600" />,
  referenze_progetti: <FolderOpen className="w-3.5 h-3.5 text-orange-600" />,
  organigramma_cv: <Users className="w-3.5 h-3.5 text-cyan-600" />,
  policy_hse: <HardHat className="w-3.5 h-3.5 text-red-600" />,
  procedure_operative: <BookOpen className="w-3.5 h-3.5 text-indigo-600" />,
  altro: <FileText className="w-3.5 h-3.5 text-slate-400" />,
};

const catLabels: Record<string, string> = {
  bando: 'Bando', disciplinare: 'Disciplinare', capitolato: 'Capitolato',
  moduli_ufficiali: 'Moduli', allegati_tecnici: 'Allegati Tecnici',
  faq_chiarimenti: 'FAQ', offerta_tecnica_schema: 'Schema OT',
  offerta_economica_schema: 'Schema OE', addendum: 'Addendum',
  profilo_aziendale: 'Profilo', bilancio: 'Bilancio', certificazioni: 'Certificazioni',
  referenze_progetti: 'Referenze', organigramma_cv: 'Team/CV',
  policy_hse: 'HSE', procedure_operative: 'Procedure', altro: 'Altro',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(',')[1] || ''); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function DocCard({ name, category, size, confirmed, keyFacts }: {
  name: string; category: string; size: number; confirmed?: boolean; keyFacts?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-3 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
      onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {catIcons[category] || catIcons.altro}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-slate-800 truncate">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400">{(size / 1024).toFixed(0)} KB</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{catLabels[category] || category}</span>
          </div>
        </div>
        {confirmed !== undefined && (
          confirmed
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <Clock className="w-4 h-4 text-amber-500 shrink-0" />
        )}
      </div>
      <AnimatePresence>
        {expanded && keyFacts && keyFacts.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t border-slate-100 overflow-hidden">
            <p className="text-[10px] font-semibold text-slate-500 mb-1">Fatti chiave:</p>
            {keyFacts.slice(0, 5).map((fact, i) => (
              <p key={i} className="text-[10px] text-slate-500 flex gap-1.5 mb-0.5">
                <span className="text-blue-400 shrink-0">&bull;</span>
                <span className="break-words">{fact}</span>
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DocumentsPanel({
  garaId, garaDocs, companyDocs, onUploadGaraDocs, onUploadCompanyDocs,
  uploading, onConfirmClassification, classificationPending,
}: DocumentsPanelProps) {
  const [tab, setTab] = useState<'gara' | 'azienda'>('gara');

  const handleFileSelect = useCallback((handler: (files: File[]) => void) => {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.html';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) handler(Array.from(files));
    };
    input.click();
  }, []);

  const pendingDocs = garaDocs.filter((d) => !d.confirmed);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 shrink-0">
        <h2 className="font-bold text-[15px] text-slate-900 mb-2">Documenti</h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setTab('gara')}
            className={`flex-1 text-[12px] font-medium py-1.5 px-3 rounded-md transition-all ${tab === 'gara' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Documenti Gara ({garaDocs.length})
          </button>
          <button onClick={() => setTab('azienda')}
            className={`flex-1 text-[12px] font-medium py-1.5 px-3 rounded-md transition-all ${tab === 'azienda' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Documenti Azienda ({companyDocs.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        {tab === 'gara' && (
          <>
            {/* Classification pending banner */}
            {pendingDocs.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-[12px] font-medium text-amber-800 mb-2">{pendingDocs.length} documenti da confermare</p>
                <Button size="sm" onClick={() => onConfirmClassification(garaDocs)}
                  disabled={classificationPending}
                  className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700">
                  {classificationPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Conferma classificazione
                </Button>
              </div>
            )}

            {garaDocs.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">Nessun documento gara</p>
                <p className="text-xs text-slate-400">Carica bando, disciplinare, capitolato...</p>
              </div>
            )}

            {garaDocs.map((doc, i) => (
              <DocCard key={doc.stored_as || i} name={doc.name} category={doc.category}
                size={doc.size} confirmed={doc.confirmed} keyFacts={doc.preview ? [doc.preview.slice(0, 200)] : []} />
            ))}

            <button onClick={() => handleFileSelect(onUploadGaraDocs)} disabled={uploading || !garaId}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 p-4 text-center transition-all hover:bg-blue-50/30 group disabled:opacity-40">
              {uploading ? (
                <><Loader2 className="w-5 h-5 text-blue-400 mx-auto mb-1 animate-spin" /><p className="text-[11px] text-slate-500">Caricamento...</p></>
              ) : (
                <><Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500 mx-auto mb-1 transition-colors" /><p className="text-[11px] text-slate-500 group-hover:text-blue-600">Aggiungi documenti gara</p></>
              )}
            </button>
          </>
        )}

        {tab === 'azienda' && (
          <>
            {companyDocs.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">Nessun documento aziendale</p>
                <p className="text-xs text-slate-400">Carica bilanci, certificazioni, referenze...</p>
              </div>
            )}

            {companyDocs.map((doc, i) => (
              <DocCard key={doc.stored_as || i} name={doc.name} category={doc.category}
                size={doc.size} keyFacts={doc.key_facts} />
            ))}

            <button onClick={() => handleFileSelect(onUploadCompanyDocs)} disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 p-4 text-center transition-all hover:bg-blue-50/30 group disabled:opacity-40">
              {uploading ? (
                <><Loader2 className="w-5 h-5 text-blue-400 mx-auto mb-1 animate-spin" /><p className="text-[11px] text-slate-500">Analisi in corso...</p></>
              ) : (
                <><Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500 mx-auto mb-1 transition-colors" /><p className="text-[11px] text-slate-500 group-hover:text-blue-600">Aggiungi documenti aziendali</p></>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
