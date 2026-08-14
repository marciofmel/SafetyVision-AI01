const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export function geminiConfigurada(): boolean {
  return !!GEMINI_KEY;
}

async function chamarGemini(prompt: string, partsExtra?: any[]): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error('Chave de API não configurada. Configure GEMINI_API_KEY no painel do Render.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

  const parts: any[] = [{ text: prompt }];
  if (partsExtra) parts.push(...partsExtra);

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`Erro da API Gemini (${res.status}): ${raw.slice(0, 300)}`);
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Resposta inválida da API Gemini');
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const finish = data?.candidates?.[0]?.finishReason;
      if (finish && finish !== 'STOP') {
        throw new Error(`Resposta da IA bloqueada ou incompleta (${finish})`);
      }
      throw new Error('API Gemini não retornou conteúdo');
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function geminiTexto(prompt: string): Promise<string> {
  return chamarGemini(prompt);
}

export async function geminiMidia(prompt: string, mimeType: string, base64: string): Promise<string> {
  return chamarGemini(prompt, [{ inline_data: { mime_type: mimeType, data: base64 } }]);
}

export function extrairJson(texto: string): any {
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta da IA');
  return JSON.parse(jsonMatch[0]);
}

export function extrairJsonArray(texto: string): any {
  const jsonMatch = texto.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta da IA');
  return JSON.parse(jsonMatch[0]);
}
