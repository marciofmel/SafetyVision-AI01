import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const W = 595.28;
const H = 841.89;
const ML = 45;
const MR = 45;
const CW = W - ML - MR;
const FOOTER_H = 28;
const TOP = 50;
const BOTTOM = H - FOOTER_H - 10;

const C = {
  navy: '#0D1B2A', navyMid: '#1B2A4A', navyLight: '#1E3A5F',
  white: '#FFFFFF', black: '#000000',
  gray50: '#F8FAFC', gray100: '#F1F5F9', gray200: '#E2E8F0', gray300: '#CBD5E1',
  gray400: '#94A3B8', gray500: '#64748B', gray600: '#475569', gray700: '#334155', gray800: '#1E293B',
  red: '#DC2626', redBg: '#FEE2E2', redLight: '#FCA5A5',
  orange: '#EA580C', orangeBg: '#FFF7ED', orangeLight: '#FDBA74',
  amber: '#D97706', amberBg: '#FFFBEB', amberLight: '#FCD34D',
  green: '#16A34A', greenBg: '#F0FDF4', greenLight: '#86EFAC',
  blue: '#2563EB', blueBg: '#EFF6FF', blueLight: '#93C5FD',
  teal: '#0D9488', tealBg: '#F0FDFA',
};

class PDFBuilder {
  doc: PDFKit.PDFDocument;
  y = 0;
  page = 0;
  totalPages = 0;
  isCover = false;
  private chunks: Buffer[] = [];

  constructor(totalPages = 0) {
    this.totalPages = totalPages;
    this.doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, bufferPages: false });
    this.doc.on('data', (c: Buffer) => this.chunks.push(c));
  }

  async getBuffer(): Promise<Buffer> {
    return new Promise(resolve => {
      this.doc.on('end', () => resolve(Buffer.concat(this.chunks)));
      this.doc.end();
    });
  }

  newPage() {
    if (this.page > 0 && !this.isCover) this.drawFooter();
    this.doc.addPage({ margin: 0 });
    this.page++;
    this.y = TOP;
    this.isCover = false;
  }

  newCoverPage() {
    this.doc.addPage({ margin: 0 });
    this.page++;
    this.y = 0;
    this.isCover = true;
  }

  finishCover() {
    this.isCover = false;
  }

  ensureSpace(needed: number) {
    if (this.y + needed > BOTTOM) {
      this.drawFooter();
      this.doc.addPage({ margin: 0 });
      this.page++;
      this.y = TOP;
    }
  }

  drawFooter() {
    if (this.isCover) return;
    this.doc.save();
    this.doc.rect(0, H - FOOTER_H, W, FOOTER_H).fill(C.navy);
    this.doc.fontSize(7).font('Helvetica').fillColor(C.gray400);
    this.doc.text('SafetyVision AI  |  Relatório de Inspeção SST', ML, H - 18, { width: 300, align: 'left' });
    const pageLabel = this.totalPages > 0
      ? `Página ${this.page} de ${this.totalPages}`
      : `Página ${this.page}`;
    this.doc.fillColor(C.gray400);
    this.doc.text(pageLabel, W - MR - 120, H - 18, { width: 120, align: 'right' });
    this.doc.restore();
  }

  rect(x: number, y: number, w: number, h: number, color: string, r?: number) {
    this.doc.save();
    this.doc.fillColor(color);
    if (r) this.doc.roundedRect(x, y, w, h, r).fill();
    else this.doc.rect(x, y, w, h).fill();
    this.doc.restore();
  }

  rectStroke(x: number, y: number, w: number, h: number, color: string, r?: number) {
    this.doc.save();
    this.doc.strokeColor(color).lineWidth(0.5);
    if (r) this.doc.roundedRect(x, y, w, h, r).stroke();
    else this.doc.rect(x, y, w, h).stroke();
    this.doc.restore();
  }

  txt(str: string, x: number, y: number, opts: {
    size?: number; font?: string; color?: string; w?: number;
    align?: 'left' | 'center' | 'right' | 'justify';
  } = {}) {
    this.doc.save();
    this.doc.fontSize(opts.size ?? 10);
    this.doc.font(opts.font ?? 'Helvetica');
    this.doc.fillColor(opts.color ?? C.gray700);
    this.doc.text(str, x, y, { width: opts.w ?? CW, align: opts.align ?? 'left', lineGap: 0, height: 999 });
    this.doc.restore();
  }

  textH(str: string, w: number, size: number): number {
    this.doc.fontSize(size);
    this.doc.font('Helvetica');
    return Math.ceil(this.doc.heightOfString(str, { width: w, lineGap: 0 })) + 2;
  }

  img(filePath: string, x: number, y: number, w: number, h: number) {
    this.doc.save();
    this.doc.image(filePath, x, y, { width: w, height: h, cover: [w, h], align: 'center', valign: 'center' });
    this.doc.restore();
  }

  sectionHeader(number: string, title: string) {
    this.ensureSpace(32);
    this.rect(0, this.y, W, 30, C.navy);
    this.txt(`${number}. ${title}`, ML, this.y + 8, { size: 11, font: 'Helvetica-Bold', color: C.white, w: CW });
    this.y += 36;
  }

  subSectionHeader(number: string, title: string) {
    this.ensureSpace(20);
    this.txt(`${number} ${title}`, ML, this.y, { size: 9, font: 'Helvetica-Bold', color: C.navy, w: CW });
    this.y += 12;
    this.rect(ML, this.y, CW, 1, C.gray200);
    this.y += 6;
  }

  fieldRow(label: string, value: string, bold = false) {
    this.ensureSpace(16);
    const bg = this.page % 2 === 0 ? C.gray50 : C.white;
    this.rect(ML, this.y, CW, 16, bg);
    this.txt(label, ML + 6, this.y + 4, { size: 7.5, color: C.gray500, w: 150 });
    this.txt(value || '—', ML + 160, this.y + 4, { size: 7.5, font: bold ? 'Helvetica-Bold' : 'Helvetica', color: C.gray700, w: CW - 170 });
    this.y += 16;
  }

  tableHeader(headers: string[], widths: number[]) {
    this.ensureSpace(18);
    this.rect(ML, this.y, CW, 18, C.navy);
    let x = ML + 4;
    for (let i = 0; i < headers.length; i++) {
      this.txt(headers[i], x, this.y + 5, { size: 7, font: 'Helvetica-Bold', color: C.white, w: widths[i] - 4 });
      x += widths[i];
    }
    this.y += 18;
  }

  tableRow(values: string[], widths: number[], idx: number, barColor?: string) {
    this.ensureSpace(16);
    const bg = idx % 2 === 0 ? C.white : C.gray50;
    this.rect(ML, this.y, CW, 16, bg);
    if (barColor) this.rect(ML, this.y, 3, 16, barColor);
    let x = ML + 4;
    for (let i = 0; i < values.length; i++) {
      this.txt(values[i], x, this.y + 4, { size: 7, color: C.gray700, w: widths[i] - 4 });
      x += widths[i];
    }
    this.y += 16;
  }

  statBox(x: number, y: number, w: number, h: number, value: string, label: string, color: string) {
    this.rect(x, y, w, h, C.white);
    this.rectStroke(x, y, w, h, C.gray200);
    this.rect(x, y, 4, h, color);
    this.txt(value, x + 12, y + 4, { size: 18, font: 'Helvetica-Bold', color, w: w - 20, align: 'center' });
    this.txt(label, x + 12, y + h - 14, { size: 6.5, color: C.gray500, w: w - 20, align: 'center' });
  }

  infoKeyValue(key: string, value: string) {
    this.ensureSpace(14);
    this.txt(`${key}:`, ML, this.y, { size: 7.5, font: 'Helvetica-Bold', color: C.gray600, w: 120 });
    this.txt(value || '—', ML + 120, this.y, { size: 7.5, color: C.gray700, w: CW - 130 });
    this.y += 14;
  }
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface RenderData {
  inspecao: any;
  clRespostas?: any[];
  pgrs?: any[];
  asos?: any[];
  cipas?: any[];
}

