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

const COLORS = {
  navy: '#0F172A',
  navyLight: '#1E293B',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  white: '#FFFFFF',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  red: '#DC2626',
  redLight: '#FEE2E2',
  orange: '#EA580C',
  orangeLight: '#FFF7ED',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
};

function addFooter(doc: PDFKit.PDFDocument, pageNum: number, totalEstimate: number) {
  const h = 30;
  doc.rect(0, 842 - h, 595, h).fill(COLORS.navy);
  doc.fontSize(8).font('Helvetica').fillColor(COLORS.gray400)
    .text('SafetyVision AI — Relatório de Inspeção de Segurança', 50, 842 - h + 10, { width: 300 });
  doc.fillColor(COLORS.amber)
    .text(`Página ${pageNum}`, 50, 842 - h + 10, { align: 'right', width: 495 });
}

function wrapText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, opts: { width: number; fontSize?: number; color?: string; bold?: boolean; font?: string }): number {
  const fontSize = opts.fontSize || 10;
  const color = opts.color || COLORS.gray700;
  const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
  doc.fontSize(fontSize).font(font).fillColor(color);
  const lines = doc.heightOfString(text, { width: opts.width }) / (fontSize * 1.3);
  doc.text(text, x, y, { width: opts.width, lineGap: 2 });
  return y + Math.ceil(lines * (fontSize * 1.3)) + 4;
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
    let pageNum = 0;

    // =================== CAPA ===================
    pageNum++;
    doc.addPage({ margin: 0 });
    // Fundo gradiente (simulado com retângulos)
    doc.rect(0, 0, 595, 842).fill(COLORS.navy);
    doc.rect(0, 0, 595, 420).fill(COLORS.navyLight);

    // Barra decorativa superior
    doc.rect(0, 0, 595, 6).fill(COLORS.amber);

    // Logo / Ícone
    doc.roundedRect(247, 80, 100, 100, 20).fill('#1a2744');
    doc.roundedRect(252, 85, 90, 90, 16).fill(COLORS.amber);
    doc.fontSize(40).font('Helvetica-Bold').fillColor(COLORS.navy).text('SV', 252, 108, { width: 90, align: 'center' });

    // Título
    doc.fontSize(32).font('Helvetica-Bold').fillColor(COLORS.white).text('SAFETYVISION AI', 0, 210, { align: 'center' });
    doc.fontSize(14).font('Helvetica').fillColor(COLORS.gray400).text('Relatório de Inspeção de Segurança do Trabalho', 0, 250, { align: 'center' });

    // Linha decorativa
    doc.moveTo(200, 285).lineTo(395, 285).strokeColor(COLORS.amber).lineWidth(2).stroke();

    // Dados da capa
    const capaY = 310;
    const capaItems = [
      { label: 'Empresa', value: inspecao.empresa.nome },
      { label: 'CNPJ', value: inspecao.empresa.cnpj || '---' },
      { label: 'Setor', value: inspecao.setor.nome },
      { label: 'Técnico', value: inspecao.usuario.nome },
      { label: 'Data', value: new Date(inspecao.dataInicio).toLocaleDateString('pt-BR') },
    ];
    let cy = capaY;
    for (const item of capaItems) {
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.gray400).text(item.label.toUpperCase(), 0, cy, { align: 'center', width: 595 });
      cy += 13;
      doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.white).text(item.value, 0, cy, { align: 'center', width: 595 });
      cy += 22;
    }

    // Nota grande circular
    const corNota = nota >= 70 ? COLORS.green : nota >= 40 ? COLORS.amber : COLORS.red;
    doc.circle(297, 540, 55).fill(corNota);
    doc.fontSize(36).font('Helvetica-Bold').fillColor(COLORS.white).text(`${nota}`, 260, 522, { align: 'center', width: 75 });
    doc.fontSize(10).fillColor(COLORS.white).text('/100', 260, 558, { align: 'center', width: 75 });
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.gray400).text('NOTA DE CONFORMIDADE', 0, 600, { align: 'center', width: 595 });

    // Estatísticas na capa
    const statsY = 640;
    const stats = [
      { value: `${totalRiscos}`, label: 'Riscos', color: COLORS.red },
      { value: `${epiAusentes}`, label: 'EPIs Ausentes', color: COLORS.amber },
      { value: `${inspecao.midias.length}`, label: 'Fotos', color: COLORS.blue },
    ];
    stats.forEach((s, i) => {
      const sx = 120 + i * 150;
      doc.roundedRect(sx, statsY, 100, 50, 8).fill('#1a2744');
      doc.fontSize(18).font('Helvetica-Bold').fillColor(s.color).text(s.value, sx, statsY + 8, { width: 100, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.gray400).text(s.label, sx, statsY + 30, { width: 100, align: 'center' });
    });

    // Rodapé capa
    doc.fontSize(7).fillColor(COLORS.gray600).text(
      `Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')} • SafetyVision AI`,
      0, 800, { align: 'center', width: 595 }
    );

    // =================== RESUMO EXECUTIVO ===================
    pageNum++;
    doc.addPage({ margin: 50 });
    doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.navy).text('Resumo Executivo', 50, 40);
    doc.moveTo(50, 64).lineTo(545, 64).strokeColor(COLORS.amber).lineWidth(2).stroke();

    let ry = 80;

    // Tabela de dados
    const tableData: [string, string][] = [
      ['Empresa', inspecao.empresa.nome],
      ['Setor', inspecao.setor.nome],
      ['Técnico Responsável', inspecao.usuario.nome],
      ['Data da Inspeção', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
      ['Riscos Identificados', String(totalRiscos)],
      ['EPIs em Desacordo', String(inspecao.epiViolacoes.filter(e => e.status !== 'correto').length)],
      ['Nota de Conformidade', `${nota}/100`],
      ['Status', inspecao.status === 'concluida' ? 'Concluída' : 'Em Andamento'],
    ];

    for (let i = 0; i < tableData.length; i++) {
      const [k, v] = tableData[i];
      const bgColor = i % 2 === 0 ? COLORS.gray100 : COLORS.white;
      doc.rect(50, ry, 495, 22).fill(bgColor);
      doc.fontSize(10).font('Helvetica').fillColor(COLORS.gray500).text(k, 60, ry + 6, { width: 200 });
      doc.font('Helvetica-Bold').fillColor(COLORS.navy).text(v, 280, ry + 6, { width: 250 });
      ry += 22;
    }

    // Matriz de risco
    ry += 15;
    if (ry > 600) { doc.addPage(); ry = 50; pageNum++; }

    doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.navy).text('Matriz de Risco', 50, ry);
    ry += 20;

    const gravidades: Array<{ key: string; label: string; color: string }> = [
      { key: 'critica', label: 'Crítica', color: COLORS.red },
      { key: 'alta', label: 'Alta', color: COLORS.orange },
      { key: 'media', label: 'Média', color: COLORS.amber },
      { key: 'baixa', label: 'Baixa', color: COLORS.green },
    ];

    // Cabeçalho
    doc.rect(50, ry, 160, 24).fill(COLORS.navy);
    doc.rect(210, ry, 160, 24).fill(COLORS.navy);
    doc.rect(370, ry, 175, 24).fill(COLORS.navy);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.white);
    doc.text('GRAVIDADE', 60, ry + 7, { width: 140 });
    doc.text('QUANTIDADE', 220, ry + 7, { width: 140 });
    doc.text('PRAZO', 380, ry + 7, { width: 155 });
    ry += 24;

    const prazos: Record<string, string> = { critica: '1 a 7 dias', alta: '15 dias', media: '30 dias', baixa: '60 dias' };

    gravidades.forEach((g, idx) => {
      const count = inspecao.riscos.filter(r => r.gravidade.toLowerCase() === g.key).length;
      const bg = idx % 2 === 0 ? COLORS.gray100 : COLORS.white;
      doc.rect(50, ry, 160, 22).fill(bg);
      doc.rect(210, ry, 160, 22).fill(bg);
      doc.rect(370, ry, 175, 22).fill(bg);
      doc.circle(70, ry + 11, 6).fill(g.color);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.navy).text(g.label, 82, ry + 5, { width: 110 });
      doc.font('Helvetica').fillColor(count > 0 ? COLORS.red : COLORS.gray500).text(`${count} risco(s)`, 220, ry + 5, { width: 140 });
      doc.fillColor(COLORS.gray600).text(prazos[g.key], 380, ry + 5, { width: 155 });
      ry += 22;
    });

    // Observações do técnico
    if (inspecao.observacoes) {
      ry += 15;
      if (ry > 680) { doc.addPage(); ry = 50; pageNum++; }
      doc.roundedRect(50, ry, 495, 60, 8).fill(COLORS.amberLight);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.navy).text('Observações do Técnico', 60, ry + 8);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.gray700).text(inspecao.observacoes, 60, ry + 22, { width: 475, height: 35 });
    }

    addFooter(doc, pageNum, 0);

    // =================== IMAGENS ANOTADAS ===================
    const imagensAnotadas = inspecao.midias
      .filter(m => m.tipo === 'foto')
      .map(m => {
        const filename = path.basename(m.url);
        const anotadaPath = path.join(anotadasDir, `anotada_${filename}.png`);
        return { midia: m, anotadaPath };
      })
      .filter(img => fs.existsSync(img.anotadaPath));

    for (const img of imagensAnotadas) {
      pageNum++;
      doc.addPage({ margin: 50 });

      doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.navy).text('Análise Visual', 50, 40);
      doc.moveTo(50, 62).lineTo(545, 62).strokeColor(COLORS.amber).lineWidth(2).stroke();
      doc.fontSize(10).font('Helvetica').fillColor(COLORS.gray500).text(`Imagem: ${img.midia.nome}`, 50, 72);

      try {
        const imgMeta = await sharp(img.anotadaPath).metadata();
        const imgW = imgMeta.width || 500;
        const imgH = imgMeta.height || 400;
        const maxWidth = 495;
        const maxHeight = 620;
        const scale = Math.min(maxWidth / imgW, maxHeight / imgH);
        const finalW = imgW * scale;
        const finalH = imgH * scale;
        const x = 50 + (maxWidth - finalW) / 2;

        doc.roundedRect(x - 2, 93, finalW + 4, finalH + 4, 4).fill(COLORS.gray200);
        doc.image(img.anotadaPath, x, 95, { width: finalW, height: finalH });

        const riscosNaImagem = inspecao.riscos.filter(r => r.imagemUrl === img.midia.url);
        if (riscosNaImagem.length > 0) {
          let y = 95 + finalH + 12;
          doc.roundedRect(50, y, 495, 18 + riscosNaImagem.slice(0, 5).length * 14, 6).fill(COLORS.redLight);
          y += 8;
          doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.red).text(`⚠ ${riscosNaImagem.length} risco(s) identificado(s):`, 60, y);
          y += 16;
          for (const risco of riscosNaImagem.slice(0, 5)) {
            doc.fontSize(8).font('Helvetica').fillColor(COLORS.gray700).text(`• ${risco.descricao} (${risco.gravidade.toUpperCase()})`, 70, y, { width: 455 });
            y += 14;
          }
        }
      } catch {
        doc.fontSize(10).fillColor(COLORS.red).text('Erro ao carregar imagem', 50, 100);
      }

      addFooter(doc, pageNum, 0);
    }

    // =================== RISCOS DETALHADOS ===================
    if (totalRiscos > 0) {
      pageNum++;
      doc.addPage({ margin: 50 });
      doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.navy).text('Riscos Identificados', 50, 40);
      doc.moveTo(50, 62).lineTo(545, 62).strokeColor(COLORS.amber).lineWidth(2).stroke();

      let y = 80;
      const gravidadeCor: Record<string, string> = {
        crítica: COLORS.red, critica: COLORS.red, alta: COLORS.orange,
        média: COLORS.amber, media: COLORS.amber, baixa: COLORS.green,
      };

      for (let i = 0; i < inspecao.riscos.length; i++) {
        const risco = inspecao.riscos[i];
        const estimatedHeight = 105;

        if (y + estimatedHeight > 790) {
          addFooter(doc, pageNum, 0);
          doc.addPage({ margin: 50 });
          pageNum++;
          y = 50;
        }

        const cor = gravidadeCor[risco.gravidade] || COLORS.amber;

        // Card do risco
        doc.roundedRect(50, y, 495, estimatedHeight - 10, 8).fillAndStroke(COLORS.white, COLORS.gray200);

        // Número + badge
        doc.circle(72, y + 18, 14).fill(cor);
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.white).text(`${i + 1}`, 64, y + 14, { width: 16, align: 'center' });

        // Título
        doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.navy).text(risco.descricao, 95, y + 8, { width: 420 });

        // Badges
        const badgeY = y + 24;
        doc.roundedRect(95, badgeY, 60, 14, 3).fill(cor);
        doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.white).text(risco.gravidade.toUpperCase(), 95, badgeY + 3, { width: 60, align: 'center' });

        if (risco.nrsRelacionadas) {
          doc.roundedRect(160, badgeY, 50, 14, 3).fill(COLORS.blueLight);
          doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.blue).text(risco.nrsRelacionadas, 160, badgeY + 3, { width: 50, align: 'center' });
        }

        doc.roundedRect(215, badgeY, 70, 14, 3).fill(COLORS.gray100);
        doc.fontSize(7).font('Helvetica').fillColor(COLORS.gray600).text(`${(risco.confianca * 100).toFixed(0)}% confiança`, 215, badgeY + 3, { width: 70, align: 'center' });

        // Detalhes
        let dy = y + 46;
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.gray500);
        doc.text(`Categoria: ${risco.categoria}`, 95, dy, { width: 420 });
        dy += 12;
        doc.text(`Local: ${risco.localIdentificado || '---'}`, 95, dy, { width: 420 });
        dy += 12;
        if (risco.consequencias) {
          doc.text(`Consequências: ${risco.consequencias}`, 95, dy, { width: 420 });
          dy += 12;
        }
        if (risco.medidasPreventivas) {
          doc.fillColor(COLORS.green).text(`✓ Prevenção: ${risco.medidasPreventivas}`, 95, dy, { width: 420 });
          dy += 12;
        }
        if (risco.medidasCorretivas) {
          doc.fillColor(COLORS.orange).text(`⚡ Correção: ${risco.medidasCorretivas}`, 95, dy, { width: 420 });
        }

        y += estimatedHeight;
      }

      addFooter(doc, pageNum, 0);
    }

    // =================== EPIs ===================
    if (inspecao.epiViolacoes.length > 0) {
      pageNum++;
      doc.addPage({ margin: 50 });
      doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.navy).text('Análise de EPIs', 50, 40);
      doc.moveTo(50, 62).lineTo(545, 62).strokeColor(COLORS.amber).lineWidth(2).stroke();

      let y = 75;

      for (let i = 0; i < inspecao.epiViolacoes.length; i++) {
        const epi = inspecao.epiViolacoes[i];
        if (y + 42 > 790) {
          addFooter(doc, pageNum, 0);
          doc.addPage({ margin: 50 });
          pageNum++;
          y = 50;
        }

        const cor = epi.status === 'ausente' ? COLORS.red : epi.status === 'incorreto' ? COLORS.orange : COLORS.green;
        const bg = epi.status === 'ausente' ? COLORS.redLight : epi.status === 'incorreto' ? COLORS.orangeLight : COLORS.greenLight;
        const statusLabel = epi.status === 'ausente' ? '✗ AUSENTE' : epi.status === 'incorreto' ? '⚠ INCORRETO' : '✓ CORRETO';

        doc.roundedRect(50, y, 495, 36, 6).fillAndStroke(bg, COLORS.gray200);

        // Badge de status
        doc.roundedRect(60, y + 6, 70, 24, 4).fill(cor);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white).text(statusLabel, 60, y + 13, { width: 70, align: 'center' });

        // Nome do EPI
        doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.navy).text(epi.epiNome, 140, y + 8, { width: 250 });

        // Confiança
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.gray500).text(`Confiança: ${(epi.confianca * 100).toFixed(0)}%`, 400, y + 10, { width: 130 });

        // Descrição
        if (epi.descricao) {
          doc.fontSize(8).fillColor(COLORS.gray500).text(epi.descricao, 140, y + 22, { width: 390 });
        }

        y += 42;
      }

      addFooter(doc, pageNum, 0);
    }

    // =================== FOTOS ORIGINAIS ===================
    const fotos = inspecao.midias.filter(m => m.tipo === 'foto');
    if (fotos.length > 0) {
      pageNum++;
      doc.addPage({ margin: 50 });
      doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.navy).text('Evidências Fotográficas', 50, 40);
      doc.moveTo(50, 62).lineTo(545, 62).strokeColor(COLORS.amber).lineWidth(2).stroke();

      let y = 75;
      let col = 0;
      for (const foto of fotos) {
        const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
        if (!fs.existsSync(imgPath)) continue;

        try {
          const imgMeta = await sharp(imgPath).metadata();
          const imgW = imgMeta.width || 300;
          const imgH = imgMeta.height || 200;
          const maxSize = 220;
          const scale = Math.min(maxSize / imgW, maxSize / imgH);
          const finalW = imgW * scale;
          const finalH = imgH * scale;

          if (y + finalH + 20 > 790) {
            addFooter(doc, pageNum, 0);
            doc.addPage({ margin: 50 });
            pageNum++;
            y = 50;
            col = 0;
          }

          const x = col === 0 ? 50 : 320;

          // Frame da imagem
          doc.roundedRect(x - 2, y - 2, finalW + 4, finalH + 4, 4).fill(COLORS.gray200);
          doc.image(imgPath, x, y, { width: finalW, height: finalH });

          // Nome
          doc.fontSize(7).font('Helvetica').fillColor(COLORS.gray500).text(foto.nome, x, y + finalH + 4, { width: finalW });

          col = col === 0 ? 1 : 0;
          if (col === 0) y += finalH + 20;
        } catch {
          // skip broken images
        }
      }

      addFooter(doc, pageNum, 0);
    }

    // =================== ASSINATURA ===================
    // Verificar se cabe na última página — se não, cria nova
    const needsNewPage = false; // sempre cria para ficar limpo
    pageNum++;
    doc.addPage({ margin: 50 });

    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.navy).text('Assinatura e Conclusão', 50, 40);
    doc.moveTo(50, 62).lineTo(545, 62).strokeColor(COLORS.amber).lineWidth(2).stroke();

    let sy = 80;

    // Card com dados do técnico
    doc.roundedRect(50, sy, 495, 90, 8).fillAndStroke(COLORS.gray100, COLORS.gray200);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.navy).text('Técnico Responsável', 70, sy + 10);
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.gray700);
    doc.text(`Nome: ${inspecao.usuario.nome}`, 70, sy + 28, { width: 200 });
    doc.text(`E-mail: ${inspecao.usuario.email}`, 70, sy + 43, { width: 200 });
    doc.text(`Data da Inspeção: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`, 300, sy + 28, { width: 220 });
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, 300, sy + 43, { width: 220 });

    // Observações
    if (inspecao.observacoes) {
      sy += 105;
      doc.roundedRect(50, sy, 495, 60, 8).fillAndStroke(COLORS.amberLight, COLORS.amber);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.navy).text('Observações', 65, sy + 8);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.gray700).text(inspecao.observacoes, 65, sy + 22, { width: 465, height: 32 });
    }

    // Linha de assinatura
    sy += 120;
    doc.moveTo(50, sy).lineTo(280, sy).strokeColor(COLORS.gray400).lineWidth(1).stroke();
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.gray500).text(`Assinatura do Técnico: ${inspecao.usuario.nome}`, 50, sy + 6);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 50, sy + 20);

    // Rodapé final
    doc.fontSize(7).fillColor(COLORS.gray400).text(
      'Este relatório foi gerado automaticamente pelo SafetyVision AI. '
      + 'As análises são baseadas em inteligência artificial e devem ser validadas por um profissional de SST.',
      50, 760, { align: 'center', width: 495 }
    );

    addFooter(doc, pageNum, 0);

    doc.end();
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

export default router;
