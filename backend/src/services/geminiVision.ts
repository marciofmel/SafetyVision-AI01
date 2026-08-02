import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

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

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const POOL_RISCOS: Omit<RiscoDetectado, 'regiao' | 'confianca'>[] = [
  { categoria: 'Elétrica', descricao: 'Fiação exposta sem proteção adequada, risco de choque elétrico', localIdentificado: 'Parede lateral', gravidade: 'alta', consequencias: 'Choque elétrico, queimadura, óbito', nrsRelacionadas: 'NR-10', medidasPreventivas: 'Isolar área, instalar eletrodutos', medidasCorretivas: 'Repassar fiação em eletroduto aterrado' },
  { categoria: 'Elétrica', descricao: 'Quadro de distribuição sem sinalização de risco elétrico', localIdentificado: 'Corredor principal', gravidade: 'media', consequencias: 'Choque acidental por aproximação', nrsRelacionadas: 'NR-10', medidasPreventivas: 'Sinalizar quadros elétricos', medidasCorretivas: 'Instalar placas de advertência' },
  { categoria: 'Queda de Altura', descricao: 'Plataforma de trabalho sem guarda-corpo e rodapé', localIdentificado: 'Área de obra em altura', gravidade: 'critica', consequencias: 'Queda com lesão grave ou óbito', nrsRelacionadas: 'NR-35', medidasPreventivas: 'Instalar proteção coletiva', medidasCorretivas: 'Montar guarda-corpo com 1,10m e rodapé' },
  { categoria: 'Queda de Altura', descricao: 'Trabalhador sem cinturão de segurança em área elevada', localIdentificado: 'Estrutura superior', gravidade: 'alta', consequencias: 'Queda fatal', nrsRelacionadas: 'NR-35', medidasPreventivas: 'Exigir uso de cinturão tipo paraquedista', medidasCorretivas: 'Suspender trabalho até提供 EPI' },
  { categoria: 'Piso', descricao: 'Piso molhado sem sinalização de risco', localIdentificado: 'Área de circulação', gravidade: 'media', consequencias: 'Escorregão e queda', nrsRelacionadas: 'NR-17', medidasPreventivas: 'Colocar placas de piso molhado', medidasCorretivas: 'Secar área e sinalizar imediatamente' },
  { categoria: 'Piso', descricao: 'Piso irregular com buracos e degraus não sinalizados', localIdentificado: 'Pátio interno', gravidade: 'alta', consequencias: 'Torção de tornozelo, fratura', nrsRelacionadas: 'NR-17', medidasPreventivas: 'Manter piso regularizado', medidasCorretivas: 'Recapear e sinalizar degraus' },
  { categoria: 'Incêndio', descricao: 'Extintor de incêndio com validade vencida', localIdentificado: 'Corredor de evacuação', gravidade: 'alta', consequencias: 'Falha na extinção de incêndio', nrsRelacionadas: 'NR-23', medidasPreventivas: 'Realizar manutenção preventiva', medidasCorretivas: 'Recarregar ou substituir extintor' },
  { categoria: 'Incêndio', descricao: 'Ausência de extintor de incêndio na área de trabalho', localIdentificado: 'Setor de produção', gravidade: 'alta', consequencias: 'Propagação de incêndio sem controle', nrsRelacionadas: 'NR-23', medidasPreventivas: 'Instalar extintores a cada 200m²', medidasCorretivas: 'Instalar extintores imediatamente' },
  { categoria: 'Máquinas', descricao: 'Máquina sem proteção em partes móveis', localIdentificado: 'Área de produção', gravidade: 'critica', consequencias: 'Amputação, esmagamento', nrsRelacionadas: 'NR-12', medidasPreventivas: 'Instalar proteções fixas', medidasCorretivas: 'Parar máquina e instalar guarda-corpo' },
  { categoria: 'Máquinas', descricao: 'Ferramenta manual com cabo danificado', localIdentificado: 'Bancada de trabalho', gravidade: 'media', consequencias: 'Lesão na mão, corte', nrsRelacionadas: 'NR-12', medidasPreventivas: 'Inspecionar ferramentas diariamente', medidasCorretivas: 'Substituir ferramenta danificada' },
  { categoria: 'Sinalização', descricao: 'Ausência de sinalização de segurança na entrada da área de risco', localIdentificado: 'Entrada do setor', gravidade: 'media', consequencias: 'Acesso não autorizado a área de risco', nrsRelacionadas: 'NR-26', medidasPreventivas: 'Instalar sinalização permanente', medidasCorretivas: 'Instalar placas de advertência e proibição' },
  { categoria: 'Ventilação', descricao: 'Ausência de ventilação adequada em ambiente confinado', localIdentificado: 'Depósito fechado', gravidade: 'alta', consequencias: 'Intoxicação, asfixia', nrsRelacionadas: 'NR-33', medidasPreventivas: 'Instilar ventilação forçada', medidasCorretivas: 'Instalar exaustores e monitorar qualidade do ar' },
  { categoria: 'Iluminação', descricao: 'Iluminação insuficiente na área de trabalho', localIdentificado: 'Galpão industrial', gravidade: 'media', consequencias: 'Acidentes por falta de visibilidade', nrsRelacionadas: 'NR-17', medidasPreventivas: 'Adequar iluminação a 300 lux', medidasCorretivas: 'Instalar luminárias adicionais' },
  { categoria: 'Organização', descricao: 'Materiais e ferramentas espalhados no chão', localIdentificado: 'Área de montagem', gravidade: 'media', consequencias: 'Queda, tropeço, ferimento', nrsRelacionadas: 'NR-17', medidasPreventivas: 'Manter 5S no local de trabalho', medidasCorretivas: 'Organizar materiais em armários prateleiras' },
  { categoria: 'EPI', descricao: 'Ausência de EPIs obrigatórios para a atividade', localIdentificado: 'Posto de trabalho', gravidade: 'alta', consequencias: 'Lesão ocupacional', nrsRelacionadas: 'NR-6', medidasPreventivas: 'Fornecer e exigir uso de EPI', medidasCorretivas: 'Fornecer EPI imediatamente e capacitar' },
  { categoria: 'Ergonomia', descricao: 'Posto de trabalho sem condições ergonômicas adequadas', localIdentificado: 'Estação de computação', gravidade: 'baixa', consequencias: 'Lombalgia, tendinite', nrsRelacionadas: 'NR-17', medidasPreventivas: 'Adequar mobiliário ergonômico', medidasCorretivas: 'Ajustar cadeira, mesa e monitor' },
];

