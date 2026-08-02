import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

interface AnaliseResultado {
  riscos: RiscoDetectado[];
  epiViolacoes: EpiDetectado[];
  descricaoGeral: string;
  nivelRisco: 'baixo' | 'medio' | 'alto' | 'critico';
}

interface RiscoDetectado {
  categoria: string;
  descricao: string;
  localIdentificado: string;
  confianca: number;
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  consequencias: string;
  nrsRelacionadas: string;
  medidasPreventivas: string;
  medidasCorretivas: string;
  regiao: { x: number; y: number; largura: number; altura: number };
}

interface EpiDetectado {
  epiNome: string;
  status: 'ausente' | 'incorreto' | 'correto';
  confianca: number;
  descricao: string;
  regiao?: { x: number; y: number; largura: number; altura: number };
}

async function getDimensions(imagemPath: string): Promise<{ w: number; h: number }> {
  try {
    const meta = await sharp(imagemPath).metadata();
    return { w: meta.width || 800, h: meta.height || 600 };
  } catch {
    return { w: 800, h: 600 };
  }
}

export async function analisarImagem(
  imagemPath: string,
  nomeArquivo: string
): Promise<AnaliseResultado> {
  if (!OPENAI_KEY) {
    throw new Error('Chave de API não configurada. Configure OPENAI_API_KEY no painel do Render.');
  }

  const openai = new OpenAI({ apiKey: OPENAI_KEY });
  const imagemBuffer = fs.readFileSync(imagemPath);
  const imagemBase64 = imagemBuffer.toString('base64');
  const { w: imgW, h: imgH } = await getDimensions(imagemPath);

  const ext = path.extname(nomeArquivo).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${imagemBase64}`;

  const prompt = `Você é um engenheiro de Segurança do Trabalho (SST) inspecionando um local de trabalho através de uma fotografia.

Analise esta imagem COMO UM ESPECIALISTA EM SST e identifique TODOS os problemas de segurança, non-conformidades e riscos presentes.

Para CADA problema encontrado, forneça:
1. Categoria do risco
2. Descrição detalhada do problema
3. Local exato na imagem (use coordenadas x, y, largura, altura em pixels — a imagem tem ${imgW}x${imgH} pixels)
4. Gravidade (baixa, media, alta, critica)
5. Consequências potenciais
6. NR relacionada
7. Medidas preventivas e corretivas

Também verifique TODOS os EPIs visíveis: Capacete, Óculos, Luva, Botina, Cinto, Protetor Auricular, Máscara, Colete. Para cada um, indique se está ausente, incorreto ou correto, com coordenadas na imagem.

Retorne APENAS um JSON válido (sem markdown, sem texto extra):

{
  "descricaoGeral": "Descrição completa do que foi observado no local",
  "nivelRisco": "baixo|medio|alto|critico",
  "riscos": [
    {
      "categoria": "Elétrica|Piso|Altura|EPI|Máquinas|Incêndio|Sinalização|Ventilação|Iluminação|Organização|Ergonomia|Química|Espaço Confinado|Outros",
      "descricao": "Descrição detalhada e específica do problema",
      "localIdentificado": "Descrição textual de onde está o problema",
      "confianca": 0.85,
      "gravidade": "baixa|media|alta|critica",
      "consequencias": "O que pode acontecer",
      "nrsRelacionadas": "NR-XX",
      "medidasPreventivas": "Como prevenir",
      "medidasCorretivas": "Como corrigir",
      "regiao": {"x": 0, "y": 0, "largura": 100, "altura": 100}
    }
  ],
  "epiViolacoes": [
    {
      "epiNome": "Capacete|Óculos|Luva|Botina|Cinto|Protetor Auricular|Máscara|Colete",
      "status": "ausente|incorreto|correto",
      "confianca": 0.90,
      "descricao": "Descrição específica da violação",
      "regiao": {"x": 0, "y": 0, "largura": 80, "altura": 80}
    }
  ]
}

IMPORTANTE:
- As coordenadas regiao.x, regiao.y, regiao.largura, regiao.altura devem ser EM PIXELS reais na imagem de ${imgW}x${imgH}
- Analise TODOS os detalhes: fiação, pisos, extintores, sinalização, organização, EPIs, máquinas, ferramentas
- Se não encontrar problema, retorne arrays vazios
- NÃO invente problemas que não estão visíveis na imagem`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0.1,
  });

  const text = response.choices[0]?.message?.content || '';

  let parsed: AnaliseResultado;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta da IA');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Resposta da IA em formato inválido. Tente novamente.');
  }

  if (!parsed.riscos || !Array.isArray(parsed.riscos)) {
    parsed.riscos = [];
  }
  if (!parsed.epiViolacoes || !Array.isArray(parsed.epiViolacoes)) {
    parsed.epiViolacoes = [];
  }
  if (!parsed.descricaoGeral) {
    parsed.descricaoGeral = 'Análise realizada';
  }
  if (!parsed.nivelRisco) {
    parsed.nivelRisco = 'medio';
  }

  // Ensure regions are within image bounds
  for (const risco of parsed.riscos) {
    if (risco.regiao) {
      risco.regiao.x = Math.max(0, Math.min(risco.regiao.x, imgW - 10));
      risco.regiao.y = Math.max(0, Math.min(risco.regiao.y, imgH - 10));
      risco.regiao.largura = Math.min(risco.regiao.largura, imgW - risco.regiao.x);
      risco.regiao.altura = Math.min(risco.regiao.altura, imgH - risco.regiao.y);
    }
  }
  for (const epi of parsed.epiViolacoes) {
    if (epi.regiao) {
      epi.regiao.x = Math.max(0, Math.min(epi.regiao.x, imgW - 10));
      epi.regiao.y = Math.max(0, Math.min(epi.regiao.y, imgH - 10));
      epi.regiao.largura = Math.min(epi.regiao.largura, imgW - epi.regiao.x);
      epi.regiao.altura = Math.min(epi.regiao.altura, imgH - epi.regiao.y);
    }
  }

  console.log(`Análise OpenAI concluída: ${parsed.riscos.length} riscos, ${parsed.epiViolacoes.length} EPIs`);
  return parsed;
}

export async function analisarVideo(
  _videoPath: string,
  _nomeArquivo: string
): Promise<AnaliseResultado> {
  return {
    descricaoGeral: 'Análise de vídeo requer análise manual — envie fotos para análise automática.',
    nivelRisco: 'medio',
    riscos: [],
    epiViolacoes: [],
  };
}
