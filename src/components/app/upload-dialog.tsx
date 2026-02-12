'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENT_CATEGORIES } from '@/lib/types';
import type { GaraDocument, DocumentCategory } from '@/lib/types';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  garaId: string;
  phase: 'upload' | 'classify' | 'confirming';
  classifiedDocs: GaraDocument[];
  onUpload: (files: File[]) => void;
  onConfirmClassification: (docs: GaraDocument[]) => void;
  uploading: boolean;
}

const categoryLabels: Record<DocumentCategory, string> = {
  bando: 'Bando',
  disciplinare: 'Disciplinare',
  capitolato: 'Capitolato',
  moduli_ufficiali: 'Moduli Ufficiali',
  allegati_tecnici: 'Allegati Tecnici',
  faq_chiarimenti: 'FAQ / Chiarimenti',
  addendum: 'Addendum',
  offerta_tecnica_schema: 'Schema Offerta Tecnica',
  offerta_economica_schema: 'Schema Offerta Economica',
  altro: 'Altro',
};

export function UploadDialog({
  open, onClose, garaId, phase, classifiedDocs, onUpload, onConfirmClassification, uploading,
}: UploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [editedDocs, setEditedDocs] = useState<GaraDocument[]>(classifiedDocs);

  // Sync classified docs when they change
  useState(() => { setEditedDocs(classifiedDocs); });

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length > 0) onUpload(fileArray);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleCategoryChange = (index: number, category: DocumentCategory) => {
    setEditedDocs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], category };
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {phase === 'upload' ? 'Carica Documenti' : 'Conferma Classificazione'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'upload'
              ? `Carica i documenti per la gara ${garaId}`
              : 'Verifica e correggi la classificazione AI prima di procedere'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Caricamento e classificazione in corso...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="font-medium text-sm mb-1">Trascina i file qui</p>
                <p className="text-xs text-muted-foreground mb-4">PDF, DOC, DOCX, XLS, XLSX, TXT, CSV</p>
                <Button variant="outline" size="sm" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.html,.xml';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFiles(files);
                  };
                  input.click();
                }}>
                  Seleziona file
                </Button>
              </>
            )}
          </div>
        )}

        {(phase === 'classify' || phase === 'confirming') && editedDocs.length > 0 && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {editedDocs.map((doc, i) => (
              <div key={doc.stored_as || i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <FileText className="w-5 h-5 text-primary/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(doc.size / 1024).toFixed(0)} KB</p>
                  {doc.rationale && <p className="text-[10px] text-muted-foreground mt-0.5">{doc.rationale}</p>}
                </div>
                <div className="shrink-0 w-[160px]">
                  <Select
                    value={doc.category}
                    onValueChange={(v) => handleCategoryChange(i, v as DocumentCategory)}
                    disabled={phase === 'confirming'}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">{categoryLabels[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {Math.round(doc.confidence * 100)}%
                </Badge>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button onClick={onClose} variant="outline" className="flex-1" disabled={phase === 'confirming'}>Annulla</Button>
              <Button
                onClick={() => onConfirmClassification(editedDocs)}
                className="flex-1 gap-1.5"
                disabled={phase === 'confirming'}
              >
                {phase === 'confirming' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Elaborazione...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Conferma classificazione</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
