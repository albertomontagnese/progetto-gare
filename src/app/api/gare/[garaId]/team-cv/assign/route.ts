import { NextResponse } from 'next/server';
import { garaDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId } from '@/lib/gara-logic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const role = String(body?.role || '').trim();
    const cvName = String(body?.cv_name || '').trim();
    if (!role) return NextResponse.json({ error: 'Ruolo mancante' }, { status: 400 });

    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists ? normalizeOutputJson(garaId, garaSnap.data()) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const team = currentOutput.team_cv || { ruoli_obbligatori: [], cv_associati: [], gap: [] };
    const currentAssoc = Array.isArray(team.cv_associati) ? team.cv_associati : [];
    const byRole = new Map(currentAssoc.map((r) => [r.ruolo, r]));
    byRole.set(role, { ruolo: role, cv: cvName });
    const cv_associati = Array.from(byRole.values());
    const roles = Array.isArray(team.ruoli_obbligatori) ? team.ruoli_obbligatori : [];
    const gap = roles.filter((r) => { const match = byRole.get(r); return !match || !match.cv; });
    const nextOutput = normalizeOutputJson(garaId, { ...currentOutput, team_cv: { ...team, ruoli_obbligatori: roles, cv_associati, gap } });
    await garaDoc(session.tenantId, garaId).set(nextOutput);
    return NextResponse.json({ garaId, assistant_reply: 'Associazione ruolo-CV aggiornata.', output_json: nextOutput });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST team-cv/assign error:', error);
    return NextResponse.json({ error: `Errore assegnazione team-CV: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
