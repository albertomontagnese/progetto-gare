'use client';

import { useState } from 'react';
import {
  FileText, Clock, Shield, CheckCircle2, Users, AlertTriangle,
  ChevronDown, ChevronRight, CircleDot, Sparkles, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { GaraOutput, ChecklistItem } from '@/lib/types';

interface SidebarRightProps {
  garaId: string | null;
  output: GaraOutput | null;
  onChecklistProgress: (itemIndex: number, progress: 'todo' | 'wip' | 'done') => void;
  onAutofill: (itemIndex: number) => void;
}

function SectionIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    overview_gara: <FileText className="w-4 h-4" />,
    anagrafica_gara: <FileText className="w-4 h-4" />,
    timeline: <Clock className="w-4 h-4" />,
    documenti: <FileText className="w-4 h-4" />,
    requisiti_ammissione: <Shield className="w-4 h-4" />,
    requisiti_valutativi: <Shield className="w-4 h-4" />,
    checklist_compliance: <CheckCircle2 className="w-4 h-4" />,
    team_cv: <Users className="w-4 h-4" />,
    rischi_red_flags: <AlertTriangle className="w-4 h-4" />,
    checklist_operativa: <CheckCircle2 className="w-4 h-4" />,
  };
  return <>{icons[name] || <CircleDot className="w-4 h-4" />}</>;
}

function sectionLabel(name: string): string {
  const labels: Record<string, string> = {
    overview_gara: 'Overview Gara',
    anagrafica_gara: 'Anagrafica',
    timeline: 'Timeline',
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
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground text-xs italic">-</span>;
  if (typeof value === 'string') return <span className="text-[13px]">{value}</span>;
  if (typeof value === 'number' || typeof value === 'boolean') return <span className="text-[13px] font-mono">{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground text-xs italic">Nessun elemento</span>;
    return (
      <ul className="space-y-1 mt-1">
        {value.slice(0, 15).map((item, i) => (
          <li key={i} className="flex gap-2 text-[12px]">
            <span className="text-primary/50 shrink-0 mt-0.5">{'>'}</span>
            <span>{typeof item === 'string' ? item : typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
          </li>
        ))}
        {value.length > 15 && <li className="text-xs text-muted-foreground">...e altri {value.length - 15}</li>}
      </ul>
    );
  }
  if (typeof value === 'object' && depth < 2) {
    return (
      <div className="space-y-1.5 mt-1 pl-2 border-l-2 border-muted">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{k.replace(/_/g, ' ')}</span>
            <div className="mt-0.5">{renderValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-xs font-mono text-muted-foreground">{JSON.stringify(value).slice(0, 200)}</span>;
}

function ChecklistCard({
  item, index, onProgress, onAutofill,
}: { item: ChecklistItem; index: number; onProgress: (p: 'todo' | 'wip' | 'done') => void; onAutofill: () => void }) {
  const progressColors = { todo: 'bg-red-100 border-l-red-500', wip: 'bg-amber-50 border-l-amber-500', done: 'bg-green-50 border-l-green-500' };
  const progressLabels = { todo: 'Da fare', wip: 'In corso', done: 'Completato' };
  const progressBadges = { todo: 'destructive' as const, wip: 'secondary' as const, done: 'default' as const };
  const nextProgress = { todo: 'wip' as const, wip: 'done' as const, done: 'todo' as const };

  return (
    <div className={`rounded-lg border border-l-4 p-3 ${progressColors[item.progress]} transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground leading-tight">{item.requisito || 'Requisito'}</p>
          {item.fonte && <p className="text-[10px] text-muted-foreground mt-1 truncate">Fonte: {item.fonte}</p>}
        </div>
        <Badge variant={progressBadges[item.progress]} className="text-[10px] shrink-0 h-5">
          {progressLabels[item.progress]}
        </Badge>
      </div>
      {item.evidenza_proposta && (
        <p className="text-[11px] text-muted-foreground mt-2 bg-white/60 rounded px-2 py-1 line-clamp-2">{item.evidenza_proposta}</p>
      )}
      <div className="flex gap-1.5 mt-2">
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onProgress(nextProgress[item.progress])}>
          {item.progress === 'todo' ? 'Avvia' : item.progress === 'wip' ? 'Completa' : 'Reset'}
        </Button>
        {item.progress !== 'done' && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-primary" onClick={onAutofill}>
            <Sparkles className="w-3 h-3 mr-1" /> Auto
          </Button>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({ name, children }: { name: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(name === 'overview_gara' || name === 'checklist_operativa' || name === 'timeline');
  return (
    <Card className="shadow-sm border-muted/80">
      <CardHeader className="py-2.5 px-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setOpen(!open)}>
        <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
          <SectionIcon name={name} />
          <span className="flex-1">{sectionLabel(name)}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      {open && <CardContent className="px-3 pb-3 pt-0">{children}</CardContent>}
    </Card>
  );
}

export function SidebarRight({ garaId, output, onChecklistProgress, onAutofill }: SidebarRightProps) {
  if (!garaId || !output) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-center px-6">
          <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Seleziona o crea una gara per visualizzare il dashboard strutturato.</p>
        </div>
      </div>
    );
  }

  const checklist = output.checklist_operativa?.items || [];
  const todoCount = checklist.filter((i) => i.progress === 'todo').length;
  const wipCount = checklist.filter((i) => i.progress === 'wip').length;
  const doneCount = checklist.filter((i) => i.progress === 'done').length;
  const total = checklist.length || 1;
  const progress = Math.round((doneCount / total) * 100);

  const skipSections = ['checklist_operativa'];

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Progress Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">Dashboard Gara</h3>
          <Badge variant="outline" className="text-[10px]">{output.overview_gara?.stato || 'iniziale'}</Badge>
        </div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{todoCount} da fare</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{wipCount} in corso</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />{doneCount} completati</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Checklist Operativa - Priority section */}
          {checklist.length > 0 && (
            <CollapsibleSection name="checklist_operativa">
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

          <Separator className="my-2" />

          {/* All other sections */}
          {Object.entries(output)
            .filter(([key]) => !skipSections.includes(key))
            .map(([key, value]) => {
              if (!value || (typeof value === 'object' && !Array.isArray(value) && Object.values(value as Record<string, unknown>).every((v) => v === '' || (Array.isArray(v) && v.length === 0)))) {
                return null;
              }
              return (
                <CollapsibleSection key={key} name={key}>
                  {typeof value === 'object' && !Array.isArray(value) ? (
                    <div className="space-y-2">
                      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{k.replace(/_/g, ' ')}</span>
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
        </div>
      </ScrollArea>
    </div>
  );
}
