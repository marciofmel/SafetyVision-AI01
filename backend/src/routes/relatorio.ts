import { Router } from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const uploadsDir = path.join(__dirname, '../../uploads');
const anotadasDir = path.join(__dirname, '../../uploads/anotadas');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 50;
const MARGIN_R = 50;
const MARGIN_T = 50;
const MARGIN_B = 50;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MAX_Y = PAGE_H - MARGIN_B;

const COL = {
  navy: '#0F172A',
  amber: '#F59E0B',
  white: '#FFFFFF',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  textDark: '#1E293B',
  textMid: '#475569',
  textLight: '#94A3B8',
  red: '#DC2626',
  redBg: '#FEF2F2',
  orange: '#EA580C',
  orangeBg: '#FFF7ED',
  green: '#16A34A',
  greenBg: '#F0FDF4',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  amberBg: '#FFFBEB',
};

class PDF {
  doc: PDFKit.PDFDocument;
  y = 0;
  pageNum = 0;
  backgrounds: Array<{ x: number; y: number; w: number; h: number; color: string; radius?: number }> = [];

  constructor() {
    this.doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, bufferPages: true });
  }

  newPage(hasBg = true) {
    if (this.pageNum > 0) {
      this.drawBackgrounds();
      this.drawFooter();
    }
    this.doc.addPage({ margin: 0 });
    this.pageNum++;
    this.y = MARGIN_T;
    this.backgrounds = [];
    if (hasBg) {
      this.backgrounds.push({ x: 0, y: 0, w: PAGE_W, h: PAGE_H, color: COL.white });
    }
  }

  addBg(x: number, y: number, w: number, h: number, color: string, radius?: number) {
    this.backgrounds.push({ x, y, w, h, color, radius });
  }

  drawBackgrounds() {
    for (const bg of this.backgrounds) {
      this.doc.save();
      if (bg.radius) {
        this.doc.roundedRect(bg.x, bg.y, bg.w, bg.h, bg.radius).fill(bg.color);
      } else {
        this.doc.rect(bg.x, bg.y, bg.w, bg.h).fill(bg.color);
      }
      this.doc.restore();
    }
  }

  drawFooter() {
    this.doc.save();
    this.doc.rect(0, PAGE_H - 28, PAGE_W, 28).fill(COL.navy);
    this.doc.fontSize(7).font('Helvetica').fillColor(COL.textLight);
    this.doc.text('SafetyVision AI  |  Relatório de Inspeção', MARGIN_L, PAGE_H - 20, { width: 300 });
    this.doc.fillColor(COL.amber);
    this.doc.text(`Página ${this.pageNum}`, PAGE_W - MARGIN_R - 80, PAGE_H - 20, { width: 80, align: 'right' });
    this.doc.restore();
  }

  checkPage(needed: number) {
    if (this.y + needed > MAX_Y) {
      this.newPage();
    }
  }

  drawRect(x: number, y: number, w: number, h: number, color: string, radius?: number) {
    this.doc.save();
    if (radius) {
      this.doc.roundedRect(x, y, w, h, radius).fill(color);
    } else {
      this.doc.rect(x, y, w, h).fill(color);
    }
    this.doc.restore();
  }

  drawBorderRect(x: number, y: number, w: number, h: number, fillColor: string, strokeColor: string, radius?: number) {
    this.doc.save();
    if (radius) {
      this.doc.roundedRect(x, y, w, h, radius).fillAndStroke(fillColor, strokeColor);
    } else {
      this.doc.rect(x, y, w, h).fillAndStroke(fillColor, strokeColor);
    }
    this.doc.restore();
  }

  txt(str: string, x: number, y: number, opts: { size?: number; font?: string; color?: string; width?: number; align?: string } = {}) {
    this.doc.save();
    this.doc.fontSize(opts.size ?? 10).font(opts.font ?? 'Helvetica').fillColor(opts.color ?? COL.textDark);
    this.doc.text(str, x, y, { width: opts.width ?? CONTENT_W, align: (opts.align as any) ?? 'left', lineGap: 0 });
    this.doc.restore();
  }

  gap(h: number) {
    this.y += h;
  }

  ensureSpace(needed: number) {
    this.checkPage(needed);
  }

  finalize() {
    this.drawBackgrounds();
    this.drawFooter();
    this.doc.end();
  }
}

