'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Save, Upload, Plus, Trash2, Loader2, FileText, FolderOpen, Shield, BarChart3, Users, HardHat, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { CompanyProfile } from '@/lib/types';

interface CompanyDoc {
  name: string;
  stored_as: string;
  category: string;
  key_facts: string[];
  uploaded_at: string;
  size: number;
}

interface CompanyProfilePanelProps {
  profile: CompanyProfile | null;
  onSave: (profile: CompanyProfile) => void;
  onUploadCv: (files: File[]) => void;
  saving: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  profilo_aziendale: <Building2 className="w-4 h-4 text-blue-600" />,
  bilancio: <BarChart3 className="w-4 h-4 text-green-600" />,
  certificazioni: <Shield className="w-4 h-4 text-purple-600" />,
  referenze_progetti: <FolderOpen className="w-4 h-4 text-orange-600" />,
  organigramma_cv: <Users className="w-4 h-4 text-cyan-600" />,
  policy_hse: <HardHat className="w-4 h-4 text-red-600" />,
  procedure_operative: <BookOpen className="w-4 h-4 text-indigo-600" />,
  altro: <FileText className="w-4 h-4 text-slate-500" />,
};

const categoryLabels: Record<string, string> = {
  profilo_aziendale: 'Profilo Aziendale',
  bilancio: 'Bilancio / Finanziario',
  certificazioni: 'Certificazioni',
  referenze_progetti: 'Referenze Progetti',
  organigramma_cv: 'Organigramma & CV',
  policy_hse: 'Policy HSE / Sicurezza',
  procedure_operative: 'Procedure Operative',
  altro: 'Altro',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(',')[1] || ''); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CompanyProfilePanel({ profile, onSave, onUploadCv, saving }: CompanyProfilePanelProps) {
  const [editedProfile, setEditedProfile] = useState<CompanyProfile>(
    profile || { azienda: { nome: '', descrizione: '', fatturato: '', settore: '' }, certificazioni: [], referenze: [], cv: [], procedure: [], evidenze: [] }
  );
  const [companyDocs, setCompanyDocs] = useState<CompanyDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (profile) setEditedProfile(profile); }, [profile]);

  const loadCompanyDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/azienda/documents');
      const data = await res.json();
      setCompanyDocs(data.documents || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCompanyDocs(); }, [loadCompanyDocs]);

  const updateAzienda = (field: string, value: string) => {
    setEditedProfile((prev) => ({ ...prev, azienda: { ...prev.azienda, [field]: value } }));
  };

  const addCertificazione = () => setEditedProfile((prev) => ({ ...prev, certificazioni: [...prev.certificazioni, ''] }));
  const updateCertificazione = (i: number, v: string) => {
    setEditedProfile((prev) => { const n = [...prev.certificazioni]; n[i] = v; return { ...prev, certificazioni: n }; });
  };
  const removeCertificazione = (i: number) => {
    setEditedProfile((prev) => ({ ...prev, certificazioni: prev.certificazioni.filter((_, j) => j !== i) }));
  };

  const handleUploadDocs = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const payloads = await Promise.all(files.map(async (f) => ({
        name: f.name, type: f.type, size: f.size, content_base64: await fileToBase64(f),
      })));
      const res = await fetch('/api/workspace/azienda/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloads }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      toast.success(`${files.length} documenti caricati e analizzati`);
      loadCompanyDocs();
    } catch (err) {
      toast.error('Errore: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Group docs by category
  const docsByCategory = companyDocs.reduce((acc, doc) => {
    const cat = doc.category || 'altro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, CompanyDoc[]>);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-[16px]">Workspace Azienda</h2>
            <p className="text-[11px] text-muted-foreground">Documenti, certificazioni e profilo riusabili per tutte le gare</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { onSave(editedProfile); toast.success('Profilo salvato'); }} disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salva profilo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 space-y-6">

          {/* ═══════ Upload Area ═══════ */}
          <Card className="border-dashed border-2 border-blue-200 bg-blue-50/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-slate-800">Carica documenti aziendali</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bilanci, certificazioni, referenze, organigramma, policy HSE, procedure operative...
                    <br />L&apos;AI classifichera e estrarra i fatti chiave automaticamente.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={uploading} className="gap-1.5 shrink-0"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.multiple = true;
                    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) handleUploadDocs(Array.from(files));
                    };
                    input.click();
                  }}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Analisi in corso...' : 'Seleziona file'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ═══════ Uploaded Documents by Category ═══════ */}
          {companyDocs.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  Documenti Aziendali
                  <Badge variant="secondary" className="ml-auto text-xs">{companyDocs.length} documenti</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence>
                  {Object.entries(docsByCategory).map(([cat, docs]) => (
                    <motion.div key={cat} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex items-center gap-2 mb-2">
                        {categoryIcons[cat] || categoryIcons.altro}
                        <span className="text-[12px] font-semibold text-slate-700">{categoryLabels[cat] || cat}</span>
                        <span className="text-[10px] text-slate-400">({docs.length})</span>
                      </div>
                      <div className="space-y-1.5 ml-6 mb-3">
                        {docs.map((doc, i) => (
                          <div key={doc.stored_as || i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-[12px] font-medium text-slate-700 truncate flex-1">{doc.name}</span>
                              <span className="text-[10px] text-slate-400">{(doc.size / 1024).toFixed(0)} KB</span>
                            </div>
                            {doc.key_facts && doc.key_facts.length > 0 && (
                              <div className="mt-1.5 ml-5 space-y-0.5">
                                {doc.key_facts.slice(0, 5).map((fact, j) => (
                                  <div key={j} className="text-[10px] text-slate-500 flex gap-1.5">
                                    <span className="text-blue-400 shrink-0">&bull;</span>
                                    <span>{fact}</span>
                                  </div>
                                ))}
                                {doc.key_facts.length > 5 && (
                                  <div className="text-[10px] text-slate-400 ml-3">+{doc.key_facts.length - 5} altri fatti</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* ═══════ Company Info (quick edit) ═══════ */}
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
                <Textarea value={editedProfile.azienda.descrizione} onChange={(e) => updateAzienda('descrizione', e.target.value)} placeholder="Descrizione azienda..." className="text-sm min-h-[60px]" />
              </div>
            </CardContent>
          </Card>

          {/* Certificazioni */}
          <Card>
            <CardHeader className="py-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">Certificazioni (rapide)</CardTitle>
              <Button variant="ghost" size="sm" onClick={addCertificazione} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Aggiungi</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {editedProfile.certificazioni.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nessuna. Aggiungine una o carica il PDF certificazioni.</p>}
              {editedProfile.certificazioni.map((cert, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={cert} onChange={(e) => updateCertificazione(i, e.target.value)} placeholder="Es. ISO 9001:2015" className="h-8 text-sm flex-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeCertificazione(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CV Upload */}
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">CV Team</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                {(editedProfile.cv || []).map((cv, i) => (<Badge key={i} variant="secondary" className="text-xs">{cv}</Badge>))}
                {(!editedProfile.cv || editedProfile.cv.length === 0) && <p className="text-xs text-muted-foreground">Nessun CV</p>}
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = '.pdf,.doc,.docx';
                input.onchange = (e) => { const f = (e.target as HTMLInputElement).files; if (f) onUploadCv(Array.from(f)); }; input.click();
              }}><Upload className="w-3.5 h-3.5" /> Carica CV</Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
