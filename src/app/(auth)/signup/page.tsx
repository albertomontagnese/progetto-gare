'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  const invitationId = searchParams.get('invitation') || '';

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationInfo, setInvitationInfo] = useState<{ tenantName: string } | null>(null);

  useEffect(() => {
    if (!email) router.push('/login');
  }, [email, router]);

  const isInvited = !!invitationId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!isInvited && !companyName.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, companyName, invitationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
            <span className="text-white font-bold text-xl">PG</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Completa la registrazione</h1>
          {isInvited ? (
            <Badge variant="secondary" className="mt-2">Invitato{invitationInfo?.tenantName ? ` da ${invitationInfo.tenantName}` : ''}</Badge>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Crea il tuo account e la tua azienda</p>
          )}
        </div>

        <Card className="shadow-xl shadow-slate-200/50 border-slate-200/60">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
                <span className="text-xs text-blue-700 font-medium">Email verificata:</span>
                <span className="text-xs text-blue-900 font-semibold">{email}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Il tuo nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mario Rossi"
                    className="pl-10 h-11 bg-slate-50"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {!isInvited && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome Azienda</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Costruzioni SpA"
                      className="pl-10 h-11 bg-slate-50"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Sarai l&apos;amministratore di questa azienda.</p>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creazione account...</>
                ) : (
                  <>{isInvited ? 'Unisciti al team' : 'Crea account'} <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
