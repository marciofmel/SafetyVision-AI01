const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
// Modelos alternativos usados automaticamente quando o principal fica indisponível (503/429/404)
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3-flash-preview,gemini-flash-lite-latest,gemini-pro-latest')
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);

const MAX_TENTATIVAS = 3;

export function geminiConfigurada(): boolean {
  return !!GEMINI_KEY;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(status: number, msg: string): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 408 ||
    /UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|temporar|AbortError|deadline|limit/i.test(msg)
  );
}

async function chamarModelo(modelo: string, prompt: string, partsExtra?: any[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_KEY}`;

  const parts: any[] = [{ text: prompt }];
  if (partsExtra) parts.push(...partsExtra);

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

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

async function chamarGemini(prompt: string, partsExtra?: any[]): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error('Chave de API não configurada. Configure GEMINI_API_KEY no painel do Render.');
  }

  const fila = [GEMINI_MODEL, ...FALLBACK_MODELS.filter((m: string) => m !== GEMINI_MODEL)];
  let ultimoErro: any = new Error('Falha desconhecida na API Gemini');

  for (const modelo of fila) {
    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
      try {
        const texto = await chamarModelo(modelo, prompt, partsExtra);
        if (modelo !== GEMINI_MODEL) {
          console.log(`Gemini: usado modelo de reserva "${modelo}"`);
        }
        return texto;
      } catch (err: any) {
        ultimoErro = err;
        const status = Number(/(\d{3})\)/.exec(err.message)?.[1] || 0);
        if (isRetryable(status, err.message) && tentativa < MAX_TENTATIVAS - 1) {
          await sleep(1500 * (tentativa + 1));
          continue;
        }
        if (status === 404 || status === 400) {
          // modelo inexistente/indisponível p/ este usuário: pula para o próximo da fila
          break;
        }
      }
    }
  }

  throw ultimoErro;
}

export async function geminiTexto(prompt: string): Promise<string> {
  return chamarGemini(prompt);
}

export async function geminiMidia(prompt: string, mimeType: string, base64: string): Promise<string> {
  return chamarGemini(prompt, [{ inline_data: { mime_type: mimeType, data: base64 } }]);
}

export function extrairJson(texto: string): any {
  if (!texto) throw new Error('Resposta da IA vazia');

  // Remove blocos de código markdown (```json ... ```) se houver
  const t = texto.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').trim();

  // Extrai o maior bloco { ... } presente na resposta
  const m = t.match(/\{[\s\S]*\}/);
  const alvo = m ? m[0] : t;

  try {
    return JSON.parse(alvo);
  } catch {
    // tentativa de reparo: vírgulas pendentes, truncação de colchetes/chaves
    const semTrailing = alvo.replace(/,\s*([}\]])/g, '$1').trim();
    const base = semTrailing.endsWith('}') || semTrailing.endsWith(']') ? semTrailing.slice(0, -1) : semTrailing;
    for (let dif = 0; dif <= 40; dif++) {
      const fechamento = ']'.repeat(dif) + '}'.repeat(dif);
      try {
        return JSON.parse(base + fechamento);
      } catch {
        // continua tentando mais fechamentos
      }
    }
    throw new Error('Resposta da IA em formato inválido. Tente novamente.');
  }
}

export function extrairJsonArray(texto: string): any {
  const jsonMatch = texto.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta da IA');
  return JSON.parse(jsonMatch[0]);
}