router.get('/:inspecaoId/relatorio', async (req: AuthRequest, res) => {
  try {
    const inspecaoId = String(req.params.inspecaoId);
    const inspecao = await prisma.inspecao.findFirst({
      where: { id: inspecaoId, usuarioId: req.userId! },
      include: {
        empresa: true,
        setor: true,
        usuario: { select: { nome: true, email: true } },
        riscos: true,
        epiViolacoes: true,
        midias: true,
      },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const pdf = new PDF();
    const { doc } = pdf;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${inspecao.id.slice(0, 8)}.pdf`);
    doc.pipe(res);

    const nota = inspecao.notaConformidade ?? 0;
    const totalRiscos = inspecao.riscos.length;
    const epiAusentes = inspecao.epiViolacoes.filter(e => e.status === 'ausente').length;
    const epiIncorretos = inspecao.epiViolacoes.filter(e => e.status === 'incorreto').length;
    const riscosPorGravidade = {
      critica: inspecao.riscos.filter(r => r.gravidade.toLowerCase() === 'critica').length,
      alta: inspecao.riscos.filter(r => r.gravidade.toLowerCase() === 'alta').length,
      media: inspecao.riscos.filter(r => r.gravidade.toLowerCase() === 'media').length,
      baixa: inspecao.riscos.filter(r => r.gravidade.toLowerCase() === 'baixa').length,
    };

    // ════════════════════════════════════════════════
    // CAPA
    // ════════════════════════════════════════════════
    pdf.newPage(false);
    pdf.backgrounds = [];
    pdf.addBg(0, 0, PAGE_W, PAGE_H, COL.navy);
    pdf.addBg(0, 0, PAGE_W, 6, COL.amber);

    const logoX = (PAGE_W - 90) / 2;
    pdf.addBg(logoX, 80, 90, 90, COL.amber, 16);
    pdf.addBg(logoX + 5, 85, 80, 80, COL.navy, 12);

    pdf.txt('SV', 0, 105, { size: 36, font: 'Helvetica-Bold', color: COL.amber, width: PAGE_W, align: 'center' });

    pdf.txt('SAFETYVISION AI', 0, 200, { size: 28, font: 'Helvetica-Bold', color: COL.white, width: PAGE_W, align: 'center' });
    pdf.txt('Relatório de Inspeção de Segurança do Trabalho', 0, 240, { size: 12, font: 'Helvetica', color: COL.textLight, width: PAGE_W, align: 'center' });

    pdf.addBg(210, 270, 175, 3, COL.amber);

    const coverItems = [
      ['EMPRESA', inspecao.empresa.nome],
      ['CNPJ', inspecao.empresa.cnpj || '—'],
      ['SETOR', inspecao.setor.nome],
      ['TÉCNICO', inspecao.usuario.nome],
      ['DATA', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
    ];
    let cy = 300;
    for (const [label, value] of coverItems) {
      pdf.txt(label, 0, cy, { size: 7, font: 'Helvetica', color: COL.textLight, width: PAGE_W, align: 'center' });
      cy += 12;
      pdf.txt(value, 0, cy, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: PAGE_W, align: 'center' });
      cy += 24;
    }

    const corNota = nota >= 70 ? COL.green : nota >= 40 ? COL.amber : COL.red;
    pdf.addBg((PAGE_W - 80) / 2, 490, 80, 80, corNota, 40);
    pdf.txt(`${nota}`, 0, 505, { size: 32, font: 'Helvetica-Bold', color: COL.white, width: PAGE_W, align: 'center' });
    pdf.txt('/100', 0, 545, { size: 8, font: 'Helvetica', color: COL.white, width: PAGE_W, align: 'center' });
    pdf.txt('NOTA DE CONFORMIDADE', 0, 580, { size: 8, font: 'Helvetica', color: COL.textLight, width: PAGE_W, align: 'center' });

    const statItems = [
      { v: `${totalRiscos}`, l: 'Riscos', c: COL.red },
      { v: `${epiAusentes + epiIncorretos}`, l: 'EPIs Irregulares', c: COL.amber },
      { v: `${inspecao.midias.length}`, l: 'Fotos', c: COL.blue },
    ];
    statItems.forEach((s, i) => {
      const sx = 80 + i * 155;
      pdf.addBg(sx, 620, 120, 50, '#1E293B', 8);
      pdf.txt(s.v, sx, 628, { size: 20, font: 'Helvetica-Bold', color: s.c, width: 120, align: 'center' });
      pdf.txt(s.l, sx, 654, { size: 7, font: 'Helvetica', color: COL.textLight, width: 120, align: 'center' });
    });

    // ════════════════════════════════════════════════
    // RESUMO EXECUTIVO
    // ════════════════════════════════════════════════
    pdf.newPage();

    pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 30, COL.navy, 4);
    pdf.txt('RESUMO EXECUTIVO', MARGIN_L, pdf.y, { size: 14, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W, align: 'left' });
    pdf.y += 30;

    const summaryData: [string, string][] = [
      ['Empresa', inspecao.empresa.nome],
      ['CNPJ', inspecao.empresa.cnpj || '—'],
      ['Setor', inspecao.setor.nome],
      ['Técnico', inspecao.usuario.nome],
      ['Data da Inspeção', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
      ['Status', inspecao.status === 'concluida' ? 'Concluída' : 'Em Andamento'],
      ['Riscos Identificados', String(totalRiscos)],
      ['Nota de Conformidade', `${nota}/100`],
    ];

    for (let i = 0; i < summaryData.length; i++) {
      const [k, v] = summaryData[i];
      const rowH = 22;
      const bgColor = i % 2 === 0 ? '#F1F5F9' : COL.white;
      pdf.addBg(MARGIN_L, pdf.y, CONTENT_W, rowH, bgColor);
      pdf.txt(k, MARGIN_L + 8, pdf.y + 6, { size: 9, font: 'Helvetica', color: COL.textMid, width: 180 });
      pdf.txt(v, MARGIN_L + 200, pdf.y + 6, { size: 9, font: 'Helvetica-Bold', color: COL.textDark, width: CONTENT_W - 210 });
      pdf.y += rowH;
    }

    pdf.gap(20);

    // Matriz de Risco
    pdf.ensureSpace(180);
    pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 26, COL.navy, 4);
    pdf.txt('MATRIZ DE RISCO', MARGIN_L, pdf.y, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W });
    pdf.y += 30;

    const matrixHeader = ['GRAVIDADE', 'QUANTIDADE', 'PRAZO DE CORREÇÃO'];
    const colWidths = [180, 100, 150];
    let mx = MARGIN_L;

    pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, 22, COL.navy);
    matrixHeader.forEach((h, i) => {
      pdf.txt(h, mx + 8, pdf.y + 6, { size: 8, font: 'Helvetica-Bold', color: COL.white, width: colWidths[i] - 16 });
      mx += colWidths[i];
    });
    pdf.y += 22;

    const gravRows: Array<{ label: string; count: number; prazo: string; color: string }> = [
      { label: 'Crítica', count: riscosPorGravidade.critica, prazo: '1 a 7 dias', color: COL.red },
      { label: 'Alta', count: riscosPorGravidade.alta, prazo: 'Até 15 dias', color: COL.orange },
      { label: 'Média', count: riscosPorGravidade.media, prazo: 'Até 30 dias', color: COL.amber },
      { label: 'Baixa', count: riscosPorGravidade.baixa, prazo: 'Até 60 dias', color: COL.green },
    ];

    for (let i = 0; i < gravRows.length; i++) {
      const g = gravRows[i];
      const bg = i % 2 === 0 ? '#F8FAFC' : COL.white;
      pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, 22, bg);

      pdf.drawRect(MARGIN_L + 8, pdf.y + 6, 10, 10, g.color, 5);
      pdf.txt(g.label, MARGIN_L + 26, pdf.y + 5, { size: 9, font: 'Helvetica-Bold', color: COL.textDark, width: 140 });
      pdf.txt(String(g.count), MARGIN_L + 180, pdf.y + 5, { size: 9, font: 'Helvetica-Bold', color: g.count > 0 ? COL.red : COL.textLight, width: 100 });
      pdf.txt(g.prazo, MARGIN_L + 280, pdf.y + 5, { size: 9, font: 'Helvetica', color: COL.textMid, width: 150 });
      pdf.y += 22;
    }

    if (inspecao.observacoes) {
      pdf.gap(16);
      pdf.ensureSpace(60);
      pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, 50, COL.amberBg);
      pdf.drawRect(MARGIN_L, pdf.y, 4, 50, COL.amber);
      pdf.txt('Observações do Técnico', MARGIN_L + 16, pdf.y + 8, { size: 9, font: 'Helvetica-Bold', color: COL.textDark, width: CONTENT_W - 24 });
      pdf.txt(inspecao.observacoes, MARGIN_L + 16, pdf.y + 22, { size: 8, font: 'Helvetica', color: COL.textMid, width: CONTENT_W - 32 });
      pdf.y += 56;
    }

    // ════════════════════════════════════════════════
    // IMAGENS ANOTADAS
    // ════════════════════════════════════════════════
    const imagensAnotadas = inspecao.midias
      .filter(m => m.tipo === 'foto')
      .map(m => {
        const filename = path.basename(m.url);
        const anotadaPath = path.join(anotadasDir, `anotada_${filename}.png`);
        return { midia: m, anotadaPath };
      })
      .filter(img => fs.existsSync(img.anotadaPath));

    for (const img of imagensAnotadas) {
      pdf.newPage();
      pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 26, COL.navy, 4);
      pdf.txt('ANÁLISE VISUAL', MARGIN_L, pdf.y, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W });
      pdf.y += 30;

      pdf.txt(img.midia.nome, MARGIN_L, pdf.y, { size: 8, font: 'Helvetica', color: COL.textMid, width: CONTENT_W });
      pdf.y += 14;

      try {
        const meta = await sharp(img.anotadaPath).metadata();
        const imgW = meta.width || 500;
        const imgH = meta.height || 400;
        const maxW = CONTENT_W;
        const maxH = MAX_Y - pdf.y - 30;
        const scale = Math.min(maxW / imgW, maxH / imgH, 1);
        const w = imgW * scale;
        const h = imgH * scale;
        const x = MARGIN_L + (maxW - w) / 2;

        pdf.drawRect(x - 2, pdf.y - 2, w + 4, h + 4, COL.border, 4);
        doc.save();
        doc.image(img.anotadaPath, x, pdf.y, { width: w, height: h });
        doc.restore();
        pdf.y += h + 8;

        const riscosImg = inspecao.riscos.filter(r => r.imagemUrl === img.midia.url);
        if (riscosImg.length > 0) {
          const boxH = 14 + Math.min(riscosImg.length, 4) * 12;
          pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, boxH, COL.redBg, 4);
          pdf.drawRect(MARGIN_L, pdf.y, 4, boxH, COL.red);
          pdf.txt(`${riscosImg.length} risco(s) identificado(s):`, MARGIN_L + 14, pdf.y + 6, { size: 8, font: 'Helvetica-Bold', color: COL.red, width: CONTENT_W - 24 });
          let ry = pdf.y + 18;
          for (const r of riscosImg.slice(0, 4)) {
            pdf.txt(`• ${r.descricao} — ${r.gravidade.toUpperCase()}`, MARGIN_L + 20, ry, { size: 7, font: 'Helvetica', color: COL.textMid, width: CONTENT_W - 36 });
            ry += 12;
          }
          pdf.y += boxH + 4;
        }
      } catch {
        pdf.txt('Imagem não disponível', MARGIN_L, pdf.y + 10, { size: 10, color: COL.textLight });
        pdf.y += 30;
      }
    }

    // ════════════════════════════════════════════════
    // RISCOS DETALHADOS
    // ════════════════════════════════════════════════
    if (totalRiscos > 0) {
      pdf.newPage();
      pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 26, COL.navy, 4);
      pdf.txt('RISCOS IDENTIFICADOS', MARGIN_L, pdf.y, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W });
      pdf.y += 30;

      const gravCor: Record<string, string> = {
        crítica: COL.red, critica: COL.red, alta: COL.orange,
        média: COL.amber, media: COL.amber, baixa: COL.green,
      };

      for (let i = 0; i < inspecao.riscos.length; i++) {
        const risco = inspecao.riscos[i];
        const cor = gravCor[risco.gravidade] || COL.amber;

        let cardH = 32;
        if (risco.consequencias) cardH += 14;
        if (risco.medidasPreventivas) cardH += 14;
        if (risco.medidasCorretivas) cardH += 14;
        if (risco.localIdentificado) cardH += 14;

        pdf.ensureSpace(cardH + 10);

        const cardY = pdf.y;
        pdf.drawRect(MARGIN_L, cardY, CONTENT_W, cardH, COL.white);
        pdf.drawRect(MARGIN_L, cardY, 4, cardH, cor);

        const numY = cardY + 8;
        pdf.drawRect(MARGIN_L + 12, numY, 20, 20, cor, 10);
        pdf.txt(String(i + 1), MARGIN_L + 12, numY + 4, { size: 9, font: 'Helvetica-Bold', color: COL.white, width: 20, align: 'center' });

        pdf.txt(risco.descricao, MARGIN_L + 40, cardY + 8, { size: 9, font: 'Helvetica-Bold', color: COL.textDark, width: CONTENT_W - 50 });

        const badgeY = cardY + 22;
        pdf.drawRect(MARGIN_L + 40, badgeY, 60, 14, cor, 3);
        pdf.txt(risco.gravidade.toUpperCase(), MARGIN_L + 40, badgeY + 3, { size: 6, font: 'Helvetica-Bold', color: COL.white, width: 60, align: 'center' });

        if (risco.nrsRelacionadas) {
          pdf.drawRect(MARGIN_L + 108, badgeY, 45, 14, COL.blueBg, 3);
          pdf.txt(risco.nrsRelacionadas, MARGIN_L + 108, badgeY + 3, { size: 6, font: 'Helvetica-Bold', color: COL.blue, width: 45, align: 'center' });
        }

        pdf.drawRect(MARGIN_L + 160, badgeY, 50, 14, '#F1F5F9', 3);
        pdf.txt(`${(risco.confianca * 100).toFixed(0)}%`, MARGIN_L + 160, badgeY + 3, { size: 6, font: 'Helvetica', color: COL.textMid, width: 50, align: 'center' });

        let detailY = cardY + 40;
        const details: Array<{ label: string; value: string; color: string }> = [];
        if (risco.localIdentificado) details.push({ label: 'Local', value: risco.localIdentificado, color: COL.textMid });
        if (risco.categoria) details.push({ label: 'Categoria', value: risco.categoria, color: COL.textMid });
        if (risco.consequencias) details.push({ label: 'Consequências', value: risco.consequencias, color: COL.red });
        if (risco.medidasPreventivas) details.push({ label: 'Prevenção', value: risco.medidasPreventivas, color: COL.green });
        if (risco.medidasCorretivas) details.push({ label: 'Correção', value: risco.medidasCorretivas, color: COL.orange });

        for (const d of details) {
          pdf.txt(`${d.label}: ${d.value}`, MARGIN_L + 44, detailY, { size: 7, font: 'Helvetica', color: d.color, width: CONTENT_W - 56 });
          detailY += 14;
        }

        pdf.y = cardY + cardH + 8;
      }
    }

    // ════════════════════════════════════════════════
    // EPIs
    // ════════════════════════════════════════════════
    if (inspecao.epiViolacoes.length > 0) {
      pdf.newPage();
      pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 26, COL.navy, 4);
      pdf.txt('ANÁLISE DE EPIs', MARGIN_L, pdf.y, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W });
      pdf.y += 30;

      for (let i = 0; i < inspecao.epiViolacoes.length; i++) {
        const epi = inspecao.epiViolacoes[i];
        const cor = epi.status === 'ausente' ? COL.red : epi.status === 'incorreto' ? COL.orange : COL.green;
        const bg = epi.status === 'ausente' ? COL.redBg : epi.status === 'incorreto' ? COL.orangeBg : COL.greenBg;
        const label = epi.status === 'ausente' ? 'AUSENTE' : epi.status === 'incorreto' ? 'INCORRETO' : 'CORRETO';

        const cardH = epi.descricao ? 40 : 30;
        pdf.ensureSpace(cardH + 6);

        const ey = pdf.y;
        pdf.drawRect(MARGIN_L, ey, CONTENT_W, cardH, bg);
        pdf.drawRect(MARGIN_L, ey, 4, cardH, cor);

        pdf.drawRect(MARGIN_L + 14, ey + 7, 60, 16, cor, 3);
        pdf.txt(label, MARGIN_L + 14, ey + 10, { size: 7, font: 'Helvetica-Bold', color: COL.white, width: 60, align: 'center' });

        pdf.txt(epi.epiNome, MARGIN_L + 84, ey + 7, { size: 10, font: 'Helvetica-Bold', color: COL.textDark, width: CONTENT_W - 160 });

        pdf.txt(`${(epi.confianca * 100).toFixed(0)}%`, MARGIN_L + CONTENT_W - 50, ey + 9, { size: 8, font: 'Helvetica', color: COL.textMid, width: 40, align: 'right' });

        if (epi.descricao) {
          pdf.txt(epi.descricao, MARGIN_L + 84, ey + 22, { size: 7, font: 'Helvetica', color: COL.textMid, width: CONTENT_W - 100 });
        }

        pdf.y = ey + cardH + 6;
      }
    }

    // ════════════════════════════════════════════════
    // CHECKLIST
    // ════════════════════════════════════════════════
    const checklistRespostas = await (prisma as any).checklistResposta.findMany({
      where: { inspecaoId: inspecao.id },
      include: { item: true },
    });

    if (checklistRespostas.length > 0) {
      pdf.newPage();
      pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 26, COL.navy, 4);
      pdf.txt('CHECKLIST DE CONFORMIDADE', MARGIN_L, pdf.y, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W });
      pdf.y += 30;

      pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, 20, COL.navy);
      const clCols = [250, 80, 80];
      const clHeaders = ['ITEM', 'STATUS', 'OBSERVAÇÃO'];
      let cx = MARGIN_L + 8;
      clHeaders.forEach((h, i) => {
        pdf.txt(h, cx, pdf.y + 5, { size: 7, font: 'Helvetica-Bold', color: COL.white, width: clCols[i] });
        cx += clCols[i];
      });
      pdf.y += 20;

      for (let i = 0; i < checklistRespostas.length; i++) {
        const cr = checklistRespostas[i];
        const bg = i % 2 === 0 ? '#F8FAFC' : COL.white;
        const statusCor = cr.resposta === 'conforme' ? COL.green : cr.resposta === 'nao_conforme' ? COL.red : COL.amber;
        const statusLabel = cr.resposta === 'conforme' ? 'Conforme' : cr.resposta === 'nao_conforme' ? 'Não Conforme' : 'N/A';

        pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, 20, bg);
        pdf.drawRect(MARGIN_L, pdf.y, 3, 20, statusCor);

        let ccx = MARGIN_L + 12;
        pdf.txt(cr.item?.texto || cr.itemId, ccx, pdf.y + 5, { size: 7, font: 'Helvetica', color: COL.textDark, width: clCols[0] - 12 });
        ccx += clCols[0];
        pdf.drawRect(ccx, pdf.y + 4, 70, 12, statusCor, 3);
        pdf.txt(statusLabel, ccx, pdf.y + 5, { size: 6, font: 'Helvetica-Bold', color: COL.white, width: 70, align: 'center' });
        ccx += clCols[1];
        pdf.txt(cr.observacao || '—', ccx, pdf.y + 5, { size: 7, font: 'Helvetica', color: COL.textMid, width: clCols[2] });
        pdf.y += 20;
      }
    }

    // ════════════════════════════════════════════════
    // FOTOS ORIGINAIS
    // ════════════════════════════════════════════════
    const fotos = inspecao.midias.filter(m => m.tipo === 'foto');
    if (fotos.length > 0) {
      pdf.newPage();
      pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 26, COL.navy, 4);
      pdf.txt('EVIDÊNCIAS FOTOGRÁFICAS', MARGIN_L, pdf.y, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W });
      pdf.y += 30;

      let col = 0;
      const colW = (CONTENT_W - 12) / 2;
      let rowMaxH = 0;

      for (const foto of fotos) {
        const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
        if (!fs.existsSync(imgPath)) continue;

        try {
          const meta = await sharp(imgPath).metadata();
          const imgW = meta.width || 300;
          const imgH = meta.height || 200;
          const scale = Math.min(colW / imgW, 200 / imgH);
          const w = imgW * scale;
          const h = imgH * scale;

          const totalH = h + 18;
          if (col === 0) {
            pdf.ensureSpace(totalH + 10);
          } else {
            if (pdf.y + totalH > MAX_Y) {
              pdf.y += rowMaxH + 8;
              col = 0;
              rowMaxH = 0;
              pdf.ensureSpace(totalH + 10);
            }
          }

          const fx = col === 0 ? MARGIN_L : MARGIN_L + colW + 12;
          const fy = pdf.y;

          pdf.drawRect(fx - 2, fy - 2, w + 4, h + 4, COL.border, 4);
          doc.save();
          doc.image(imgPath, fx, fy, { width: w, height: h });
          doc.restore();
          pdf.txt(foto.nome, fx, fy + h + 4, { size: 7, font: 'Helvetica', color: COL.textMid, width: w });

          rowMaxH = Math.max(rowMaxH, totalH);
          col = col === 0 ? 1 : 0;
          if (col === 0) {
            pdf.y += rowMaxH + 8;
            rowMaxH = 0;
          }
        } catch {
          // skip
        }
      }
      if (col === 1) {
        pdf.y += rowMaxH + 8;
      }
    }

    // ════════════════════════════════════════════════
    // CONCLUSÃO / ASSINATURA
    // ════════════════════════════════════════════════
    pdf.newPage();
    pdf.addBg(MARGIN_L - 5, pdf.y - 5, CONTENT_W + 10, 26, COL.navy, 4);
    pdf.txt('CONCLUSÃO', MARGIN_L, pdf.y, { size: 12, font: 'Helvetica-Bold', color: COL.white, width: CONTENT_W });
    pdf.y += 30;

    const conclH = 90;
    pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, conclH, '#F8FAFC', 6);
    pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, 1, COL.border);

    pdf.txt('Técnico Responsável', MARGIN_L + 16, pdf.y + 12, { size: 10, font: 'Helvetica-Bold', color: COL.textDark, width: CONTENT_W - 32 });
    pdf.txt(`Nome: ${inspecao.usuario.nome}`, MARGIN_L + 16, pdf.y + 30, { size: 8, font: 'Helvetica', color: COL.textMid, width: 220 });
    pdf.txt(`E-mail: ${inspecao.usuario.email}`, MARGIN_L + 16, pdf.y + 44, { size: 8, font: 'Helvetica', color: COL.textMid, width: 220 });
    pdf.txt(`Data da Inspeção: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`, MARGIN_L + 260, pdf.y + 30, { size: 8, font: 'Helvetica', color: COL.textMid, width: 200 });
    pdf.txt(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, MARGIN_L + 260, pdf.y + 44, { size: 8, font: 'Helvetica', color: COL.textMid, width: 200 });
    pdf.y += conclH;

    if (inspecao.observacoes) {
      pdf.gap(16);
      const obsH = 50;
      pdf.drawRect(MARGIN_L, pdf.y, CONTENT_W, obsH, COL.amberBg, 4);
      pdf.drawRect(MARGIN_L, pdf.y, 4, obsH, COL.amber);
      pdf.txt('Observações', MARGIN_L + 16, pdf.y + 8, { size: 9, font: 'Helvetica-Bold', color: COL.textDark, width: CONTENT_W - 32 });
      pdf.txt(inspecao.observacoes, MARGIN_L + 16, pdf.y + 24, { size: 8, font: 'Helvetica', color: COL.textMid, width: CONTENT_W - 36 });
      pdf.y += obsH + 8;
    }

    pdf.gap(30);
    pdf.drawRect(MARGIN_L, pdf.y, 200, 1, COL.border);
    pdf.txt(inspecao.usuario.nome, MARGIN_L, pdf.y + 8, { size: 8, font: 'Helvetica-Bold', color: COL.textDark, width: 200 });
    pdf.txt(new Date().toLocaleDateString('pt-BR'), MARGIN_L, pdf.y + 22, { size: 8, font: 'Helvetica', color: COL.textMid, width: 200 });

    pdf.finalize();
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

export default router;
