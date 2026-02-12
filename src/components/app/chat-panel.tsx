'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Upload, Sparkles, ClipboardList, AlertTriangle, FileOutput, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/lib/types';
import type { SessionPayload } from '@/lib/session';

interface ChatPanelProps {
  garaId: string | null;
  conversation: ChatMessage[];
  loading: boolean;
  onSendMessage: (message: string) => void;
  onUpload: () => void;
  onStartGuidedQA: () => void;
  session?: SessionPayload | null;
}

export function ChatPanel({ garaId, conversation, loading, onSendMessage, onUpload, onStartGuidedQA, session }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);
  useEffect(() => { scrollToBottom(); }, [conversation, scrollToBottom]);

  const handleSend = () => {
    if (!message.trim() || loading) return;
    onSendMessage(message.trim());
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            Seleziona una gara dalla sidebar oppure creane una nuova per iniziare l&apos;analisi AI dei documenti di gara.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={onUpload} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all text-left group shadow-sm">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                <Upload className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800">Carica documenti gara</div>
                <div className="text-xs text-slate-500 mt-0.5">Bando, disciplinare, capitolato</div>
              </div>
            </button>
            <button onClick={() => onSendMessage('Descrivi la gara')} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all text-left group shadow-sm">
              <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800">Descrivi la gara</div>
                <div className="text-xs text-slate-500 mt-0.5">Raccontami i requisiti principali</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-sm">
        <div>
          <h2 className="font-bold text-[15px] text-slate-900">{garaId.replace('gara-', 'Gara ')}</h2>
          <p className="text-[11px] text-slate-400">{conversation.length} messaggi</p>
        </div>
        <Button variant="outline" size="sm" onClick={onUpload} className="gap-1.5 text-xs h-8 rounded-lg border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
          <Upload className="w-3.5 h-3.5" /> Carica documenti
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-5 space-y-5">
          {conversation.length === 0 && (
            <div className="text-center py-16">
              <Bot className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nessun messaggio. Inizia caricando documenti o descrivendo la gara.</p>
            </div>
          )}
          <AnimatePresence initial={false}>
          {conversation.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                  : 'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
              }`}>
                {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15'
                  : 'bg-white border border-slate-200/80 text-slate-800 shadow-sm'
              }`}>
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-sm">
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
      </ScrollArea>

      {/* Quick Actions */}
      <div className="px-6 py-2.5 flex gap-2 flex-wrap border-t border-slate-100 bg-slate-50/50">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={action.action}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/80 hover:shadow-sm transition-all hover-lift"
          >
            <action.icon className="w-3 h-3" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-3.5 border-t border-slate-100 bg-white">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio..."
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-blue-500/30 focus-visible:border-blue-300 pr-4 text-[14px]"
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
