const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

interface OpenAIMessage {
  role: string;
  content: Array<{ type: string; text?: string; file_data?: string; filename?: string }>;
}

interface OpenAIRequest {
  model: string;
  temperature: number;
  input: OpenAIMessage[];
}

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

export function extractResponseText(payload: OpenAIResponse): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string') {
        parts.push(part.text);
      }
    }
  }
  return parts.join('\n').trim();
}

export function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    // try to recover first json object
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export async function callOpenAI(input: OpenAIRequest): Promise<OpenAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY non impostata');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      (payload as { error?: { message?: string } })?.error?.message || 'Errore OpenAI'
    );
  }
  return payload as OpenAIResponse;
}

export function getModel(): string {
  return OPENAI_MODEL;
}
