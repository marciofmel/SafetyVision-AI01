import { Router } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../prisma';

const router = Router();

router.get('/:inspecaoId/relatorio', async (req, res) => {
  try {
    const inspecao = await prisma.inspecao.findUnique({
      where: { id: req.params.inspecaoId },
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

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${inspecao.id.slice(0, 8)}.pdf`);
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(20).font('Helvetica-Bold').text('SafetyVision AI', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Relatório de Inspeção de Segurança', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Dados gerais
    doc.fontSize(12).font('Helvetica-Bold').text('Dados da Inspeção');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Empresa: ${inspecao.empresa.nome}`);
    doc.text(`CNPJ: ${inspecao.empresa.cnpj || '---'}`);
    doc.text(`Setor: ${inspecao.setor.nome}`);
    doc.text(`Técnico: ${inspecao.usuario.nome}`);
    doc.text(`Data: ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}`);
    doc.text(`Hora início: ${new Date(inspecao.dataInicio).toLocaleTimeString('pt-BR')}`);
    if (inspecao.dataFim) doc.text(`Hora fim: ${new Date(inspecao.dataFim).toLocaleTimeString('pt-BR')}`);
    doc.text(`Status: ${inspecao.status}`);
    doc.moveDown();

    // Resumo
    doc.fontSize(12).font('Helvetica-Bold').text('Resumo da Inspeção');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fotos analisadas: ${inspecao.totalFotos}`);
    doc.text(`Vídeos analisados: ${inspecao.totalVideos}`);
    doc.text(`Riscos identificados: ${inspecao.riscos.length}`);
    doc.text(`Violações de EPI: ${inspecao.epiViolacoes.filter(e => e.status === 'ausente').length}`);
    if (inspecao.notaConformidade !== null) {
      doc.text(`Nota de conformidade: ${inspecao.notaConformidade}/100`);
    }
    doc.moveDown();

    // EPIs
    if (inspecao.epiViolacoes.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Análise de EPIs');
      doc.fontSize(10).font('Helvetica');
      for (const epi of inspecao.epiViolacoes) {
        const status = epi.status === 'ausente' ? '✗ AUSENTE' : '✓ Correto';
        doc.text(`${epi.epiNome}: ${status} (Confiança: ${(epi.confianca * 100).toFixed(0)}%)`);
      }
      doc.moveDown();
    }

    // Riscos
    if (inspecao.riscos.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Riscos Identificados');
      doc.moveDown();
      for (let i = 0; i < inspecao.riscos.length; i++) {
        const risco = inspecao.riscos[i];
        if (doc.y > 700) doc.addPage();
        doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${risco.descricao}`);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Categoria: ${risco.categoria}`);
        doc.text(`Gravidade: ${risco.gravidade.toUpperCase()}`);
        doc.text(`Confiança: ${(risco.confianca * 100).toFixed(0)}%`);
        doc.text(`Local: ${risco.localIdentificado}`);
        doc.text(`Consequências: ${risco.consequencias}`);
        doc.text(`NRs: ${risco.nrsRelacionadas || '---'}`);
        doc.text(`Medidas Preventivas: ${risco.medidasPreventivas}`);
        doc.text(`Medidas Corretivas: ${risco.medidasCorretivas}`);
        doc.moveDown();
      }
    }

    // Observações
    if (inspecao.observacoes) {
      doc.fontSize(12).font('Helvetica-Bold').text('Observações do Técnico');
      doc.fontSize(10).font('Helvetica').text(inspecao.observacoes);
      doc.moveDown();
    }

    // Assinatura
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
    doc.fontSize(10).font('Helvetica').text(`Assinatura do Técnico: ${inspecao.usuario.nome}`);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);

    // Rodapé
    doc.fontSize(8).font('Helvetica')
      .text(`Relatório gerado automaticamente pelo SafetyVision AI em ${new Date().toLocaleString('pt-BR')}`, 50, 780, { align: 'center' });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
