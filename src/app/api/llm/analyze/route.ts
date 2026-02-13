import { NextResponse } from 'next/server';
import { runStructuredAnalysis } from '@/lib/gara-logic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = await runStructuredAnalysis(body);
    return NextResponse.json({ text });
  } catch (error) {
    console.error('POST analyze error:', error);
    return NextResponse.json({ error: `Errore analisi: ${(error as Error).message || 'Errore sconosciuto'}` }, { status: 500 });
  }
}
