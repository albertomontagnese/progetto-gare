'use client';

import { useState, useEffect } from 'react';
import { Building2, Save, Upload, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { CompanyProfile } from '@/lib/types';

interface CompanyProfilePanelProps {
  profile: CompanyProfile | null;
  onSave: (profile: CompanyProfile) => void;
  onUploadCv: (files: File[]) => void;
  saving: boolean;
}

export function CompanyProfilePanel({ profile, onSave, onUploadCv, saving }: CompanyProfilePanelProps) {
  const [editedProfile, setEditedProfile] = useState<CompanyProfile>(
    profile || { azienda: { nome: '', descrizione: '', fatturato: '', settore: '' }, certificazioni: [], referenze: [], cv: [], procedure: [], evidenze: [] }
  );

  useEffect(() => {
    if (profile) setEditedProfile(profile);
  }, [profile]);

  const updateAzienda = (field: string, value: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      azienda: { ...prev.azienda, [field]: value },
    }));
  };

  const addCertificazione = () => {
    setEditedProfile((prev) => ({ ...prev, certificazioni: [...prev.certificazioni, ''] }));
  };

  const updateCertificazione = (index: number, value: string) => {
    setEditedProfile((prev) => {
      const next = [...prev.certificazioni];
      next[index] = value;
      return { ...prev, certificazioni: next };
    });
  };

  const removeCertificazione = (index: number) => {
    setEditedProfile((prev) => ({
      ...prev,
      certificazioni: prev.certificazioni.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-[15px]">Profilo Azienda</h2>
            <p className="text-[11px] text-muted-foreground">Dati riusabili per tutte le gare</p>
          </div>
        </div>
        <Button onClick={() => { onSave(editedProfile); toast.success('Profilo salvato'); }} disabled={saving} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Informazioni Generali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome Azienda</label>
                  <Input value={editedProfile.azienda.nome} onChange={(e) => updateAzienda('nome', e.target.value)} placeholder="Es. Costruzioni SpA" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Settore</label>
                  <Input value={editedProfile.azienda.settore} onChange={(e) => updateAzienda('settore', e.target.value)} placeholder="Es. Costruzioni ferroviarie" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fatturato</label>
                <Input value={editedProfile.azienda.fatturato} onChange={(e) => updateAzienda('fatturato', e.target.value)} placeholder="Es. 90M EUR (2023)" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrizione</label>
                <Textarea value={editedProfile.azienda.descrizione} onChange={(e) => updateAzienda('descrizione', e.target.value)} placeholder="Descrizione dell'azienda..." className="text-sm min-h-[80px]" />
              </div>
            </CardContent>
          </Card>

          {/* Certificazioni */}
          <Card>
            <CardHeader className="py-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">Certificazioni</CardTitle>
              <Button variant="ghost" size="sm" onClick={addCertificazione} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Aggiungi
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {editedProfile.certificazioni.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nessuna certificazione. Aggiungine una.</p>
              )}
              {editedProfile.certificazioni.map((cert, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={cert} onChange={(e) => updateCertificazione(i, e.target.value)} placeholder="Es. ISO 9001:2015" className="h-8 text-sm flex-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeCertificazione(i)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* CV Upload */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">CV Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                {(editedProfile.cv || []).map((cv, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{cv}</Badge>
                ))}
                {(!editedProfile.cv || editedProfile.cv.length === 0) && (
                  <p className="text-xs text-muted-foreground">Nessun CV caricato</p>
                )}
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '.pdf,.doc,.docx';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) onUploadCv(Array.from(files));
                };
                input.click();
              }}>
                <Upload className="w-3.5 h-3.5" /> Carica CV
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
