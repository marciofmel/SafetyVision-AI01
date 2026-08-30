import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';
import fs from 'fs';

// ═══════════════════════════════════════════════
// Template engine simples — substitui {{var}} e {{#if}}...{{/if}}
// ═══════════════════════════════════════════════

function hasValue(v: any): boolean {
  return v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== '[object Object]';
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resolve(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

function renderTemplate(html: string, data: any): string {
  // Processa {{#each array}}...{{/each}}
  html = html.replace(/\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, inner) => {
    const arr = resolve(data, key);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.map((item: any, idx: number) => {
      const itemData = typeof item === 'object' ? { ...item, _index: idx } : { _value: item, _index: idx };
      return renderTemplate(inner, { ...data, ...itemData, this: item });
    }).join('');
  });

  // Processa {{#if var}}...{{/if}}
  html = html.replace(/\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) => {
    const val = resolve(data, key);
    if (Array.isArray(val)) return val.length > 0 ? renderTemplate(inner, data) : '';
    return hasValue(val) ? renderTemplate(inner, data) : '';
  });

  // Processa {{this.var}} (dentro de each)
  html = html.replace(/\{\{this\.(\w+)\}\}/g, (_, key) => {
    const val = resolve(data.this || data, key);
    return hasValue(val) ? escapeHtml(String(val)) : '';
  });

  // Processa {{var}} simples
  html = html.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    const val = resolve(data, key);
    if (val === undefined || val === null) return '';
    return escapeHtml(String(val));
  });

  return html;
}

// ═══════════════════════════════════════════════
// Converte imagem para data URI
// ═══════════════════════════════════════════════

