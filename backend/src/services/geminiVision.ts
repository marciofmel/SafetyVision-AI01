import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

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

export async function analisarImagemComGemini(
  imagemPath: string,
  nomeArquivo: string
): Promise<AnaliseResultado> {
  const imagemBuffer = fs.readFileSync(imagemPath);
  const imagemBase64 = imagemBuffer.toString('base64');

  const ext = path.extname(nomeArquivo).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Você é um especialista em Segurança do Trabalho (SST) analisando uma imagem de inspeção de segurança.

Analise esta imagem detalhadamente e retorne um JSON válido com a seguinte estrutura exata:

{
  "descricaoGeral": "Descrição geral do que foi observado na imagem",
  "nivelRisco": "baixo|medio|alto|critico",
  "riscos": [
    {
      "categoria": "Categoria do risco (ex: Elétrica, Piso, Altura, EPI, Máquinas, Incêndio, etc)",
      "descricao": "Descrição detalhada do problema encontrado",
      "localIdentificado": "Onde na imagem está o problema (ex: canto superior esquerdo, centro, etc)",
      "confianca": 0.85,
      "gravidade": "baixa|media|alta|critica",
      "consequencias": "O que pode acontecer se não for corrigido",
      "nrsRelacionadas": "NR-10, NR-12, etc",
      "medidasPreventivas": "Como prevenir este problema",
      "medidasCorretivas": "Como corrigir este problema",
      "regiao": { "x": 100, "y": 200, "largura": 150, "altura": 150 }
    }
  ],
  "epiViolacoes": [
    {
      "epiNome": "Nome do EPI (Capacete, Luva, Óculos, Botina, Cinto, etc)",
      "status": "ausente|incorreto|correto",
      "confianca": 0.90,
      "descricao": "Descrição da violação de EPI",
      "regiao": { "x": 100, "y": 200, "largura": 100, "altura": 100 }
    }
  ]
}

REGRAS IMPORTANTES:
1. Analise CADA detalhe da imagem: EPIs, condições do piso, fiação elétrica, extintores, sinalização, organização, máquinas, ferramentas, altitude, etc.
2. Para CADA problema encontrado, retorne a REGIÃO exata (coordenadas x, y, largura, altura) onde o problema está na imagem.
3. As coordenadas devem ser relativas ao tamanho da imagem (use percentuais multiplicados por 10 para facilitar).
4. Confiança deve ser entre 0.5 e 1.0.
5. Retorne APENAS o JSON, sem markdown, sem texto antes ou depois.
6. Se não encontrar nenhum problema, retorne riscos e epiViolacoes como arrays vazios.
7. Analise: EPIs (capacete, óculos, luvas, botina, cinto, protetor auricular, máscara, colete), piso (molhado, irregular, buracos), fiação (exposta, solta), extintores (ausentes, obstruídos), sinalização (ausente), máquinas (sem proteção), organização, iluminação, ventilação.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: imagemBase64 } },
  ]);

  const response = result.response;
  const text = response.text();

  let parsed: AnaliseResultado;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = {
      descricaoGeral: 'Análise realizada mas formato de resposta inválido',
      nivelRisco: 'medio',
      riscos: [],
      epiViolacoes: [],
    };
  }

  return parsed;
}

export async function analisarVideoComGemini(
  videoPath: string,
  nomeArquivo: string
): Promise<AnaliseResultado> {
  const descricaoGeral = 'Análise de vídeo pendente - envie fotos para análise detalhada';

  return {
    descricaoGeral,
    nivelRisco: 'medio',
    riscos: [],
    epiViolacoes: [],
  };
}
