import { NextResponse } from 'next/server';
import { garaDoc } from '@/lib/firestore';
import { normalizeOutputJson, sanitizeGaraId, defaultOutputForGara, sanitizeChecklistItems, applyChecklistToOutput, fallbackChecklistFromOutput } from '@/lib/gara-logic';
import { requireSession } from '@/lib/session';

export async function GET(_request: Request, { params }: { params: Promise<{ garaId: string }> }) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const doc = await garaDoc(session.tenantId, garaId).get();
    let output;
    if (doc.exists) {
      output = normalizeOutputJson(garaId, doc.data());
    } else {
      output = normalizeOutputJson(garaId, defaultOutputForGara(garaId));
      const checklistItems = fallbackChecklistFromOutput(output);
      output = applyChecklistToOutput(garaId, output, sanitizeChecklistItems(checklistItems, output));
      await garaDoc(session.tenantId, garaId).set(output);
    }
    return NextResponse.json({ garaId, output });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('GET gara error:', error);
    return NextResponse.json({ error: `Errore GET gara: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ garaId: string }> }) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const candidate = body?.output_json || body?.output || body;
    const nextOutput = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? normalizeOutputJson(garaId, candidate) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    await garaDoc(session.tenantId, garaId).set(nextOutput);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    return NextResponse.json({ error: `Errore POST gara: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
