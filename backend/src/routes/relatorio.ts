import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { generateRelatorioPDF } from '../services/pdfService';

const router = Router();

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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${inspecao.id.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

export default router;