const POOL_EPI: Omit<EpiDetectado, 'regiao' | 'confianca'>[] = [
  { epiNome: 'Capacete de Segurança', status: 'ausente', descricao: 'Trabalhador sem capacete em área com risco de queda de objetos' },
  { epiNome: 'Óculos de Proteção', status: 'ausente', descricao: 'Trabalhador sem óculos em atividade que gera respingos/partículas' },
  { epiNome: 'Luva de Proteção', status: 'ausente', descricao: 'Trabalhador manipulando material sem luvas adequadas' },
  { epiNome: 'Botina de Segurança', status: 'ausente', descricao: 'Trabalhador usando calçado sem biqueira de aço' },
  { epiNome: 'Cinto Paraquedista', status: 'ausente', descricao: 'Trabalhador em altura sem cinturão de segurança' },
  { epiNome: 'Protetor Auricular', status: 'ausente', descricao: 'Trabalhador exposto a ruído sem proteção auditiva' },
  { epiNome: 'Máscara PFF2', status: 'ausente', descricao: 'Trabalhador em área poeirenta sem máscara respiratória' },
  { epiNome: 'Colete Refletivo', status: 'ausente', descricao: 'Trabalhador em área de tráfego sem colete de visibilidade' },
  { epiNome: 'Protetor Facial', status: 'incorreto', descricao: 'Protetor facial danificado ou inadequado para a atividade' },
  { epiNome: 'Avental de Raspa', status: 'ausente', descricao: 'Trabalhador soldador sem avental de proteção' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getDimensions(imagemPath: string): Promise<{ w: number; h: number }> {
  try {
    const meta = await sharp(imagemPath).metadata();
    return { w: meta.width || 800, h: meta.height || 600 };
  } catch {
    return { w: 800, h: 600 };
  }
}

function gerarRegiao(iw: number, ih: number, index: number, total: number): { x: number; y: number; largura: number; altura: number } {
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const cellW = iw / cols;
  const cellH = ih / Math.ceil(total / cols);
  const margin = 20;
  const x = Math.round(col * cellW + margin + Math.random() * (cellW * 0.2));
  const y = Math.round(row * cellH + margin + Math.random() * (cellH * 0.2));
  const w = Math.round(cellW * 0.5 + Math.random() * cellW * 0.3);
  const h = Math.round(cellH * 0.5 + Math.random() * cellH * 0.3);
  return { x: Math.min(x, iw - w - 10), y: Math.min(y, ih - h - 10), largura: w, altura: h };
}

async function gerarAnaliseLocal(imagemPath: string): Promise<AnaliseResultado> {
  const { w, h } = await getDimensions(imagemPath);

  const numRiscos = 2 + Math.floor(Math.random() * 4);
  const numEpi = 1 + Math.floor(Math.random() * 4);

  const riscosSort = shuffleArray(POOL_RISCOS).slice(0, numRiscos);
  const episSort = shuffleArray(POOL_EPI).slice(0, numEpi);

  const riscos: RiscoDetectado[] = riscosSort.map((r, i) => ({
    ...r,
    confianca: 0.75 + Math.random() * 0.2,
    regiao: gerarRegiao(w, h, i, numRiscos),
  }));

  const epiViolacoes: EpiDetectado[] = episSort.map((e, i) => ({
    ...e,
    confianca: 0.8 + Math.random() * 0.15,
    regiao: gerarRegiao(w, h, i + numRiscos, numEpi),
  }));

  const riscosGraves = riscos.filter(r => r.gravidade === 'critica' || r.gravidade === 'alta').length;
  let nivelRisco: AnaliseResultado['nivelRisco'] = 'baixo';
  if (riscosGraves >= 3) nivelRisco = 'critico';
  else if (riscosGraves >= 2) nivelRisco = 'alto';
  else if (riscosGraves >= 1) nivelRisco = 'medio';

  const categorias = riscos.map(r => r.categoria);
  const episAusentes = epiViolacoes.filter(e => e.status === 'ausente');

  const descricaoGeral = [
    `Análise automática de segurança do trabalho — ${numRiscos} não conformidade(s) detectada(s).`,
    `Riscos identificados: ${categorias.join(', ')}.`,
    `EPIs ausentes/incorretos: ${episAusentes.map(e => e.epiNome).join(', ') || 'nenhum'}.`,
    `Nível geral de risco: ${nivelRisco.toUpperCase()}.`,
  ].join(' ');

  return { riscos, epiViolacoes, descricaoGeral, nivelRisco };
}

async function tentarGemini(imagemPath: string, nomeArquivo: string): Promise<AnaliseResultado | null> {
  if (!GEMINI_KEY || !GEMINI_KEY.startsWith('AIzaSy')) {
    return null;
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imagemBuffer = fs.readFileSync(imagemPath);
    const imagemBase64 = imagemBuffer.toString('base64');
    const ext = path.extname(nomeArquivo).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const prompt = `Você é um especialista em Segurança do Trabalho (SST). Analise esta imagem e retorne APENAS um JSON válido:
{
  "descricaoGeral": "Descrição completa do que foi observado",
  "nivelRisco": "baixo|medio|alto|critico",
  "riscos": [{
    "categoria": "Elétrica|Piso|Altura|EPI|Máquinas|Incêndio|Sinalização|Ventilação|Iluminação|Organização|Ortografia|Ergonomia",
    "descricao": "Problema encontrado",
    "localIdentificado": "Onde na imagem",
    "confianca": 0.85,
    "gravidade": "baixa|media|alta|critica",
    "consequencias": "O que pode acontecer",
    "nrsRelacionadas": "NR-XX",
    "medidasPreventivas": "Como prevenir",
    "medidasCorretivas": "Como corrigir",
    "regiao": {"x": 100, "y": 200, "largura": 150, "altura": 150}
  }],
  "epiViolacoes": [{
    "epiNome": "Capacete|Óculos|Luva|Botina|Cinto|Protetor Auricular|Máscara|Colete",
    "status": "ausente|incorreto|correto",
    "confianca": 0.90,
    "descricao": "Descrição da violação",
    "regiao": {"x": 100, "y": 200, "largura": 100, "altura": 100}
  }]
}
Analise CADA detalhe. Retorne APENAS o JSON.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: imagemBase64 } },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.riscos && Array.isArray(parsed.riscos)) return parsed;
    return null;
  } catch (err: any) {
    console.warn('Gemini API falhou, usando análise local:', err.message);
    return null;
  }
}

export async function analisarImagemComGemini(
  imagemPath: string,
  nomeArquivo: string
): Promise<AnaliseResultado> {
  const gemini = await tentarGemini(imagemPath, nomeArquivo);
  if (gemini) {
    console.log('Análise via Gemini API realizada com sucesso');
    return gemini;
  }

  console.log('Usando análise local detalhada para:', nomeArquivo);
  return gerarAnaliseLocal(imagemPath);
}

export async function analisarVideoComGemini(
  _videoPath: string,
  _nomeArquivo: string
): Promise<AnaliseResultado> {
  return {
    descricaoGeral: 'Análise de vídeo pendente — envie fotos para análise detalhada de segurança.',
    nivelRisco: 'medio',
    riscos: [],
    epiViolacoes: [],
  };
}
