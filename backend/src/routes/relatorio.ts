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

const W = 595.28;
const H = 841.89;
const ML = 50;
const MR = 50;
const CW = W - ML - MR;

const C = {
  navy: '#0F172A', amber: '#F59E0B', white: '#FFFFFF',
  gray50: '#F8FAFC', gray100: '#F1F5F9', gray200: '#E2E8F0', gray300: '#CBD5E1',
  gray400: '#94A3B8', gray500: '#64748B', gray600: '#475569', gray700: '#334155',
  red: '#DC2626', redBg: '#FEF2F2',
  orange: '#EA580C', orangeBg: '#FFF7ED',
  green: '#16A34A', greenBg: '#F0FDF4',
  blue: '#2563EB', blueBg: '#EFF6FF',
  amberBg: '#FFFBEB',
};

function rect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string, r?: number) {
  doc.save();
  if (r) doc.roundedRect(x, y, w, h, r).fill(color);
  else doc.rect(x, y, w, h).fill(color);
  doc.restore();
}

function txt(doc: PDFKit.PDFDocument, str: string, x: number, y: number, opts: {
  size?: number; font?: string; color?: string; w?: number; align?: string
} = {}) {
  doc.save();
  doc.fontSize(opts.size ?? 10).font(opts.font ?? 'Helvetica').fillColor(opts.color ?? C.gray700);
  doc.text(str, x, y, { width: opts.w ?? CW, align: (opts.align as any) ?? 'left', lineGap: 0 });
  doc.restore();
}

