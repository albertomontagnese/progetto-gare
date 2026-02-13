import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc } from '@/lib/firestore';
import { tryUploadFile } from '@/lib/gcs';
import { requireSession } from '@/lib/session';
import {
  normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, sanitizeFileName,
  getChecklistItems, normalizeChecklistItem, applyChecklistToOutput, buildEvidenceWithAttachmentNames,
} from '@/lib/gara-logic';
import type { ChatMessage } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  try {
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const itemIndex = Number(body?.item_index);
    const files = Array.isArray(body?.files) ? body.files : [];
    if (!Number.isInteger(itemIndex) || itemIndex < 0) return NextResponse.json({ error: 'item_index non valido' }, { status: 400 });
    if (!files.length) return NextResponse.json({ error: 'Nessun allegato ricevuto' }, { status: 400 });

    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists ? normalizeOutputJson(garaId, garaSnap.data()) : normalizeOutputJson(garaId, defaultOutputForGara(garaId));
    const checklist = getChecklistItems(currentOutput);
    const item = checklist[itemIndex];
    if (!item) return NextResponse.json({ error: 'Requisito non trovato' }, { status: 404 });

    const savedNames: string[] = [];
    for (const file of files) {
      const originalName = sanitizeFileName(file?.name || 'allegato');
      const encoded = String(file?.content_base64 || '');
      if (!encoded) continue;
      const buffer = Buffer.from(encoded, 'base64');
      const targetName = `${Date.now()}_r${itemIndex}_${originalName}`;
      const gcsPath = `gare/${garaId}/allegati/${targetName}`;
      await tryUploadFile(buffer, gcsPath, file?.type);
      savedNames.push(targetName);
    }

    const mergedAttachments = Array.from(new Set([...(item.allegati || []), ...savedNames]));
    const nextEvidence = buildEvidenceWithAttachmentNames(item.evidenza_proposta || '', mergedAttachments);
    checklist[itemIndex] = normalizeChecklistItem({ ...item, allegati: mergedAttachments, evidenza_proposta: nextEvidence });
    const nextOutput = applyChecklistToOutput(garaId, currentOutput, checklist);
    await garaDoc(session.tenantId, garaId).set(nextOutput);

    const convoSnap = await conversationDoc(session.tenantId, garaId).get();
    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    conversation.push({ role: 'assistant', text: `[Allegati requisito] Caricati: ${savedNames.join(', ')}`, created_at: new Date().toISOString() });
    await conversationDoc(session.tenantId, garaId).set({ messages: conversation });

    return NextResponse.json({ garaId, assistant_reply: 'Allegati requisito caricati.', uploaded_files: savedNames, output_json: nextOutput, conversation });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error('POST checklist/attach error:', error);
    return NextResponse.json({ error: `Errore allegati checklist: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
