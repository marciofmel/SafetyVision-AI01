import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const uploadsDir = path.join(__dirname, '../../uploads');
const relatoriosDir = path.join(__dirname, '../../uploads/relatorios');

if (!fs.existsSync(relatoriosDir)) fs.mkdirSync(relatoriosDir, { recursive: true });

// ═══════════════════════════════════════════
// Gerar, salvar e retornar PDF
// ═══════════════════════════════════════════
router.get('/:inspecaoId/gerar', async (req: AuthRequest, res) => {
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

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const nota = inspecao.notaConformidade ?? 0;
    const totalRiscos = inspecao.riscos.length;
    const epiIrreg = inspecao.epiViolacoes.filter(e => e.status !== 'correto').length;
    const riscosPorGr: Record<string, number> = { critica: 0, alta: 0, media: 0, baixa: 0 };
    inspecao.riscos.forEach(r => { const k = r.gravidade.toLowerCase(); if (riscosPorGr[k] !== undefined) riscosPorGr[k]++; });

    let pageNum = 0;
    function footer() {
      rect(doc, 0, H - 28, W, 28, C.navy);
      txt(doc, 'SafetyVision AI', ML, H - 20, { size: 7, color: C.gray400, w: 200 });
      txt(doc, `Página ${pageNum}`, W - MR - 80, H - 20, { size: 7, color: C.amber, w: 80, align: 'right' });
    }

    // ════════════════════ CAPA ════════════════════
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

    // ════════════════════ RESUMO ════════════════════
    doc.addPage({ margin: 0 });
    pageNum++;
    rect(doc, 0, 0, W, H, C.white);
    let y = 40;
    rect(doc, ML - 4, y - 4, CW + 8, 28, C.navy, 4);
    txt(doc, 'RESUMO EXECUTIVO', ML, y, { size: 12, font: 'Helvetica-Bold', color: C.white });
    y += 32;

    const sumRows: [string, string][] = [
      ['Empresa', inspecao.empresa.nome],
      ['Setor', inspecao.setor.nome],
      ['Técnico', inspecao.usuario.nome],
      ['Data', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
      ['Riscos', String(totalRiscos)],
      ['Nota', `${nota}/100`],
    ];
    for (let i = 0; i < sumRows.length; i++) {
      const [k, v] = sumRows[i];
      rect(doc, ML, y, CW, 22, i % 2 === 0 ? C.gray50 : C.white);
      txt(doc, k, ML + 8, y + 6, { size: 9, color: C.gray500, w: 180 });
      txt(doc, v, ML + 200, y + 6, { size: 9, font: 'Helvetica-Bold', color: C.navy, w: CW - 210 });
      y += 22;
    }

    y += 16;
    rect(doc, ML - 4, y - 4, CW + 8, 28, C.navy, 4);
    txt(doc, 'MATRIZ DE RISCO', ML, y, { size: 11, font: 'Helvetica-Bold', color: C.white });
    y += 32;

    rect(doc, ML, y, CW, 22, C.navy);
    txt(doc, 'GRAVIDADE', ML + 10, y + 6, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 160 });
    txt(doc, 'QTD', ML + 180, y + 6, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 60 });
    txt(doc, 'PRAZO', ML + 250, y + 6, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 160 });
    y += 22;

    const gravData = [
      { label: 'Crítica', count: riscosPorGr.critica, prazo: '1 a 7 dias', color: C.red },
      { label: 'Alta', count: riscosPorGr.alta, prazo: 'Até 15 dias', color: C.orange },
      { label: 'Média', count: riscosPorGr.media, prazo: 'Até 30 dias', color: C.amber },
      { label: 'Baixa', count: riscosPorGr.baixa, prazo: 'Até 60 dias', color: C.green },
    ];
    for (let i = 0; i < gravData.length; i++) {
      const g = gravData[i];
      rect(doc, ML, y, CW, 22, i % 2 === 0 ? C.gray50 : C.white);
      rect(doc, ML + 8, y + 6, 10, 10, g.color, 5);
      txt(doc, g.label, ML + 26, y + 5, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: 140 });
      txt(doc, String(g.count), ML + 180, y + 5, { size: 9, font: 'Helvetica-Bold', color: g.count > 0 ? C.red : C.gray300, w: 60 });
      txt(doc, g.prazo, ML + 250, y + 5, { size: 9, color: C.gray600, w: 160 });
      y += 22;
    }
    footer();

    // ════════════════════ RISCOS ════════════════════
    if (totalRiscos > 0) {
      doc.addPage({ margin: 0 });
      pageNum++;
      rect(doc, 0, 0, W, H, C.white);
      let ry = 40;
      rect(doc, ML - 4, ry - 4, CW + 8, 28, C.navy, 4);
      txt(doc, 'RISCOS IDENTIFICADOS', ML, ry, { size: 12, font: 'Helvetica-Bold', color: C.white });
      ry += 32;

      const gravCor: Record<string, string> = { crítica: C.red, critica: C.red, alta: C.orange, média: C.amber, media: C.amber, baixa: C.green };

      for (let i = 0; i < inspecao.riscos.length; i++) {
        const risco = inspecao.riscos[i];
        const cor = gravCor[risco.gravidade] || C.amber;
        let cardH = 36;
        if (risco.localIdentificado) cardH += 14;
        if (risco.consequencias) cardH += 14;
        if (risco.medidasPreventivas) cardH += 14;
        if (risco.medidasCorretivas) cardH += 14;

        if (ry + cardH > H - 60) { footer(); doc.addPage({ margin: 0 }); pageNum++; rect(doc, 0, 0, W, H, C.white); ry = 40; }

        rect(doc, ML, ry, CW, cardH, C.white);
        rect(doc, ML, ry, 4, cardH, cor);
        rect(doc, ML + 12, ry + 8, 20, 20, cor, 10);
        txt(doc, String(i + 1), ML + 12, ry + 12, { size: 9, font: 'Helvetica-Bold', color: C.white, w: 20, align: 'center' });
        txt(doc, risco.descricao, ML + 40, ry + 8, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: CW - 52 });
        rect(doc, ML + 40, ry + 24, 60, 14, cor, 3);
        txt(doc, risco.gravidade.toUpperCase(), ML + 40, ry + 27, { size: 6, font: 'Helvetica-Bold', color: C.white, w: 60, align: 'center' });

        let dy = ry + 42;
        if (risco.localIdentificado) { txt(doc, `Local: ${risco.localIdentificado}`, ML + 44, dy, { size: 7, color: C.gray500, w: CW - 56 }); dy += 14; }
        if (risco.consequencias) { txt(doc, `Consequências: ${risco.consequencias}`, ML + 44, dy, { size: 7, color: C.red, w: CW - 56 }); dy += 14; }
        if (risco.medidasPreventivas) { txt(doc, `Prevenção: ${risco.medidasPreventivas}`, ML + 44, dy, { size: 7, color: C.green, w: CW - 56 }); dy += 14; }
        if (risco.medidasCorretivas) { txt(doc, `Correção: ${risco.medidasCorretivas}`, ML + 44, dy, { size: 7, color: C.orange, w: CW - 56 }); }

        ry += cardH + 8;
      }
      footer();
    }

    // ════════════════════ EPIs ════════════════════
    if (inspecao.epiViolacoes.length > 0) {
      doc.addPage({ margin: 0 });
      pageNum++;
      rect(doc, 0, 0, W, H, C.white);
      let ey = 40;
      rect(doc, ML - 4, ey - 4, CW + 8, 28, C.navy, 4);
      txt(doc, 'ANÁLISE DE EPIs', ML, ey, { size: 12, font: 'Helvetica-Bold', color: C.white });
      ey += 32;

      for (const epi of inspecao.epiViolacoes) {
        const cor = epi.status === 'ausente' ? C.red : epi.status === 'incorreto' ? C.orange : C.green;
        const bg = epi.status === 'ausente' ? C.redBg : epi.status === 'incorreto' ? C.orangeBg : C.greenBg;
        const label = epi.status === 'ausente' ? 'AUSENTE' : epi.status === 'incorreto' ? 'INCORRETO' : 'CORRETO';
        const cardH = 28;
        rect(doc, ML, ey, CW, cardH, bg);
        rect(doc, ML, ey, 4, cardH, cor);
        rect(doc, ML + 14, ey + 6, 60, 16, cor, 3);
        txt(doc, label, ML + 14, ey + 9, { size: 7, font: 'Helvetica-Bold', color: C.white, w: 60, align: 'center' });
        txt(doc, epi.epiNome, ML + 84, ey + 7, { size: 10, font: 'Helvetica-Bold', color: C.gray700, w: CW - 100 });
        txt(doc, `${(epi.confianca * 100).toFixed(0)}%`, ML + CW - 50, ey + 9, { size: 8, color: C.gray500, w: 40, align: 'right' });
        ey += cardH + 6;
      }
      footer();
    }

    // ════════════════════ FOTOS ════════════════════
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
          const iw = meta.width || 300, ih = meta.height || 200;
          const sc = Math.min(colW / iw, 200 / ih);
          const w = iw * sc, h = ih * sc;
          if (col === 0 && fy + h + 20 > H - 50) { footer(); doc.addPage({ margin: 0 }); pageNum++; rect(doc, 0, 0, W, H, C.white); fy = 40; }
          const fx = col === 0 ? ML : ML + colW + 12;
          rect(doc, fx - 2, fy - 2, w + 4, h + 4, C.gray200, 4);
          doc.save(); doc.image(imgPath, fx, fy, { width: w, height: h }); doc.restore();
          txt(doc, foto.nome, fx, fy + h + 4, { size: 7, color: C.gray500, w });
          rowMaxH = Math.max(rowMaxH, h + 18);
          col = col === 0 ? 1 : 0;
          if (col === 0) { fy += rowMaxH + 8; rowMaxH = 0; }
        } catch { /* skip */ }
      }
      footer();
    }

    // ════════════════════ CONCLUSÃO ════════════════════
    doc.addPage({ margin: 0 });
    pageNum++;
    rect(doc, 0, 0, W, H, C.white);
    let sy = 40;
    rect(doc, ML - 4, sy - 4, CW + 8, 28, C.navy, 4);
    txt(doc, 'CONCLUSÃO', ML, sy, { size: 12, font: 'Helvetica-Bold', color: C.white });
    sy += 36;
    rect(doc, ML, sy, CW, 72, C.gray50);
    txt(doc, 'Técnico Responsável', ML + 16, sy + 10, { size: 10, font: 'Helvetica-Bold', color: C.gray700, w: CW - 32 });
    txt(doc, `Nome: ${inspecao.usuario.nome}`, ML + 16, sy + 28, { size: 8, color: C.gray500, w: 220 });
    txt(doc, `E-mail: ${inspecao.usuario.email}`, ML + 16, sy + 42, { size: 8, color: C.gray500, w: 220 });
    txt(doc, `Data: ${new Date().toLocaleDateString('pt-BR')}`, ML + 260, sy + 28, { size: 8, color: C.gray500, w: 200 });
    sy += 84;
    rect(doc, ML, sy, 200, 1, C.gray300);
    txt(doc, inspecao.usuario.nome, ML, sy + 8, { size: 9, font: 'Helvetica-Bold', color: C.gray700, w: 200 });
    footer();

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Salvar PDF no disco
    const nomeArquivo = `relatorio-${inspecao.id.slice(0, 8)}-${Date.now()}.pdf`;
    const filePath = path.join(relatoriosDir, nomeArquivo);
    fs.writeFileSync(filePath, pdfBuffer);

    // Salvar registro no banco
    const relatorio = await prisma.relatorio.create({
      data: {
        inspecaoId: inspecao.id,
        userId: req.userId!,
        empresaId: inspecao.empresaId,
        filePath: `/uploads/relatorios/${nomeArquivo}`,
        nomeArquivo,
        tamanhoBytes: pdfBuffer.length,
        empresaNome: inspecao.empresa.nome,
        setorNome: inspecao.setor.nome,
        notaConformidade: nota,
        totalRiscos,
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${nomeArquivo}`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

// ═══════════════════════════════════════════
// Listar relatórios salvos
// ═══════════════════════════════════════════
router.get('/', async (req: AuthRequest, res) => {
  try {
    const relatorios = await prisma.relatorio.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { empresa: { select: { nome: true } } },
    });
    res.json(relatorios);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
// Baixar PDF salvo
// ═══════════════════════════════════════════
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const relatorio = await prisma.relatorio.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!relatorio) return res.status(404).json({ error: 'Relatório não encontrado' });

    const fullPath = path.join(__dirname, '..', relatorio.filePath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${relatorio.nomeArquivo}`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
// Excluir relatório
// ═══════════════════════════════════════════
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const relatorio = await prisma.relatorio.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!relatorio) return res.status(404).json({ error: 'Relatório não encontrado' });

    const fullPath = path.join(__dirname, '..', relatorio.filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await prisma.relatorio.delete({ where: { id: relatorio.id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