router.get('/:inspecaoId/relatorio', async (req: AuthRequest, res) => {
  try {
    const inspecaoId = String(req.params.inspecaoId);
    const inspecao = await prisma.inspecao.findFirst({
      where: { id: inspecaoId, usuarioId: req.userId! },
      include: {
        empresa: true, setor: true,
        usuario: { select: { nome: true, email: true } },
        riscos: true, epiViolacoes: true, midias: true,
      },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${inspecao.id.slice(0, 8)}.pdf`);
    doc.pipe(res);

    const nota = inspecao.notaConformidade ?? 0;
    const totalRiscos = inspecao.riscos.length;
    const epiIrreg = inspecao.epiViolacoes.filter(e => e.status !== 'correto').length;
    const riscosPorGrav: Record<string, number> = { critica: 0, alta: 0, media: 0, baixa: 0 };
    inspecao.riscos.forEach(r => { const k = r.gravidade.toLowerCase(); if (riscosPorGrav[k] !== undefined) riscosPorGrav[k]++; });

    function footer() {
      rect(doc, 0, H - 28, W, 28, C.navy);
      txt(doc, 'SafetyVision AI', ML, H - 20, { size: 7, color: C.gray400, w: 200 });
    }

    let pageNum = 0;

    // ════════════════════════════════════════
    // CAPA
    // ════════════════════════════════════════
    doc.addPage({ margin: 0 });
    pageNum++;
    rect(doc, 0, 0, W, H, C.navy);
    rect(doc, 0, 0, W, 6, C.amber);

    const logoX = (W - 80) / 2;
    rect(doc, logoX, 80, 80, 80, C.amber, 14);
    rect(doc, logoX + 4, 84, 72, 72, C.navy, 10);
    txt(doc, 'SV', 0, 103, { size: 32, font: 'Helvetica-Bold', color: C.amber, w: W, align: 'center' });

    txt(doc, 'SAFETYVISION AI', 0, 195, { size: 26, font: 'Helvetica-Bold', color: C.white, w: W, align: 'center' });
    txt(doc, 'Relatório de Inspeção de Segurança do Trabalho', 0, 232, { size: 11, color: C.gray400, w: W, align: 'center' });

    rect(doc, 210, 262, 175, 2, C.amber);

    const coverRows: [string, string][] = [
      ['EMPRESA', inspecao.empresa.nome],
      ['CNPJ', inspecao.empresa.cnpj || '—'],
      ['SETOR', inspecao.setor.nome],
      ['TÉCNICO', inspecao.usuario.nome],
      ['DATA', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
    ];
    let cy = 285;
    for (const [label, val] of coverRows) {
      txt(doc, label, 0, cy, { size: 7, color: C.gray400, w: W, align: 'center' });
      cy += 12;
      txt(doc, val, 0, cy, { size: 11, font: 'Helvetica-Bold', color: C.white, w: W, align: 'center' });
      cy += 22;
    }

    const corNota = nota >= 70 ? C.green : nota >= 40 ? C.amber : C.red;
    rect(doc, (W - 76) / 2, 480, 76, 76, corNota, 38);
    txt(doc, `${nota}`, 0, 493, { size: 30, font: 'Helvetica-Bold', color: C.white, w: W, align: 'center' });
    txt(doc, '/100', 0, 530, { size: 8, color: C.white, w: W, align: 'center' });
    txt(doc, 'NOTA DE CONFORMIDADE', 0, 565, { size: 8, color: C.gray400, w: W, align: 'center' });

    const stats = [
      { v: `${totalRiscos}`, l: 'Riscos', c: C.red },
      { v: `${epiIrreg}`, l: 'EPIs Irregulares', c: C.amber },
      { v: `${inspecao.midias.length}`, l: 'Fotos', c: C.blue },
    ];
    stats.forEach((s, i) => {
      const sx = 75 + i * 155;
      rect(doc, sx, 610, 120, 48, '#1E293B', 8);
      txt(doc, s.v, sx, 618, { size: 20, font: 'Helvetica-Bold', color: s.c, w: 120, align: 'center' });
      txt(doc, s.l, sx, 640, { size: 7, color: C.gray400, w: 120, align: 'center' });
    });

    footer();

    // ════════════════════════════════════════
    // RESUMO EXECUTIVO
    // ════════════════════════════════════════
    doc.addPage({ margin: 0 });
    pageNum++;
    rect(doc, 0, 0, W, H, C.white);

    let y = 40;
    rect(doc, ML - 4, y - 4, CW + 8, 28, C.navy, 4);
    txt(doc, 'RESUMO EXECUTIVO', ML, y, { size: 12, font: 'Helvetica-Bold', color: C.white });
    y += 32;

    const sumRows: [string, string][] = [
      ['Empresa', inspecao.empresa.nome],
      ['CNPJ', inspecao.empresa.cnpj || '—'],
      ['Setor', inspecao.setor.nome],
      ['Técnico', inspecao.usuario.nome],
      ['Data da Inspeção', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
      ['Status', inspecao.status === 'concluida' ? 'Concluída' : 'Em Andamento'],
      ['Riscos Identificados', String(totalRiscos)],
      ['Nota de Conformidade', `${nota}/100`],
    ];

    for (let i = 0; i < sumRows.length; i++) {
      const [k, v] = sumRows[i];
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      rect(doc, ML, y, CW, 22, bg);
      txt(doc, k, ML + 8, y + 6, { size: 9, color: C.gray500, w: 180 });
      txt(doc, v, ML + 200, y + 6, { size: 9, font: 'Helvetica-Bold', color: C.navy, w: CW - 210 });
      y += 22;
    }

    y += 20;
    rect(doc, ML - 4, y - 4, CW + 8, 28, C.navy, 4);
    txt(doc, 'MATRIZ DE RISCO', ML, y, { size: 11, font: 'Helvetica-Bold', color: C.white });
    y += 32;

    rect(doc, ML, y, CW, 22, C.navy);
    txt(doc, 'GRAVIDADE', ML + 10, y + 6, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 160 });
    txt(doc, 'QUANTIDADE', ML + 180, y + 6, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 100 });
    txt(doc, 'PRAZO DE CORREÇÃO', ML + 290, y + 6, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 160 });
    y += 22;

    const gravData: Array<{ label: string; count: number; prazo: string; color: string }> = [
      { label: 'Crítica', count: riscosPorGrav.critica, prazo: '1 a 7 dias', color: C.red },
      { label: 'Alta', count: riscosPorGrav.alta, prazo: 'Até 15 dias', color: C.orange },
      { label: 'Média', count: riscosPorGrav.media, prazo: 'Até 30 dias', color: C.amber },
      { label: 'Baixa', count: riscosPorGrav.baixa, prazo: 'Até 60 dias', color: C.green },
    ];

    for (let i = 0; i < gravData.length; i++) {
      const g = gravData[i];
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      rect(doc, ML, y, CW, 22, bg);
      rect(doc, ML + 8, y + 6, 10, 10, g.color, 5);
      txt(doc, g.label, ML + 26, y + 5, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: 140 });
      txt(doc, String(g.count), ML + 180, y + 5, { size: 9, font: 'Helvetica-Bold', color: g.count > 0 ? C.red : C.gray300, w: 100 });
      txt(doc, g.prazo, ML + 290, y + 5, { size: 9, color: C.gray600, w: 160 });
      y += 22;
    }

    if (inspecao.observacoes) {
      y += 16;
      rect(doc, ML, y, CW, 48, C.amberBg);
      rect(doc, ML, y, 4, 48, C.amber);
      txt(doc, 'Observações do Técnico', ML + 14, y + 6, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: CW - 24 });
      txt(doc, inspecao.observacoes, ML + 14, y + 22, { size: 8, color: C.gray500, w: CW - 28 });
      y += 56;
    }

    footer();

    // ════════════════════════════════════════
    // IMAGENS ANOTADAS
    // ════════════════════════════════════════
    const imgsAnotadas = inspecao.midias
      .filter(m => m.tipo === 'foto')
      .map(m => {
        const fn = path.basename(m.url);
        return { midia: m, path: path.join(anotadasDir, `anotada_${fn}.png`) };
      })
      .filter(img => fs.existsSync(img.path));

    for (const img of imgsAnotadas) {
      doc.addPage({ margin: 0 });
      pageNum++;
      rect(doc, 0, 0, W, H, C.white);

      let iy = 40;
      rect(doc, ML - 4, iy - 4, CW + 8, 28, C.navy, 4);
      txt(doc, 'ANÁLISE VISUAL', ML, iy, { size: 12, font: 'Helvetica-Bold', color: C.white });
      iy += 32;

      txt(doc, img.midia.nome, ML, iy, { size: 8, color: C.gray500, w: CW });
      iy += 14;

      try {
        const meta = await sharp(img.path).metadata();
        const iw = meta.width || 500;
        const ih = meta.height || 400;
        const maxW = CW;
        const maxH = H - iy - 60;
        const sc = Math.min(maxW / iw, maxH / ih, 1);
        const w = iw * sc;
        const h = ih * sc;
        const ix = ML + (maxW - w) / 2;

        rect(doc, ix - 2, iy - 2, w + 4, h + 4, C.gray200, 4);
        doc.save();
        doc.image(img.path, ix, iy, { width: w, height: h });
        doc.restore();
        iy += h + 8;

        const riscosImg = inspecao.riscos.filter(r => r.imagemUrl === img.midia.url);
        if (riscosImg.length > 0) {
          const boxH = 14 + Math.min(riscosImg.length, 4) * 12;
          rect(doc, ML, iy, CW, boxH, C.redBg);
          rect(doc, ML, iy, 4, boxH, C.red);
          txt(doc, `${riscosImg.length} risco(s) identificado(s):`, ML + 12, iy + 6, { size: 8, font: 'Helvetica-Bold', color: C.red, w: CW - 20 });
          let ry = iy + 18;
          for (const r of riscosImg.slice(0, 4)) {
            txt(doc, `• ${r.descricao} — ${r.gravidade.toUpperCase()}`, ML + 18, ry, { size: 7, color: C.gray600, w: CW - 30 });
            ry += 12;
          }
          iy += boxH + 4;
        }
      } catch {
        txt(doc, 'Imagem não disponível', ML, iy + 10, { size: 10, color: C.gray300 });
      }

      footer();
    }

    // ════════════════════════════════════════
    // RISCOS DETALHADOS
    // ════════════════════════════════════════
    if (totalRiscos > 0) {
      doc.addPage({ margin: 0 });
      pageNum++;
      rect(doc, 0, 0, W, H, C.white);

      let ry = 40;
      rect(doc, ML - 4, ry - 4, CW + 8, 28, C.navy, 4);
      txt(doc, 'RISCOS IDENTIFICADOS', ML, ry, { size: 12, font: 'Helvetica-Bold', color: C.white });
      ry += 32;

      const gravCor: Record<string, string> = {
        crítica: C.red, critica: C.red, alta: C.orange,
        média: C.amber, media: C.amber, baixa: C.green,
      };

      for (let i = 0; i < inspecao.riscos.length; i++) {
        const risco = inspecao.riscos[i];
        const cor = gravCor[risco.gravidade] || C.amber;

        let cardH = 36;
        if (risco.localIdentificado) cardH += 14;
        if (risco.categoria) cardH += 14;
        if (risco.consequencias) cardH += 14;
        if (risco.medidasPreventivas) cardH += 14;
        if (risco.medidasCorretivas) cardH += 14;

        if (ry + cardH > H - 60) {
          footer();
          doc.addPage({ margin: 0 });
          pageNum++;
          rect(doc, 0, 0, W, H, C.white);
          ry = 40;
        }

        rect(doc, ML, ry, CW, cardH, C.white);
        rect(doc, ML, ry, 4, cardH, cor);

        rect(doc, ML + 12, ry + 8, 20, 20, cor, 10);
        txt(doc, String(i + 1), ML + 12, ry + 12, { size: 9, font: 'Helvetica-Bold', color: C.white, w: 20, align: 'center' });

        txt(doc, risco.descricao, ML + 40, ry + 8, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: CW - 52 });

        rect(doc, ML + 40, ry + 24, 60, 14, cor, 3);
        txt(doc, risco.gravidade.toUpperCase(), ML + 40, ry + 27, { size: 6, font: 'Helvetica-Bold', color: C.white, w: 60, align: 'center' });

        let bx = ML + 108;
        if (risco.nrsRelacionadas) {
          rect(doc, bx, ry + 24, 45, 14, C.blueBg, 3);
          txt(doc, risco.nrsRelacionadas, bx, ry + 27, { size: 6, font: 'Helvetica-Bold', color: C.blue, w: 45, align: 'center' });
          bx += 53;
        }

        rect(doc, bx, ry + 24, 50, 14, C.gray100, 3);
        txt(doc, `${(risco.confianca * 100).toFixed(0)}%`, bx, ry + 27, { size: 6, color: C.gray500, w: 50, align: 'center' });

        let dy = ry + 42;
        if (risco.localIdentificado) {
          txt(doc, `Local: ${risco.localIdentificado}`, ML + 44, dy, { size: 7, color: C.gray500, w: CW - 56 });
          dy += 14;
        }
        if (risco.categoria) {
          txt(doc, `Categoria: ${risco.categoria}`, ML + 44, dy, { size: 7, color: C.gray500, w: CW - 56 });
          dy += 14;
        }
        if (risco.consequencias) {
          txt(doc, `Consequências: ${risco.consequencias}`, ML + 44, dy, { size: 7, color: C.red, w: CW - 56 });
          dy += 14;
        }
        if (risco.medidasPreventivas) {
          txt(doc, `Prevenção: ${risco.medidasPreventivas}`, ML + 44, dy, { size: 7, color: C.green, w: CW - 56 });
          dy += 14;
        }
        if (risco.medidasCorretivas) {
          txt(doc, `Correção: ${risco.medidasCorretivas}`, ML + 44, dy, { size: 7, color: C.orange, w: CW - 56 });
        }

        ry += cardH + 8;
      }

      footer();
    }

    // ════════════════════════════════════════
    // EPIs
    // ════════════════════════════════════════
    if (inspecao.epiViolacoes.length > 0) {
      doc.addPage({ margin: 0 });
      pageNum++;
      rect(doc, 0, 0, W, H, C.white);

      let ey = 40;
      rect(doc, ML - 4, ey - 4, CW + 8, 28, C.navy, 4);
      txt(doc, 'ANÁLISE DE EPIs', ML, ey, { size: 12, font: 'Helvetica-Bold', color: C.white });
      ey += 32;

      for (let i = 0; i < inspecao.epiViolacoes.length; i++) {
        const epi = inspecao.epiViolacoes[i];
        const cor = epi.status === 'ausente' ? C.red : epi.status === 'incorreto' ? C.orange : C.green;
        const bg = epi.status === 'ausente' ? C.redBg : epi.status === 'incorreto' ? C.orangeBg : C.greenBg;
        const label = epi.status === 'ausente' ? 'AUSENTE' : epi.status === 'incorreto' ? 'INCORRETO' : 'CORRETO';

        const cardH = epi.descricao ? 40 : 28;
        rect(doc, ML, ey, CW, cardH, bg);
        rect(doc, ML, ey, 4, cardH, cor);

        rect(doc, ML + 14, ey + 6, 60, 16, cor, 3);
        txt(doc, label, ML + 14, ey + 9, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 60, align: 'center' });

        txt(doc, epi.epiNome, ML + 84, ey + 7, { size: 10, font: 'Helvetica-Bold', color: C.gray700, w: CW - 160 });
        txt(doc, `${(epi.confianca * 100).toFixed(0)}%`, ML + CW - 50, ey + 9, { size: 8, color: C.gray500, w: 40, align: 'right' });

        if (epi.descricao) {
          txt(doc, epi.descricao, ML + 84, ey + 22, { size: 7, color: C.gray500, w: CW - 100 });
        }

        ey += cardH + 6;
      }

      footer();
    }

    // ════════════════════════════════════════
    // CHECKLIST
    // ════════════════════════════════════════
    const clRespostas = await (prisma as any).checklistResposta.findMany({
      where: { inspecaoId: inspecao.id },
      include: { item: true },
    });

    if (clRespostas.length > 0) {
      doc.addPage({ margin: 0 });
      pageNum++;
      rect(doc, 0, 0, W, H, C.white);

      let cly = 40;
      rect(doc, ML - 4, cly - 4, CW + 8, 28, C.navy, 4);
      txt(doc, 'CHECKLIST DE CONFORMIDADE', ML, cly, { size: 12, font: 'Helvetica-Bold', color: C.white });
      cly += 32;

      rect(doc, ML, cly, CW, 20, C.navy);
      txt(doc, 'ITEM', ML + 10, cly + 5, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 240 });
      txt(doc, 'STATUS', ML + 260, cly + 5, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 100 });
      txt(doc, 'OBSERVAÇÃO', ML + 370, cly + 5, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 140 });
      cly += 20;

      for (let i = 0; i < clRespostas.length; i++) {
        const cr = clRespostas[i];
        const bg = i % 2 === 0 ? C.gray50 : C.white;
        const sCor = cr.resposta === 'conforme' ? C.green : cr.resposta === 'nao_conforme' ? C.red : C.amber;
        const sLabel = cr.resposta === 'conforme' ? 'Conforme' : cr.resposta === 'nao_conforme' ? 'Não Conforme' : 'N/A';

        rect(doc, ML, cly, CW, 18, bg);
        rect(doc, ML, cly, 3, 18, sCor);
        txt(doc, cr.item?.texto || cr.itemId, ML + 10, cly + 4, { size: 7, color: C.gray700, w: 240 });
        rect(doc, ML + 260, cly + 3, 70, 12, sCor, 3);
        txt(doc, sLabel, ML + 260, cly + 4, { size: 6, font: 'Helvetica-Bold', color: C.white, w: 70, align: 'center' });
        txt(doc, cr.observacao || '—', ML + 370, cly + 4, { size: 7, color: C.gray500, w: 140 });
        cly += 18;
      }

      footer();
    }

    // ════════════════════════════════════════
    // FOTOS ORIGINAIS
    // ════════════════════════════════════════
    const fotos = inspecao.midias.filter(m => m.tipo === 'foto');
    if (fotos.length > 0) {
      doc.addPage({ margin: 0 });
      pageNum++;
      rect(doc, 0, 0, W, H, C.white);

      let fy = 40;
      rect(doc, ML - 4, fy - 4, CW + 8, 28, C.navy, 4);
      txt(doc, 'EVIDÊNCIAS FOTOGRÁFICAS', ML, fy, { size: 12, font: 'Helvetica-Bold', color: C.white });
      fy += 32;

      let col = 0;
      const colW = (CW - 12) / 2;
      let rowMaxH = 0;

      for (const foto of fotos) {
        const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
        if (!fs.existsSync(imgPath)) continue;

        try {
          const meta = await sharp(imgPath).metadata();
          const iw = meta.width || 300;
          const ih = meta.height || 200;
          const sc = Math.min(colW / iw, 200 / ih);
          const w = iw * sc;
          const h = ih * sc;

          if (col === 0 && fy + h + 20 > H - 50) {
            footer();
            doc.addPage({ margin: 0 });
            pageNum++;
            rect(doc, 0, 0, W, H, C.white);
            fy = 40;
          }

          const fx = col === 0 ? ML : ML + colW + 12;

          rect(doc, fx - 2, fy - 2, w + 4, h + 4, C.gray200, 4);
          doc.save();
          doc.image(imgPath, fx, fy, { width: w, height: h });
          doc.restore();
          txt(doc, foto.nome, fx, fy + h + 4, { size: 7, color: C.gray500, w });

          rowMaxH = Math.max(rowMaxH, h + 18);
          col = col === 0 ? 1 : 0;
          if (col === 0) { fy += rowMaxH + 8; rowMaxH = 0; }
        } catch { /* skip */ }
      }
      if (col === 1) fy += rowMaxH + 8;

      footer();
    }

    // ════════════════════════════════════════
    // CONCLUSÃO
    // ════════════════════════════════════════
    doc.addPage({ margin: 0 });
    pageNum++;
    rect(doc, 0, 0, W, H, C.white);

    let sy = 40;
    rect(doc, ML - 4, sy - 4, CW + 8, 28, C.navy, 4);
    txt(doc, 'CONCLUSÃO', ML, sy, { size: 12, font: 'Helvetica-Bold', color: C.white });
    sy += 36;

    rect(doc, ML, sy, CW, 72, C.gray50);
    rect(doc, ML, sy, CW, 1, C.gray200);
    txt(doc, 'Técnico Responsável', ML + 16, sy + 10, { size: 10, font: 'Helvetica-Bold', color: C.gray700, w: CW - 32 });
    txt(doc, `Nome: ${inspecao.usuario.nome}`, ML + 16, sy + 28, { size: 8, color: C.gray500, w: 220 });
    txt(doc, `E-mail: ${inspecao.usuario.email}`, ML + 16, sy + 42, { size: 8, color: C.gray500, w: 220 });
    txt(doc, `Data da Inspeção: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`, ML + 260, sy + 28, { size: 8, color: C.gray500, w: 200 });
    txt(doc, `Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, ML + 260, sy + 42, { size: 8, color: C.gray500, w: 200 });
    sy += 80;

    if (inspecao.observacoes) {
      rect(doc, ML, sy, CW, 48, C.amberBg);
      rect(doc, ML, sy, 4, 48, C.amber);
      txt(doc, 'Observações', ML + 14, sy + 6, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: CW - 24 });
      txt(doc, inspecao.observacoes, ML + 14, sy + 22, { size: 8, color: C.gray500, w: CW - 28 });
      sy += 56;
    }

    sy += 40;
    rect(doc, ML, sy, 200, 1, C.gray300);
    txt(doc, inspecao.usuario.nome, ML, sy + 8, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: 200 });
    txt(doc, new Date().toLocaleDateString('pt-BR'), ML, sy + 22, { size: 8, color: C.gray500, w: 200 });

    footer();

    doc.end();
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

export default router;