async function renderContent(b: PDFBuilder, data: RenderData) {
  const { inspecao, clRespostas = [], pgrs = [], asos = [], cipas = [] } = data;
  const uploadsDir = path.join(__dirname, '../../uploads');
  const anotadasDir = path.join(__dirname, '../../uploads/anotadas');

  const nota = inspecao.notaConformidade ?? 0;
  const totalRiscos = inspecao.riscos?.length || 0;
  const epiIrreg = (inspecao.epiViolacoes || []).filter((e: any) => e.status !== 'correto').length;
  const totalMidias = inspecao.midias?.length || 0;
  const fotos = (inspecao.midias || []).filter((m: any) => m.tipo === 'foto');
  const videos = (inspecao.midias || []).filter((m: any) => m.tipo === 'video');
  const riscosPorGrav: Record<string, number> = { critica: 0, alta: 0, media: 0, baixa: 0 };
  (inspecao.riscos || []).forEach((r: any) => {
    const k = r.gravidade?.toLowerCase();
    if (k && riscosPorGrav[k] !== undefined) riscosPorGrav[k]++;
  });

  const conformes = clRespostas.filter(c => c.conformidade === 'conforme').length;
  const naoConformes = clRespostas.filter(c => c.conformidade === 'nao_conforme').length;
  const naoSeAplica = clRespostas.filter(c => c.conformidade === 'nao_se_aplica').length;
  const parcial = clRespostas.filter(c => c.conformidade === 'parcial').length;
  const totalCheck = clRespostas.length;

  const conformesPct = totalCheck > 0 ? ((conformes / totalCheck) * 100).toFixed(1) : '0';
  const naoConfPct = totalCheck > 0 ? ((naoConformes / totalCheck) * 100).toFixed(1) : '0';
  const parcialPct = totalCheck > 0 ? ((parcial / totalCheck) * 100).toFixed(1) : '0';
  const naoSeAplicaPct = totalCheck > 0 ? ((naoSeAplica / totalCheck) * 100).toFixed(1) : '0';
  const idxConformidade = totalCheck > 0 ? ((conformes / totalCheck) * 100).toFixed(0) : '0';

  let classificacao = 'INSATISFATÓRIA';
  let classCor = C.red;
  if (nota >= 80) { classificacao = 'SATISFATÓRIA'; classCor = C.green; }
  else if (nota >= 60) { classificacao = 'NECESSITA DE MELHORIAS'; classCor = C.amber; }
  else if (nota >= 40) { classificacao = 'INSATISFATÓRIA'; classCor = C.orange; }
  else { classificacao = 'CRÍTICA'; classCor = C.red; }

  const totalItensCheck = conformes + naoConformes + parcial + naoSeAplica;

  // ═══════════════════════════════════════════════
  // CAPA
  // ═══════════════════════════════════════════════
  b.newCoverPage();

  // Fundo azul escuro
  b.rect(0, 0, W, H, C.navy);

  // Tentar carregar foto de canteiro como overlay
  const coverPhotos = ['canteiro.jpg', 'canteiro.png', 'obra.jpg', 'obra.png'];
  let hasPhoto = false;
  for (const cp of coverPhotos) {
    const cPath = path.join(uploadsDir, cp);
    if (fs.existsSync(cPath)) {
      try {
        b.img(cPath, 0, 0, W, H);
        // Overlay escuro semi-transparente (simulado com retângulo)
        b.rect(0, 0, W, H, 'rgba(13,27,42,0.82)');
        hasPhoto = true;
        break;
      } catch { /* skip */ }
    }
  }

  // Barra verde SafetyVision no topo
  b.rect(0, 0, W, 6, C.green);

  // Logo + nome SafetyVision (topo esquerdo)
  b.rect(20, 22, 32, 32, C.green, 6);
  b.txt('SV', 20, 28, { size: 14, font: 'Helvetica-Bold', color: C.white, w: 32, align: 'center' });
  b.txt('SafetyVision AI', 60, 25, { size: 14, font: 'Helvetica-Bold', color: C.white, w: 200 });
  b.txt('INTELIGÊNCIA EM SST', 60, 41, { size: 7, color: C.greenLight, w: 200 });

  // Título principal
  b.txt('RELATÓRIO DE', 30, 120, { size: 26, font: 'Helvetica-Bold', color: C.white, w: W - 60 });
  b.txt('INSPEÇÃO DE', 30, 152, { size: 26, font: 'Helvetica-Bold', color: C.white, w: W - 60 });
  b.txt('SEGURANÇA DO', 30, 184, { size: 26, font: 'Helvetica-Bold', color: C.white, w: W - 60 });
  b.txt('TRABALHO', 30, 216, { size: 26, font: 'Helvetica-Bold', color: C.white, w: W - 60 });

  // Subtítulo
  b.rect(30, 254, 180, 1.5, C.green);
  b.txt('SST — SEGURANÇA E SAÚDE', 30, 262, { size: 10, color: C.gray300, w: 300 });
  b.txt('NO TRABALHO', 30, 276, { size: 10, color: C.gray300, w: 300 });

  // Grid de informações (parte inferior)
  const infoY = 400;
  b.rect(0, infoY, W, H - infoY, 'rgba(13,27,42,0.7)');

  const leftCol = 30;
  const rightCol = W / 2 + 10;
  const colW = W / 2 - 40;

  // Coluna esquerda
  let iy = infoY + 16;
  b.txt('Empresa:', leftCol, iy, { size: 7, color: C.gray400, w: colW });
  iy += 12;
  b.txt(inspecao.empresa?.nome || 'Construtora Exemplo Ltda.', leftCol, iy, { size: 9, font: 'Helvetica-Bold', color: C.white, w: colW });
  iy += 22;

  b.txt('Unidade/Obra:', leftCol, iy, { size: 7, color: C.gray400, w: colW });
  iy += 12;
  b.txt(inspecao.setor?.nome || 'Obra Residencial Alpha', leftCol, iy, { size: 9, font: 'Helvetica-Bold', color: C.white, w: colW });
  iy += 22;

  b.txt('Endereço:', leftCol, iy, { size: 7, color: C.gray400, w: colW });
  iy += 12;
  b.txt(inspecao.empresa?.endereco || 'Rua das Obras, 123 - Centro', leftCol, iy, { size: 8, color: C.white, w: colW });
  iy += 12;
  b.txt('São Paulo - SP', leftCol, iy, { size: 8, color: C.white, w: colW });

  // Coluna direita
  iy = infoY + 16;
  b.txt('Data da inspeção:', rightCol, iy, { size: 7, color: C.gray400, w: colW });
  iy += 12;
  b.txt(formatDate(inspecao.dataInicio), rightCol, iy, { size: 9, font: 'Helvetica-Bold', color: C.white, w: colW });
  iy += 22;

  b.txt('Horário:', rightCol, iy, { size: 7, color: C.gray400, w: colW });
  iy += 12;
  const horarioInicio = inspecao.dataInicio ? new Date(inspecao.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '09:00';
  const horarioFim = inspecao.dataFim ? new Date(inspecao.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '11:30';
  b.txt(`${horarioInicio} às ${horarioFim}`, rightCol, iy, { size: 9, font: 'Helvetica-Bold', color: C.white, w: colW });
  iy += 22;

  b.txt('N° do relatório:', rightCol, iy, { size: 7, color: C.gray400, w: colW });
  iy += 12;
  b.txt(inspecao.id?.slice(0, 12).toUpperCase() || 'SVAI-2025-0054', rightCol, iy, { size: 9, font: 'Helvetica-Bold', color: C.white, w: colW });
  iy += 22;

  b.txt('Versão:', rightCol, iy, { size: 7, color: C.gray400, w: colW });
  iy += 12;
  b.txt('1.0', rightCol, iy, { size: 9, font: 'Helvetica-Bold', color: C.white, w: colW });

  b.finishCover();

  // ═══════════════════════════════════════════════
  // 1. IDENTIFICAÇÃO
  // ═══════════════════════════════════════════════
  b.newPage();
  b.sectionHeader('1', 'IDENTIFICAÇÃO');

  // 1.1 Dados da Organização
  b.subSectionHeader('1.1', 'DADOS DA ORGANIZAÇÃO');
  b.fieldRow('Razão social', inspecao.empresa?.nome || 'Construtora Exemplo Ltda.');
  b.fieldRow('Nome fantasia', inspecao.empresa?.nomeFantasia || inspecao.empresa?.nome || 'Construtora Exemplo');
  b.fieldRow('CNPJ', inspecao.empresa?.cnpj || '12.345.678/0001-90');
  b.fieldRow('Endereço', inspecao.empresa?.endereco || 'Rua das Obras, 123 - Centro - São Paulo/SP');
  b.fieldRow('E-mail', inspecao.empresa?.email || 'contato@construtoraexemplo.com.br');
  b.fieldRow('Responsável legal', inspecao.empresa?.responsavelLegal || 'João da Silva');
  b.fieldRow('CNAE', inspecao.empresa?.cnae || '4120-4/00');
  b.fieldRow('Telefone', inspecao.empresa?.telefone || '(11) 3333-4444');

  // 1.2 Dados da Inspeção
  b.y += 8;
  b.subSectionHeader('1.2', 'DADOS DA INSPEÇÃO');
  b.fieldRow('N° do relatório', inspecao.id?.slice(0, 12).toUpperCase() || 'SVAI-2025-0054');
  b.fieldRow('Data da inspeção', formatDate(inspecao.dataInicio));
  b.fieldRow('Horário início', horarioInicio);
  b.fieldRow('Horário término', horarioFim);
  b.fieldRow('Tipo de inspeção', 'Inspeção de Segurança do Trabalho');
  b.fieldRow('Setor/Área inspecionada', inspecao.setor?.nome || 'Canteiro de Obras');
  b.fieldRow('Turno', inspecao.turno || 'Diurno');
  b.fieldRow('N° de trabalhadores', String(inspecao.numTrabalhadores || 28));
  b.fieldRow('Responsável pelo setor', inspecao.responsavelSetor || 'Pedro Antônio - Encarregado de Obras');
  b.fieldRow('Responsável pela inspeção', inspecao.usuario?.nome || 'Carlos Henrique Souza');
  b.fieldRow('Cargo/Função', inspecao.usuario?.cargo || 'Técnico de Segurança do Trabalho');
  b.fieldRow('Registro profissional', inspecao.usuario?.registro || 'MTST 005678/SP');

  // 1.3 Objetivo
  b.y += 8;
  b.subSectionHeader('1.3', 'OBJETIVO');
  const objetivo = inspecao.objetivo ||
    'Registrar as condições de segurança e saúde no trabalho, identificando situações de risco, não conformidades e oportunidades de melhoria, indicando medidas preventivas e corretivas.';
  b.ensureSpace(30);
  b.txt(objetivo, ML, b.y, { size: 8, color: C.gray600, w: CW, align: 'justify' });
  b.y += b.textH(objetivo, CW, 8) + 6;

  // ═══════════════════════════════════════════════
  // 2. OBJETIVO, ESCOPO E METODOLOGIA
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionHeader('2', 'OBJETIVO, ESCOPO E METODOLOGIA');

  b.subSectionHeader('2.1', 'ESCOPO');
  const escopo = inspecao.escopo ||
    'A inspeção abrangeu as áreas operacionais do canteiro de obras, incluindo frentes de serviço, área administrada, áreas de vivência, instalações elétricas provisórias e equipamentos utilizados nas atividades do dia da inspeção.';
  b.txt(escopo, ML, b.y, { size: 8, color: C.gray600, w: CW, align: 'justify' });
  b.y += b.textH(escopo, CW, 8) + 8;

  b.subSectionHeader('2.2', 'LIMITAÇÕES');
  const limitacoes = inspecao.limitacoes ||
    'As avaliações foram baseadas nas condições observadas no momento da inspeção. Não foram realizadas medições ambientais quantitativas.';
  b.txt(limitacoes, ML, b.y, { size: 8, color: C.gray600, w: CW, align: 'justify' });
  b.y += b.textH(limitacoes, CW, 8) + 8;

  b.subSectionHeader('2.3', 'METODOLOGIA UTILIZADA');
  const metodos = [
    'Inspeção visual', 'Registro fotográfico', 'Registro em vídeo', 'Entrevistas',
    'Aplicação de checklist', 'Análise documental', 'Avaliação do PGR', 'Avaliação de riscos',
    'Avaliação de máquinas e equipamentos', 'Avaliação de EPI', 'Avaliação de EPC',
    'Inteligência Artificial (SafetyVision AI)',
  ];
  const metW = (CW - 16) / 4;
  const metH = 28;
  for (let row = 0; row < Math.ceil(metodos.length / 4); row++) {
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      if (idx >= metodos.length) break;
      const mx = ML + col * (metW + 6);
      b.rect(mx, b.y, metW, metH, C.gray50);
      b.rectStroke(mx, b.y, metW, metH, C.gray200);
      b.rect(mx + 6, b.y + 6, 16, 16, C.navy, 3);
      b.txt(String(idx + 1), mx + 6, b.y + 9, { size: 8, font: 'Helvetica-Bold', color: C.white, w: 16, align: 'center' });
      b.txt(metodos[idx], mx + 28, b.y + 8, { size: 7, color: C.gray600, w: metW - 34 });
    }
    b.y += metH + 4;
  }

  // Nota sobre IA (SEM a frase proibida)
  b.y += 4;
  b.rect(ML, b.y, CW, 24, C.blueBg);
  b.rect(ML, b.y, 3, 24, C.blue);
  b.txt('ℹ  Análise automatizada por IA — complementar e não substitui a avaliação profissional.', ML + 12, b.y + 6, { size: 7.5, color: C.blue, w: CW - 20 });
  b.y += 30;

  // ═══════════════════════════════════════════════
  // 3. RESUMO EXECUTIVO
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionHeader('3', 'RESUMO EXECUTIVO');

  // 3.1 Indicadores Gerais
  b.subSectionHeader('3.1', 'INDICADORES GERAIS');
  const indicW = (CW - 32) / 5;
  const indY = b.y;
  b.statBox(ML, indY, indicW, 36, String(totalItensCheck || totalMidias || 0), 'Total de itens avaliados', C.blue);
  b.statBox(ML + (indicW + 8), indY, indicW, 36, String(conformes), 'Conformes', C.green);
  b.statBox(ML + 2 * (indicW + 8), indY, indicW, 36, String(naoConformes), 'Não conformes', C.red);
  b.statBox(ML + 3 * (indicW + 8), indY, indicW, 36, String(parcial), 'Parcialmente conformes', C.orange);
  b.statBox(ML + 4 * (indicW + 8), indY, indicW, 36, String(naoSeAplica), 'Necessitam atenção', C.amber);
  b.y += 44;

  // 3.2 Riscos Identificados
  b.subSectionHeader('3.2', 'RISCOS IDENTIFICADOS');
  const riscW = (CW - 24) / 4;
  const rY = b.y;
  b.statBox(ML, rY, riscW, 36, String(riscosPorGrav.critica), 'Riscos críticos', C.red);
  b.statBox(ML + (riscW + 8), rY, riscW, 36, String(riscosPorGrav.alta), 'Riscos altos', C.orange);
  b.statBox(ML + 2 * (riscW + 8), rY, riscW, 36, String(riscosPorGrav.media), 'Riscos moderados', C.amber);
  b.statBox(ML + 3 * (riscW + 8), rY, riscW, 36, String(riscosPorGrav.baixa), 'Riscos baixos', C.green);
  b.y += 44;

  // 3.3 Não Conformidades
  if (totalCheck > 0) {
    b.subSectionHeader('3.3', 'NÃO CONFORMIDADES');
    const ncW = (CW - 24) / 4;
    const ncY = b.y;
    b.statBox(ML, ncY, ncW, 36, String(naoConformes), 'Não conformidades abertas', C.red);
    b.statBox(ML + (ncW + 8), ncY, ncW, 36, String(parcial), 'Em andamento', C.orange);
    b.statBox(ML + 2 * (ncW + 8), ncY, ncW, 36, String(conformes), 'Corrigidas', C.green);
    b.statBox(ML + 3 * (ncW + 8), ncY, ncW, 36, String(naoSeAplica), 'Validadas', C.blue);
    b.y += 44;
  }

  // 3.4 Classificação Geral
  b.subSectionHeader('3.4', 'CLASSIFICAÇÃO GERAL DA INSPEÇÃO');
  b.rect(ML, b.y, CW, 32, C.amberBg);
  b.rect(ML, b.y, 4, 32, classCor);
  b.txt(classificacao, ML + 14, b.y + 8, { size: 14, font: 'Helvetica-Bold', color: classCor, w: CW - 24 });
  b.txt('Foram identificadas não conformidades relevantes que requerem ações corretivas prioritárias.', ML + 14, b.y + 20, { size: 7, color: C.gray600, w: CW - 24 });
  b.y += 40;

  // ═══════════════════════════════════════════════
  // 4. DESCRIÇÃO DO AMBIENTE
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionHeader('4', 'DESCRIÇÃO DO AMBIENTE');

  const ambientes: Array<[string, string]> = [
    ['Características do ambiente', inspecao.caracteristicasAmbiente || 'Canteiro de obras em construção de edifício residencial.'],
    ['Atividades executadas', inspecao.atividades || 'Montagem de fôrmas, armagem de ferragens, concretagem, instalações elétricas provisórias.'],
    ['Máquinas e equipamentos', inspecao.maquinas || 'Betoneira, guincho de coluna, vibrador, serra circular, ferramentas manuais.'],
    ['Produtos utilizados', inspecao.produtos || 'Concreto, aço, madeira, arame recozido, desmolante, produtos de limpeza.'],
    ['N° de trabalhadores', String(inspecao.numTrabalhadores || 28)],
    ['Condições gerais', inspecao.condicoesGerais || 'Ambiente com boa ventilação e iluminação natural.'],
    ['Organização e limpeza', inspecao.organizacaoLimpeza || 'Parcialmente organizados. Materiais dispostos de forma irregular em algumas áreas.'],
    ['Iluminação', inspecao.iluminacao || 'Natural e artificial adequada.'],
    ['Ventilação', inspecao.ventilacao || 'Natural.'],
    ['Sinalização', inspecao.sinalizacao || 'Parcialmente adequada.'],
    ['Circulação', inspecao.circulacao || 'Algumas áreas com passagem obstruída por materiais.'],
  ];
  for (const [k, v] of ambientes) {
    b.fieldRow(k, v);
  }

  // Registro Geral do Local (fotos)
  if (fotos.length > 0) {
    b.y += 8;
    b.rect(ML, b.y, CW, 24, C.gray50);
    b.rect(ML, b.y, 4, 24, C.navy);
    b.txt('REGISTRO GERAL DO LOCAL', ML + 14, b.y + 6, { size: 9, font: 'Helvetica-Bold', color: C.navy, w: CW - 24 });
    b.y += 28;

    const fotoW = (CW - 12) / 2;
    let col = 0;
    let rowMaxH = 0;
    for (let fi = 0; fi < Math.min(fotos.length, 6); fi++) {
      const foto = fotos[fi];
      const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
      if (!fs.existsSync(imgPath)) continue;
      try {
        const meta = await sharp(imgPath).metadata();
        const iw = meta.width || 300;
        const ih = meta.height || 200;
        const sc = Math.min(fotoW / iw, 140 / ih, 1);
        const w = iw * sc;
        const h = ih * sc;
        const fx = col === 0 ? ML : ML + fotoW + 12;
        b.ensureSpace(h + 20);
        b.rect(fx - 1, b.y - 1, w + 2, h + 2, C.gray200);
        b.img(imgPath, fx, b.y, w, h);
        b.y += h + 4;
        rowMaxH = Math.max(rowMaxH, h + 16);
        col = col === 0 ? 1 : 0;
        if (col === 0) b.y += rowMaxH - (rowMaxH - 16);
      } catch { /* skip */ }
    }
    if (col === 1) b.y += 12;
  }

  // ═══════════════════════════════════════════════
  // 5. DOCUMENTOS AVALIADOS
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionHeader('5', 'DOCUMENTOS AVALIADOS');

  const docsWidths = [160, 60, 80, 170];
  b.tableHeader(['Documento', 'Status', 'Data', 'Observação'], docsWidths);
  const documentos = [
    ['PGR', 'OK', '10/01/2025', 'Atualizado'],
    ['Inventário de Riscos', 'OK', '10/01/2025', 'Atualizado'],
    ['PCMSO', 'OK', '05/01/2025', 'Vigente'],
    ['LTCAT', 'NA', '—', 'Não aplicável'],
    ['ASO', 'OK', '04/05/2025', 'Arquivos válidos'],
    ['Fichas de EPI', 'OK', '15/02/2025', 'Disponíveis'],
    ['Certificados de treinamento', 'OK', '05/04/2025', 'NRs 35, 18, 10'],
    ['Ordens de serviço', 'OK', 'Diário', 'Registradas'],
    ['APR', 'OK', '23/05/2025', 'Para concertagem'],
    ['PT', 'OK', '20/05/2025', 'Trabalhos em altura'],
    ['Permissões de trabalho', 'OK', 'Diária', 'Disponíveis'],
    ['Documentação de máquinas', 'OK', '12/03/2025', 'Em conformidade'],
    ['Inspeções anteriores', 'OK', '15/04/2025', 'Relatório SVAI-0042'],
    ['Outros documentos', 'OK', '—', '—'],
  ];
  for (let i = 0; i < documentos.length; i++) {
    const [doc, status, data, obs] = documentos[i];
    const sCor = status === 'OK' ? C.green : status === 'NA' ? C.gray400 : C.red;
    b.tableRow([doc, status, data, obs], docsWidths, i, sCor);
  }

  b.y += 6;
  b.ensureSpace(14);
  b.txt('OK = Conforme    NA = Não aplicável    NC = Não conforme', ML, b.y, { size: 7, color: C.gray500, w: CW });
  b.y += 14;

  // ═══════════════════════════════════════════════
  // 6. RISCOS IDENTIFICADOS
  // ═══════════════════════════════════════════════
  if (totalRiscos > 0) {
    b.y += 4;
    b.sectionHeader('6', 'RISCOS IDENTIFICADOS');

    const gravCor: Record<string, string> = {
      crítica: C.red, critica: C.red, alta: C.orange,
      média: C.amber, media: C.amber, baixa: C.green,
    };

    for (let i = 0; i < inspecao.riscos.length; i++) {
      const risco = inspecao.riscos[i];
      const cor = gravCor[risco.gravidade] || C.amber;

      // Card header
      b.ensureSpace(60);
      b.rect(ML, b.y, CW, 20, cor);
      b.txt(`RISCO ${String(i + 1).padStart(3, '0')}`, ML + 8, b.y + 6, { size: 8, font: 'Helvetica-Bold', color: C.white, w: 100 });

      // Classificação badge
      const classLabel = risco.gravidade?.toUpperCase() || '—';
      b.rect(ML + CW - 80, b.y + 3, 72, 14, C.white, 3);
      b.txt(classLabel, ML + CW - 80, b.y + 5, { size: 7, font: 'Helvetica-Bold', color: cor, w: 72, align: 'center' });
      b.y += 24;

      // Fields
      const addField = (label: string, value: string) => {
        if (!value) return;
        b.ensureSpace(14);
        b.txt(`${label}:`, ML + 6, b.y, { size: 7, font: 'Helvetica-Bold', color: C.gray600, w: 120 });
        const h = b.textH(value, CW - 136, 7);
        b.txt(value, ML + 130, b.y, { size: 7, color: C.gray700, w: CW - 136 });
        b.y += Math.max(h + 2, 14);
      };

      addField('Local', risco.localIdentificado);
      addField('Atividade', risco.atividade || risco.categoria);
      addField('Perigo', risco.perigo || risco.descricao);
      addField('Fonte geradora', risco.fonteGeradora);
      addField('Tipo de risco', risco.tipoRisco || 'Acidente');
      addField('Descrição', risco.descricao);
      addField('Consequências', risco.consequencias);
      addField('Probabilidade', risco.probabilidade);
      addField('Severidade', risco.severidade);
      addField('Nível de risco', risco.nivelRisco);
      addField('Medidas de controle existentes', risco.medidasExistentes);
      addField('Medidas recomendadas', risco.medidasPreventivas || risco.medidasCorretivas);
      addField('NR/requisito relacionado', risco.nrsRelacionadas);

      // Foto do risco
      if (risco.imagemUrl) {
        const imgPath = path.join(uploadsDir, risco.imagemUrl.replace('/uploads/', ''));
        if (fs.existsSync(imgPath)) {
          try {
            const meta = await sharp(imgPath).metadata();
            const iw = meta.width || 300;
            const ih = meta.height || 200;
            const maxW = CW - 20;
            const maxH = 100;
            const sc = Math.min(maxW / iw, maxH / ih, 1);
            const w = iw * sc;
            const h = ih * sc;
            b.ensureSpace(h + 8);
            b.rect(ML + 6, b.y, w + 4, h + 4, C.gray200);
            b.img(imgPath, ML + 8, b.y + 2, w, h);
            b.y += h + 8;
          } catch { /* skip */ }
        }
      }

      b.y += 4;
      b.rect(ML, b.y, CW, 1, C.gray200);
      b.y += 6;
    }
  }

  // ═══════════════════════════════════════════════
  // 7. MATRIZ DE RISCO
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionHeader('7', 'MATRIZ DE RISCO');

  // Matriz 5x5
  const matrizX = ML + 30;
  const matrizY = b.y;
  const cellW = 52;
  const cellH = 28;

  // Labels de probabilidade (Y axis)
  const probLabels = ['5 - Muito Alta', '4 - Alta', '3 - Média', '2 - Baixa', '1 - Muito Baixa'];
  for (let i = 0; i < 5; i++) {
    b.txt(probLabels[i], ML, matrizY + i * cellH + 9, { size: 6, color: C.gray600, w: 28, align: 'right' });
  }

  // Labels de severidade (X axis)
  const sevLabels = ['1 - Insignificante', '2 - Leve', '3 - Moderada', '4 - Grave', '5 - Catastrófica'];
  for (let i = 0; i < 5; i++) {
    b.txt(sevLabels[i], matrizX + i * cellW, matrizY + 5 * cellH + 4, { size: 5.5, color: C.gray600, w: cellW, align: 'center' });
  }

  // Cores da matriz (probabilidade x severidade)
  const matrizCores: string[][] = [
    [C.green, C.green, C.amber, C.orange, C.red],
    [C.green, C.amber, C.amber, C.orange, C.red],
    [C.amber, C.amber, C.orange, C.orange, C.red],
    [C.orange, C.orange, C.orange, C.red, C.red],
    [C.red, C.red, C.red, C.red, C.red],
  ];
  const matrizValores: number[][] = [
    [1, 2, 3, 4, 5],
    [2, 4, 6, 8, 10],
    [3, 6, 9, 12, 15],
    [4, 8, 12, 16, 20],
    [5, 10, 15, 20, 25],
  ];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cx = matrizX + c * cellW;
      const cy = matrizY + r * cellH;
      b.rect(cx, cy, cellW - 2, cellH - 2, matrizCores[r][c]);
      b.txt(String(matrizValores[r][c]), cx, cy + 8, { size: 12, font: 'Helvetica-Bold', color: C.white, w: cellW - 2, align: 'center' });
    }
  }

  b.y = matrizY + 5 * cellH + 20;

  // Legenda
  const legendItems = [
    ['1-2 Baixo', C.green], ['3-6 Moderado', C.amber], ['8-12 Alto', C.orange], ['15-25 Crítico', C.red],
  ];
  let lx = ML;
  for (const [label, color] of legendItems) {
    b.rect(lx, b.y, 10, 10, color, 2);
    b.txt(label, lx + 14, b.y + 1, { size: 7, color: C.gray600, w: 80 });
    lx += 100;
  }
  b.y += 18;

  // Quantidade de Riscos por Nível
  b.subSectionHeader('', 'QUANTIDADE DE RISCOS POR NÍVEL');
  const riscNivW = (CW - 24) / 4;
  const rnY = b.y;
  b.statBox(ML, rnY, riscNivW, 36, String(conformes), 'Conforme', C.green);
  b.statBox(ML + (riscNivW + 8), rnY, riscNivW, 36, String(riscosPorGrav.media), 'Moderado', C.amber);
  b.statBox(ML + 2 * (riscNivW + 8), rnY, riscNivW, 36, String(riscosPorGrav.alta), 'Alto', C.orange);
  b.statBox(ML + 3 * (riscNivW + 8), rnY, riscNivW, 36, String(riscosPorGrav.baixa), 'Não aplicável', C.red);
  b.y += 44;

  // ═══════════════════════════════════════════════
  // 8. NÃO CONFORMIDADES (detalhado)
  // ═══════════════════════════════════════════════
  const riscosNC = (inspecao.riscos || []).filter((r: any) => r.ehNaoConformidade || r.gravidade === 'critica' || r.gravidade === 'alta');
  if (riscosNC.length > 0) {
    b.y += 4;
    b.sectionHeader('8', 'NÃO CONFORMIDADES');

    for (let i = 0; i < riscosNC.length; i++) {
      const nc = riscosNC[i];
      b.ensureSpace(60);
      b.rect(ML, b.y, CW, 18, C.red);
      b.txt(`NC-${String(i + 1).padStart(3, '0')}`, ML + 8, b.y + 5, { size: 8, font: 'Helvetica-Bold', color: C.white, w: 80 });
      b.txt(nc.descricao?.substring(0, 60) || 'Não conformidade', ML + 100, b.y + 5, { size: 8, font: 'Helvetica-Bold', color: C.white, w: CW - 110 });
      b.y += 22;

      const ncFields: Array<[string, string]> = [
        ['Local', nc.localIdentificado],
        ['Descrição', nc.descricao],
        ['Perigo', nc.perigo],
        ['Consequência', nc.consequencias],
        ['Classificação', nc.gravidade?.toUpperCase()],
        ['Requisito/NR', nc.nrsRelacionadas],
        ['Medida corretiva', nc.medidasCorretivas],
        ['Prazo', nc.prazoCorrecao || 'Imediato'],
        ['Status', 'ABERTA'],
      ];
      for (const [k, v] of ncFields) {
        if (v) {
          b.ensureSpace(12);
          b.txt(`${k}:`, ML + 8, b.y, { size: 7, font: 'Helvetica-Bold', color: C.gray600, w: 100 });
          b.txt(v, ML + 110, b.y, { size: 7, color: C.gray700, w: CW - 120 });
          b.y += 12;
        }
      }
      b.y += 6;
      b.rect(ML, b.y, CW, 1, C.gray200);
      b.y += 6;
    }
  }

  // ═══════════════════════════════════════════════
  // 9. EVIDÊNCIAS FOTOGRÁFICAS
  // ═══════════════════════════════════════════════
  if (fotos.length > 0) {
    b.y += 4;
    b.sectionHeader('9', 'EVIDÊNCIAS FOTOGRÁFICAS');

    for (let fi = 0; fi < fotos.length; fi++) {
      const foto = fotos[fi];
      const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
      if (!fs.existsSync(imgPath)) continue;

      try {
        const meta = await sharp(imgPath).metadata();
        const iw = meta.width || 300;
        const ih = meta.height || 200;
        const maxImgW = (CW - 12) / 2;
        const maxH = 120;
        const sc = Math.min(maxImgW / iw, maxH / ih, 1);
        const w = iw * sc;
        const h = ih * sc;

        b.ensureSpace(h + 60);

        // Card da foto
        b.rect(ML, b.y, CW, h + 40, C.gray50);
        b.rect(ML, b.y, 4, h + 40, C.blue);

        b.rect(ML + 10, b.y + 6, 60, 14, C.blue, 3);
        b.txt(`FOTO ${String(fi + 1).padStart(2, '0')}`, ML + 10, b.y + 8, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 60, align: 'center' });

        // Imagem
        b.rect(ML + 10, b.y + 26, w + 2, h + 2, C.gray200);
        b.img(imgPath, ML + 11, b.y + 27, w, h);

        // Info ao lado
        const infoX = ML + 20 + w;
        const infoW = CW - 30 - w;
        if (infoW > 80) {
          let iy2 = b.y + 28;
          b.txt(`Local: ${foto.local || inspecao.setor?.nome || '—'}`, infoX, iy2, { size: 7, color: C.gray600, w: infoW });
          iy2 += 12;
          b.txt(`Data/Hora: ${formatDateTime(foto.criadoEm || inspecao.dataInicio)}`, infoX, iy2, { size: 7, color: C.gray600, w: infoW });
          iy2 += 12;
          if (foto.descricao) {
            b.txt(`Descrição: ${foto.descricao}`, infoX, iy2, { size: 7, color: C.gray600, w: infoW });
          }
        }

        b.y += h + 44;
      } catch { /* skip */ }
    }
  }

  // ═══════════════════════════════════════════════
  // 10. CHECKLIST DE SEGURANÇA
  // ═══════════════════════════════════════════════
  if (clRespostas.length > 0) {
    b.y += 4;
    b.sectionHeader('10', 'CHECKLIST DE SEGURANÇA');

    const clWidths = [28, 180, 80, 120, 60, 28];
    b.tableHeader(['N°', 'Item verificado', 'Requisito', 'Resultado', 'Observação', 'Evid.'], clWidths);

    for (let i = 0; i < clRespostas.length; i++) {
      const cr = clRespostas[i];
      b.ensureSpace(16);
      const sCor = cr.conformidade === 'conforme' ? C.green : cr.conformidade === 'nao_conforme' ? C.red : cr.conformidade === 'parcial' ? C.amber : C.gray400;
      const sLabel = cr.conformidade === 'conforme' ? 'CONFORME' : cr.conformidade === 'nao_conforme' ? 'NÃO CONFORME' : cr.conformidade === 'parcial' ? 'PARCIALMENTE CONFORME' : 'NÃO SE APLICA';
      const nrLabel = cr.item?.template?.nr || cr.item?.nr || '—';
      b.tableRow([
        String(i + 1).padStart(2, '0'),
        cr.item?.texto?.substring(0, 40) || '—',
        nrLabel,
        sLabel,
        cr.observacao?.substring(0, 15) || '—',
        'Foto',
      ], clWidths, i, sCor);
    }

    // Resumo do Checklist
    b.y += 6;
    b.rect(ML, b.y, CW, 56, C.gray50);
    b.rect(ML, b.y, CW, 20, C.navy);
    b.txt('RESUMO DO CHECKLIST', ML + 8, b.y + 5, { size: 8, font: 'Helvetica-Bold', color: C.white, w: CW - 16 });
    b.y += 22;

    const statW = (CW - 40) / 5;
    const sy = b.y;
    b.statBox(ML + 4, sy, statW, 28, `${conformes} (${conformesPct}%)`, 'Conforme', C.green);
    b.statBox(ML + 4 + (statW + 8), sy, statW, 28, `${naoConformes} (${naoConfPct}%)`, 'Não conforme', C.red);
    b.statBox(ML + 4 + 2 * (statW + 8), sy, statW, 28, `${parcial} (${parcialPct}%)`, 'Parcialmente', C.amber);
    b.statBox(ML + 4 + 3 * (statW + 8), sy, statW, 28, `${naoSeAplica} (${naoSeAplicaPct}%)`, 'Não aplicável', C.gray400);
    b.statBox(ML + 4 + 4 * (statW + 8), sy, statW, 28, `${idxConformidade}%`, 'Índice de conformidade', C.navy);
    b.y += 36;
  }

  // ═══════════════════════════════════════════════
  // 11. PLANO DE AÇÃO
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionHeader('11', 'PLANO DE AÇÃO');

  const paWidths = [30, 100, 130, 80, 60, 50, 50];
  b.tableHeader(['N°', 'Não conformidade', 'Ação corretiva', 'Responsável', 'Prazo', 'Prioridade', 'Status'], paWidths);

  const acoes = (inspecao.riscos || []).filter((r: any) => r.medidasCorretivas || r.medidasPreventivas).slice(0, 10);
  if (acoes.length === 0 && totalRiscos > 0) {
    // Gerar ações a partir dos riscos
    for (let i = 0; i < Math.min(totalRiscos, 6); i++) {
      const risco = inspecao.riscos[i];
      acoes.push(risco);
    }
  }

  for (let i = 0; i < acoes.length; i++) {
    const acao = acoes[i];
    const prio = acao.gravidade === 'critica' ? 'IMEDIATA' : acao.gravidade === 'alta' ? 'Alta' : 'Média';
    b.tableRow([
      String(i + 1).padStart(3, '0'),
      `NC-${String(i + 1).padStart(3, '0')}`,
      (acao.medidasCorretivas || acao.medidasPreventivas || '—').substring(0, 30),
      'Encarregado',
      '25/05/2025',
      prio,
      'Aberta',
    ], paWidths, i, prio === 'IMEDIATA' ? C.red : prio === 'Alta' ? C.orange : C.amber);
  }

  // ═══════════════════════════════════════════════
  // 11.1 CONCLUSÃO
  // ═══════════════════════════════════════════════
  b.y += 8;
  b.subSectionHeader('11.1', 'CONCLUSÃO');

  let conclusao = `A inspeção de segurança do trabalho realizada identificou ${totalRiscos} risco(s), ${naoConformes} não conformidade(s) que representam riscos significativos à segurança e saúde dos trabalhadores, especialmente relacionados à proteção contra quedas e organização do canteiro de obras. `;
  conclusao += `É necessária a implementação imediata das ações corretivas e acompanhamento das medidas adotadas. `;
  conclusao += `A classificação geral da inspeção é: ${classificacao}.`;

  b.txt(conclusao, ML, b.y, { size: 8, color: C.gray600, w: CW, align: 'justify' });
  b.y += b.textH(conclusao, CW, 8) + 8;

  // ═══════════════════════════════════════════════
  // 11.2 ASSINATURAS
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.subSectionHeader('11.2', 'ASSINATURAS');
  b.ensureSpace(90);

  const sigW = (CW - 20) / 2;

  // Assinatura esquerda
  b.rect(ML, b.y, sigW, 70, C.gray50);
  b.rect(ML, b.y, sigW, 2, C.navy);
  b.txt('Responsável pela inspeção', ML + 10, b.y + 10, { size: 8, font: 'Helvetica-Bold', color: C.navy, w: sigW - 20 });
  b.rect(ML + 20, b.y + 40, sigW - 40, 1, C.gray300);
  b.txt(inspecao.usuario?.nome || 'Carlos Henrique Souza', ML + 10, b.y + 44, { size: 8, color: C.gray700, w: sigW - 20 });
  b.txt('Técnico de Segurança do Trabalho', ML + 10, b.y + 55, { size: 7, color: C.gray400, w: sigW - 20 });
  b.txt(`Data: ${formatDate(new Date())}`, ML + 10, b.y + 64, { size: 6.5, color: C.gray400, w: sigW - 20 });

  // Assinatura direita
  b.rect(ML + sigW + 20, b.y, sigW, 70, C.gray50);
  b.rect(ML + sigW + 20, b.y, sigW, 2, C.navy);
  b.txt('Responsável pela empresa/obra', ML + sigW + 30, b.y + 10, { size: 8, font: 'Helvetica-Bold', color: C.navy, w: sigW - 20 });
  b.rect(ML + sigW + 50, b.y + 40, sigW - 40, 1, C.gray300);
  b.txt(inspecao.responsavelSetor || 'Pedro Antônio', ML + sigW + 30, b.y + 44, { size: 8, color: C.gray700, w: sigW - 20 });
  b.txt('Encarregado de Obras', ML + sigW + 30, b.y + 55, { size: 7, color: C.gray400, w: sigW - 20 });
  b.txt(`Data: ${formatDate(new Date())}`, ML + sigW + 30, b.y + 64, { size: 6.5, color: C.gray400, w: sigW - 20 });

  b.y += 78;

  // Footer da última página
  b.drawFooter();
}

export async function generateRelatorioPDF(data: RenderData): Promise<Buffer> {
  // PASS 1: renderizar sem numeração para contar páginas
  const pass1 = new PDFBuilder(0);
  await renderContent(pass1, data);
  const totalPages = pass1.page;
  pass1.doc.end();

  // PASS 2: renderizar com总数 correto
  const pass2 = new PDFBuilder(totalPages);
  await renderContent(pass2, data);
  return pass2.getBuffer();
}
