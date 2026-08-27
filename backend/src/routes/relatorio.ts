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

const C = {
  navy: '#0F172A',
  navyLight: '#1E293B',
  navyCard: '#162032',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  white: '#FFFFFF',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  red: '#DC2626',
  redLight: '#FEE2E2',
  redBg: '#FEF2F2',
  orange: '#EA580C',
  orangeLight: '#FFF7ED',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  greenBg: '#F0FDF4',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 40;

function footer(doc: PDFKit.PDFDocument, page: number) {
  doc.rect(0, PAGE_H - 32, PAGE_W, 32).fill(C.navy);
  doc.fontSize(7).font('Helvetica').fillColor(C.gray400)
    .text('SafetyVision AI', MARGIN, PAGE_H - 22, { width: 200 });
  doc.fillColor(C.amber)
    .text(`${page}`, MARGIN, PAGE_H - 22, { align: 'right', width: CONTENT_W });
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, y: number) {
  doc.fontSize(18).font('Helvetica-Bold').fillColor(C.navy).text(title, MARGIN, y);
  doc.moveTo(MARGIN, y + 24).lineTo(PAGE_W - MARGIN, y + 24).strokeColor(C.amber).lineWidth(2).stroke();
  return y + 36;
}

function checkPage(doc: PDFKit.PDFDocument, y: number, needed: number, pageRef: { value: number }): number {
  if (y + needed > BOTTOM) {
    footer(doc, pageRef.value);
    doc.addPage({ margin: MARGIN });
    pageRef.value++;
    return 50;
  }
  return y;
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

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${inspecao.id.slice(0, 8)}.pdf`);
    doc.pipe(res);

    const nota = inspecao.notaConformidade ?? 0;
    const totalRiscos = inspecao.riscos.length;
    const epiAusentes = inspecao.epiViolacoes.filter(e => e.status === 'ausente').length;
    const page = { value: 0 };

    // ═══════════════════════════════════════════════════
    // CAPA
    // ═══════════════════════════════════════════════════
    page.value++;
    doc.addPage({ margin: 0 });
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.navy);
    doc.rect(0, 0, PAGE_W, 5).fill(C.amber);

    // Ícone
    doc.roundedRect(247, 90, 100, 100, 18).fill(C.navyCard);
    doc.roundedRect(252, 95, 90, 90, 14).fill(C.amber);
    doc.fontSize(38).font('Helvetica-Bold').fillColor(C.navy).text('SV', 252, 118, { width: 90, align: 'center' });

    // Título
    doc.fontSize(30).font('Helvetica-Bold').fillColor(C.white).text('SAFETYVISION AI', 0, 220, { align: 'center' });
    doc.fontSize(13).font('Helvetica').fillColor(C.gray400).text('Relatório de Inspeção de Segurança', 0, 258, { align: 'center' });

    doc.moveTo(210, 290).lineTo(385, 290).strokeColor(C.amber).lineWidth(2).stroke();

    // Dados centralizados
    const coverData = [
      ['Empresa', inspecao.empresa.nome],
      ['CNPJ', inspecao.empresa.cnpj || '---'],
      ['Setor', inspecao.setor.nome],
      ['Técnico', inspecao.usuario.nome],
      ['Data', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
    ];
    let cy = 315;
    for (const [label, value] of coverData) {
      doc.fontSize(8).font('Helvetica').fillColor(C.gray400).text(label.toUpperCase(), 0, cy, { align: 'center', width: PAGE_W });
      cy += 12;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(C.white).text(value, 0, cy, { align: 'center', width: PAGE_W });
      cy += 20;
    }

    // Nota circular
    const corNota = nota >= 70 ? C.green : nota >= 40 ? C.amber : C.red;
    doc.circle(297, 530, 50).fill(corNota);
    doc.fontSize(34).font('Helvetica-Bold').fillColor(C.white).text(`${nota}`, 262, 514, { align: 'center', width: 70 });
    doc.fontSize(9).fillColor(C.white).text('/100', 262, 548, { align: 'center', width: 70 });
    doc.fontSize(9).font('Helvetica').fillColor(C.gray400).text('NOTA DE CONFORMIDADE', 0, 590, { align: 'center', width: PAGE_W });

    // Stats
    const stats = [
      { v: `${totalRiscos}`, l: 'Riscos', c: C.red },
      { v: `${epiAusentes}`, l: 'EPIs Ausentes', c: C.amber },
      { v: `${inspecao.midias.length}`, l: 'Fotos', c: C.blue },
    ];
    stats.forEach((s, i) => {
      const sx = 110 + i * 145;
      doc.roundedRect(sx, 620, 110, 48, 8).fill(C.navyCard);
      doc.fontSize(18).font('Helvetica-Bold').fillColor(s.c).text(s.v, sx, 628, { width: 110, align: 'center' });
      doc.fontSize(7).font('Helvetica').fillColor(C.gray400).text(s.l, sx, 650, { width: 110, align: 'center' });
    });

    footer(doc, page.value);

    // ═══════════════════════════════════════════════════
    // RESUMO EXECUTIVO
    // ═══════════════════════════════════════════════════
    page.value++;
    doc.addPage({ margin: MARGIN });
    let y = sectionTitle(doc, 'Resumo Executivo', 40);

    const rows: [string, string][] = [
      ['Empresa', inspecao.empresa.nome],
      ['Setor', inspecao.setor.nome],
      ['Técnico Responsável', inspecao.usuario.nome],
      ['Data da Inspeção', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
      ['Riscos Identificados', String(totalRiscos)],
      ['EPIs em Desacordo', String(inspecao.epiViolacoes.filter(e => e.status !== 'correto').length)],
      ['Nota de Conformidade', `${nota}/100`],
      ['Status', inspecao.status === 'concluida' ? 'Concluída' : 'Em Andamento'],
    ];

    for (let i = 0; i < rows.length; i++) {
      const [k, v] = rows[i];
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      doc.rect(MARGIN, y, CONTENT_W, 24).fill(bg);
      doc.fontSize(10).font('Helvetica').fillColor(C.gray500).text(k, MARGIN + 12, y + 7, { width: 200 });
      doc.font('Helvetica-Bold').fillColor(C.navy).text(v, MARGIN + 220, y + 7, { width: CONTENT_W - 232 });
      y += 24;
    }

    // Matriz de risco
    y += 16;
    y = checkPage(doc, y, 160, page);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.navy).text('Matriz de Risco', MARGIN, y);
    y += 20;

    const gravidades: Array<{ key: string; label: string; color: string }> = [
      { key: 'critica', label: 'Crítica', color: C.red },
      { key: 'alta', label: 'Alta', color: C.orange },
      { key: 'media', label: 'Média', color: C.amber },
      { key: 'baixa', label: 'Baixa', color: C.green },
    ];
    const prazos: Record<string, string> = { critica: '1 a 7 dias', alta: '15 dias', media: '30 dias', baixa: '60 dias' };

    // Header
    doc.rect(MARGIN, y, CONTENT_W, 24).fill(C.navy);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white);
    doc.text('GRAVIDADE', MARGIN + 10, y + 8, { width: 150 });
    doc.text('QUANTIDADE', MARGIN + 170, y + 8, { width: 140 });
    doc.text('PRAZO', MARGIN + 330, y + 8, { width: 140 });
    y += 24;

    for (let i = 0; i < gravidades.length; i++) {
      const g = gravidades[i];
      const count = inspecao.riscos.filter(r => r.gravidade.toLowerCase() === g.key).length;
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      doc.rect(MARGIN, y, CONTENT_W, 22).fill(bg);
      doc.circle(MARGIN + 16, y + 11, 5).fill(g.color);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.navy).text(g.label, MARGIN + 28, y + 6, { width: 130 });
      doc.font('Helvetica').fillColor(count > 0 ? C.red : C.gray400).text(`${count}`, MARGIN + 170, y + 6, { width: 140 });
      doc.fillColor(C.gray600).text(prazos[g.key], MARGIN + 330, y + 6, { width: 140 });
      y += 22;
    }

    // Observações
    if (inspecao.observacoes) {
      y += 14;
      y = checkPage(doc, y, 70, page);
      doc.roundedRect(MARGIN, y, CONTENT_W, 56, 6).fill(C.amberLight);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.navy).text('Observações do Técnico', MARGIN + 12, y + 8);
      doc.fontSize(8).font('Helvetica').fillColor(C.gray700).text(inspecao.observacoes, MARGIN + 12, y + 22, { width: CONTENT_W - 24, height: 28 });
      y += 56;
    }

    footer(doc, page.value);

    // ═══════════════════════════════════════════════════
    // IMAGENS ANOTADAS
    // ═══════════════════════════════════════════════════
    const imagensAnotadas = inspecao.midias
      .filter(m => m.tipo === 'foto')
      .map(m => {
        const filename = path.basename(m.url);
        const anotadaPath = path.join(anotadasDir, `anotada_${filename}.png`);
        return { midia: m, anotadaPath };
      })
      .filter(img => fs.existsSync(img.anotadaPath));

    for (const img of imagensAnotadas) {
      page.value++;
      doc.addPage({ margin: MARGIN });
      let iy = sectionTitle(doc, 'Análise Visual', 40);

      doc.fontSize(9).font('Helvetica').fillColor(C.gray500).text(img.midia.nome, MARGIN, iy);
      iy += 16;

      try {
        const meta = await sharp(img.anotadaPath).metadata();
        const imgW = meta.width || 500;
        const imgH = meta.height || 400;
        const maxW = CONTENT_W;
        const maxH = BOTTOM - iy - 20;
        const scale = Math.min(maxW / imgW, maxH / imgH);
        const w = imgW * scale;
        const h = imgH * scale;
        const x = MARGIN + (maxW - w) / 2;

        doc.roundedRect(x - 2, iy - 2, w + 4, h + 4, 4).fill(C.gray200);
        doc.image(img.anotadaPath, x, iy, { width: w, height: h });

        const riscosImg = inspecao.riscos.filter(r => r.imagemUrl === img.midia.url);
        if (riscosImg.length > 0) {
          let ry = iy + h + 10;
          const boxH = 16 + Math.min(riscosImg.length, 5) * 13;
          ry = checkPage(doc, ry, boxH, page);
          doc.roundedRect(MARGIN, ry, CONTENT_W, boxH, 6).fill(C.redBg);
          ry += 8;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(C.red).text(`${riscosImg.length} risco(s) identificado(s):`, MARGIN + 10, ry);
          ry += 14;
          for (const r of riscosImg.slice(0, 5)) {
            doc.fontSize(7).font('Helvetica').fillColor(C.gray700).text(`${r.descricao} (${r.gravidade.toUpperCase()})`, MARGIN + 16, ry, { width: CONTENT_W - 32 });
            ry += 13;
          }
        }
      } catch {
        doc.fontSize(10).fillColor(C.gray400).text('Imagem não disponível', MARGIN, iy + 20);
      }

      footer(doc, page.value);
    }

    // ═══════════════════════════════════════════════════
    // RISCOS DETALHADOS
    // ═══════════════════════════════════════════════════
    if (totalRiscos > 0) {
      page.value++;
      doc.addPage({ margin: MARGIN });
      let ry = sectionTitle(doc, 'Riscos Identificados', 40);

      const gravidadeCor: Record<string, string> = {
        crítica: C.red, critica: C.red, alta: C.orange,
        média: C.amber, media: C.amber, baixa: C.green,
      };

      for (let i = 0; i < inspecao.riscos.length; i++) {
        const risco = inspecao.riscos[i];
        ry = checkPage(doc, ry, 90, page);

        const cor = gravidadeCor[risco.gravidade] || C.amber;

        // Card
        doc.roundedRect(MARGIN, ry, CONTENT_W, 82, 6).fillAndStroke(C.white, C.gray200);

        // Borda lateral colorida
        doc.rect(MARGIN, ry + 6, 4, 70).fill(cor);

        // Número
        doc.circle(MARGIN + 24, ry + 16, 11).fill(cor);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white).text(`${i + 1}`, MARGIN + 16, ry + 12, { width: 16, align: 'center' });

        // Título
        doc.fontSize(10).font('Helvetica-Bold').fillColor(C.navy).text(risco.descricao, MARGIN + 42, ry + 8, { width: CONTENT_W - 54 });

        // Badges
        const bY = ry + 24;
        doc.roundedRect(MARGIN + 42, bY, 52, 13, 3).fill(cor);
        doc.fontSize(6).font('Helvetica-Bold').fillColor(C.white).text(risco.gravidade.toUpperCase(), MARGIN + 42, bY + 3, { width: 52, align: 'center' });

        if (risco.nrsRelacionadas) {
          doc.roundedRect(MARGIN + 100, bY, 42, 13, 3).fill(C.blueLight);
          doc.fontSize(6).font('Helvetica-Bold').fillColor(C.blue).text(risco.nrsRelacionadas, MARGIN + 100, bY + 3, { width: 42, align: 'center' });
        }

        doc.roundedRect(MARGIN + 148, bY, 62, 13, 3).fill(C.gray100);
        doc.fontSize(6).font('Helvetica').fillColor(C.gray600).text(`${(risco.confianca * 100).toFixed(0)}%`, MARGIN + 148, bY + 3, { width: 62, align: 'center' });

        // Detalhes
        let dy = ry + 42;
        doc.fontSize(7).font('Helvetica').fillColor(C.gray500);
        doc.text(`Categoria: ${risco.categoria}  |  Local: ${risco.localIdentificado || '---'}`, MARGIN + 42, dy, { width: CONTENT_W - 54 });
        dy += 11;
        if (risco.consequencias) {
          doc.text(`Consequências: ${risco.consequencias}`, MARGIN + 42, dy, { width: CONTENT_W - 54 });
          dy += 11;
        }
        if (risco.medidasPreventivas) {
          doc.fillColor(C.green).text(`Prevenção: ${risco.medidasPreventivas}`, MARGIN + 42, dy, { width: CONTENT_W - 54 });
          dy += 11;
        }
        if (risco.medidasCorretivas) {
          doc.fillColor(C.orange).text(`Correção: ${risco.medidasCorretivas}`, MARGIN + 42, dy, { width: CONTENT_W - 54 });
        }

        ry += 90;
      }

      footer(doc, page.value);
    }

    // ═══════════════════════════════════════════════════
    // EPIs
    // ═══════════════════════════════════════════════════
    if (inspecao.epiViolacoes.length > 0) {
      page.value++;
      doc.addPage({ margin: MARGIN });
      let ey = sectionTitle(doc, 'Análise de EPIs', 40);

      for (let i = 0; i < inspecao.epiViolacoes.length; i++) {
        const epi = inspecao.epiViolacoes[i];
        ey = checkPage(doc, ey, 40, page);

        const cor = epi.status === 'ausente' ? C.red : epi.status === 'incorreto' ? C.orange : C.green;
        const bg = epi.status === 'ausente' ? C.redBg : epi.status === 'incorreto' ? C.orangeLight : C.greenBg;
        const label = epi.status === 'ausente' ? 'AUSENTE' : epi.status === 'incorreto' ? 'INCORRETO' : 'CORRETO';

        doc.roundedRect(MARGIN, ey, CONTENT_W, 34, 6).fillAndStroke(bg, C.gray200);
        doc.rect(MARGIN, ey + 6, 4, 22).fill(cor);

        doc.roundedRect(MARGIN + 14, ey + 7, 60, 20, 4).fill(cor);
        doc.fontSize(7).font('Helvetica-Bold').fillColor(C.white).text(label, MARGIN + 14, ey + 13, { width: 60, align: 'center' });

        doc.fontSize(10).font('Helvetica-Bold').fillColor(C.navy).text(epi.epiNome, MARGIN + 82, ey + 8, { width: 280 });
        doc.fontSize(7).font('Helvetica').fillColor(C.gray500).text(`${(epi.confianca * 100).toFixed(0)}%`, MARGIN + CONTENT_W - 50, ey + 10, { width: 40, align: 'right' });

        if (epi.descricao) {
          doc.fontSize(7).fillColor(C.gray500).text(epi.descricao, MARGIN + 82, ey + 22, { width: CONTENT_W - 140 });
        }

        ey += 40;
      }

      footer(doc, page.value);
    }

    // ═══════════════════════════════════════════════════
    // FOTOS ORIGINAIS
    // ═══════════════════════════════════════════════════
    const fotos = inspecao.midias.filter(m => m.tipo === 'foto');
    if (fotos.length > 0) {
      page.value++;
      doc.addPage({ margin: MARGIN });
      let fy = sectionTitle(doc, 'Evidências Fotográficas', 40);
      let col = 0;

      for (const foto of fotos) {
        const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
        if (!fs.existsSync(imgPath)) continue;

        try {
          const meta = await sharp(imgPath).metadata();
          const imgW = meta.width || 300;
          const imgH = meta.height || 200;
          const maxSize = 210;
          const scale = Math.min(maxSize / imgW, maxSize / imgH);
          const w = imgW * scale;
          const h = imgH * scale;

          fy = checkPage(doc, fy, h + 22, page);

          const x = col === 0 ? MARGIN : MARGIN + CONTENT_W / 2 + 8;

          doc.roundedRect(x - 2, fy - 2, w + 4, h + 4, 4).fill(C.gray200);
          doc.image(imgPath, x, fy, { width: w, height: h });
          doc.fontSize(7).font('Helvetica').fillColor(C.gray500).text(foto.nome, x, fy + h + 4, { width: w });

          col = col === 0 ? 1 : 0;
          if (col === 0) fy += h + 22;
        } catch {
          // skip
        }
      }

      footer(doc, page.value);
    }

    // ═══════════════════════════════════════════════════
    // ASSINATURA
    // ═══════════════════════════════════════════════════
    page.value++;
    doc.addPage({ margin: MARGIN });
    let sy = sectionTitle(doc, 'Conclusão', 40);

    // Card do técnico
    doc.roundedRect(MARGIN, sy, CONTENT_W, 80, 8).fillAndStroke(C.gray50, C.gray200);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.navy).text('Técnico Responsável', MARGIN + 16, sy + 10);
    doc.fontSize(9).font('Helvetica').fillColor(C.gray700);
    doc.text(`Nome: ${inspecao.usuario.nome}`, MARGIN + 16, sy + 28, { width: 220 });
    doc.text(`E-mail: ${inspecao.usuario.email}`, MARGIN + 16, sy + 42, { width: 220 });
    doc.text(`Data da Inspeção: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`, MARGIN + 260, sy + 28, { width: 200 });
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, MARGIN + 260, sy + 42, { width: 200 });
    sy += 94;

    // Observações
    if (inspecao.observacoes) {
      doc.roundedRect(MARGIN, sy, CONTENT_W, 50, 6).fillAndStroke(C.amberLight, C.amber);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.navy).text('Observações', MARGIN + 12, sy + 8);
      doc.fontSize(8).font('Helvetica').fillColor(C.gray700).text(inspecao.observacoes, MARGIN + 12, sy + 22, { width: CONTENT_W - 24, height: 22 });
      sy += 64;
    }

    // Linha de assinatura
    sy += 20;
    doc.moveTo(MARGIN, sy).lineTo(MARGIN + 220, sy).strokeColor(C.gray300).lineWidth(1).stroke();
    doc.fontSize(8).font('Helvetica').fillColor(C.gray500).text(inspecao.usuario.nome, MARGIN, sy + 6);
    doc.text(new Date().toLocaleDateString('pt-BR'), MARGIN, sy + 18);

    footer(doc, page.value);

    doc.end();
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

export default router;
