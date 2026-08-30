import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { generateRelatorioPDF } from '../services/pdfService';

const router = Router();

const uploadsDir = path.join(__dirname, '../../uploads');

function getUploadsDir(): string {
  const candidates = [
    path.join(__dirname, '../../uploads'),
    path.join(process.cwd(), 'backend/uploads'),
    path.join(process.cwd(), 'src/backend/uploads'),
    '/opt/render/project/src/backend/uploads',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return uploadsDir;
}

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

    const existing = await prisma.relatorio.findFirst({
      where: { inspecaoId },
    });
    if (existing) {
      await prisma.relatorio.update({
        where: { id: existing.id },
        data: {
          nomeArquivo, filePath: nomeArquivo, tamanhoBytes: pdfBuffer.length,
          empresaNome: i.empresa?.nome || '', setorNome: i.setor?.nome || '',
          notaConformidade: inspecao.notaConformidade, totalRiscos: i.riscos?.length || 0,
        },
      });
    } else {
      await prisma.relatorio.create({
        data: {
          inspecaoId, userId: req.userId!, empresaId: inspecao.empresaId,
          filePath: nomeArquivo, nomeArquivo, tamanhoBytes: pdfBuffer.length,
          empresaNome: i.empresa?.nome || '', setorNome: i.setor?.nome || '',
          notaConformidade: inspecao.notaConformidade, totalRiscos: i.riscos?.length || 0,
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
// Servir arquivo PDF existente do disco
// ═══════════════════════════════════════════
router.get('/:id/arquivo', async (req: AuthRequest, res) => {
  try {
    const relatorio = await prisma.relatorio.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!relatorio) return res.status(404).json({ error: 'Relatório não encontrado' });

    const filePath = path.join(getUploadsDir(), 'relatorios', relatorio.nomeArquivo);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nomeArquivo}"`);
      return res.sendFile(filePath);
    }

    // Arquivo não existe no disco — regenerar
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
    const pgrs = await prisma.pGR.findMany({ where: { empresaId: inspecao.empresaId }, include: { itens: true } });
    const asos = await prisma.aSO.findMany({ where: { empresaId: inspecao.empresaId }, include: { colaborador: true }, orderBy: { dataExame: 'desc' } });
    const cipas = await prisma.cIPA.findMany({ where: { empresaId: inspecao.empresaId } });

    const pdfBuffer = await generateRelatorioPDF({ inspecao, clRespostas, pgrs, asos, cipas });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nomeArquivo}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao baixar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao baixar relatório' });
  }
});

// ═══════════════════════════════════════════
// Download do PDF (serve arquivo existente, não regenera)
// ═══════════════════════════════════════════
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const relatorio = await prisma.relatorio.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    });
    if (!relatorio) return res.status(404).json({ error: 'Relatório não encontrado' });

    const filePath = path.join(getUploadsDir(), 'relatorios', relatorio.nomeArquivo);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nomeArquivo}"`);
      return res.sendFile(filePath);
    }

    // Fallback: regenerar
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
    const pgrs = await prisma.pGR.findMany({ where: { empresaId: inspecao.empresaId }, include: { itens: true } });
    const asos = await prisma.aSO.findMany({ where: { empresaId: inspecao.empresaId }, include: { colaborador: true }, orderBy: { dataExame: 'desc' } });
    const cipas = await prisma.cIPA.findMany({ where: { empresaId: inspecao.empresaId } });

    const pdfBuffer = await generateRelatorioPDF({ inspecao, clRespostas, pgrs, asos, cipas });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nomeArquivo}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao baixar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao baixar relatório' });
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