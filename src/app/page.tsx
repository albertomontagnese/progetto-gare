'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SidebarLeft } from '@/components/app/sidebar-left';
import { ChatPanel } from '@/components/app/chat-panel';
import { SidebarRight } from '@/components/app/sidebar-right';
import { UploadDialog } from '@/components/app/upload-dialog';
import { CompanyProfilePanel } from '@/components/app/company-profile-panel';
import type { GaraSummary, GaraOutput, ChatMessage, CompanyProfile, GaraDocument } from '@/lib/types';
import type { SessionPayload } from '@/lib/session';
import type { Tenant } from '@/lib/auth-db';

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(',')[1] || ''); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const router = useRouter();

  // Session
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // App state
  const [gare, setGare] = useState<GaraSummary[]>([]);
  const [activeGaraId, setActiveGaraId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'company' | 'setup-settore' | 'setup-azienda'>('chat');
  const [output, setOutput] = useState<GaraOutput | null>(null);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<'upload' | 'classify' | 'confirming'>('upload');
  const [classifiedDocs, setClassifiedDocs] = useState<GaraDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  // Keep file payloads in memory between upload and confirm (avoids Firestore size limits)
  const [uploadedFilePayloads, setUploadedFilePayloads] = useState<Array<{ name: string; type: string; size: number; content_base64: string }>>([]);

  // Load session
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) { router.push('/login'); return; }
        setSession(data.user);
        setTenant(data.tenant);
        setSessionLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Load gare
  const loadGare = useCallback(async () => {
    try {
      const data = await api<{ gare: GaraSummary[] }>('/api/gare');
      setGare(data.gare);
    } catch (err) {
      if ((err as Error).message === 'UNAUTHORIZED') { router.push('/login'); return; }
      console.error(err);
    }
  }, [router]);

  useEffect(() => { if (!sessionLoading && session) loadGare(); }, [sessionLoading, session, loadGare]);

  const loadGaraData = useCallback(async (garaId: string) => {
    try {
      const [outputData, convoData] = await Promise.all([
        api<{ output: GaraOutput }>(`/api/gare/${encodeURIComponent(garaId)}`),
        api<{ conversation: ChatMessage[] }>(`/api/gare/${encodeURIComponent(garaId)}/conversation`),
      ]);
      setOutput(outputData.output);
      setConversation(convoData.conversation);
    } catch (err) {
      if ((err as Error).message === 'UNAUTHORIZED') { router.push('/login'); return; }
      toast.error('Errore caricamento gara');
    }
  }, [router]);

  const handleSelectGara = useCallback((garaId: string) => {
    setActiveGaraId(garaId); setActiveView('chat'); loadGaraData(garaId);
  }, [loadGaraData]);

  const handleNewGara = useCallback(async () => {
    try {
      const data = await api<{ garaId: string; output: GaraOutput }>('/api/gare', {
        method: 'POST', body: JSON.stringify({ garaId: `gara-${Date.now()}` }),
      });
      setActiveGaraId(data.garaId); setActiveView('chat');
      setOutput(data.output); setConversation([]);
      await loadGare();
      toast.success('Nuova gara creata');
    } catch (err) {
      if ((err as Error).message === 'UNAUTHORIZED') { router.push('/login'); return; }
      toast.error('Errore creazione gara: ' + (err as Error).message);
    }
  }, [loadGare, router]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!activeGaraId) { await handleNewGara(); return; }
    setChatLoading(true);
    try {
      const data = await api<{ assistant_reply: string; output_json: GaraOutput; conversation: ChatMessage[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/chat`,
        { method: 'POST', body: JSON.stringify({ message }) }
      );
      setOutput(data.output_json); setConversation(data.conversation); loadGare();
    } catch (err) { toast.error('Errore: ' + (err as Error).message); }
    finally { setChatLoading(false); }
  }, [activeGaraId, handleNewGara, loadGare]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!activeGaraId) { toast.error('Seleziona prima una gara'); return; }
    setUploading(true);
    try {
      const filePayloads = await Promise.all(files.map(async (f) => ({
        name: f.name, type: f.type, size: f.size, content_base64: await fileToBase64(f),
      })));
      const data = await api<{ files: GaraDocument[]; output_json: GaraOutput; conversation: ChatMessage[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/upload`,
        { method: 'POST', body: JSON.stringify({ files: filePayloads }) }
      );
      setClassifiedDocs(data.files); setUploadPhase('classify');
      setUploadedFilePayloads(filePayloads); // keep in memory for confirm step
      setOutput(data.output_json); setConversation(data.conversation);
      toast.success(`${files.length} documenti caricati`);
    } catch (err) { toast.error('Errore upload: ' + (err as Error).message); }
    finally { setUploading(false); }
  }, [activeGaraId]);

  const handleConfirmClassification = useCallback(async (docs: GaraDocument[]) => {
    if (!activeGaraId) return;
    setUploadPhase('confirming');
    try {
      const data = await api<{ output_json: GaraOutput; conversation: ChatMessage[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/document-classification/confirm`,
        { method: 'POST', body: JSON.stringify({ documents: docs, rawFiles: uploadedFilePayloads }) }
      );
      setOutput(data.output_json); setConversation(data.conversation);
      setUploadOpen(false); setUploadPhase('upload'); setClassifiedDocs([]); setUploadedFilePayloads([]); loadGare();
      toast.success('Estrazione completata');
    } catch (err) { toast.error('Errore: ' + (err as Error).message); setUploadPhase('classify'); }
  }, [activeGaraId, loadGare, uploadedFilePayloads]);

  const handleChecklistProgress = useCallback(async (itemIndex: number, progress: 'todo' | 'wip' | 'done') => {
    if (!activeGaraId) return;
    try {
      const data = await api<{ output_json: GaraOutput }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/checklist/progress`,
        { method: 'POST', body: JSON.stringify({ item_index: itemIndex, progress }) }
      );
      setOutput(data.output_json);
    } catch (err) { toast.error('Errore: ' + (err as Error).message); }
  }, [activeGaraId]);

  const handleAutofill = useCallback(async (itemIndex: number) => {
    if (!activeGaraId) return;
    toast.info('Generazione bozza automatica...');
    try {
      const data = await api<{ output_json: GaraOutput; conversation: ChatMessage[] }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/qa/autofill`,
        { method: 'POST', body: JSON.stringify({ item_index: itemIndex }) }
      );
      setOutput(data.output_json); setConversation(data.conversation);
      toast.success('Bozza generata');
    } catch (err) { toast.error('Errore: ' + (err as Error).message); }
  }, [activeGaraId]);

  const handleStartGuidedQA = useCallback(async () => {
    if (!activeGaraId) return;
    setChatLoading(true);
    try {
      const data = await api<{ assistant_reply: string; questions: Array<{ domanda: string; suggerimento_ai: string }> }>(
        `/api/gare/${encodeURIComponent(activeGaraId)}/qa/generate`,
        { method: 'POST' }
      );
      if (data.questions.length > 0) {
        setConversation((prev) => [...prev, {
          role: 'assistant',
          text: `${data.assistant_reply}\n\n${data.questions.map((q, i) => `${i + 1}. ${q.domanda}\n   Suggerimento: ${q.suggerimento_ai}`).join('\n\n')}`,
          created_at: new Date().toISOString(),
        }]);
      }
      toast.info(data.assistant_reply);
    } catch (err) { toast.error('Errore: ' + (err as Error).message); }
    finally { setChatLoading(false); }
  }, [activeGaraId]);

  const loadCompanyProfile = useCallback(async () => {
    try {
      const data = await api<{ profile: CompanyProfile }>('/api/workspace/azienda');
      setCompanyProfile(data.profile);
    } catch (err) { console.error(err); }
  }, []);

  const handleSaveCompanyProfile = useCallback(async (profile: CompanyProfile) => {
    setSaving(true);
    try { await api('/api/workspace/azienda', { method: 'POST', body: JSON.stringify({ profile }) }); setCompanyProfile(profile); }
    catch (err) { toast.error('Errore: ' + (err as Error).message); }
    finally { setSaving(false); }
  }, []);

  const handleUploadCv = useCallback(async (files: File[]) => {
    try {
      const payloads = await Promise.all(files.map(async (f) => ({
        name: f.name, type: f.type, size: f.size, content_base64: await fileToBase64(f),
      })));
      const data = await api<{ cv_files: string[] }>('/api/workspace/azienda/cv', { method: 'POST', body: JSON.stringify({ files: payloads }) });
      setCompanyProfile((prev) => prev ? { ...prev, cv: data.cv_files } : prev);
      toast.success('CV caricati');
    } catch (err) { toast.error('Errore: ' + (err as Error).message); }
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  }, [router]);

  if (sessionLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 relative noise">
        <div className="text-center animate-fade-in-up">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/25 animate-pulse">
            <span className="text-white font-bold text-xl">PG</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* Left Sidebar */}
      <div className="w-[264px] shrink-0">
        <SidebarLeft
          gare={gare}
          activeGaraId={activeGaraId}
          onSelectGara={handleSelectGara}
          onNewGara={handleNewGara}
          onOpenCompanyProfile={() => { setActiveView('company'); loadCompanyProfile(); }}
          onOpenSetup={(type) => setActiveView(`setup-${type}` as 'setup-settore' | 'setup-azienda')}
          activeView={activeView}
          session={session}
          tenant={tenant}
          onLogout={handleLogout}
          onOpenAdmin={() => router.push('/admin')}
        />
      </div>

      {/* Center */}
      <div className="flex-1 min-w-0">
        {activeView === 'company' ? (
          <CompanyProfilePanel profile={companyProfile} onSave={handleSaveCompanyProfile} onUploadCv={handleUploadCv} saving={saving} />
        ) : (
          <ChatPanel garaId={activeGaraId} conversation={conversation} loading={chatLoading}
            onSendMessage={handleSendMessage} onUpload={() => { if (!activeGaraId) { toast.error('Crea prima una gara'); return; } setUploadPhase('upload'); setClassifiedDocs([]); setUploadOpen(true); }}
            onStartGuidedQA={handleStartGuidedQA} session={session} />
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-[480px] shrink-0 border-l border-slate-200 h-full overflow-hidden">
        <SidebarRight garaId={activeGaraId} output={output} onChecklistProgress={handleChecklistProgress} onAutofill={handleAutofill} />
      </div>

      {activeGaraId && (
        <UploadDialog open={uploadOpen} onClose={() => { setUploadOpen(false); setUploadPhase('upload'); }}
          garaId={activeGaraId} phase={uploadPhase} classifiedDocs={classifiedDocs}
          onUpload={handleUpload} onConfirmClassification={handleConfirmClassification} uploading={uploading} />
      )}
    </div>
  );
}
