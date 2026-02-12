'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Upload, Sparkles, ClipboardList, AlertTriangle, FileOutput, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ChatMessage } from '@/lib/types';

interface ChatPanelProps {
  garaId: string | null;
  conversation: ChatMessage[];
  loading: boolean;
  onSendMessage: (message: string) => void;
  onUpload: () => void;
  onStartGuidedQA: () => void;
}

export function ChatPanel({ garaId, conversation, loading, onSendMessage, onUpload, onStartGuidedQA }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Benvenuto in Progetto Gare</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Seleziona una gara dalla sidebar oppure creane una nuova per iniziare l&apos;analisi AI.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={onUpload} className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary/30 hover:bg-blue-50/50 transition-all text-left">
              <Upload className="w-5 h-5 text-primary" />
              <div>
                <div className="font-semibold text-sm">Carica documenti gara</div>
                <div className="text-xs text-muted-foreground">Bando, disciplinare, capitolato</div>
              </div>
            </button>
            <button onClick={() => onSendMessage('Descrivi la gara')} className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary/30 hover:bg-blue-50/50 transition-all text-left">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <div className="font-semibold text-sm">Descrivi la gara</div>
                <div className="text-xs text-muted-foreground">Raccontami i requisiti principali</div>
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
      <div className="px-6 py-3 border-b flex items-center justify-between bg-white">
        <div>
          <h2 className="font-bold text-[15px]">Gara: {garaId}</h2>
          <p className="text-[11px] text-muted-foreground">{conversation.length} messaggi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onUpload} className="gap-1.5 text-xs h-8">
            <Upload className="w-3.5 h-3.5" /> Documenti
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-4">
          {conversation.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">Nessun messaggio. Inizia caricando documenti o descrivendo la gara.</p>
            </div>
          )}
          {conversation.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === 'assistant' ? 'bg-primary text-white' : 'bg-slate-700 text-white'
              }`}>
                {msg.role === 'assistant' ? 'AI' : 'Tu'}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted border'
              }`}>
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className="text-[10px] text-muted-foreground mt-1.5">
                  {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">AI</div>
              <div className="bg-muted border rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Elaborazione in corso...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="px-6 py-2 flex gap-2 flex-wrap border-t bg-muted/30">
        {quickActions.map((action) => (
          <Badge
            key={action.label}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-all py-1 px-2.5 gap-1"
            onClick={action.action}
          >
            <action.icon className="w-3 h-3" />
            <span className="text-[11px]">{action.label}</span>
          </Badge>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-3 border-t bg-white">
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            className="min-h-[42px] max-h-[120px] resize-none rounded-xl border-muted focus-visible:ring-primary/30"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || loading}
            size="icon"
            className="h-[42px] w-[42px] rounded-xl shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
