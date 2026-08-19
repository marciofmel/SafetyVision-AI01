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

    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${inspecao.id.slice(0, 8)}.pdf`);
    doc.pipe(res);

    // =================== PÁGINA 1: CAPA ===================
    doc.addPage();
    doc.rect(0, 0, 595, 842).fill('#0F172A');

    doc.fontSize(36).font('Helvetica-Bold').fillColor('#F59E0B').text('SAFETYVISION AI', 50, 120, { align: 'center' });
    doc.fontSize(18).font('Helvetica').fillColor('#FFFFFF').text('Relatório de Inspeção de Segurança', 50, 170, { align: 'center' });

    doc.moveTo(150, 210).lineTo(445, 210).strokeColor('#F59E0B').lineWidth(2).stroke();

    doc.fontSize(14).fillColor('#94A3B8');
    doc.text(`Empresa: ${inspecao.empresa.nome}`, 50, 250, { align: 'center' });
    doc.text(`CNPJ: ${inspecao.empresa.cnpj || '---'}`, 50, 275, { align: 'center' });
    doc.text(`Setor: ${inspecao.setor.nome}`, 50, 300, { align: 'center' });
    doc.text(`Técnico: ${inspecao.usuario.nome}`, 50, 325, { align: 'center' });
    doc.text(`Data: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`, 50, 350, { align: 'center' });

    // Nota grande
    const nota = inspecao.notaConformidade ?? 0;
    const corNota = nota >= 70 ? '#16A34A' : nota >= 40 ? '#D97706' : '#DC2626';
    doc.circle(297, 450, 60).fill(corNota);
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#FFFFFF').text(`${nota}`, 260, 435, { align: 'center', width: 75 });
    doc.fontSize(10).fillColor('#FFFFFF').text('/100', 260, 465, { align: 'center', width: 75 });
    doc.fontSize(12).fillColor('#94A3B8').text('Nota de Conformidade', 200, 525, { align: 'center', width: 195 });

    // Estatísticas
    const totalRiscos = inspecao.riscos.length;
    const epiAusentes = inspecao.epiViolacoes.filter(e => e.status === 'ausente').length;

    doc.fontSize(14).fillColor('#FFFFFF');
    doc.text(`${totalRiscos}`, 130, 590, { align: 'center', width: 80 });
    doc.fontSize(10).fillColor('#94A3B8').text('Riscos', 130, 615, { align: 'center', width: 80 });

    doc.fontSize(14).fillColor('#F59E0B');
    doc.text(`${epiAusentes}`, 257, 590, { align: 'center', width: 80 });
    doc.fontSize(10).fillColor('#94A3B8').text('EPIs Ausentes', 257, 615, { align: 'center', width: 80 });

    doc.fontSize(14).fillColor('#FFFFFF');
    doc.text(`${inspecao.midias.length}`, 385, 590, { align: 'center', width: 80 });
    doc.fontSize(10).fillColor('#94A3B8').text('Fotos Analisadas', 385, 615, { align: 'center', width: 80 });

    doc.fontSize(8).fillColor('#475569').text(`Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`, 50, 800, { align: 'center', width: 495 });

    // =================== PÁGINA: RESUMO EXECUTIVO (FASE 7) ===================
    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0F172A').text('Resumo Executivo', 50, 40);
    doc.moveTo(50, 62).lineTo(545, 62).strokeColor('#F59E0B').lineWidth(2).stroke();

    let ry = 80;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('Panorama da Inspeção', 50, ry);
    ry += 22;
    const linhasResumo: [string, string][] = [
      ['Empresa', inspecao.empresa.nome],
      ['Setor', inspecao.setor.nome],
      ['Técnico Responsável', inspecao.usuario.nome],
      ['Data da Inspeção', new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')],
      ['Riscos Identificados', String(inspecao.riscos.length)],
      ['EPIs em desacordo', String(inspecao.epiViolacoes.filter(e => e.status !== 'correto').length)],
      ['Nota de Conformidade', `${nota}/100`],
      ['Status', inspecao.status],
    ];
    doc.fontSize(10).font('Helvetica');
    for (const [k, v] of linhasResumo) {
      doc.fillColor('#64748B').text(k, 60, ry, { width: 200 });
      doc.fillColor('#0F172A').font('Helvetica-Bold').text(v, 280, ry, { width: 240 });
      doc.font('Helvetica');
      ry += 16;
    }

    // Matriz de risco (gravidade x prioridade)
    ry += 10;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text('Matriz de Risco', 50, ry);
    ry += 24;

    const gravidades = ['critica', 'alta', 'media', 'baixa'];
    const gravLabel: Record<string, string> = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
    const gravCor: Record<string, string> = { critica: '#DC2626', alta: '#EA580C', media: '#D97706', baixa: '#16A34A' };

    // Cabeçalho da matriz
    const mrowW = 240;
    const mrowH = 26;
    const mleft = 60;
    const mtop = ry;
    doc.rect(mleft, mtop, mrowW, mrowH).fillAndStroke('#0F172A', '#0F172A');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF').text('Gravidade', mleft + 8, mtop + 8);
    doc.rect(mleft + mrowW, mtop, mrowW, mrowH).fillAndStroke('#0F172A', '#0F172A');
    doc.text('Riscos Encontrados', mleft + mrowW + 8, mtop + 8);
    doc.font('Helvetica');

    gravidades.forEach((g, idx) => {
      const y = mtop + mrowH + idx * mrowH;
      const count = inspecao.riscos.filter(r => r.gravidade.toLowerCase() === g).length;
      doc.rect(mleft, y, mrowW, mrowH).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.circle(mleft + 16, y + mrowH / 2, 9).fill(gravCor[g]);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text(gravLabel[g], mleft + 32, y + 8);
      doc.rect(mleft + mrowW, y, mrowW, mrowH).fillAndStroke(count > 0 ? '#FEF2F2' : '#F8FAFC', '#E2E8F0');
      doc.text(`${count}`, mleft + mrowW + 8, y + 8);
      doc.font('Helvetica');
    });
    ry = mtop + mrowH + gravidades.length * mrowH + 16;

    // Prazos recomendados por gravidade
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text('Prazos Recomendados', 50, ry);
    ry += 24;
    const prazos: Record<string, string> = { critica: '1 a 7 dias', alta: '15 dias', media: '30 dias', baixa: '60 dias' };
    const colW = [80, 60, 70, 80, 190];
    const cLefts = [50, 135, 200, 275, 455];
    const prazoHeads = ['Gravidade', 'Qtde', 'Prazo', 'Prioridade', 'Responsável'];
    const totalW = colW.reduce((a, b) => a + b, 0);

    doc.rect(50, ry, totalW, 24).fillAndStroke('#0F172A', '#0F172A');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
    prazoHeads.forEach((h, i) => doc.text(h, cLefts[i] + 4, ry + 8));
    doc.font('Helvetica');
    ry += 24;

    gravidades.forEach((g) => {
      const count = inspecao.riscos.filter(r => r.gravidade.toLowerCase() === g).length;
      if (count === 0) return;
      const cor = gravCor[g];
      doc.rect(50, ry, totalW, 22).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(cor).text(gravLabel[g], cLefts[0] + 4, ry + 6);
      doc.font('Helvetica').fillColor('#334155');
      doc.text(`${count}`, cLefts[1] + 4, ry + 6);
      doc.text(prazos[g], cLefts[2] + 4, ry + 6);
      doc.text(g === 'critica' ? 'IMEDIATA' : g === 'alta' ? 'ALTA' : g === 'media' ? 'MÉDIA' : 'BAIXA', cLefts[3] + 4, ry + 6);
      doc.text(`${inspecao.usuario.nome}`, cLefts[4] + 4, ry + 6, { width: colW[4] - 8 });
      ry += 22;
    });

    if (inspecao.riscos.length === 0) {
      doc.fontSize(10).font('Helvetica').fillColor('#16A34A').text('Nenhum risco foi identificado nesta inspeção. Ambiente dentro dos padrões esperados.', 50, ry + 8, { width: 495 });
    }

    // Observações do técnico
    if (inspecao.observacoes) {
      ry += 30;
      if (ry > 720) { doc.addPage(); ry = 50; }
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0F172A').text('Observações do Técnico', 50, ry);
      ry += 20;
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text(inspecao.observacoes, 50, ry, { width: 495, height: 120, lineGap: 4 });
    }

    // =================== PÁGINA 2: IMAGENS ANOTADAS ===================
    const imagensAnotadas = inspecao.midias
      .filter(m => m.tipo === 'foto')
      .map(m => {
        const filename = path.basename(m.url);
        const anotadaPath = path.join(anotadasDir, `anotada_${filename}.png`);
        return { midia: m, anotadaPath };
      })
      .filter(img => fs.existsSync(img.anotadaPath));

    if (imagensAnotadas.length > 0) {
      for (const img of imagensAnotadas) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#0F172A').text('Análise Visual', 50, 40);
        doc.fontSize(10).font('Helvetica').fillColor('#64748B').text(`Imagem: ${img.midia.nome}`, 50, 62);

        try {
          const imgMeta = await sharp(img.anotadaPath).metadata();
          const imgW = imgMeta.width || 500;
          const imgH = imgMeta.height || 400;
          const maxWidth = 495;
          const maxHeight = 600;
          const scale = Math.min(maxWidth / imgW, maxHeight / imgH);
          const finalW = imgW * scale;
          const finalH = imgH * scale;
          const x = 50 + (maxWidth - finalW) / 2;

          doc.image(img.anotadaPath, x, 85, { width: finalW, height: finalH });

          const riscosNaImagem = inspecao.riscos.filter(r => r.imagemUrl === img.midia.url);
          if (riscosNaImagem.length > 0) {
            let y = 85 + finalH + 15;
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#DC2626').text(`⚠ ${riscosNaImagem.length} risco(s) identificado(s):`, 50, y);
            y += 18;
            for (const risco of riscosNaImagem.slice(0, 5)) {
              if (y > 780) break;
              doc.fontSize(9).font('Helvetica').fillColor('#374151');
              doc.text(`• ${risco.descricao} (${risco.gravidade.toUpperCase()})`, 60, y, { width: 475 });
              y += 14;
            }
          }
        } catch (imgErr) {
          doc.fontSize(10).fillColor('#EF4444').text('Erro ao carregar imagem anotada', 50, 100);
        }
      }
    }

    // =================== PÁGINA: RISCOS DETALHADOS ===================
    if (inspecao.riscos.length > 0) {
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#0F172A').text('Riscos Identificados', 50, 40);
      doc.moveTo(50, 62).lineTo(545, 62).strokeColor('#F59E0B').lineWidth(2).stroke();

      let y = 80;
      const gravidadeCor: Record<string, string> = {
        crítica: '#DC2626', critica: '#DC2626', alta: '#EA580C', média: '#D97706', media: '#D97706', baixa: '#16A34A',
      };

      for (let i = 0; i < inspecao.riscos.length; i++) {
        const risco = inspecao.riscos[i];
        if (y > 720) {
          doc.addPage();
          y = 50;
        }

        const cor = gravidadeCor[risco.gravidade] || '#D97706';
        doc.roundedRect(50, y, 495, 100, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.circle(70, y + 15, 12).fill(cor);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF').text(`${i + 1}`, 64, y + 10, { width: 12, align: 'center' });

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text(risco.descricao, 90, y + 8, { width: 430 });
        doc.fontSize(9).font('Helvetica').fillColor('#64748B');
        doc.text(`Categoria: ${risco.categoria} | Gravidade: ${risco.gravidade.toUpperCase()} | Confiança: ${(risco.confianca * 100).toFixed(0)}%`, 90, y + 26, { width: 430 });
        doc.text(`NRs: ${risco.nrsRelacionadas || '---'} | Local: ${risco.localIdentificado}`, 90, y + 40, { width: 430 });
        doc.text(`Consequências: ${risco.consequencias}`, 90, y + 54, { width: 430 });

        doc.fontSize(8).font('Helvetica').fillColor('#059669');
        doc.text(`Prevenção: ${risco.medidasPreventivas}`, 90, y + 68, { width: 430 });
        doc.text(`Correção: ${risco.medidasCorretivas}`, 90, y + 80, { width: 430 });

        y += 112;
      }
    }

    // =================== PÁGINA: EPIs ===================
    if (inspecao.epiViolacoes.length > 0) {
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#0F172A').text('Análise de EPIs', 50, 40);
      doc.moveTo(50, 62).lineTo(545, 62).strokeColor('#F59E0B').lineWidth(2).stroke();

      let y = 80;
      for (const epi of inspecao.epiViolacoes) {
        if (y > 780) {
          doc.addPage();
          y = 50;
        }

        const cor = epi.status === 'ausente' ? '#DC2626' : epi.status === 'incorreto' ? '#EA580C' : '#16A34A';
        const statusLabel = epi.status === 'ausente' ? '✗ AUSENTE' : epi.status === 'incorreto' ? '⚠ INCORRETO' : '✓ CORRETO';

        doc.roundedRect(50, y, 495, 35, 6).fillAndStroke(epi.status === 'ausente' ? '#FEF2F2' : epi.status === 'incorreto' ? '#FFF7ED' : '#F0FDF4', '#E2E8F0');
        doc.circle(70, y + 17, 10).fill(cor);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text(epi.status === 'ausente' ? 'X' : epi.status === 'incorreto' ? '!' : '✓', 64, y + 13, { width: 12, align: 'center' });

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text(`${epi.epiNome}`, 90, y + 10, { width: 200 });
        doc.fontSize(9).font('Helvetica').fillColor(cor).text(statusLabel, 300, y + 10, { width: 100 });
        doc.fontSize(8).fillColor('#64748B').text(`Confiança: ${(epi.confianca * 100).toFixed(0)}%`, 420, y + 12, { width: 110 });

        if (epi.descricao) {
          doc.fontSize(8).fillColor('#64748B').text(epi.descricao, 90, y + 24, { width: 440 });
        }

        y += 42;
      }
    }

    // =================== PÁGINA: IMAGENS ORIGINAIS ===================
    const fotos = inspecao.midias.filter(m => m.tipo === 'foto');
    if (fotos.length > 0) {
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#0F172A').text('Evidências Fotográficas', 50, 40);
      doc.moveTo(50, 62).lineTo(545, 62).strokeColor('#F59E0B').lineWidth(2).stroke();

      let y = 80;
      let col = 0;
      for (const foto of fotos) {
        const imgPath = path.join(uploadsDir, foto.url.replace('/uploads/', ''));
        if (!fs.existsSync(imgPath)) continue;

        try {
          const imgMeta = await sharp(imgPath).metadata();
          const imgW = imgMeta.width || 300;
          const imgH = imgMeta.height || 200;
          const maxSize = 230;
          const scale = Math.min(maxSize / imgW, maxSize / imgH);
          const finalW = imgW * scale;
          const finalH = imgH * scale;

          if (y + finalH + 20 > 800) {
            doc.addPage();
            y = 50;
            col = 0;
          }

          const x = col === 0 ? 50 : 310;
          doc.image(imgPath, x, y, { width: finalW, height: finalH });
          doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(foto.nome, x, y + finalH + 4, { width: finalW });

          col = col === 0 ? 1 : 0;
          if (col === 0) y += finalH + 25;
        } catch {
          // skip broken images
        }
      }
    }

    // =================== PÁGINA: ASSINATURA ===================
    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0F172A').text('Assinatura e Conclusão', 50, 40);
    doc.moveTo(50, 62).lineTo(545, 62).strokeColor('#F59E0B').lineWidth(2).stroke();

    doc.fontSize(12).font('Helvetica').fillColor('#374151');
    doc.text(`Técnico Responsável: ${inspecao.usuario.nome}`, 50, 100);
    doc.text(`E-mail: ${inspecao.usuario.email}`, 50, 120);
    doc.text(`Data da Inspeção: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`, 50, 140);
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, 50, 160);

    if (inspecao.observacoes) {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('Observações:', 50, 200);
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text(inspecao.observacoes, 50, 220, { width: 495 });
    }

    doc.moveTo(50, 500).lineTo(250, 500).strokeColor('#94A3B8').lineWidth(1).stroke();
    doc.fontSize(10).font('Helvetica').fillColor('#64748B').text(`Assinatura do Técnico: ${inspecao.usuario.nome}`, 50, 510);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 50, 525);

    doc.fontSize(8).fillColor('#94A3B8').text(
      `Relatório gerado automaticamente pelo SafetyVision AI em ${new Date().toLocaleString('pt-BR')}`,
      50, 780, { align: 'center', width: 495 }
    );

    doc.end();
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

export default router;
