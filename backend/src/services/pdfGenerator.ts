import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const W = 595.28;
const H = 841.89;
const ML = 50;
const MR = 50;
const CW = W - ML - MR;
const HEADER_H = 32;
const FOOTER_H = 30;
const TOP = HEADER_H + 8;
const BOTTOM = H - FOOTER_H - 8;

const C = {
  navy: '#0F172A', navyLight: '#1E293B', amber: '#F59E0B', white: '#FFFFFF',
  gray50: '#F8FAFC', gray100: '#F1F5F9', gray200: '#E2E8F0', gray300: '#CBD5E1',
  gray400: '#94A3B8', gray500: '#64748B', gray600: '#475569', gray700: '#334155',
  red: '#DC2626', redBg: '#FEF2F2',
  orange: '#EA580C', orangeBg: '#FFF7ED',
  green: '#16A34A', greenBg: '#F0FDF4',
  blue: '#2563EB', blueBg: '#EFF6FF',
  amberBg: '#FFFBEB',
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
    if (this.page > 0 && !this.isCover) this.drawHeaderFooter();
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
      this.drawHeaderFooter();
      this.doc.addPage({ margin: 0 });
      this.page++;
      this.y = TOP;
    }
  }

  drawHeaderFooter() {
    this.doc.save();
    this.doc.rect(0, 0, W, HEADER_H).fill(C.navy);
    this.doc.fontSize(7).font('Helvetica').fillColor(C.gray400);
    this.doc.text('SafetyVision AI  |  Relatório de Inspeção SST', ML, 10, { width: CW, align: 'left' });
    this.doc.fontSize(7).font('Helvetica').fillColor(C.amber);
    this.doc.text('Relatório de Inspeção', ML, 20, { width: CW, align: 'left' });
    this.doc.restore();

    this.doc.save();
    this.doc.rect(0, H - FOOTER_H, W, FOOTER_H).fill(C.navy);
    this.doc.fontSize(7).font('Helvetica').fillColor(C.gray400);
    this.doc.text('SafetyVision AI', ML, H - 22, { width: 200, align: 'left' });
    this.doc.fontSize(7).font('Helvetica').fillColor(C.amber);
    const pageLabel = this.totalPages > 0
      ? `Página ${this.page} de ${this.totalPages}`
      : `Página ${this.page}`;
    this.doc.text(pageLabel, W - MR - 130, H - 22, { width: 130, align: 'right' });
    this.doc.restore();
  }

  rect(x: number, y: number, w: number, h: number, color: string, r?: number) {
    this.doc.save();
    this.doc.fillColor(color);
    if (r) this.doc.roundedRect(x, y, w, h, r).fill();
    else this.doc.rect(x, y, w, h).fill();
    this.doc.restore();
  }

  txt(str: string, x: number, y: number, opts: {
    size?: number; font?: string; color?: string; w?: number; align?: 'left' | 'center' | 'right' | 'justify';
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
    this.doc.image(filePath, x, y, { width: w, height: h });
    this.doc.restore();
  }

  sectionTitle(title: string) {
    this.ensureSpace(36);
    this.rect(ML - 4, this.y - 4, CW + 8, 28, C.navy, 4);
    this.txt(title, ML, this.y, { size: 12, font: 'Helvetica-Bold', color: C.white });
    this.y += 32;
  }

  subTitle(title: string) {
    this.ensureSpace(20);
    this.txt(title, ML, this.y, { size: 10, font: 'Helvetica-Bold', color: C.navy });
    this.y += 14;
    this.rect(ML, this.y, 60, 2, C.amber);
    this.y += 8;
  }

  tableRow(headers: string[], widths: number[], color: string) {
    this.ensureSpace(20);
    this.rect(ML, this.y, CW, 20, color);
    let x = ML + 6;
    for (let i = 0; i < headers.length; i++) {
      this.txt(headers[i], x, this.y + 5, { size: 7, font: 'Helvetica-Bold', color: C.white, w: widths[i] - 6 });
      x += widths[i];
    }
    this.y += 20;
  }

  tableRowData(values: string[], widths: number[], bgColor: string, barColor?: string) {
    this.ensureSpace(18);
    this.rect(ML, this.y, CW, 18, bgColor);
    if (barColor) this.rect(ML, this.y, 3, 18, barColor);
    let x = ML + 6;
    for (let i = 0; i < values.length; i++) {
      this.txt(values[i], x, this.y + 4, { size: 7, color: C.gray700, w: widths[i] - 6 });
      x += widths[i];
    }
    this.y += 18;
  }

  textBlock(str: string, x: number, w: number, size: number, color: string) {
    const h = this.textH(str, w, size);
    this.ensureSpace(h + 4);
    this.txt(str, x, this.y, { size, color, w });
    this.y += h + 2;
  }
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
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

  const corNota = nota >= 70 ? C.green : nota >= 40 ? C.amber : C.red;

  // ═══════════════════════════════════════════════
  // CAPA
  // ═══════════════════════════════════════════════
  b.newCoverPage();
  b.rect(0, 0, W, H, C.navy);
  b.rect(0, 0, W, 6, C.amber);

  const logoX = (W - 80) / 2;
  b.rect(logoX, 60, 80, 80, C.amber, 14);
  b.rect(logoX + 4, 64, 72, 72, C.navy, 10);
  b.txt('SV', 0, 83, { size: 32, font: 'Helvetica-Bold', color: C.amber, w: W, align: 'center' });

  b.txt('RELATÓRIO DE INSPEÇÃO', 0, 160, { size: 28, font: 'Helvetica-Bold', color: C.white, w: W, align: 'center' });
  b.txt('SEGURANÇA E SAÚDE NO TRABALHO', 0, 195, { size: 14, color: C.amber, w: W, align: 'center' });
  b.txt('SST — Segurança do Trabalho', 0, 218, { size: 10, color: C.gray400, w: W, align: 'center' });

  b.rect((W - 200) / 2, 245, 200, 2, C.amber);

  const coverInfo: Array<{ label: string; val: string }> = [
    { label: 'EMPRESA', val: inspecao.empresa?.nome || '—' },
    { label: 'CNPJ', val: inspecao.empresa?.cnpj || '—' },
    { label: 'ENDEREÇO', val: inspecao.empresa?.endereco || '—' },
    { label: 'SETOR / UNIDADE', val: inspecao.setor?.nome || '—' },
    { label: 'RESPONSÁVEL PELA INSPEÇÃO', val: inspecao.usuario?.nome || '—' },
    { label: 'DATA DA INSPEÇÃO', val: formatDate(inspecao.dataInicio) },
    { label: 'HORÁRIO', val: inspecao.dataInicio ? new Date(inspecao.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—' },
    { label: 'NÚMERO DO RELATÓRIO', val: inspecao.id?.slice(0, 8).toUpperCase() || '—' },
  ];
  let cy = 265;
  for (const d of coverInfo) {
    b.txt(d.label, 0, cy, { size: 7, color: C.gray400, w: W, align: 'center' });
    cy += 12;
    b.txt(d.val, 0, cy, { size: 11, font: 'Helvetica-Bold', color: C.white, w: W, align: 'center' });
    cy += 20;
  }

  b.rect((W - 76) / 2, 510, 76, 76, corNota, 38);
  b.txt(`${nota}`, 0, 523, { size: 30, font: 'Helvetica-Bold', color: C.white, w: W, align: 'center' });
  b.txt('/100', 0, 560, { size: 8, color: C.white, w: W, align: 'center' });
  b.txt('NOTA DE CONFORMIDADE', 0, 595, { size: 8, color: C.gray400, w: W, align: 'center' });

  const stats = [
    { v: `${totalRiscos}`, l: 'Riscos', c: C.red },
    { v: `${epiIrreg}`, l: 'EPIs Irreg.', c: C.amber },
    { v: `${totalMidias}`, l: 'Evidências', c: C.blue },
  ];
  stats.forEach((s, i) => {
    const sx = 75 + i * 155;
    b.rect(sx, 640, 120, 48, C.navyLight, 8);
    b.txt(s.v, sx, 648, { size: 22, font: 'Helvetica-Bold', color: s.c, w: 120, align: 'center' });
    b.txt(s.l, sx, 673, { size: 7, color: C.gray400, w: 120, align: 'center' });
  });

  b.finishCover();

  // ═══════════════════════════════════════════════
  // 1. DADOS DA ORGANIZAÇÃO
  // ═══════════════════════════════════════════════
  b.newPage();
  b.sectionTitle('1. DADOS DA ORGANIZAÇÃO');

  const orgRows: Array<[string, string]> = [
    ['Razão Social', inspecao.empresa?.nome || '—'],
    ['CNPJ', inspecao.empresa?.cnpj || '—'],
    ['Endereço', inspecao.empresa?.endereco || '—'],
    ['Bairro', inspecao.empresa?.bairro || '—'],
    ['Cidade/UF', [inspecao.empresa?.cidade, inspecao.empresa?.estado].filter(Boolean).join(' / ') || '—'],
    ['CEP', inspecao.empresa?.cep || '—'],
    ['Telefone', inspecao.empresa?.telefone || '—'],
    ['E-mail', inspecao.empresa?.email || '—'],
    ['Atividade Principal', inspecao.empresa?.atividadePrincipal || '—'],
    ['Natureza Jurídica', inspecao.empresa?.naturezaJuridica || '—'],
    ['Porte', inspecao.empresa?.porte || '—'],
  ];
  for (let i = 0; i < orgRows.length; i++) {
    const [k, v] = orgRows[i];
    b.rect(ML, b.y, CW, 20, i % 2 === 0 ? C.gray50 : C.white);
    b.txt(k, ML + 8, b.y + 5, { size: 8, color: C.gray500, w: 170 });
    b.txt(v, ML + 180, b.y + 5, { size: 8, font: 'Helvetica-Bold', color: C.navy, w: CW - 190 });
    b.y += 20;
  }

  // ═══════════════════════════════════════════════
  // 2. DADOS DA INSPEÇÃO
  // ═══════════════════════════════════════════════
  b.y += 12;
  b.sectionTitle('2. DADOS DA INSPEÇÃO');

  const inspRows: Array<[string, string]> = [
    ['Número do Relatório', inspecao.id?.slice(0, 8).toUpperCase() || '—'],
    ['Data', formatDate(inspecao.dataInicio)],
    ['Horário Início', inspecao.dataInicio ? new Date(inspecao.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'],
    ['Horário Término', inspecao.dataFim ? new Date(inspecao.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Em andamento'],
    ['Tipo de Inspeção', 'Inspeção de Segurança do Trabalho (SST)'],
    ['Setor', inspecao.setor?.nome || '—'],
    ['Status', inspecao.status === 'concluida' || inspecao.status === 'analisada' ? 'Concluída' : 'Em Andamento'],
    ['Responsável', inspecao.usuario?.nome || '—'],
    ['E-mail do Responsável', inspecao.usuario?.email || '—'],
  ];
  for (let i = 0; i < inspRows.length; i++) {
    const [k, v] = inspRows[i];
    b.rect(ML, b.y, CW, 20, i % 2 === 0 ? C.gray50 : C.white);
    b.txt(k, ML + 8, b.y + 5, { size: 8, color: C.gray500, w: 170 });
    b.txt(v, ML + 180, b.y + 5, { size: 8, font: 'Helvetica-Bold', color: C.navy, w: CW - 190 });
    b.y += 20;
  }

  // ═══════════════════════════════════════════════
  // 3. OBJETIVO DA INSPEÇÃO
  // ═══════════════════════════════════════════════
  b.y += 12;
  b.sectionTitle('3. OBJETIVO DA INSPEÇÃO');
  b.textBlock(
    'A presente inspeção tem por objetivo avaliar as condições de segurança e saúde no trabalho no setor indicado, ' +
    'identificando riscos, não conformidades e oportunidades de melhoria, em conformidade com a legislação trabalhista vigente ' +
    'e as Normas Regulamentadoras do Ministério do Trabalho e Emprego.',
    ML, CW, 9, C.gray600
  );
  b.textBlock(
    `Setor avaliado: ${inspecao.setor?.nome || '—'}. ` +
    `Atividades observadas: atividades operacionais e administrativas do setor. ` +
    `Foram analisadas ${totalMidias} evidências (fotos e vídeos), identificando ${totalRiscos} risco(s) e ${epiIrreg} irregularidade(s) de EPI.`,
    ML, CW, 9, C.gray600
  );

  // ═══════════════════════════════════════════════
  // 4. METODOLOGIA
  // ═══════════════════════════════════════════════
  b.y += 8;
  b.sectionTitle('4. METODOLOGIA');
  const metItems = [
    'Inspeção visual do ambiente de trabalho',
    'Coleta de evidências fotográficas e videográficas',
    'Análise automatizada por Inteligência Artificial (Gemini Vision)',
    'Checklist de conformidade por Norma Regulamentadora',
    'Avaliação de EPIs e EPCs',
    'Verificação de documentação disponível',
    'Análise de riscos e classificação por gravidade',
  ];
  for (const item of metItems) {
    b.ensureSpace(14);
    b.rect(ML + 4, b.y + 3, 8, 8, C.amber, 4);
    b.txt('•', ML + 4, b.y + 1, { size: 6, color: C.white, w: 8, align: 'center' });
    b.txt(item, ML + 18, b.y, { size: 8, color: C.gray600, w: CW - 24 });
    b.y += 14;
  }
  b.y += 4;
  b.rect(ML, b.y, CW, 28, C.amberBg);
  b.rect(ML, b.y, 4, 28, C.amber);
  b.txt('Nota: A análise automatizada por IA constitui ferramenta de apoio e deve ser validada pelo profissional responsável.', ML + 12, b.y + 6, { size: 7, color: C.gray600, w: CW - 20 });
  b.y += 32;

  // ═══════════════════════════════════════════════
  // 5. RESUMO EXECUTIVO
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionTitle('5. RESUMO EXECUTIVO');

  let classificacao = 'INSATISFATÓRIA';
  let classCor = C.red;
  if (nota >= 80) { classificacao = 'SATISFATÓRIA'; classCor = C.green; }
  else if (nota >= 60) { classificacao = 'NECESSITA DE MELHORIAS'; classCor = C.amber; }
  else if (nota >= 40) { classificacao = 'INSATISFATÓRIA'; classCor = C.orange; }
  else { classificacao = 'CRÍTICA'; classCor = C.red; }

  b.rect(ML, b.y, CW, 36, C.gray50, 4);
  b.rect(ML, b.y, 6, 36, classCor);
  b.txt('CLASSIFICAÇÃO GERAL:', ML + 16, b.y + 6, { size: 8, color: C.gray500, w: 160 });
  b.txt(classificacao, ML + 16, b.y + 18, { size: 14, font: 'Helvetica-Bold', color: classCor, w: CW - 24 });
  b.y += 44;

  const indicadores: Array<{ label: string; val: string; cor: string }> = [
    { label: 'Nota', val: `${nota}/100`, cor: corNota },
    { label: 'Riscos', val: `${totalRiscos}`, cor: totalRiscos > 0 ? C.red : C.green },
    { label: 'Críticos', val: `${riscosPorGrav.critica}`, cor: C.red },
    { label: 'Altos', val: `${riscosPorGrav.alta}`, cor: C.orange },
    { label: 'Médios', val: `${riscosPorGrav.media}`, cor: C.amber },
    { label: 'Baixos', val: `${riscosPorGrav.baixa}`, cor: C.green },
    { label: 'EPIs Irreg.', val: `${epiIrreg}`, cor: C.orange },
    { label: 'Fotos', val: `${totalMidias}`, cor: C.blue },
  ];
  const cardW = (CW - 30) / 4;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      if (idx >= indicadores.length) break;
      const ind = indicadores[idx];
      const cx = ML + col * (cardW + 10);
      const cy2 = b.y;
      b.rect(cx, cy2, cardW, 32, C.gray50);
      b.rect(cx, cy2, 4, 32, ind.cor);
      b.txt(ind.val, cx + 10, cy2 + 4, { size: 14, font: 'Helvetica-Bold', color: ind.cor, w: cardW - 16 });
      b.txt(ind.label, cx + 10, cy2 + 18, { size: 7, color: C.gray500, w: cardW - 16 });
    }
    b.y += 38;
  }

  if (totalCheck > 0) {
    b.y += 4;
    b.subTitle('Conformidade do Checklist');
    const clWidths = [120, 80, 80, 80, 80, 80];
    b.tableRow(['Métrica', 'Conforme', 'Não Conforme', 'Parcial', 'N/A', 'Total'], clWidths, C.navy);
    const pctConf = totalCheck > 0 ? ((conformes / totalCheck) * 100).toFixed(0) : '0';
    const pctNC = totalCheck > 0 ? ((naoConformes / totalCheck) * 100).toFixed(0) : '0';
    b.tableRowData([`${totalCheck} itens`, `${conformes} (${pctConf}%)`, `${naoConformes} (${pctNC}%)`, `${parcial}`, `${naoSeAplica}`, `${totalCheck}`], clWidths, C.gray50);
  }

  // ═══════════════════════════════════════════════
  // 6. DESCRIÇÃO DO AMBIENTE
  // ═══════════════════════════════════════════════
  b.y += 8;
  b.sectionTitle('6. DESCRIÇÃO DO AMBIENTE');
  b.textBlock(
    `Setor: ${inspecao.setor?.nome || '—'}. ` +
    `${inspecao.setor?.descricao ? inspecao.setor.descricao + '. ' : ''}` +
    `A inspeção abrangeu as atividades operacionais e administrativas presentes no setor, ` +
    `incluindo máquinas, equipamentos, ferramentas, produtos químicos e condições gerais do ambiente.`,
    ML, CW, 9, C.gray600
  );
  if (inspecao.observacoes) {
    b.y += 4;
    b.rect(ML, b.y, CW, 36, C.gray50);
    b.rect(ML, b.y, 4, 36, C.blue);
    b.txt('Observações do Ambiente:', ML + 14, b.y + 4, { size: 8, font: 'Helvetica-Bold', color: C.gray700, w: CW - 24 });
    b.txt(inspecao.observacoes, ML + 14, b.y + 18, { size: 8, color: C.gray500, w: CW - 24 });
    b.y += 40;
  }

  // ═══════════════════════════════════════════════
  // 7. RISCOS IDENTIFICADOS
  // ═══════════════════════════════════════════════
  if (totalRiscos > 0) {
    b.y += 4;
    b.sectionTitle('7. RISCOS IDENTIFICADOS');

    const gravCor: Record<string, string> = {
      crítica: C.red, critica: C.red, alta: C.orange,
      média: C.amber, media: C.amber, baixa: C.green,
    };

    for (let i = 0; i < inspecao.riscos.length; i++) {
      const risco = inspecao.riscos[i];
      const cor = gravCor[risco.gravidade] || C.amber;

      let cardH = 36;
      if (risco.descricao) cardH += b.textH(risco.descricao, CW - 28, 9) + 4;
      if (risco.localIdentificado) cardH += 12;
      if (risco.categoria) cardH += 12;
      if (risco.consequencias) cardH += b.textH(risco.consequencias, CW - 28, 7) + 2;
      if (risco.medidasPreventivas) cardH += b.textH(risco.medidasPreventivas, CW - 28, 7) + 2;
      if (risco.medidasCorretivas) cardH += b.textH(risco.medidasCorretivas, CW - 28, 7) + 2;
      cardH += 10;

      b.ensureSpace(cardH + 8);

      b.rect(ML, b.y, CW, cardH, C.gray50);
      b.rect(ML, b.y, 4, cardH, cor);

      const hY = b.y + 8;
      b.rect(ML + 12, hY, 22, 22, cor, 11);
      b.txt(String(i + 1).padStart(2, '0'), ML + 12, hY + 6, { size: 8, font: 'Helvetica-Bold', color: C.white, w: 22, align: 'center' });

      b.rect(ML + 42, hY, 65, 18, cor, 3);
      b.txt(risco.gravidade?.toUpperCase() || '—', ML + 42, hY + 4, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 65, align: 'center' });

      let bx = ML + 115;
      if (risco.nrsRelacionadas) {
        b.rect(bx, hY, 55, 18, C.blueBg, 3);
        b.txt(risco.nrsRelacionadas, bx, hY + 4, { size: 7, font: 'Helvetica-Bold', color: C.blue, w: 55, align: 'center' });
        bx += 63;
      }

      b.rect(bx, hY, 48, 18, C.gray100, 3);
      b.txt(`${(risco.confianca * 100).toFixed(0)}% IA`, bx, hY + 4, { size: 7, color: C.gray500, w: 48, align: 'center' });

      let dy = b.y + 36;
      if (risco.descricao) {
        b.txt(risco.descricao, ML + 14, dy, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: CW - 28 });
        dy += b.textH(risco.descricao, CW - 28, 9) + 4;
      }

      const addField = (label: string, value: string, color: string) => {
        const t = `${label}: ${value}`;
        b.txt(t, ML + 14, dy, { size: 7, color, w: CW - 28 });
        dy += b.textH(t, CW - 28, 7) + 2;
      };

      if (risco.localIdentificado) addField('Local', risco.localIdentificado, C.gray500);
      if (risco.categoria) addField('Categoria', risco.categoria, C.gray500);
      if (risco.consequencias) addField('Consequências', risco.consequencias, C.red);
      if (risco.medidasPreventivas) addField('Medidas Preventivas', risco.medidasPreventivas, C.green);
      if (risco.medidasCorretivas) addField('Medidas Corretivas', risco.medidasCorretivas, C.orange);

      if (risco.imagemUrl) {
        const imgPath = path.join(uploadsDir, risco.imagemUrl.replace('/uploads/', ''));
        if (fs.existsSync(imgPath)) {
          try {
            const meta = await sharp(imgPath).metadata();
            const iw = meta.width || 300;
            const ih = meta.height || 200;
            const maxW = CW - 20;
            const maxH = 120;
            const sc = Math.min(maxW / iw, maxH / ih, 1);
            const w = iw * sc;
            const h = ih * sc;
            b.ensureSpace(h + 8);
            b.img(imgPath, ML + 14, dy, w, h);
            dy += h + 4;
          } catch { /* skip */ }
        }
      }

      b.y += cardH + 8;
    }
  }

  // ═══════════════════════════════════════════════
  // 8. MATRIZ DE RISCO
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionTitle('8. MATRIZ DE RISCO');

  const gravData: Array<{ label: string; count: number; prazo: string; color: string }> = [
    { label: 'Crítica', count: riscosPorGrav.critica, prazo: 'Imediato (1-7 dias)', color: C.red },
    { label: 'Alta', count: riscosPorGrav.alta, prazo: 'Curto prazo (até 15 dias)', color: C.orange },
    { label: 'Média', count: riscosPorGrav.media, prazo: 'Médio prazo (até 30 dias)', color: C.amber },
    { label: 'Baixa', count: riscosPorGrav.baixa, prazo: 'Longo prazo (até 60 dias)', color: C.green },
  ];

  const matrizWidths = [150, 80, 200];
  b.tableRow(['GRAVIDADE', 'QUANTIDADE', 'PRAZO DE CORREÇÃO'], matrizWidths, C.navy);
  for (let i = 0; i < gravData.length; i++) {
    const g = gravData[i];
    const bg = i % 2 === 0 ? C.gray50 : C.white;
    b.ensureSpace(22);
    b.rect(ML, b.y, CW, 20, bg);
    b.rect(ML + 6, b.y + 5, 10, 10, g.color, 5);
    b.txt(g.label, ML + 24, b.y + 4, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: 120 });
    b.txt(String(g.count), ML + 160, b.y + 4, { size: 9, font: 'Helvetica-Bold', color: g.count > 0 ? C.red : C.gray300, w: 80 });
    b.txt(g.prazo, ML + 250, b.y + 4, { size: 8, color: C.gray600, w: 200 });
    b.y += 20;
  }

  // ═══════════════════════════════════════════════
  // 9. ANÁLISE DE EPIs
  // ═══════════════════════════════════════════════
  if (inspecao.epiViolacoes?.length > 0) {
    b.y += 4;
    b.sectionTitle('9. ANÁLISE DE EPIs');

    for (let i = 0; i < inspecao.epiViolacoes.length; i++) {
      const epi = inspecao.epiViolacoes[i];
      const cor = epi.status === 'ausente' ? C.red : epi.status === 'incorreto' ? C.orange : C.green;
      const bg = epi.status === 'ausente' ? C.redBg : epi.status === 'incorreto' ? C.orangeBg : C.greenBg;
      const label = epi.status === 'ausente' ? 'AUSENTE' : epi.status === 'incorreto' ? 'INCORRETO' : 'CORRETO';

      let cardH = 28;
      if (epi.descricao) cardH += b.textH(epi.descricao, CW - 100, 7) + 4;

      b.ensureSpace(cardH + 6);
      b.rect(ML, b.y, CW, cardH, bg);
      b.rect(ML, b.y, 4, cardH, cor);
      b.rect(ML + 14, b.y + 6, 65, 16, cor, 3);
      b.txt(label, ML + 14, b.y + 9, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 65, align: 'center' });
      b.txt(epi.epiNome, ML + 88, b.y + 7, { size: 10, font: 'Helvetica-Bold', color: C.gray700, w: CW - 150 });
      b.txt(`${(epi.confianca * 100).toFixed(0)}%`, ML + CW - 50, b.y + 9, { size: 8, color: C.gray500, w: 40, align: 'right' });
      if (epi.descricao) {
        b.txt(epi.descricao, ML + 88, b.y + 24, { size: 7, color: C.gray500, w: CW - 102 });
      }

      if (epi.imagemUrl) {
        const imgPath = path.join(uploadsDir, epi.imagemUrl.replace('/uploads/', ''));
        if (fs.existsSync(imgPath)) {
          try {
            const meta = await sharp(imgPath).metadata();
            const iw = meta.width || 300;
            const ih = meta.height || 200;
            const sc = Math.min((CW - 100) / iw, 80 / ih, 1);
            const w = iw * sc;
            const h = ih * sc;
            b.ensureSpace(cardH + h + 12);
            b.img(imgPath, ML + 88, b.y + cardH, w, h);
            b.y += h + 4;
          } catch { /* skip */ }
        }
      }

      b.y += cardH + 6;
    }
  }

  // ═══════════════════════════════════════════════
  // 10. CHECKLIST DE CONFORMIDADE
  // ═══════════════════════════════════════════════
  if (clRespostas.length > 0) {
    b.y += 4;
    b.sectionTitle('10. CHECKLIST DE CONFORMIDADE');

    const clWidths = [30, 220, 100, 100, 80];
    b.tableRow(['Nº', 'ITEM', 'RESULTADO', 'NR', 'OBSERVAÇÃO'], clWidths, C.navy);

    for (let i = 0; i < clRespostas.length; i++) {
      const cr = clRespostas[i];
      b.ensureSpace(18);

      const sCor = cr.conformidade === 'conforme' ? C.green : cr.conformidade === 'nao_conforme' ? C.red : cr.conformidade === 'parcial' ? C.amber : C.gray400;
      const sLabel = cr.conformidade === 'conforme' ? 'Conforme' : cr.conformidade === 'nao_conforme' ? 'Não Conforme' : cr.conformidade === 'parcial' ? 'Parcial' : 'N/A';
      const bg = i % 2 === 0 ? C.gray50 : C.white;

      b.rect(ML, b.y, CW, 18, bg);
      b.rect(ML, b.y, 3, 18, sCor);
      b.txt(String(i + 1).padStart(2, '0'), ML + 6, b.y + 4, { size: 7, color: C.gray500, w: 24 });
      b.txt(cr.item?.texto || '—', ML + 36, b.y + 4, { size: 7, color: C.gray700, w: 210 });
      b.rect(ML + 250, b.y + 3, 80, 12, sCor, 3);
      b.txt(sLabel, ML + 250, b.y + 4, { size: 6, font: 'Helvetica-Bold', color: C.white, w: 80, align: 'center' });
      b.txt(cr.item?.template?.nr || '—', ML + 350, b.y + 4, { size: 7, color: C.gray500, w: 90 });
      b.txt(cr.observacao || '—', ML + 440, b.y + 4, { size: 7, color: C.gray500, w: 80 });
      b.y += 18;
    }

    b.y += 4;
    b.rect(ML, b.y, CW, 28, C.gray50, 4);
    const pctConf = totalCheck > 0 ? ((conformes / totalCheck) * 100).toFixed(1) : '0';
    const pctNC = totalCheck > 0 ? ((naoConformes / totalCheck) * 100).toFixed(1) : '0';
    b.txt(`Resumo: ${totalCheck} itens | ${conformes} conformes (${pctConf}%) | ${naoConformes} não conformes (${pctNC}%) | ${parcial} parciais | ${naoSeAplica} N/A`, ML + 12, b.y + 8, { size: 8, color: C.gray600, w: CW - 24 });
    b.y += 32;
  }

  // ═══════════════════════════════════════════════
  // 11. PGR / INVENTÁRIO DE RISCOS
  // ═══════════════════════════════════════════════
  if (pgrs.length > 0) {
    b.y += 4;
    b.sectionTitle('11. PGR / INVENTÁRIO DE RISCOS');

    for (const pgr of pgrs) {
      b.subTitle(pgr.titulo);
      if (pgr.descricao) b.textBlock(pgr.descricao, ML, CW, 8, C.gray600);

      if (pgr.itens?.length > 0) {
        const pgrWidths = [30, 130, 100, 100, 80, 80];
        b.tableRow(['Nº', 'PROCESSO', 'PERIGO', 'RISCOS', 'MEDIDAS', 'STATUS'], pgrWidths, C.navy);
        for (let i = 0; i < pgr.itens.length; i++) {
          const item = pgr.itens[i];
          b.ensureSpace(18);
          const bg = i % 2 === 0 ? C.gray50 : C.white;
          b.rect(ML, b.y, CW, 18, bg);
          b.rect(ML, b.y, 3, 18, C.blue);
          b.txt(String(i + 1), ML + 6, b.y + 4, { size: 7, color: C.gray500, w: 24 });
          b.txt(item.processo || '—', ML + 36, b.y + 4, { size: 7, color: C.gray700, w: 120 });
          b.txt(item.perigo || '—', ML + 166, b.y + 4, { size: 7, color: C.gray700, w: 90 });
          b.txt(item.riscos || '—', ML + 266, b.y + 4, { size: 7, color: C.gray700, w: 90 });
          b.txt(item.medidasControle || '—', ML + 366, b.y + 4, { size: 7, color: C.gray600, w: 70 });
          b.txt(item.status || '—', ML + 446, b.y + 4, { size: 7, color: C.gray500, w: 70 });
          b.y += 18;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 12. EVIDÊNCIAS FOTOGRÁFICAS
  // ═══════════════════════════════════════════════
  if (fotos.length > 0) {
    b.y += 4;
    b.sectionTitle('12. EVIDÊNCIAS FOTOGRÁFICAS');

    let col = 0;
    const colW = (CW - 12) / 2;
    let rowMaxH = 0;

    for (let fi = 0; fi < fotos.length; fi++) {
      const foto = fotos[fi];
      const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
      if (!fs.existsSync(imgPath)) continue;

      try {
        const meta = await sharp(imgPath).metadata();
        const iw = meta.width || 300;
        const ih = meta.height || 200;
        const sc = Math.min(colW / iw, 200 / ih, 1);
        const w = iw * sc;
        const h = ih * sc;

        const needed = h + 30;
        if (col === 0 && b.y + needed > BOTTOM) {
          b.drawHeaderFooter();
          b.doc.addPage({ margin: 0 });
          b.page++;
          b.y = TOP;
        }

        const fx = col === 0 ? ML : ML + colW + 12;

        b.rect(fx - 2, b.y - 2, w + 4, h + 4, C.gray200, 4);
        b.img(imgPath, fx, b.y, w, h);
        b.txt(`Foto ${fi + 1}: ${foto.nome}`, fx, b.y + h + 4, { size: 7, color: C.gray500, w });
        if (foto.descricao) {
          b.txt(foto.descricao, fx, b.y + h + 14, { size: 7, color: C.gray400, w });
        }

        rowMaxH = Math.max(rowMaxH, h + (foto.descricao ? 28 : 18));
        col = col === 0 ? 1 : 0;
        if (col === 0) { b.y += rowMaxH + 8; rowMaxH = 0; }
      } catch { /* skip */ }
    }
    if (col === 1) b.y += rowMaxH + 8;
  }

  // ═══════════════════════════════════════════════
  // 13. EVIDÊNCIAS EM VÍDEO
  // ═══════════════════════════════════════════════
  if (videos.length > 0) {
    b.y += 4;
    b.sectionTitle('13. EVIDÊNCIAS EM VÍDEO');

    for (const vid of videos) {
      b.ensureSpace(36);
      b.rect(ML, b.y, CW, 28, C.gray50);
      b.rect(ML, b.y, 4, 28, C.blue);
      b.rect(ML + 12, b.y + 6, 18, 18, C.blue, 9);
      b.txt('▶', ML + 12, b.y + 8, { size: 10, color: C.white, w: 18, align: 'center' });
      b.txt(vid.nome, ML + 38, b.y + 7, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: CW - 50 });
      if (vid.descricao) {
        b.txt(vid.descricao, ML + 38, b.y + 19, { size: 7, color: C.gray500, w: CW - 50 });
      }
      b.y += 36;
    }

    b.txt('Os vídeos estão disponíveis no painel de inspeção da plataforma para visualização completa.', ML, b.y, { size: 8, color: C.gray400, w: CW });
    b.y += 14;
  }

  // ═══════════════════════════════════════════════
  // 14. IMAGENS ANOTADAS COM RISCOS
  // ═══════════════════════════════════════════════
  const imgsAnotadas = fotos
    .map((m: any) => {
      const fn = path.basename(m.url);
      return { midia: m, annotatedPath: path.join(anotadasDir, `anotada_${fn}.png`), originalPath: path.join(uploadsDir, m.url.replace('/uploads/', '')) };
    })
    .filter((img: any) => fs.existsSync(img.annotatedPath) || fs.existsSync(img.originalPath));

  if (imgsAnotadas.length > 0) {
    b.y += 4;
    b.sectionTitle('14. ANÁLISE VISUAL — IMAGENS ANOTADAS');

    for (let idx = 0; idx < imgsAnotadas.length; idx++) {
      const img = imgsAnotadas[idx];
      const imgPath = fs.existsSync(img.annotatedPath) ? img.annotatedPath : img.originalPath;
      const riscosImg = (inspecao.riscos || []).filter((r: any) => r.imagemUrl === img.midia.url);

      try {
        const meta = await sharp(imgPath).metadata();
        const iw = meta.width || 500;
        const ih = meta.height || 400;
        const maxImgW = CW;
        const availH = BOTTOM - b.y - 60;
        if (availH < 100) {
          b.drawHeaderFooter();
          b.doc.addPage({ margin: 0 });
          b.page++;
          b.y = TOP;
        }
        const sc = Math.min(maxImgW / iw, (BOTTOM - b.y - 60) / ih, 1);
        const w = iw * sc;
        const h = ih * sc;
        const ix = ML + (maxImgW - w) / 2;

        b.ensureSpace(h + 40);
        b.txt(`${img.midia.nome}`, ML, b.y, { size: 8, font: 'Helvetica-Bold', color: C.gray600, w: CW });
        b.y += 12;

        b.rect(ix - 2, b.y - 2, w + 4, h + 4, C.gray200, 4);
        b.img(imgPath, ix, b.y, w, h);
        b.y += h + 6;

        if (riscosImg.length > 0) {
          const boxPad = 8;
          const boxTitleH = 14;
          const lineH = 12;
          const boxContentH = Math.min(riscosImg.length, 6) * lineH;
          const boxH = boxPad + boxTitleH + boxContentH + boxPad;

          b.rect(ML, b.y, CW, boxH, C.redBg);
          b.rect(ML, b.y, 4, boxH, C.red);
          b.txt(`${riscosImg.length} risco(s) identificado(s) nesta imagem:`, ML + 14, b.y + boxPad, { size: 8, font: 'Helvetica-Bold', color: C.red, w: CW - 24 });
          let ry2 = b.y + boxPad + boxTitleH;
          for (const r of riscosImg.slice(0, 6)) {
            b.txt(`• ${r.descricao} — ${r.gravidade?.toUpperCase() || '—'}`, ML + 20, ry2, { size: 7, color: C.gray600, w: CW - 32 });
            ry2 += lineH;
          }
          b.y += boxH + 6;
        }
      } catch {
        b.txt(`[Imagem não disponível: ${img.midia.nome}]`, ML, b.y, { size: 9, color: C.gray300 });
        b.y += 16;
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 15. ASO
  // ═══════════════════════════════════════════════
  if (asos.length > 0) {
    b.y += 4;
    b.sectionTitle('15. ASO — ATESTADO DE SAÚDE OCUPACIONAL');
    const asoWidths = [120, 100, 80, 80, 100];
    b.tableRow(['COLABORADOR', 'TIPO', 'DATA', 'VALIDADE', 'RESULTADO'], asoWidths, C.navy);
    for (let i = 0; i < asos.length; i++) {
      const aso = asos[i];
      b.ensureSpace(18);
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      const sCor = aso.resultado === 'apto' ? C.green : C.red;
      b.rect(ML, b.y, CW, 18, bg);
      b.rect(ML, b.y, 3, 18, sCor);
      b.txt(aso.colaborador?.nome || '—', ML + 6, b.y + 4, { size: 7, color: C.gray700, w: 114 });
      b.txt(aso.tipoExame || '—', ML + 126, b.y + 4, { size: 7, color: C.gray700, w: 94 });
      b.txt(formatDate(aso.dataExame), ML + 226, b.y + 4, { size: 7, color: C.gray600, w: 74 });
      b.txt(formatDate(aso.validoAte), ML + 306, b.y + 4, { size: 7, color: C.gray600, w: 94 });
      b.txt(aso.resultado?.toUpperCase() || '—', ML + 406, b.y + 4, { size: 7, font: 'Helvetica-Bold', color: sCor, w: 100 });
      b.y += 18;
    }
  }

  // ═══════════════════════════════════════════════
  // 16. CIPA
  // ═══════════════════════════════════════════════
  if (cipas.length > 0) {
    b.y += 4;
    b.sectionTitle('16. CIPA — COMISSÃO INTERNA DE PREVENÇÃO DE ACIDENTES');
    for (const cipa of cipas) {
      b.ensureSpace(60);
      b.rect(ML, b.y, CW, 52, C.gray50);
      b.rect(ML, b.y, 4, 52, C.blue);
      b.txt(cipa.nome || '—', ML + 14, b.y + 6, { size: 10, font: 'Helvetica-Bold', color: C.gray700, w: CW - 24 });
      let cY = b.y + 22;
      if (cipa.cnpj) { b.txt(`CNPJ: ${cipa.cnpj}`, ML + 14, cY, { size: 7, color: C.gray500, w: 200 }); cY += 12; }
      if (cipa.grauRisco) { b.txt(`Grau de Risco: ${cipa.grauRisco}`, ML + 220, b.y + 22, { size: 7, color: C.gray500, w: 200 }); }
      if (cipa.efetivo) { b.txt(`Efetivo: ${cipa.efetivo} | SIPRAT: ${cipa.siprat || '—'}`, ML + 14, cY, { size: 7, color: C.gray500, w: CW - 24 }); }
      b.y += 58;
    }
  }

  // ═══════════════════════════════════════════════
  // 17. RECOMENDAÇÕES GERAIS
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionTitle('17. RECOMENDAÇÕES GERAIS');

  const imediatas: string[] = [];
  const curtoPrazo: string[] = [];
  const medioPrazo: string[] = [];

  for (const r of inspecao.riscos || []) {
    if (r.gravidade === 'critica') imediatas.push(`[${r.categoria}] ${r.medidasCorretivas || r.descricao}`);
    else if (r.gravidade === 'alta') curtoPrazo.push(`[${r.categoria}] ${r.medidasCorretivas || r.descricao}`);
    else medioPrazo.push(`[${r.categoria}] ${r.medidasCorretivas || r.descricao}`);
  }

  if (epiIrreg > 0) {
    imediatas.push(`Regularizar ${epiIrreg} EPI(s) irregular(es) identificado(s)`);
  }

  const addRecList = (titulo: string, items: string[], cor: string) => {
    if (items.length === 0) return;
    b.ensureSpace(20);
    b.rect(ML, b.y, CW, 18, cor);
    b.txt(titulo, ML + 8, b.y + 4, { size: 8, font: 'Helvetica-Bold', color: C.white, w: CW - 16 });
    b.y += 18;
    for (const item of items.slice(0, 10)) {
      b.ensureSpace(14);
      b.rect(ML + 4, b.y + 3, 6, 6, cor, 3);
      b.txt('•', ML + 4, b.y + 1, { size: 5, color: C.white, w: 6, align: 'center' });
      b.txt(item, ML + 16, b.y, { size: 7, color: C.gray600, w: CW - 24 });
      b.y += 14;
    }
  };

  addRecList('AÇÕES IMEDIATAS (até 7 dias)', imediatas, C.red);
  addRecList('AÇÕES DE CURTO PRAZO (até 15 dias)', curtoPrazo, C.orange);
  addRecList('AÇÕES DE MÉDIO PRAZO (até 30 dias)', medioPrazo, C.amber);

  if (imediatas.length === 0 && curtoPrazo.length === 0 && medioPrazo.length === 0) {
    b.textBlock('Nenhuma ação corretiva urgente identificada. Manter monitoramento contínuo.', ML, CW, 9, C.gray500);
  }

  // ═══════════════════════════════════════════════
  // 18. CONCLUSÃO
  // ═══════════════════════════════════════════════
  b.y += 4;
  b.sectionTitle('18. CONCLUSÃO');

  let conclusao = `A inspeção de segurança do trabalho realizada no setor "${inspecao.setor?.nome || '—'}" `;
  conclusao += `da empresa "${inspecao.empresa?.nome || '—'}" `;
  conclusao += `resultou em uma nota de conformidade de ${nota}/100, classificação "${classificacao}". `;
  conclusao += `Foram identificados ${totalRiscos} risco(s) `;
  if (riscosPorGrav.critica > 0) conclusao += `(${riscosPorGrav.critica} crítico(s), `;
  if (riscosPorGrav.alta > 0) conclusao += `${riscosPorGrav.alta} alto(s), `;
  if (riscosPorGrav.media > 0) conclusao += `${riscosPorGrav.media} médio(s), `;
  if (riscosPorGrav.baixa > 0) conclusao += `${riscosPorGrav.baixa} baixo(s)`;
  conclusao += `), ${epiIrreg} irregularidade(s) de EPI e ${totalMidias} evidência(s) coletada(s). `;
  conclusao += `Recomenda-se a implementação das ações corretivas e preventivas descritas neste relatório, `;
  conclusao += `com acompanhamento para validação das melhorias.`;

  b.textBlock(conclusao, ML, CW, 9, C.gray600);

  if (riscosPorGrav.critica > 0) {
    b.y += 4;
    b.rect(ML, b.y, CW, 24, C.redBg);
    b.rect(ML, b.y, 4, 24, C.red);
    b.txt(`ATENÇÃO: ${riscosPorGrav.critica} risco(s) CRÍTICO(S) identificado(s). Ação imediata necessária.`, ML + 12, b.y + 6, { size: 8, font: 'Helvetica-Bold', color: C.red, w: CW - 20 });
    b.y += 28;
  }

  // ═══════════════════════════════════════════════
  // 19. ASSINATURAS
  // ═══════════════════════════════════════════════
  b.y += 8;
  b.sectionTitle('19. ASSINATURAS');

  b.ensureSpace(100);
  const sigW = (CW - 20) / 2;

  b.rect(ML, b.y, sigW, 80, C.gray50);
  b.rect(ML, b.y, sigW, 2, C.navy);
  b.txt('RESPONSÁVEL PELA INSPEÇÃO', ML + 10, b.y + 10, { size: 8, font: 'Helvetica-Bold', color: C.navy, w: sigW - 20 });
  b.rect(ML + 20, b.y + 45, sigW - 40, 1, C.gray300);
  b.txt(inspecao.usuario?.nome || '—', ML + 10, b.y + 50, { size: 8, color: C.gray700, w: sigW - 20 });
  b.txt('Técnico de Segurança do Trabalho', ML + 10, b.y + 62, { size: 7, color: C.gray400, w: sigW - 20 });

  b.rect(ML + sigW + 20, b.y, sigW, 80, C.gray50);
  b.rect(ML + sigW + 20, b.y, sigW, 2, C.navy);
  b.txt('RESPONSÁVEL PELA EMPRESA', ML + sigW + 30, b.y + 10, { size: 8, font: 'Helvetica-Bold', color: C.navy, w: sigW - 20 });
  b.rect(ML + sigW + 50, b.y + 45, sigW - 40, 1, C.gray300);
  b.txt('________________________________', ML + sigW + 30, b.y + 50, { size: 8, color: C.gray700, w: sigW - 20 });
  b.txt('Responsável / Gestor', ML + sigW + 30, b.y + 62, { size: 7, color: C.gray400, w: sigW - 20 });

  b.y += 88;
  b.txt(`Data: ${formatDate(new Date())}`, ML, b.y, { size: 8, color: C.gray500, w: CW });
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
