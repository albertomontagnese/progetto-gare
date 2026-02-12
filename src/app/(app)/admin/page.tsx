'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Mail, Shield, Clock, Plus, Loader2, ArrowLeft, UserPlus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface TeamMember { email: string; name: string; role: string; createdAt: string }
interface PendingInvite { id: string; email: string; role: string; createdAt: string; expiresAt: string }

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/team');
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setUsers(data.users || []);
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Invito inviato a ${inviteEmail}`);
      setInviteEmail('');
      loadTeam();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestione Team</h1>
            <p className="text-sm text-slate-500">Invita colleghi e gestisci i permessi del tuo team</p>
          </div>
        </div>

        {/* Invite Form */}
        <Card className="shadow-lg shadow-slate-200/40 border-slate-200/60 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Invita un nuovo membro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collega@azienda.com"
                  className="pl-10 h-10"
                  required
                />
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'user' | 'admin')}>
                <SelectTrigger className="w-[130px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={sending} className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1.5" /> Invita</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="shadow-lg shadow-slate-200/40 border-slate-200/60 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Membri del team
              <Badge variant="secondary" className="ml-auto text-xs">{users.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto" /></div>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Nessun membro. Invita il tuo primo collega.</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.email} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] h-5">
                      {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {user.role === 'admin' ? 'Admin' : 'Utente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card className="shadow-lg shadow-slate-200/40 border-slate-200/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Inviti in attesa
                <Badge variant="outline" className="ml-auto text-xs text-amber-700 border-amber-200 bg-amber-50">{invitations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                    <Mail className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{inv.email}</p>
                      <p className="text-[11px] text-slate-500">Scade: {new Date(inv.expiresAt).toLocaleDateString('it-IT')}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{inv.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
