import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { generateRelatorioPDF } from '../services/pdfGenerator';

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

    // Buscar dados complementares
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

    // Salvar PDF no disco
    const nomeArquivo = `relatorio-${inspecao.id.slice(0, 8)}-${Date.now()}.pdf`;
    const filePath = path.join(relatoriosDir, nomeArquivo);
    fs.writeFileSync(filePath, pdfBuffer);

    // Salvar registro no banco
    await prisma.relatorio.create({
      data: {
        inspecaoId: inspecao.id,
        userId: req.userId!,
        empresaId: inspecao.empresaId,
        filePath: `/uploads/relatorios/${nomeArquivo}`,
        nomeArquivo,
        tamanhoBytes: pdfBuffer.length,
        empresaNome: inspecao.empresa.nome,
        setorNome: inspecao.setor.nome,
        notaConformidade: inspecao.notaConformidade,
        totalRiscos: inspecao.riscos.length,
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
