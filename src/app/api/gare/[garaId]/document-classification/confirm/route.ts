import { NextResponse } from 'next/server';
import { garaDoc, conversationDoc, documentsDoc } from '@/lib/firestore';
import { tryDownloadFile } from '@/lib/gcs';
import { requireSession } from '@/lib/session';
import {
  normalizeOutputJson, defaultOutputForGara, sanitizeGaraId,
  mergeDocumentsIntoOutput, runInitialOutputFromDocuments,
} from '@/lib/gara-logic';
import { DOCUMENT_CATEGORIES } from '@/lib/types';
import type { GaraDocument, ChatMessage, DocumentCategory } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  let step = 'init';
  try {
    step = 'auth';
    const session = await requireSession();
    const { garaId: rawId } = await params;
    const garaId = sanitizeGaraId(rawId);
    const body = await request.json().catch(() => ({}));
    const updates = Array.isArray(body?.documents) ? body.documents : [];

    // Get current docs
    step = 'load-docs';
    const docsSnap = await documentsDoc(session.tenantId, garaId).get();
    const currentDocs: GaraDocument[] = docsSnap.exists ? docsSnap.data()?.documents || [] : [];

    step = 'confirm-classification';
    const byStoredAs = new Map(updates.map((u: GaraDocument) => [String(u?.stored_as || ''), u]));
    const confirmedDocs = currentDocs.map((doc) => {
      const upd: Partial<GaraDocument> = byStoredAs.get(String(doc.stored_as)) || {};
      const updCategory = upd.category;
      const category: DocumentCategory = updCategory && DOCUMENT_CATEGORIES.includes(updCategory as DocumentCategory) ? (updCategory as DocumentCategory) : doc.category || 'altro';
      return { ...doc, category, confirmed: true };
    });
    await documentsDoc(session.tenantId, garaId).set({ documents: confirmedDocs });

    // Load raw files for LLM analysis
    // Priority: 1) content_base64 stored in Firestore, 2) download from GCS
    step = 'load-raw-files';
    const rawFiles: Array<{ name: string; type: string; size: number; content_base64: string }> = [];
    for (const doc of confirmedDocs.slice(0, 6)) {
      // First try content_base64 saved during upload
      if (doc.content_base64) {
        rawFiles.push({
          name: doc.name,
          type: doc.type || 'application/octet-stream',
          size: doc.size,
          content_base64: doc.content_base64,
        });
        continue;
      }
      // Fall back to GCS download
      if (doc.gcs_path) {
        const buffer = await tryDownloadFile(doc.gcs_path);
        if (buffer) {
          rawFiles.push({
            name: doc.name,
            type: doc.type || 'application/octet-stream',
            size: doc.size || buffer.length,
            content_base64: buffer.toString('base64'),
          });
        }
      }
    }

    console.log(`[confirm] Loaded ${rawFiles.length} raw files for AI extraction (out of ${confirmedDocs.length} docs)`);

    step = 'extract-with-llm';
    const garaSnap = await garaDoc(session.tenantId, garaId).get();
    const currentOutput = garaSnap.exists
      ? normalizeOutputJson(garaId, garaSnap.data())
      : normalizeOutputJson(garaId, defaultOutputForGara(garaId));

    const preOutput = mergeDocumentsIntoOutput(currentOutput, confirmedDocs, 'confermato');
    const llmResult = await runInitialOutputFromDocuments({
      garaId, documents: confirmedDocs, currentOutput: preOutput, rawFiles,
    });

    step = 'save-output';
    const finalOutput = mergeDocumentsIntoOutput(llmResult.output_json, confirmedDocs, 'confermato');
    await garaDoc(session.tenantId, garaId).set(finalOutput);

    // After extraction, clear the base64 content to save Firestore space
    step = 'cleanup-base64';
    const cleanedDocs = confirmedDocs.map((d) => {
      const { content_base64, ...rest } = d;
      return rest;
    });
    await documentsDoc(session.tenantId, garaId).set({ documents: cleanedDocs });

    step = 'update-conversation';
    const convoSnap = await conversationDoc(session.tenantId, garaId).get();
    const conversation: ChatMessage[] = convoSnap.exists ? convoSnap.data()?.messages || [] : [];
    conversation.push({ role: 'assistant', text: llmResult.assistant_reply, created_at: new Date().toISOString() });
    await conversationDoc(session.tenantId, garaId).set({ messages: conversation });

    return NextResponse.json({
      garaId,
      assistant_reply: llmResult.assistant_reply,
      output_json: finalOutput,
      conversation,
    });
  } catch (error) {
    const msg = (error as Error).message || 'Errore sconosciuto';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error(`[confirm] Failed at step="${step}":`, error);
    return NextResponse.json({ error: `Errore conferma (step: ${step}): ${msg}` }, { status: 500 });
  }
}
