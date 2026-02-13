'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, FileText, Sparkles, ClipboardList, AlertTriangle, FileOutput, Bot, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage, GaraDocument } from '@/lib/types';
import type { SessionPayload } from '@/lib/session';

interface MentionableDoc {
  name: string;
  source: 'gara' | 'azienda';
  category: string;
}

interface ChatPanelProps {
  garaId: string | null;
  conversation: ChatMessage[];
  loading: boolean;
  onSendMessage: (message: string) => void;
  onToggleDocs: () => void;
  onStartGuidedQA: () => void;
  session?: SessionPayload | null;
  garaDocs?: GaraDocument[];
  companyDocs?: Array<{ name: string; category: string }>;
}

export function ChatPanel({ garaId, conversation, loading, onSendMessage, onToggleDocs, onStartGuidedQA, session, garaDocs = [], companyDocs = [] }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @ mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIdx, setMentionIdx] = useState(0);

  const allDocs: MentionableDoc[] = [
    ...garaDocs.map((d) => ({ name: d.name, source: 'gara' as const, category: d.category })),
    ...companyDocs.map((d) => ({ name: d.name, source: 'azienda' as const, category: d.category })),
  ];
  const filteredDocs = allDocs.filter((d) =>
    d.name.toLowerCase().includes(mentionFilter.toLowerCase())
  ).slice(0, 8);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); });
  }, []);
  useEffect(() => { scrollToBottom(); }, [conversation, scrollToBottom]);

  const handleSend = () => {
    if (!message.trim() || loading) return;
    onSendMessage(message.trim());
    setMessage('');
    setShowMentions(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const insertMention = (doc: MentionableDoc) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const textBefore = message.slice(0, cursorPos);
    const textAfter = message.slice(cursorPos);
    // Find the @ that triggered the popup
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx === -1) return;
    const prefix = `[${doc.source === 'gara' ? 'DOC GARA' : 'DOC AZIENDA'}: ${doc.name}]`;
    const newMsg = textBefore.slice(0, atIdx) + prefix + ' ' + textAfter;
    setMessage(newMsg);
    setShowMentions(false);
    setTimeout(() => ta.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    // Check for @ trigger
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx !== -1 && (atIdx === 0 || textBefore[atIdx - 1] === ' ')) {
      const query = textBefore.slice(atIdx + 1);
      if (!query.includes(' ') || query.length < 30) {
        setMentionFilter(query);
        setMentionIdx(0);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredDocs.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((prev) => Math.min(prev + 1, filteredDocs.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((prev) => Math.max(prev - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredDocs[mentionIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setShowMentions(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    { label: 'Q/A Guidata', icon: ClipboardList, action: onStartGuidedQA },
    { label: 'Red flags', icon: AlertTriangle, action: () => onSendMessage('Quali red flags hai trovato?') },
    { label: 'Compliance', icon: Sparkles, action: () => onSendMessage('Mostrami la matrice compliance') },
    { label: 'Bozza offerta', icon: FileOutput, action: () => onSendMessage('Esporta bozza offerta') },
  ];

  if (!garaId) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-gradient-to-br from-white via-blue-50/20 to-white">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Sparkles className="w-9 h-9 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            Ciao{session?.name ? `, ${session.name.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Seleziona una gara dalla sidebar oppure creane una nuova per iniziare l&apos;analisi AI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="font-bold text-[15px] text-slate-900">{garaId.replace('gara-', 'Gara ')}</h2>
          <p className="text-[11px] text-slate-400">{conversation.length} messaggi</p>
        </div>
        <Button onClick={onToggleDocs} variant="outline" size="sm" className="gap-1.5 text-xs h-8 rounded-lg">
          <FileText className="w-3.5 h-3.5" /> Documenti
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-5 space-y-5">
          {conversation.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400 mb-4">Nessun messaggio.</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button onClick={onToggleDocs}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all">
                  <FileText className="w-4 h-4" /> Carica documenti gara
                </button>
                <button onClick={() => onSendMessage('Quali sono i requisiti principali?')}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-[12px] font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all">
                  <Sparkles className="w-4 h-4" /> Analizza requisiti
                </button>
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {conversation.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-hidden ${
                  msg.role === 'user' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15'
                    : 'bg-white border border-slate-200/80 text-slate-800 shadow-sm'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                  <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"><Bot className="w-4 h-4" /></div>
              <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-slate-500">Elaborazione...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 py-2 flex gap-2 flex-wrap border-t border-slate-100 bg-slate-50/50 shrink-0">
        {quickActions.map((a) => (
          <button key={a.label} onClick={a.action}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/80 transition-all">
            <a.icon className="w-3 h-3" /> {a.label}
          </button>
        ))}
      </div>

      {/* Input with @ mention */}
      <div className="px-5 py-3 border-t border-slate-100 bg-white shrink-0 relative">
        {/* @ mention popup */}
        <AnimatePresence>
          {showMentions && filteredDocs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-5 right-5 mb-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-2 border-b border-slate-100">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider px-2">Riferisci un documento</p>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {filteredDocs.map((doc, i) => (
                  <button key={`${doc.source}-${doc.name}`}
                    onClick={() => insertMention(doc)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors ${
                      i === mentionIdx ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50 text-slate-700'
                    }`}>
                    {doc.source === 'gara' ? <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                    <span className="flex-1 truncate">{doc.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{doc.source === 'gara' ? 'Gara' : 'Azienda'}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea ref={textareaRef} value={message}
              onChange={handleInputChange} onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio... (usa @ per riferire un documento)"
              className="w-full min-h-[44px] max-h-[120px] resize-none rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 px-4 py-3 text-[14px] outline-none"
              rows={1}
            />
          </div>
          <Button onClick={handleSend} disabled={!message.trim() || loading} size="icon"
            className="h-[44px] w-[44px] rounded-xl shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 disabled:opacity-40">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
