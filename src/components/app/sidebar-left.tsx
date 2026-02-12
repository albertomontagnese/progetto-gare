'use client';

import { Plus, FileText, Building2, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { GaraSummary } from '@/lib/types';

interface SidebarLeftProps {
  gare: GaraSummary[];
  activeGaraId: string | null;
  onSelectGara: (garaId: string) => void;
  onNewGara: () => void;
  onOpenCompanyProfile: () => void;
  onOpenSetup: (type: 'settore' | 'azienda') => void;
  activeView: string;
}

export function SidebarLeft({
  gare, activeGaraId, onSelectGara, onNewGara, onOpenCompanyProfile, onOpenSetup, activeView,
}: SidebarLeftProps) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 to-slate-50 border-r">
      {/* Header */}
      <div className="p-4 border-b bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
            PG
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">Progetto Gare</h1>
            <p className="text-[11px] text-muted-foreground">Piattaforma AI Gare</p>
          </div>
        </div>
      </div>

      {/* New Gara Button */}
      <div className="p-3">
        <Button onClick={onNewGara} variant="outline" className="w-full justify-start gap-2 bg-white hover:bg-blue-50 border-primary/20 text-primary shadow-sm">
          <Plus className="w-4 h-4" />
          <span className="font-medium">Nuova Gara</span>
        </Button>
      </div>

      {/* Gare List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {gare.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">
              Nessuna gara ancora. Crea la tua prima gara per iniziare.
            </p>
          )}
          {gare.map((gara) => (
            <button
              key={gara.garaId}
              onClick={() => onSelectGara(gara.garaId)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 group ${
                activeGaraId === gara.garaId && activeView === 'chat'
                  ? 'bg-white shadow-sm border border-primary/20 text-foreground'
                  : 'hover:bg-white/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0 text-primary/60" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-[13px]">{gara.garaId}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {gara.documents_count > 0 && (
                    <span className="text-[10px] text-muted-foreground">{gara.documents_count} doc</span>
                  )}
                  {gara.checklist_items > 0 && (
                    <span className="text-[10px] text-muted-foreground">{gara.checklist_items} req</span>
                  )}
                </div>
              </div>
              {gara.checklist_items > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-blue-100 text-blue-700 border-0">
                  {gara.messages_count}
                </Badge>
              )}
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Setup & Company */}
      <div className="p-2 space-y-1">
        <button
          onClick={onOpenCompanyProfile}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
            activeView === 'company' ? 'bg-white shadow-sm' : 'hover:bg-white/60'
          } text-muted-foreground hover:text-foreground`}
        >
          <Building2 className="w-4 h-4" />
          <span className="font-medium text-[13px]">Profilo Azienda</span>
        </button>
        <button
          onClick={() => onOpenSetup('settore')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
            activeView === 'setup-settore' ? 'bg-white shadow-sm' : 'hover:bg-white/60'
          } text-muted-foreground hover:text-foreground`}
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium text-[13px]">Setup Settore</span>
        </button>
      </div>
    </div>
  );
}
