'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, Shield, CheckCircle2, Users, AlertTriangle,
  ChevronDown, CircleDot, Sparkles, Upload, Paperclip, MessageSquare,
  TrendingUp, Eye, AlertCircle, UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GaraOutput, ChecklistItem } from '@/lib/types';

interface SidebarRightProps {
  garaId: string | null;
  output: GaraOutput | null;
  onChecklistProgress: (itemIndex: number, progress: 'todo' | 'wip' | 'done') => void;
  onAutofill: (itemIndex: number) => void;
  onAttachFile?: (itemIndex: number, files: File[]) => void;
  onManualAnswer?: (itemIndex: number) => void;
  onAssignCv?: (role: string, cvName: string) => void;
  onRunMatch?: () => void;
  matching?: boolean;
  onEditRequisito?: (itemIndex: number, updates: Partial<ChecklistItem>) => void;
  onDeleteRequisito?: (itemIndex: number) => void;
  onAddRequisito?: (requisito: string) => void;
}

/* ────────── Helpers ────────── */

function SectionIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    overview_gara: <Eye className="w-3.5 h-3.5" />,
    anagrafica_gara: <FileText className="w-3.5 h-3.5" />,
    timeline: <Clock className="w-3.5 h-3.5" />,
    documenti: <FileText className="w-3.5 h-3.5" />,
    requisiti_ammissione: <Shield className="w-3.5 h-3.5" />,
    requisiti_valutativi: <Shield className="w-3.5 h-3.5" />,
    checklist_compliance: <CheckCircle2 className="w-3.5 h-3.5" />,
    team_cv: <Users className="w-3.5 h-3.5" />,
    rischi_red_flags: <AlertTriangle className="w-3.5 h-3.5" />,
    checklist_operativa: <CheckCircle2 className="w-3.5 h-3.5" />,
    economica: <TrendingUp className="w-3.5 h-3.5" />,
  };
  return <>{icons[name] || <CircleDot className="w-3.5 h-3.5" />}</>;
}

