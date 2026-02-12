'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, Shield, CheckCircle2, Users, AlertTriangle,
  ChevronDown, ChevronRight, CircleDot, Sparkles, Upload,
  TrendingUp, Zap, Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GaraOutput, ChecklistItem } from '@/lib/types';

interface SidebarRightProps {
  garaId: string | null;
  output: GaraOutput | null;
  onChecklistProgress: (itemIndex: number, progress: 'todo' | 'wip' | 'done') => void;
  onAutofill: (itemIndex: number) => void;
}

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
    anagrafica_gara: 'Anagrafica',
    timeline: 'Timeline & Scadenze',
    documenti: 'Documenti',
    requisiti_ammissione: 'Requisiti Ammissione',
    requisiti_valutativi: 'Requisiti Valutativi',
    checklist_compliance: 'Compliance',
    team_cv: 'Team & CV',
    rti_subappalto: 'RTI / Subappalto',
    economica: 'Economica',
    rischi_red_flags: 'Rischi & Red Flags',
    qa: 'Q&A',
    azioni_operative: 'Azioni Operative',
    output_finale: 'Output Finale',
    checklist_operativa: 'Checklist Operativa',
  };
  return labels[name] || name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderValue(value: any, depth = 0): React.ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400 text-xs italic">--</span>;
  if (typeof value === 'string') return <span className="text-[13px] text-slate-700">{value}</span>;
  if (typeof value === 'number' || typeof value === 'boolean') return <code className="text-[12px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{String(value)}</code>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 text-xs italic">Nessun elemento</span>;
    return (
      <ul className="space-y-1 mt-1">
        {value.slice(0, 15).map((item, i) => (
          <li key={i} className="flex gap-2 text-[12px] text-slate-600">
            <span className="text-blue-400 shrink-0 mt-px select-none">&bull;</span>
            <span className="leading-relaxed">{typeof item === 'string' ? item : typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
          </li>
        ))}
        {value.length > 15 && <li className="text-[11px] text-slate-400 pl-4">...e altri {value.length - 15}</li>}
      </ul>
    );
  }
  if (typeof value === 'object' && depth < 2) {
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
  return <code className="text-[11px] font-mono text-slate-500 break-all">{JSON.stringify(value).slice(0, 200)}</code>;
}

function ChecklistCard({ item, index, onProgress, onAutofill }: {
  item: ChecklistItem; index: number;
  onProgress: (p: 'todo' | 'wip' | 'done') => void;
  onAutofill: () => void;
}) {
  const styles = {
    todo: { bg: 'bg-gradient-to-r from-red-50 to-rose-50/50', border: 'border-red-200/60', accent: 'border-l-red-500', badge: 'bg-red-100 text-red-700', badgeLabel: 'Da fare' },
    wip: { bg: 'bg-gradient-to-r from-amber-50 to-yellow-50/50', border: 'border-amber-200/60', accent: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', badgeLabel: 'In corso' },
    done: { bg: 'bg-gradient-to-r from-emerald-50 to-green-50/50', border: 'border-emerald-200/60', accent: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', badgeLabel: 'Fatto' },
  };
  const s = styles[item.progress];
  const nextProgress = { todo: 'wip' as const, wip: 'done' as const, done: 'todo' as const };
  const nextLabel = { todo: 'Avvia', wip: 'Completa', done: 'Reset' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border border-l-[3px] ${s.accent} ${s.border} ${s.bg} p-3 transition-all hover:shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-800 leading-snug flex-1">{item.requisito || 'Requisito'}</p>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s.badge}`}>{s.badgeLabel}</span>
      </div>
      {item.fonte && <p className="text-[10px] text-slate-500 mt-1 truncate">Fonte: {item.fonte}</p>}
      {item.evidenza_proposta && (
        <p className="text-[11px] text-slate-500 mt-2 bg-white/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 line-clamp-2 border border-slate-100">{item.evidenza_proposta}</p>
      )}
      <div className="flex gap-1.5 mt-2.5">
        <button
          onClick={() => onProgress(nextProgress[item.progress])}
          className="text-[10px] font-medium text-slate-600 hover:text-blue-700 bg-white/80 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg px-2.5 py-1 transition-all"
        >
          {nextLabel[item.progress]}
        </button>
        {item.progress !== 'done' && (
          <button
            onClick={onAutofill}
            className="text-[10px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/50 hover:border-blue-300 rounded-lg px-2.5 py-1 transition-all flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> Auto-fill
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CollapsibleSection({ name, children, defaultOpen = false }: { name: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50/80 transition-colors text-left"
      >
        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          <SectionIcon name={name} />
        </div>
        <span className="text-[13px] font-semibold text-slate-800 flex-1">{sectionLabel(name)}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-3.5 pb-3.5 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarRight({ garaId, output, onChecklistProgress, onAutofill }: SidebarRightProps) {
  if (!garaId || !output) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-blue-50/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-8"
        >
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

  const skipSections = ['checklist_operativa'];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-50/80 to-white">
      {/* Progress Header */}
      <div className="p-4 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px] text-slate-900">Dashboard</h3>
          <Badge variant="outline" className="text-[10px] rounded-full px-2.5 border-slate-200 text-slate-500 font-medium">
            {output.overview_gara?.stato || 'iniziale'}
          </Badge>
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="oklch(0.92 0.01 240)" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="url(#progress-gradient)" strokeWidth="4"
                strokeDasharray={`${progressPct * 1.257} 125.7`} strokeLinecap="round" className="transition-all duration-500" />
              <defs>
                <linearGradient id="progress-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3 space-y-2">
          {/* Checklist Operativa */}
          {checklist.length > 0 && (
            <CollapsibleSection name="checklist_operativa" defaultOpen>
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <ChecklistCard
                    key={i} item={item} index={i}
                    onProgress={(p) => onChecklistProgress(i, p)}
                    onAutofill={() => onAutofill(i)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2" />

          {/* All other sections */}
          {Object.entries(output)
            .filter(([key]) => !skipSections.includes(key))
            .map(([key, value]) => {
              if (!value || (typeof value === 'object' && !Array.isArray(value) &&
                Object.values(value as Record<string, unknown>).every((v) => v === '' || (Array.isArray(v) && v.length === 0)))) {
                return null;
              }
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
                  ) : (
                    renderValue(value)
                  )}
                </CollapsibleSection>
              );
            })}

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
