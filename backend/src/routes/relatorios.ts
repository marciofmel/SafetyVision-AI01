import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { generateRelatorioPDF } from '../services/pdfService';

const router = Router();

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
        usuario: { select: { nome: true, email: true, cargo: true } },
        riscos: true, epiViolacoes: true, midias: true,
      },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const clRespostas = await (prisma as any).checklistResposta.findMany({
      where: { inspecaoId: inspecao.id },
      include: { item: { include: { template: true } } },
    });

    const pgrs = await prisma.pGR.findMany({
      where: { empresaId: inspecao.empresaId },
      include: { itens: true },
    });

    const asos = await prisma.aSO.findMany({
      where: { empresaId: inspecao.empresaId },
      include: { colaborador: true },
      orderBy: { dataExame: 'desc' },
    });

    const cipas = await prisma.cIPA.findMany({
      where: { empresaId: inspecao.empresaId },
    });

    const pdfBuffer = await generateRelatorioPDF({
      inspecao,
      clRespostas,
      pgrs,
      asos,
      cipas,
    });

    const i = inspecao as any;

    const nomeArquivo = `relatorio-${inspecao.id.slice(0, 8)}-${Date.now()}.pdf`;

    const relatorio = await prisma.relatorio.findFirst({
      where: { inspecaoId: inspecao.id, userId: req.userId! },
    });
    if (relatorio) {
      await prisma.relatorio.update({
        where: { id: relatorio.id },
        data: {
          nomeArquivo,
          tamanhoBytes: pdfBuffer.length,
          empresaNome: i.empresa?.nome || '',
          setorNome: i.setor?.nome || '',
          notaConformidade: inspecao.notaConformidade,
          totalRiscos: i.riscos?.length || 0,
        },
      });
    } else {
      await prisma.relatorio.create({
        data: {
          inspecaoId: inspecao.id,
          userId: req.userId!,
          empresaId: inspecao.empresaId,
          filePath: 'generated-on-the-fly',
          nomeArquivo,
          tamanhoBytes: pdfBuffer.length,
          empresaNome: i.empresa?.nome || '',
          setorNome: i.setor?.nome || '',
          notaConformidade: inspecao.notaConformidade,
          totalRiscos: i.riscos?.length || 0,
        },
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
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
// Baixar PDF — regenera on-the-fly (sem disco)
// ═══════════════════════════════════════════
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const relatorio = await prisma.relatorio.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!relatorio) return res.status(404).json({ error: 'Relatório não encontrado' });

    const inspecao = await prisma.inspecao.findFirst({
      where: { id: relatorio.inspecaoId },
      include: {
        empresa: true, setor: true,
        usuario: { select: { nome: true, email: true, cargo: true } },
        riscos: true, epiViolacoes: true, midias: true,
      },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const clRespostas = await (prisma as any).checklistResposta.findMany({
      where: { inspecaoId: inspecao.id },
      include: { item: { include: { template: true } } },
    });

    const pgrs = await prisma.pGR.findMany({
      where: { empresaId: inspecao.empresaId },
      include: { itens: true },
    });

    const asos = await prisma.aSO.findMany({
      where: { empresaId: inspecao.empresaId },
      include: { colaborador: true },
      orderBy: { dataExame: 'desc' },
    });

    const cipas = await prisma.cIPA.findMany({
      where: { empresaId: inspecao.empresaId },
    });

    const pdfBuffer = await generateRelatorioPDF({
      inspecao,
      clRespostas,
      pgrs,
      asos,
      cipas,
    });

    await prisma.relatorio.update({
      where: { id: relatorio.id },
      data: { tamanhoBytes: pdfBuffer.length },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nomeArquivo}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao baixar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao baixar relatório' });
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
    await prisma.relatorio.delete({ where: { id: relatorio.id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