function imageToDataUri(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════
// Monta dados do template a partir da inspeção
// ═══════════════════════════════════════════════

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatTime(d: Date | string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface RenderData {
  inspecao: any;
  clRespostas?: any[];
  pgrs?: any[];
  asos?: any[];
  cipas?: any[];
}

function buildTemplateData(data: RenderData) {
  const { inspecao, clRespostas = [], pgrs = [], asos = [], cipas = [] } = data;
  const uploadsDir = path.join(__dirname, '../../uploads');

  const totalRiscos = inspecao.riscos?.length || 0;
  const epiIrreg = (inspecao.epiViolacoes || []).filter((e: any) => e.status !== 'correto').length;

  const conformes = clRespostas.filter(c => c.conformidade === 'conforme').length;
  const naoConformes = clRespostas.filter(c => c.conformidade === 'nao_conforme').length;
  const parcial = clRespostas.filter(c => c.conformidade === 'parcial').length;
  const naoSeAplica = clRespostas.filter(c => c.conformidade === 'nao_se_aplica').length;
  const totalCheck = clRespostas.length;

  const riscosPorGrav: Record<string, number> = { critica: 0, alta: 0, media: 0, baixa: 0 };
  (inspecao.riscos || []).forEach((r: any) => {
    const k = r.gravidade?.toLowerCase();
    if (k && riscosPorGrav[k] !== undefined) riscosPorGrav[k]++;
  });

  let classificacao = 'INSATISFATÓRIA';
  let classCor = 'badge-danger';
  const nota = inspecao.notaConformidade ?? 0;
  if (nota >= 80) { classificacao = 'SATISFATÓRIA'; classCor = 'badge-success'; }
  else if (nota >= 60) { classificacao = 'NECESSITA DE MELHORIAS'; classCor = 'badge-warning'; }
  else if (nota >= 40) { classificacao = 'INSATISFATÓRIA'; classCor = 'badge-danger'; }
  else { classificacao = 'CRÍTICA'; classCor = 'badge-danger'; }

  const gravClass: Record<string, string> = {
    crítica: 'risk-critical', critica: 'risk-critical', alta: 'risk-high',
    média: 'risk-medium', media: 'risk-medium', baixa: 'risk-low',
  };
  const gravBadge: Record<string, string> = {
    crítica: 'badge-danger', critica: 'badge-danger', alta: 'badge-warning',
    média: 'badge-warning', media: 'badge-warning', baixa: 'badge-success',
  };

  // Cover image
  let coverImage = '';
  const coverPhotos = ['canteiro.jpg', 'canteiro.png', 'obra.jpg', 'obra.png'];
  for (const cp of coverPhotos) {
    const p = path.join(uploadsDir, cp);
    if (fs.existsSync(p)) { coverImage = imageToDataUri(p) || ''; break; }
  }

  // Environment
  const environment = [
    { label: 'Características do ambiente', value: inspecao.caracteristicasAmbiente || 'Canteiro de obras em construção de edifício residencial.' },
    { label: 'Atividades executadas', value: inspecao.atividades || 'Montagem de fôrmas, armagem de ferragens, concretagem, instalações elétricas provisórias.' },
    { label: 'Máquinas e equipamentos', value: inspecao.maquinas || 'Betoneira, guincho de coluna, vibrador, serra circular, ferramentas manuais.' },
    { label: 'Produtos utilizados', value: inspecao.produtos || 'Concreto, aço, madeira, arame recozido, desmolante, produtos de limpeza.' },
    { label: 'N° de trabalhadores', value: String(inspecao.numTrabalhadores || 28) },
    { label: 'Condições gerais', value: inspecao.condicoesGerais || 'Ambiente com boa ventilação e iluminação natural.' },
    { label: 'Organização e limpeza', value: inspecao.organizacaoLimpeza || 'Parcialmente organizados.' },
    { label: 'Iluminação', value: inspecao.iluminacao || 'Natural e artificial adequada.' },
    { label: 'Ventilação', value: inspecao.ventilacao || 'Natural.' },
    { label: 'Sinalização', value: inspecao.sinalizacao || 'Parcialmente adequada.' },
    { label: 'Circulação', value: inspecao.circulacao || 'Algumas áreas com passagem obstruída.' },
  ].filter(e => hasValue(e.value));

  // Documents
  const documentos = [
    { name: 'PGR', status: 'OK', statusClass: 'badge-success', date: '10/01/2025', observation: 'Atualizado' },
    { name: 'Inventário de Riscos', status: 'OK', statusClass: 'badge-success', date: '10/01/2025', observation: 'Atualizado' },
    { name: 'PCMSO', status: 'OK', statusClass: 'badge-success', date: '05/01/2025', observation: 'Vigente' },
    { name: 'LTCAT', status: 'NA', statusClass: 'badge-neutral', date: '—', observation: 'Não aplicável' },
    { name: 'ASO', status: 'OK', statusClass: 'badge-success', date: '04/05/2025', observation: 'Arquivos válidos' },
    { name: 'Fichas de EPI', status: 'OK', statusClass: 'badge-success', date: '15/02/2025', observation: 'Disponíveis' },
    { name: 'Certificados de treinamento', status: 'OK', statusClass: 'badge-success', date: '05/04/2025', observation: 'NRs 35, 18, 10' },
    { name: 'Ordens de serviço', status: 'OK', statusClass: 'badge-success', date: 'Diário', observation: 'Registradas' },
    { name: 'APR', status: 'OK', statusClass: 'badge-success', date: '23/05/2025', observation: 'Para concertagem' },
    { name: 'PT', status: 'OK', statusClass: 'badge-success', date: '20/05/2025', observation: 'Trabalhos em altura' },
    { name: 'Permissões de trabalho', status: 'OK', statusClass: 'badge-success', date: 'Diária', observation: 'Disponíveis' },
    { name: 'Documentação de máquinas', status: 'OK', statusClass: 'badge-success', date: '12/03/2025', observation: 'Em conformidade' },
    { name: 'Inspeções anteriores', status: 'OK', statusClass: 'badge-success', date: '15/04/2025', observation: 'Relatório SVAI-0042' },
    { name: 'Outros documentos', status: 'OK', statusClass: 'badge-success', date: '—', observation: '—' },
  ];

  // Risks
  const risks = (inspecao.riscos || []).map((r: any, i: number) => {
    const g = r.gravidade?.toLowerCase() || '';
    let imgData = '';
    if (r.imagemUrl) {
      // Tenta base64 do risco primeiro
      if (r.imagemBase64) {
        imgData = r.imagemBase64;
      } else {
        const imgPath = path.join(uploadsDir, r.imagemUrl.replace('/uploads/', ''));
        imgData = imageToDataUri(imgPath) || '';
      }
    }
    return {
      number: String(i + 1).padStart(3, '0'),
      title: r.descricao?.substring(0, 80) || 'Risco identificado',
      classification: r.gravidade?.toUpperCase() || '—',
      classificationClass: gravBadge[g] || 'badge-neutral',
      riskClass: gravClass[g] || '',
      location: r.localIdentificado || '',
      activity: r.atividade || r.categoria || '',
      hazard: r.perigo || r.descricao || '',
      source: r.fonteGeradora || '',
      type: r.tipoRisco || 'Acidente',
      exposed: r.trabalhadoresExpostos || '',
      probability: r.probabilidade || '',
      severity: r.severidade || '',
      description: r.descricao || '',
      consequences: r.consequencias || '',
      existingControls: r.medidasExistentes || '',
      recommendedControls: r.medidasPreventivas || r.medidasCorretivas || '',
      image: imgData,
    };
  });

  // Non-conformities (risks that are critical/high or marked as NC)
  const nonConformities = (inspecao.riscos || [])
    .filter((r: any) => r.ehNaoConformidade || r.gravidade === 'critica' || r.gravidade === 'alta')
    .map((r: any, i: number) => ({
      number: String(i + 1).padStart(3, '0'),
      title: r.descricao?.substring(0, 60) || 'Não conformidade',
      status: 'ABERTA',
      statusClass: 'badge-danger',
      riskClass: gravClass[r.gravidade?.toLowerCase()] || 'risk-high',
      location: r.localIdentificado || '',
      priority: r.gravidade === 'critica' ? 'IMEDIATA' : 'Alta',
      risk: r.perigo || r.descricao || '',
      deadline: r.prazoCorrecao || 'Imediato',
      responsible: 'Encarregado de Obras',
      nr: r.nrsRelacionadas || '',
      description: r.descricao || '',
      correctiveAction: r.medidasCorretivas || r.medidasPreventivas || '',
    }));

  // Photos
  const fotos = (inspecao.midias || []).filter((m: any) => m.tipo === 'foto');
  const photos = fotos.map((f: any, i: number) => {
    let src = '';
    // Tenta base64 do banco primeiro (sobrevive ao disco efêmero)
    if (f.dadosBase64) {
      src = f.dadosBase64;
    } else {
      const imgPath = path.join(uploadsDir, f.url.replace('/uploads/', ''));
      src = imageToDataUri(imgPath) || '';
    }
    return {
      number: String(i + 1).padStart(2, '0'),
      src,
      location: f.local || inspecao.setor?.nome || '',
      description: f.descricao || f.nome || '',
      risk: '',
      recommendation: '',
    };
  }).filter((p: any) => p.src);

  // Checklist
  const checklist = clRespostas.map((cr: any, i: number) => {
    const resultClass = cr.conformidade === 'conforme' ? 'badge-success' : cr.conformidade === 'nao_conforme' ? 'badge-danger' : cr.conformidade === 'parcial' ? 'badge-warning' : 'badge-neutral';
    const result = cr.conformidade === 'conforme' ? 'CONFORME' : cr.conformidade === 'nao_conforme' ? 'NÃO CONFORME' : cr.conformidade === 'parcial' ? 'PARCIAL' : 'N/A';
    return {
      number: String(i + 1).padStart(2, '0'),
      item: (cr.item?.texto || '').substring(0, 50),
      requirement: cr.item?.template?.nr || cr.item?.nr || '',
      result,
      resultClass,
      observation: (cr.observacao || '').substring(0, 30),
      evidence: 'Foto',
    };
  });

  const complianceRate = totalCheck > 0 ? ((conformes / totalCheck) * 100).toFixed(0) : '0';

  // EPIs
  const epis = (inspecao.epiViolacoes || []).map((e: any) => ({
    name: e.epiNome || '',
    required: 'Sim',
    available: e.status !== 'ausente' ? 'Sim' : 'Não',
    used: e.status === 'correto' ? 'Sim' : 'Não',
    condition: e.status === 'correto' ? 'Bom' : e.status === 'incorreto' ? 'Irregular' : 'Ausente',
    observation: e.descricao || '',
  }));

  // PGR
  const pgr = pgrs.flatMap((p: any) => (p.itens || []).map((item: any) => ({
    risk: item.perigo || item.riscos || '',
    inPgr: 'Sim',
    pgrStatusClass: 'badge-success',
    controls: item.medidasControle || '',
    needsUpdate: 'Verificar',
    observation: '',
  })));

  // Action plan
  const actionPlan = (inspecao.riscos || [])
    .filter((r: any) => r.medidasCorretivas || r.medidasPreventivas)
    .slice(0, 20)
    .map((r: any, i: number) => ({
      number: String(i + 1).padStart(3, '0'),
      nc: `NC-${String(i + 1).padStart(3, '0')}`,
      action: (r.medidasCorretivas || r.medidasPreventivas || '').substring(0, 60),
      responsible: 'Encarregado de Obras',
      deadline: '25/05/2025',
      priority: r.gravidade === 'critica' ? 'IMEDIATA' : r.gravidade === 'alta' ? 'Alta' : 'Média',
      status: 'Aberta',
    }));

  // Recommendations
  const imediatas: string[] = [];
  const curtoPrazo: string[] = [];
  const medioPrazo: string[] = [];
  for (const r of inspecao.riscos || []) {
    const desc = r.medidasCorretivas || r.descricao || '';
    if (r.gravidade === 'critica') imediatas.push(`[${r.categoria}] ${desc}`);
    else if (r.gravidade === 'alta') curtoPrazo.push(`[${r.categoria}] ${desc}`);
    else medioPrazo.push(`[${r.categoria}] ${desc}`);
  }
  if (epiIrreg > 0) imediatas.push(`Regularizar ${epiIrreg} EPI(s) irregular(es)`);

  // Conclusion
  let conclusao = `A inspeção identificou ${totalRiscos} risco(s), ${naoConformes} não conformidade(s). `;
  if (riscosPorGrav.critica > 0) conclusao += `${riscosPorGrav.critica} crítico(s), `;
  if (riscosPorGrav.alta > 0) conclusao += `${riscosPorGrav.alta} alto(s), `;
  conclusao += `Classificação: ${classificacao}. Recomenda-se implementação das ações corretivas.`;

  return {
    coverImage,
    company: {
      name: inspecao.empresa?.nome || '',
      cnpj: inspecao.empresa?.cnpj || '',
      tradeName: inspecao.empresa?.nomeFantasia || '',
      cnae: inspecao.empresa?.cnae || '',
      riskLevel: inspecao.empresa?.grauRisco || '',
      address: inspecao.empresa?.endereco || '',
      email: inspecao.empresa?.email || '',
      phone: inspecao.empresa?.telefone || '',
      legalRep: inspecao.empresa?.responsavelLegal || '',
    },
    inspection: {
      number: inspecao.id?.slice(0, 12).toUpperCase() || '',
      date: formatDate(inspecao.dataInicio),
      startTime: formatTime(inspecao.dataInicio),
      endTime: formatTime(inspecao.dataFim),
      type: 'Inspeção de Segurança do Trabalho',
      sector: inspecao.setor?.nome || '',
      workers: String(inspecao.numTrabalhadores || ''),
      turno: inspecao.turno || '',
      responsavelSetor: inspecao.responsavelSetor || '',
      responsavel: inspecao.usuario?.nome || '',
      cargo: inspecao.usuario?.cargo || 'Técnico de Segurança do Trabalho',
      registro: inspecao.usuario?.registro || '',
      objective: inspecao.objetivo || 'Registrar as condições de segurança e saúde no trabalho, identificando situações de risco, não conformidades e oportunidades de melhoria.',
      scope: inspecao.escopo || 'A inspeção abrangeu as áreas operacionais do canteiro de obras.',
      limitations: inspecao.limitacoes || 'Avaliações baseadas nas condições observadas no momento da inspeção.',
      methodology: inspecao.metodologia || 'Inspeção visual, registro fotográfico, checklist de conformidade, análise de riscos, avaliação de EPIs e EPCs.',
    },
    summary: {
      totalItems: String(totalCheck || totalRiscos || 0),
      conforming: String(conformes),
      nonConforming: String(naoConformes),
      partial: String(parcial),
      notApplicable: String(naoSeAplica),
      criticalRisks: String(riscosPorGrav.critica),
      highRisks: String(riscosPorGrav.alta),
      mediumRisks: String(riscosPorGrav.media),
      lowRisks: String(riscosPorGrav.baixa),
      classification: classificacao,
      classificationClass: classCor,
      generalDescription: `Foram identificados ${totalRiscos} risco(s) e ${naoConformes} não conformidade(s) que requerem ações corretivas prioritárias.`,
    },
    environment,
    documents: documentos,
    risks,
    nonConformities,
    photos,
    checklist,
    checklistSummary: {
      conforming: String(conformes),
      nonConforming: String(naoConformes),
      partial: String(parcial),
      complianceRate,
    },
    epis,
    pgr,
    actionPlan,
    recommendations: {
      immediate: imediatas.slice(0, 10),
      shortTerm: curtoPrazo.slice(0, 10),
      mediumTerm: medioPrazo.slice(0, 10),
    },
    matrixSummary: {
      low: String(riscosPorGrav.baixa),
      medium: String(riscosPorGrav.media),
      high: String(riscosPorGrav.alta),
      critical: String(riscosPorGrav.critica),
    },
    conclusion: conclusao,
    responsible: {
      name: inspecao.usuario?.nome || '—',
      role: inspecao.usuario?.cargo || 'Técnico de Segurança do Trabalho',
      registration: inspecao.usuario?.registro || '',
    },
    companyResponsible: {
      name: inspecao.responsavelSetor || '—',
      role: 'Encarregado de Obras',
    },
  };
}

// ═══════════════════════════════════════════════
// Gera PDF via Playwright
// ═══════════════════════════════════════════════

function findTemplate(): string {
  const candidates = [
    path.join(__dirname, '../templates/relatorio.html'),
    path.join(__dirname, '../../templates/relatorio.html'),
    path.join(__dirname, '../../../src/templates/relatorio.html'),
    path.join(process.cwd(), 'src/templates/relatorio.html'),
    path.join(process.cwd(), 'dist/templates/relatorio.html'),
    path.join(process.cwd(), 'backend/src/templates/relatorio.html'),
    path.join(process.cwd(), 'backend/dist/templates/relatorio.html'),
    '/opt/render/project/src/backend/src/templates/relatorio.html',
    '/opt/render/project/src/backend/dist/templates/relatorio.html',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  throw new Error(`Template relatorio.html não encontrado. Tentativas: ${candidates.join(', ')}`);
}

let _cachedTemplate: string | null = null;

function getTemplate(): string {
  if (_cachedTemplate) return _cachedTemplate;
  try {
    const templatePath = findTemplate();
    _cachedTemplate = fs.readFileSync(templatePath, 'utf-8');
    console.log(`[pdfService] Template carregado de: ${templatePath}`);
  } catch (err) {
    console.error('[pdfService] ERRO ao carregar template:', err);
    throw err;
  }
  return _cachedTemplate!;
}

export async function generateRelatorioPDF(data: RenderData): Promise<Buffer> {
  let html = getTemplate();

  const templateData = buildTemplateData(data);
  html = renderTemplate(html, templateData);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: '14mm', right: '12mm', bottom: '16mm', left: '12mm' },
      headerTemplate: `
        <div style="width:100%;font-family:Arial;font-size:7px;color:#6b7280;padding:0 12mm">
          SafetyVision AI
          <span style="float:right">Relatório de Inspeção SST</span>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;font-family:Arial;font-size:7px;color:#6b7280;padding:0 12mm">
          <span>SafetyVision AI | Relatório de Inspeção SST</span>
          <span style="float:right">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
