'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { SidebarLeft } from '@/components/app/sidebar-left';
import { ChatPanel } from '@/components/app/chat-panel';
import { SidebarRight } from '@/components/app/sidebar-right';
import { UploadDialog } from '@/components/app/upload-dialog';
import { CompanyProfilePanel } from '@/components/app/company-profile-panel';
import type { GaraSummary, GaraOutput, ChatMessage, CompanyProfile, GaraDocument } from '@/lib/types';

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  // ─── Global State ───
  const [gare, setGare] = useState<GaraSummary[]>([]);
  const [activeGaraId, setActiveGaraId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'company' | 'setup-settore' | 'setup-azienda'>('chat');
  const [output, setOutput] = useState<GaraOutput | null>(null);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // ─── Loading states ───
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Upload dialog ───
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<'upload' | 'classify' | 'confirming'>('upload');
  const [classifiedDocs, setClassifiedDocs] = useState<GaraDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  // ─── Load gare list ───
  const loadGare = useCallback(async () => {
    try {
      const data = await api<{ gare: GaraSummary[] }>('/api/gare');
      setGare(data.gare);
    } catch (err) {
      console.error('Failed to load gare:', err);
    }
  }, []);

  useEffect(() => { loadGare(); }, [loadGare]);

  // ─── Load gara data ───
  const loadGaraData = useCallback(async (garaId: string) => {
    try {
      const [outputData, convoData] = await Promise.all([
        api<{ output: GaraOutput }>(`/api/gare/${encodeURIComponent(garaId)}`),
        api<{ conversation: ChatMessage[] }>(`/api/gare/${encodeURIComponent(garaId)}/conversation`),
      ]);
      setOutput(outputData.output);
      setConversation(convoData.conversation);
    } catch (err) {
      console.error('Failed to load gara data:', err);
      toast.error('Errore nel caricamento dati gara');
    }
  }, []);

  // ─── Select gara ───
  const handleSelectGara = useCallback((garaId: string) => {
    setActiveGaraId(garaId);
    setActiveView('chat');
    loadGaraData(garaId);
  }, [loadGaraData]);

  // ─── New gara ───
  const handleNewGara = useCallback(async () => {
    try {
      const data = await api<{ garaId: string; output: GaraOutput }>('/api/gare', {
        method: 'POST',
        body: JSON.stringify({ garaId: `gara-${Date.now()}` }),
      });
      setActiveGaraId(data.garaId);
      setActiveView('chat');
      setOutput(data.output);
      setConversation([]);
      await loadGare();
      toast.success('Nuova gara creata');
    } catch (err) {
      console.error('Failed to create gara:', err);
      toast.error('Errore creazione gara');
    }
  }, [loadGare]);

  // ─── Send message ───
  const handleSendMessage = useCallback(async (message: string) => {
    if (!activeGaraId) {
      // If no active gara, create one first
      await handleNewGara();
      return;
    }
    setChatLoading(true);
    try {
      const data = await api<{ assistant_reply: string; output_json: GaraOutput; conversation: ChatMessage[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/chat`,
        { method: 'POST', body: JSON.stringify({ message }) }
      );
      setOutput(data.output_json);
      setConversation(data.conversation);
      loadGare();
    } catch (err) {
      console.error('Chat error:', err);
      toast.error('Errore invio messaggio');
    } finally {
      setChatLoading(false);
    }
  }, [activeGaraId, handleNewGara, loadGare]);

  // ─── Upload documents ───
  const handleUpload = useCallback(async (files: File[]) => {
    if (!activeGaraId) {
      toast.error('Seleziona prima una gara');
      return;
    }
    setUploading(true);
    try {
      const filePayloads = await Promise.all(files.map(async (f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        content_base64: await fileToBase64(f),
      })));
      const data = await api<{ files: GaraDocument[]; output_json: GaraOutput; conversation: ChatMessage[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/upload`,
        { method: 'POST', body: JSON.stringify({ files: filePayloads }) }
      );
      setClassifiedDocs(data.files);
      setUploadPhase('classify');
      setOutput(data.output_json);
      setConversation(data.conversation);
      toast.success(`${files.length} documenti caricati e classificati`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Errore upload');
    } finally {
      setUploading(false);
    }
  }, [activeGaraId]);

  // ─── Confirm classification ───
  const handleConfirmClassification = useCallback(async (docs: GaraDocument[]) => {
    if (!activeGaraId) return;
    setUploadPhase('confirming');
    try {
      const data = await api<{ output_json: GaraOutput; conversation: ChatMessage[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/document-classification/confirm`,
        { method: 'POST', body: JSON.stringify({ documents: docs }) }
      );
      setOutput(data.output_json);
      setConversation(data.conversation);
      setUploadOpen(false);
      setUploadPhase('upload');
      setClassifiedDocs([]);
      loadGare();
      toast.success('Classificazione confermata. Estrazione completata.');
    } catch (err) {
      console.error('Confirm error:', err);
      toast.error('Errore conferma classificazione');
      setUploadPhase('classify');
    }
  }, [activeGaraId, loadGare]);

  // ─── Checklist progress ───
  const handleChecklistProgress = useCallback(async (itemIndex: number, progress: 'todo' | 'wip' | 'done') => {
    if (!activeGaraId) return;
    try {
      const data = await api<{ output_json: GaraOutput }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/checklist/progress`,
        { method: 'POST', body: JSON.stringify({ item_index: itemIndex, progress }) }
      );
      setOutput(data.output_json);
    } catch (err) {
      console.error('Progress error:', err);
      toast.error('Errore aggiornamento progresso');
    }
  }, [activeGaraId]);

  // ─── Autofill ───
  const handleAutofill = useCallback(async (itemIndex: number) => {
    if (!activeGaraId) return;
    toast.info('Generazione bozza automatica...');
    try {
      const data = await api<{ output_json: GaraOutput; conversation: ChatMessage[]; answer: string }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/qa/autofill`,
        { method: 'POST', body: JSON.stringify({ item_index: itemIndex }) }
      );
      setOutput(data.output_json);
      setConversation(data.conversation);
      toast.success('Bozza automatica generata');
    } catch (err) {
      console.error('Autofill error:', err);
      toast.error('Errore autofill');
    }
  }, [activeGaraId]);

  // ─── Guided QA ───
  const handleStartGuidedQA = useCallback(async () => {
    if (!activeGaraId) return;
    setChatLoading(true);
    try {
      const data = await api<{ assistant_reply: string; questions: unknown[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/qa/generate`,
        { method: 'POST' }
      );
      toast.info(data.assistant_reply);
      if (data.questions.length > 0) {
        // Add as assistant message
        setConversation((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `${data.assistant_reply}\n\n${(data.questions as Array<{ domanda: string; suggerimento_ai: string }>).map((q, i) => `${i + 1}. ${q.domanda}\n   Suggerimento: ${q.suggerimento_ai}`).join('\n\n')}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('QA generate error:', err);
      toast.error('Errore generazione Q/A');
    } finally {
      setChatLoading(false);
    }
  }, [activeGaraId]);

  // ─── Company profile ───
  const loadCompanyProfile = useCallback(async () => {
    try {
      const data = await api<{ profile: CompanyProfile }>('/api/workspace/azienda');
      setCompanyProfile(data.profile);
    } catch (err) {
      console.error('Failed to load company profile:', err);
    }
  }, []);

  const handleSaveCompanyProfile = useCallback(async (profile: CompanyProfile) => {
    setSaving(true);
    try {
      await api('/api/workspace/azienda', { method: 'POST', body: JSON.stringify({ profile }) });
      setCompanyProfile(profile);
    } catch (err) {
      console.error('Save profile error:', err);
      toast.error('Errore salvataggio profilo');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleUploadCv = useCallback(async (files: File[]) => {
    try {
      const filePayloads = await Promise.all(files.map(async (f) => ({
        name: f.name, type: f.type, size: f.size, content_base64: await fileToBase64(f),
      })));
      const data = await api<{ cv_files: string[] }>('/api/workspace/azienda/cv', { method: 'POST', body: JSON.stringify({ files: filePayloads }) });
      setCompanyProfile((prev) => prev ? { ...prev, cv: data.cv_files } : prev);
      toast.success('CV caricati');
    } catch (err) {
      console.error('Upload CV error:', err);
      toast.error('Errore upload CV');
    }
  }, []);

  const handleOpenCompanyProfile = useCallback(() => {
    setActiveView('company');
    loadCompanyProfile();
  }, [loadCompanyProfile]);

  const handleOpenUploadDialog = useCallback(() => {
    if (!activeGaraId) {
      toast.error('Crea prima una gara');
      return;
    }
    setUploadPhase('upload');
    setClassifiedDocs([]);
    setUploadOpen(true);
  }, [activeGaraId]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Sidebar - 260px */}
      <div className="w-[260px] shrink-0">
        <SidebarLeft
          gare={gare}
          activeGaraId={activeGaraId}
          onSelectGara={handleSelectGara}
          onNewGara={handleNewGara}
          onOpenCompanyProfile={handleOpenCompanyProfile}
          onOpenSetup={(type) => setActiveView(`setup-${type}` as 'setup-settore' | 'setup-azienda')}
          activeView={activeView}
        />
      </div>

      {/* Center Panel */}
      <div className="flex-1 min-w-0">
        {activeView === 'company' ? (
          <CompanyProfilePanel
            profile={companyProfile}
            onSave={handleSaveCompanyProfile}
            onUploadCv={handleUploadCv}
            saving={saving}
          />
        ) : (
          <ChatPanel
            garaId={activeGaraId}
            conversation={conversation}
            loading={chatLoading}
            onSendMessage={handleSendMessage}
            onUpload={handleOpenUploadDialog}
            onStartGuidedQA={handleStartGuidedQA}
          />
        )}
      </div>

      {/* Right Sidebar - 480px */}
      <div className="w-[480px] shrink-0 border-l">
        <SidebarRight
          garaId={activeGaraId}
          output={output}
          onChecklistProgress={handleChecklistProgress}
          onAutofill={handleAutofill}
        />
      </div>

      {/* Upload Dialog */}
      {activeGaraId && (
        <UploadDialog
          open={uploadOpen}
          onClose={() => { setUploadOpen(false); setUploadPhase('upload'); }}
          garaId={activeGaraId}
          phase={uploadPhase}
          classifiedDocs={classifiedDocs}
          onUpload={handleUpload}
          onConfirmClassification={handleConfirmClassification}
          uploading={uploading}
        />
      )}
    </div>
  );
}
