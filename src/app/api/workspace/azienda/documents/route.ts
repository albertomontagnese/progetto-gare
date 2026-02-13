import { NextResponse } from 'next/server';
import { companyProfileDoc } from '@/lib/firestore';
import { tryUploadFile } from '@/lib/gcs';
import { requireSession } from '@/lib/session';
import { sanitizeFileName, defaultCompanyProfile } from '@/lib/gara-logic';
import { callOpenAI, extractResponseText, tryParseJson, getModel } from '@/lib/openai';
import type { CompanyProfile } from '@/lib/types';

const DOC_CATEGORIES = [
  'profilo_aziendale', 'bilancio', 'certificazioni', 'referenze_progetti',
  'organigramma_cv', 'policy_hse', 'procedure_operative', 'altro',
] as const;

/** GET: list company documents */
export async function GET() {
  try {
    const session = await requireSession();
    const snap = await companyProfileDoc(session.tenantId).get();
    const profile = snap.exists ? snap.data() as CompanyProfile : defaultCompanyProfile();
    const docs = profile.company_documents || [];
    return NextResponse.json({ documents: docs });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    return NextResponse.json({ error: `Errore: ${(error as Error).message}` }, { status: 500 });
  }
}

/** POST: upload + AI-classify company documents, extract key facts */
export async function POST(request: Request) {
  let step = 'init';
  try {
    step = 'auth';
    const session = await requireSession();

    step = 'parse';
    const body = await request.json().catch(() => ({}));
    const files = Array.isArray(body?.files) ? body.files : [];
    if (!files.length) return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 });

    step = 'process-files';
    const savedDocs: Array<{
      name: string; stored_as: string; size: number; type: string;
      category: string; gcs_path: string; key_facts: string[];
      uploaded_at: string;
    }> = [];

    for (const file of files) {
      const originalName = sanitizeFileName(file?.name || 'documento');
      const encoded = String(file?.content_base64 || '');
      if (!encoded) continue;
      const buffer = Buffer.from(encoded, 'base64');
      const targetName = `${Date.now()}_${originalName}`;
      const gcsPath = `${session.tenantId}/workspace/documents/${targetName}`;

      await tryUploadFile(buffer, gcsPath, file?.type);

      savedDocs.push({
        name: originalName,
        stored_as: targetName,
        size: buffer.length,
        type: file?.type || '',
        category: 'altro',
        gcs_path: gcsPath,
        key_facts: [],
        uploaded_at: new Date().toISOString(),
      });
    }

    // AI classify + extract key facts from each document
    step = 'ai-classify';
    if (process.env.OPENAI_API_KEY && savedDocs.length > 0) {
      const docsForAi = savedDocs.map((d) => ({ name: d.name, type: d.type, size: d.size }));
      // Also get text content for AI analysis
      const textContents: string[] = [];
      for (const file of files) {
        const encoded = String(file?.content_base64 || '');
        if (!encoded) { textContents.push(''); continue; }
        const buf = Buffer.from(encoded, 'base64');
        // Only use text preview for text-like files, otherwise send as input_file
        const t = String(file?.type || '').toLowerCase();
        const n = String(file?.name || '').toLowerCase();
        if (t.startsWith('text/') || t.includes('json') || n.endsWith('.txt') || n.endsWith('.csv')) {
          textContents.push(buf.toString('utf8').slice(0, 8000));
        } else {
          textContents.push('');
        }
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content: any[] = [{
          type: 'input_text',
          text: `Classifica questi documenti aziendali e estrai i FATTI CHIAVE da ciascuno.
Categorie ammesse: ${DOC_CATEGORIES.join(', ')}
Per ogni documento estrai fino a 15 key_facts: frasi sintetiche su capacità, numeri, certificazioni, esperienze.
Rispondi SOLO JSON: {"documents":[{"name":"...","category":"...","key_facts":["..."]}]}
Documenti: ${JSON.stringify(docsForAi)}`
        }];

        // Attach actual files for PDF analysis
        for (let i = 0; i < files.length && i < 6; i++) {
          const encoded = String(files[i]?.content_base64 || '').trim();
          if (!encoded) continue;
          const mime = String(files[i]?.type || 'application/octet-stream');
          content.push({
            type: 'input_file',
            filename: sanitizeFileName(files[i]?.name || 'doc'),
            file_data: `data:${mime};base64,${encoded}`,
          });
        }

        const payload = await callOpenAI({
          model: getModel(), temperature: 0.1,
          input: [
            { role: 'system', content: [{ type: 'input_text', text: 'Sei un analista aziendale. Classifica documenti ed estrai fatti chiave. Rispondi SOLO in JSON.' }] },
            { role: 'user', content },
          ],
        });
        const text = extractResponseText(payload);
        const parsed = tryParseJson(text || '') as { documents?: Array<{ name: string; category: string; key_facts: string[] }> } | null;
        if (parsed?.documents) {
          const byName = new Map(parsed.documents.map((d) => [d.name, d]));
          for (const doc of savedDocs) {
            const match = byName.get(doc.name);
            if (match) {
              doc.category = DOC_CATEGORIES.includes(match.category as typeof DOC_CATEGORIES[number]) ? match.category : 'altro';
              doc.key_facts = Array.isArray(match.key_facts) ? match.key_facts.map(String) : [];
            }
          }
        }
      } catch (aiErr) {
        console.warn('[company-docs] AI classify failed:', (aiErr as Error).message);
      }
    }

    // Save to company profile
    step = 'save';
    const snap = await companyProfileDoc(session.tenantId).get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile: any = snap.exists ? snap.data() : defaultCompanyProfile();
    const existingDocs = Array.isArray(profile.company_documents) ? profile.company_documents : [];
    profile.company_documents = [...existingDocs, ...savedDocs];
    await companyProfileDoc(session.tenantId).set(profile);

    return NextResponse.json({
      ok: true,
      documents: savedDocs,
      total: profile.company_documents.length,
    });
  } catch (error) {
    const msg = (error as Error).message || 'Errore sconosciuto';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    console.error(`[company-docs] Failed at step="${step}":`, error);
    return NextResponse.json({ error: `Errore upload documenti aziendali (step: ${step}): ${msg}` }, { status: 500 });
  }
}
