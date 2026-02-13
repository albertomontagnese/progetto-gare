import { NextResponse } from 'next/server';
import { garaDoc } from '@/lib/firestore';
import { requireSession } from '@/lib/session';
import { normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, buildRenderModelFromOutput } from '@/lib/gara-logic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const snap = await garaDoc(session.tenantId, garaId).get();
    const output = snap.exists
      ? normalizeOutputJson(garaId, snap.data())
      : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const renderModel = await buildRenderModelFromOutput({ garaId, outputJson: output });
    return NextResponse.json({ garaId, output, render_model: renderModel });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('GET render error:', error);
    return NextResponse.json({ error: `Errore render: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
