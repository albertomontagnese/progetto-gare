import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc, documentsDoc } from '@/lib/firestore';
import { tryUploadFile } from '@/lib/gcs';
import { requireSession } from '@/lib/session';
import {
  normalizeOutputJson, defaultOutputForGara, sanitizeGaraId, sanitizeFileName,
  classifyDocumentsWithLLM, mergeDocumentsIntoOutput,
} from '@/lib/gara-logic';
import type { GaraDocument, ChatMessage } from '@/lib/types';

function errJson(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  let step = 'init';
  try {
    step = 'auth';
    const session = await requireSession();

    step = 'parse-params';
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);

    step = 'parse-body';
    const body = await request.json().catch(() => ({}));
    const files = Array.isArray(body?.files) ? body.files : [];
    if (!files.length) return errJson('Nessun file ricevuto', 400);

    step = 'process-files';
    const saved: GaraDocument[] = [];

    for (const file of files) {
      const originalName = sanitizeFileName(file?.name || 'documento');
      const encoded = String(file?.content_base64 || '');
      if (!encoded) continue;
      const buffer = Buffer.from(encoded, 'base64');
      const targetName = `${Date.now()}_${originalName}`;
      const gcsPath = `gare/${garaId}/documents/${targetName}`;

      // Try GCS upload (non-blocking)
      const uploadedPath = await tryUploadFile(buffer, gcsPath, file?.type);

      let textPreview = '';
      const t = String(file?.type || '').toLowerCase();
      const n = originalName.toLowerCase();
      if (t.startsWith('text/') || t.includes('json') || n.endsWith('.txt') || n.endsWith('.csv') || n.endsWith('.html') || n.endsWith('.xml')) {
        textPreview = buffer.toString('utf8').slice(0, 4000);
      }

      saved.push({
        name: originalName,
        stored_as: targetName,
        size: Number(file?.size || buffer.length),
        type: String(file?.type || ''),
        preview: textPreview,
        category: 'altro',
        confidence: 0,
        rationale: '',
        confirmed: false,
        gcs_path: uploadedPath || gcsPath,
      });
    }

    if (!saved.length) return errJson('Nessun file valido ricevuto (content_base64 mancante)', 400);

    // Classify with LLM (metadata only)
    step = 'classify';
    const classified = await classifyDocumentsWithLLM({ garaId, documents: saved });

    // Save document metadata to Firestore (small, no base64)
    step = 'save-documents';
    await documentsDoc(session.tenantId, garaId).set({ documents: classified });

    // Update output
    step = 'update-output';
    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists
      ? normalizeOutputJson(garaId, garaSnap.data())
      : normalizeOutputJson(garaId, defaultOutputForGara(garaId));

    const taggedOutput = mergeDocumentsIntoOutput(currentOutput, classified, 'da_confermare');
    await garaDoc(session.tenantId, garaId).set(taggedOutput);

    // Update conversation
    step = 'update-conversation';
    const convoSnap = await conversationDoc(session.tenantId, garaId).get();
    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    conversation.push({
      role: 'assistant',
      text: 'Ho classificato automaticamente i documenti. Conferma/correggi il tagging prima di procedere con l\'estrazione completa.',
      created_at: new Date().toISOString(),
    });
    await conversationDoc(session.tenantId, garaId).set({ messages: conversation });

    return NextResponse.json({
      garaId,
      assistant_reply: 'Classificazione documenti completata. Serve conferma manuale.',
      output_json: taggedOutput,
      conversation,
      files: classified,
      classification_required: true,
    });
  } catch (error) {
    const msg = (error as Error).message || 'Errore sconosciuto';
    if (msg === 'UNAUTHORIZED') return errJson('Non autenticato', 401);
    console.error(`[upload] Failed at step="${step}":`, error);
    return errJson(`Errore upload (step: ${step}): ${msg}`);
  }
}