function sectionLabel(name: string): string {
  const labels: Record<string, string> = {
    overview_gara: 'Overview',
    anagrafica_gara: 'Anagrafica Gara',
    timeline: 'Timeline & Scadenze',
    documenti: 'Documenti',
    requisiti_ammissione: 'Requisiti di Ammissione',
    requisiti_valutativi: 'Requisiti Valutativi',
    checklist_compliance: 'Compliance',
    team_cv: 'Team & CV',
    rti_subappalto: 'RTI / Subappalto',
    economica: 'Offerta Economica',
    rischi_red_flags: 'Rischi & Red Flags',
    qa: 'Q&A Ufficiali',
    azioni_operative: 'Azioni Operative',
    output_finale: 'Output Finale',
    checklist_operativa: 'Requisiti — Checklist Operativa',
  };
  return labels[name] || name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderValue(value: any, depth = 0): React.ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400 text-xs italic">--</span>;
  if (typeof value === 'string') return <span className="text-[13px] text-slate-700 leading-relaxed break-words">{value}</span>;
  if (typeof value === 'number' || typeof value === 'boolean') return <code className="text-[12px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{String(value)}</code>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 text-xs italic">Nessun elemento</span>;
    return (
      <ul className="space-y-1 mt-1">
        {value.map((item, i) => (
          <li key={i} className="flex gap-2 text-[12px] text-slate-600">
            <span className="text-blue-400 shrink-0 mt-px select-none">&bull;</span>
            <span className="leading-relaxed">{typeof item === 'string' ? item : typeof item === 'object' ? Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(' | ') : String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object' && depth < 3) {
    return (
      <div className="space-y-2 mt-1.5 pl-3 border-l-2 border-slate-100">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k.replace(/_/g, ' ')}</span>
            <div className="mt-0.5">{renderValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <code className="text-[11px] font-mono text-slate-500 break-all">{JSON.stringify(value).slice(0, 300)}</code>;
}

/* ────────── Collapsible Section ────────── */

function CollapsibleSection({ name, children, defaultOpen = false, count }: {
  name: string; children: React.ReactNode; defaultOpen?: boolean; count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50/80 transition-colors text-left min-w-0">
        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          <SectionIcon name={name} />
        </div>
        <span className="text-[13px] font-semibold text-slate-800 flex-1 truncate">{sectionLabel(name)}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">{count}</span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden">
            <div className="px-3.5 pb-3.5 pt-0 overflow-hidden">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────── Requisito Card (full-featured like old app) ────────── */

function RequisitoCard({ item, index, onProgress, onAutofill, onAttachFile, onManualAnswer, onEdit, onDelete }: {
  item: ChecklistItem; index: number;
  onProgress: (p: 'todo' | 'wip' | 'done') => void;
  onAutofill: () => void;
  onAttachFile?: (files: File[]) => void;
  onManualAnswer?: () => void;
  onEdit?: (updates: Partial<ChecklistItem>) => void;
  onDelete?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.requisito);
  const styles = {
    todo: { bg: 'from-red-50 to-rose-50/30', border: 'border-red-200/60', accent: 'border-l-red-500', badge: 'bg-red-100 text-red-700', badgeLabel: 'Da fare', selectClass: 'text-red-700' },
    wip: { bg: 'from-amber-50 to-yellow-50/30', border: 'border-amber-200/60', accent: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', badgeLabel: 'In corso', selectClass: 'text-amber-700' },
    done: { bg: 'from-emerald-50 to-green-50/30', border: 'border-emerald-200/60', accent: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', badgeLabel: 'Fatto', selectClass: 'text-emerald-700' },
  };
  const s = styles[item.progress];
  const isInsufficient = item.esito_copertura === 'insufficiente_dati_azienda';
  const gap = Array.isArray(item.gap_informativi) ? item.gap_informativi : [];

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
      className={`rounded-xl border border-l-[3px] ${s.accent} ${s.border} bg-gradient-to-r ${s.bg} p-3 transition-all hover:shadow-sm overflow-hidden`}>

      {/* Title + Badge */}
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex-1 flex gap-1.5">
            <input value={editText} onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { onEdit?.({ requisito: editText }); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 text-[12px] font-semibold text-slate-800 bg-white border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
            <button onClick={() => { onEdit?.({ requisito: editText }); setEditing(false); }}
              className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100">OK</button>
          </div>
        ) : (
          <p className="text-[12px] font-semibold text-slate-800 leading-snug flex-1 cursor-pointer hover:text-blue-700 break-words overflow-hidden"
            onClick={() => setEditing(true)} title="Clicca per modificare">{item.requisito || 'Requisito'}</p>
        )}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s.badge}`}>{s.badgeLabel}</span>
      </div>

      {/* Meta fields */}
      <div className="mt-2 space-y-1">
        <div className="text-[10px] text-slate-500"><strong className="text-slate-600">Stato:</strong> {item.stato || 'non coperto'}</div>
        <div className="text-[10px] text-slate-500"><strong className="text-slate-600">Fonte:</strong> {item.fonte || 'Da confermare'}</div>
        <div className="text-[10px] text-slate-500"><strong className="text-slate-600">Tipo:</strong> {item.tipo || 'obbligatorio'}</div>
      </div>

      {/* Evidenza */}
      {item.evidenza_proposta && (
        <div className="mt-2 bg-white/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-slate-100 overflow-hidden">
          <div className="text-[10px] font-semibold text-slate-500 mb-0.5">Evidenza proposta:</div>
          <p className="text-[11px] text-slate-600 leading-relaxed break-words line-clamp-4">{item.evidenza_proposta}</p>
        </div>
      )}

      {/* Allegati */}
      {item.allegati && item.allegati.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          <Paperclip className="w-3 h-3 text-slate-400" />
          {item.allegati.map((a, i) => (
            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a}</span>
          ))}
        </div>
      )}

      {/* Insufficient data warning */}
      {isInsufficient && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-medium text-amber-800">Dati aziendali insufficienti</p>
            {gap.length > 0 && (
              <p className="text-[10px] text-amber-600 mt-0.5">Gap: {gap.join(' | ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Progress selector */}
      <div className="mt-2.5 flex items-center gap-2">
        <select
          value={item.progress}
          onChange={(e) => onProgress(e.target.value as 'todo' | 'wip' | 'done')}
          className={`text-[10px] font-semibold ${s.selectClass} bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-300`}
        >
          <option value="todo">To do</option>
          <option value="wip">In corso</option>
          <option value="done">Completato</option>
        </select>
      </div>

      {/* Action buttons */}
      <div className="mt-2 flex gap-1.5 flex-wrap">
        <button onClick={() => fileInputRef.current?.click()}
          className="text-[10px] font-medium text-slate-600 hover:text-blue-700 bg-white/80 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg px-2 py-1 transition-all flex items-center gap-1">
          <Paperclip className="w-3 h-3" /> Allega file
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0 && onAttachFile) onAttachFile(Array.from(files));
          e.target.value = '';
        }} />

        {onManualAnswer && (
          <button onClick={onManualAnswer}
            className="text-[10px] font-medium text-slate-600 hover:text-blue-700 bg-white/80 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg px-2 py-1 transition-all flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Rispondi
          </button>
        )}

        {item.progress !== 'done' && (
          <button onClick={onAutofill}
            className="text-[10px] font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg px-2.5 py-1 transition-all flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3" /> Auto-compila
          </button>
        )}
        {onDelete && (
          <button onClick={() => { if (confirm('Eliminare questo requisito?')) onDelete(); }}
            className="text-[10px] font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/50 rounded-lg px-2 py-1 transition-all ml-auto">
            Elimina
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ────────── Team CV Section ────────── */

function TeamCvSection({ output }: { output: GaraOutput }) {
  const team = output.team_cv;
  if (!team) return null;
  const roles = Array.isArray(team.ruoli_obbligatori) ? team.ruoli_obbligatori : [];
  const assoc = Array.isArray(team.cv_associati) ? team.cv_associati : [];
  const gaps = Array.isArray(team.gap) ? team.gap : [];
  const assocMap = new Map(assoc.map((a) => [a.ruolo, a.cv]));

  if (roles.length === 0 && assoc.length === 0) return null;

  return (
    <CollapsibleSection name="team_cv" count={roles.length}>
      <div className="space-y-2">
        {roles.map((role, i) => {
          const cv = assocMap.get(role) || '';
          const isGap = gaps.includes(role);
          return (
            <div key={i} className={`rounded-lg border p-2.5 ${isGap ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserPlus className={`w-3.5 h-3.5 ${isGap ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="text-[12px] font-semibold text-slate-700">{role}</span>
                </div>
                {cv ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">{cv}</span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">Non assegnato</span>
                )}
              </div>
            </div>
          );
        })}
        {assoc.filter((a) => !roles.includes(a.ruolo)).map((a, i) => (
          <div key={`extra-${i}`} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-700">{a.ruolo}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">{a.cv}</span>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

/* ────────── Doc Classification Badge ────────── */

function DocClassificationBadge({ output }: { output: GaraOutput }) {
  const stato = output.documenti?.classificazione_stato;
  if (!stato) return null;
  const isConfirmed = stato === 'confermato';
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-2.5 ${
      isConfirmed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
    }`}>
      {isConfirmed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
      <span className={`text-[12px] font-medium ${isConfirmed ? 'text-emerald-800' : 'text-amber-800'}`}>
        Classificazione documenti: {isConfirmed ? 'confermata' : 'da confermare'}
      </span>
    </div>
  );
}

/* ────────── Main Component ────────── */

export function SidebarRight({ garaId, output, onChecklistProgress, onAutofill, onAttachFile, onManualAnswer, onRunMatch, matching, onEditRequisito, onDeleteRequisito, onAddRequisito }: SidebarRightProps) {
  const [newReqText, setNewReqText] = useState('');
  if (!garaId || !output) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-blue-50/30">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">Seleziona o crea una gara</p>
          <p className="text-xs text-slate-400 mt-1">Il dashboard strutturato apparira qui</p>
        </motion.div>
      </div>
    );
  }

  const checklist = output.checklist_operativa?.items || [];
  const todoCount = checklist.filter((i) => i.progress === 'todo').length;
  const wipCount = checklist.filter((i) => i.progress === 'wip').length;
  const doneCount = checklist.filter((i) => i.progress === 'done').length;
  const total = checklist.length || 1;
  const progressPct = Math.round((doneCount / total) * 100);

  // Sections to render with dedicated components (not generic key-value)
  const dedicatedSections = new Set(['checklist_operativa', 'team_cv', 'requisiti_ammissione', 'requisiti_valutativi']);

  // Priority order for generic sections
  const prioritySections = ['overview_gara', 'anagrafica_gara', 'timeline', 'documenti'];

  // Collect all requisiti for display
  const reqAmm = output.requisiti_ammissione;
  const reqVal = output.requisiti_valutativi;
  const hasReqAmm = reqAmm && Object.values(reqAmm).some((v) => Array.isArray(v) && v.length > 0);
  const hasReqVal = reqVal && Object.values(reqVal).some((v) => Array.isArray(v) && v.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-50/80 to-white min-w-0">
      {/* Progress Header */}
      <div className="p-4 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px] text-slate-900">Requisiti & Dashboard</h3>
          <Badge variant="outline" className="text-[10px] rounded-full px-2.5 border-slate-200 text-slate-500 font-medium">
            {output.overview_gara?.stato || 'iniziale'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="oklch(0.92 0.01 240)" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="url(#pg)" strokeWidth="4"
                strokeDasharray={`${progressPct * 1.257} 125.7`} strokeLinecap="round" className="transition-all duration-500" />
              <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#6366f1" /></linearGradient></defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-700">{progressPct}%</span>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1">
            <div className="text-center p-1.5 rounded-lg bg-red-50/80">
              <div className="text-[15px] font-bold text-red-600">{todoCount}</div>
              <div className="text-[9px] text-red-500 font-medium uppercase tracking-wider">Da fare</div>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-amber-50/80">
              <div className="text-[15px] font-bold text-amber-600">{wipCount}</div>
              <div className="text-[9px] text-amber-500 font-medium uppercase tracking-wider">In corso</div>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-emerald-50/80">
              <div className="text-[15px] font-bold text-emerald-600">{doneCount}</div>
              <div className="text-[9px] text-emerald-500 font-medium uppercase tracking-wider">Completati</div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Button */}
      {checklist.length > 0 && onRunMatch && (
        <div className="px-4 py-2.5 border-b border-slate-200/80 bg-white/90 shrink-0">
          <button onClick={onRunMatch} disabled={matching}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-[12px] font-semibold shadow-md shadow-purple-500/20 transition-all disabled:opacity-60">
            {matching ? (
              <><Sparkles className="w-4 h-4 animate-spin" /> Matching in corso...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Match Requisiti vs Documenti Aziendali</>
            )}
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 min-w-0">
        <div className="p-3 space-y-2 overflow-hidden">

          {/* Doc Classification Badge */}
          <DocClassificationBadge output={output} />

          {/* ═══ REQUISITI — Checklist Operativa (main section, always visible) ═══ */}
          <CollapsibleSection name="checklist_operativa" defaultOpen count={checklist.length}>
            {checklist.length > 0 ? (
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <RequisitoCard key={i} item={item} index={i}
                    onProgress={(p) => onChecklistProgress(i, p)}
                    onAutofill={() => onAutofill(i)}
                    onAttachFile={onAttachFile ? (files) => onAttachFile(i, files) : undefined}
                    onManualAnswer={onManualAnswer ? () => onManualAnswer(i) : undefined}
                    onEdit={onEditRequisito ? (updates) => onEditRequisito(i, updates) : undefined}
                    onDelete={onDeleteRequisito ? () => onDeleteRequisito(i) : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                Nessun requisito ancora. Carica documenti e conferma la classificazione per estrarre i requisiti.
              </p>
            )}
            {/* Add requisito */}
            {onAddRequisito && (
              <div className="mt-3 flex gap-1.5">
                <input value={newReqText} onChange={(e) => setNewReqText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newReqText.trim()) { onAddRequisito(newReqText.trim()); setNewReqText(''); } }}
                  placeholder="Aggiungi requisito..."
                  className="flex-1 text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300" />
                <button onClick={() => { if (newReqText.trim()) { onAddRequisito(newReqText.trim()); setNewReqText(''); } }}
                  disabled={!newReqText.trim()}
                  className="text-[10px] font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg px-3 py-1.5 disabled:opacity-40 transition-all">
                  + Aggiungi
                </button>
              </div>
            )}
          </CollapsibleSection>

          {/* ═══ Requisiti Ammissione (dedicated section) ═══ */}
          {hasReqAmm && (
            <CollapsibleSection name="requisiti_ammissione" defaultOpen>
              <div className="space-y-3">
                {Object.entries(reqAmm).map(([key, values]) => {
                  if (!Array.isArray(values) || values.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</div>
                      <ul className="space-y-1">
                        {values.map((v, i) => (
                          <li key={i} className="flex gap-2 text-[12px] text-slate-700 bg-blue-50/40 rounded-lg px-2.5 py-1.5 border border-blue-100/50">
                            <Shield className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                            <span>{typeof v === 'string' ? v : typeof v === 'object' ? Object.entries(v).map(([k2, v2]) => `${k2}: ${v2}`).join(' | ') : String(v)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* ═══ Requisiti Valutativi (dedicated section) ═══ */}
          {hasReqVal && (
            <CollapsibleSection name="requisiti_valutativi" defaultOpen>
              <div className="space-y-3">
                {Object.entries(reqVal).map(([key, values]) => {
                  if (!Array.isArray(values) || values.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</div>
                      <ul className="space-y-1">
                        {values.map((v, i) => (
                          <li key={i} className="flex gap-2 text-[12px] text-slate-700 bg-indigo-50/40 rounded-lg px-2.5 py-1.5 border border-indigo-100/50">
                            <Shield className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                            <span>{typeof v === 'string' ? v : typeof v === 'object' ? Object.entries(v).map(([k2, v2]) => `${k2}: ${v2}`).join(' | ') : String(v)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* ═══ Team & CV (dedicated section) ═══ */}
          <TeamCvSection output={output} />

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2" />

          {/* ═══ Priority sections (overview, anagrafica, timeline, documenti) ═══ */}
          {prioritySections.map((key) => {
            const value = output[key as keyof GaraOutput];
            if (!value || dedicatedSections.has(key)) return null;
            if (typeof value === 'object' && !Array.isArray(value) &&
              Object.values(value as Record<string, unknown>).every((v) => v === '' || (Array.isArray(v) && v.length === 0))) return null;
            return (
              <CollapsibleSection key={key} name={key}>
                {typeof value === 'object' && !Array.isArray(value) ? (
                  <div className="space-y-2.5">
                    {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k.replace(/_/g, ' ')}</span>
                        <div className="mt-0.5">{renderValue(v)}</div>
                      </div>
                    ))}
                  </div>
                ) : renderValue(value)}
              </CollapsibleSection>
            );
          })}

          {/* ═══ Remaining sections ═══ */}
          {Object.entries(output)
            .filter(([key]) => !dedicatedSections.has(key) && !prioritySections.includes(key))
            .map(([key, value]) => {
              if (!value) return null;
              if (typeof value === 'object' && !Array.isArray(value) &&
                Object.values(value as Record<string, unknown>).every((v) => v === '' || (Array.isArray(v) && v.length === 0))) return null;
              return (
                <CollapsibleSection key={key} name={key}>
                  {typeof value === 'object' && !Array.isArray(value) ? (
                    <div className="space-y-2.5">
                      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k.replace(/_/g, ' ')}</span>
                          <div className="mt-0.5">{renderValue(v)}</div>
                        </div>
                      ))}
                    </div>
                  ) : renderValue(value)}
                </CollapsibleSection>
              );
            })}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
