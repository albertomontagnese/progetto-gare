'use client';

import { useState } from 'react';
import { Loader2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
            <span className="text-white font-bold text-xl">PG</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Progetto Gare</h1>
          <p className="text-sm text-slate-500 mt-1">Piattaforma AI per gare d&apos;appalto</p>
        </div>

        <Card className="shadow-xl shadow-slate-200/50 border-slate-200/60">
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Controlla la tua email</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Abbiamo inviato un link di accesso a<br />
                  <strong className="text-slate-700">{email}</strong>
                </p>
                <p className="text-xs text-slate-400 mt-4">Il link scade tra 15 minuti</p>
                <Button variant="ghost" className="mt-4 text-xs" onClick={() => { setSent(false); setEmail(''); }}>
                  Usa un&apos;altra email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">Accedi o registrati</h2>
                  <p className="text-sm text-slate-500">Inserisci la tua email per ricevere un link di accesso sicuro.</p>
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@azienda.com"
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus-visible:ring-blue-500/30"
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Invio in corso...</>
                  ) : (
                    <>Continua <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Cliccando &quot;Continua&quot; riceverai un link di accesso via email. Nessuna password richiesta.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Progetto Gare &middot; Piattaforma sicura per gestione gare d&apos;appalto
        </p>
      </div>
    </div>
  );
}
