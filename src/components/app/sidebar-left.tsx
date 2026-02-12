'use client';

import { Plus, FileText, Building2, Settings, ChevronRight, LogOut, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { GaraSummary } from '@/lib/types';
import type { SessionPayload } from '@/lib/session';
import type { Tenant } from '@/lib/auth-db';

interface SidebarLeftProps {
  gare: GaraSummary[];
  activeGaraId: string | null;
  onSelectGara: (garaId: string) => void;
  onNewGara: () => void;
  onOpenCompanyProfile: () => void;
  onOpenSetup: (type: 'settore' | 'azienda') => void;
  activeView: string;
  session: SessionPayload | null;
  tenant: Tenant | null;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export function SidebarLeft({
  gare, activeGaraId, onSelectGara, onNewGara, onOpenCompanyProfile, onOpenSetup, activeView,
  session, tenant, onLogout, onOpenAdmin,
}: SidebarLeftProps) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50/80 to-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/20">
            PG
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[13px] tracking-tight text-slate-900 truncate">{tenant?.name || 'Progetto Gare'}</h1>
            <p className="text-[10px] text-slate-500 truncate">{session?.email}</p>
          </div>
        </div>
      </div>

      {/* New Gara Button */}
      <div className="p-3">
        <Button onClick={onNewGara} className="w-full justify-start gap-2.5 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 text-white rounded-xl">
          <Plus className="w-4 h-4" />
          <span className="font-semibold text-[13px]">Nuova Gara</span>
        </Button>
      </div>

      {/* Gare List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-4">
          {gare.length === 0 && (
            <div className="text-center py-10 px-4">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-xs text-slate-400 leading-relaxed">Nessuna gara ancora.<br />Crea la tua prima gara.</p>
            </div>
          )}
          {gare.map((gara) => (
            <button
              key={gara.garaId}
              onClick={() => onSelectGara(gara.garaId)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-all flex items-center gap-2.5 group ${
                activeGaraId === gara.garaId && activeView === 'chat'
                  ? 'bg-white shadow-sm border border-blue-100 text-slate-900'
                  : 'hover:bg-white/70 text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                activeGaraId === gara.garaId && activeView === 'chat'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
              }`}>
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{gara.garaId.replace('gara-', 'Gara ')}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {gara.documents_count > 0 && <span className="text-[10px] text-slate-400">{gara.documents_count} doc</span>}
                  {gara.checklist_items > 0 && <span className="text-[10px] text-slate-400">{gara.checklist_items} req</span>}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
            </button>
          ))}
        </div>
      </ScrollArea>

      <Separator className="bg-slate-200/80" />

      {/* Navigation */}
      <div className="p-2 space-y-0.5">
        <button onClick={onOpenCompanyProfile}
          className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-all flex items-center gap-2.5 ${activeView === 'company' ? 'bg-white shadow-sm text-slate-900' : 'hover:bg-white/70 text-slate-600 hover:text-slate-900'}`}>
          <Building2 className="w-4 h-4" /> <span className="font-medium">Profilo Azienda</span>
        </button>
        <button onClick={() => onOpenSetup('settore')}
          className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-all flex items-center gap-2.5 ${activeView === 'setup-settore' ? 'bg-white shadow-sm text-slate-900' : 'hover:bg-white/70 text-slate-600 hover:text-slate-900'}`}>
          <Settings className="w-4 h-4" /> <span className="font-medium">Setup Settore</span>
        </button>
        {session?.role === 'admin' && (
          <button onClick={onOpenAdmin}
            className="w-full text-left px-3 py-2 rounded-xl text-[13px] transition-all flex items-center gap-2.5 hover:bg-white/70 text-slate-600 hover:text-slate-900">
            <Users className="w-4 h-4" /> <span className="font-medium">Gestione Team</span>
            <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5">Admin</Badge>
          </button>
        )}
      </div>

      <Separator className="bg-slate-200/80" />

      {/* User Footer */}
      <div className="p-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {session?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 truncate">{session?.name}</p>
            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              {session?.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
              {session?.role === 'admin' ? 'Amministratore' : 'Utente'}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600" onClick={onLogout}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
