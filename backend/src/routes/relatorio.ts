import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { generateRelatorioPDF } from '../services/pdfService';

const router = Router();

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
  return path.join(__dirname, '../../uploads');
}

function getRelatoriosDir(): string {
  const dir = path.join(getUploadsDir(), 'relatorios');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function salvarPdfDisco(pdfBuffer: Buffer, nomeArquivo: string): Promise<string | null> {
  try {
    const dir = getRelatoriosDir();
    const filePath = path.join(dir, nomeArquivo);
    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  } catch (err) {
    console.error('Erro ao salvar PDF no disco:', err);
    return null;
  }
}

router.get('/:inspecaoId/relatorio', async (req: AuthRequest, res) => {
  try {
    const inspecaoId = String(req.params.inspecaoId);

    const relatorio = await prisma.relatorio.findFirst({
      where: { inspecaoId, userId: req.userId! },
    });

    if (relatorio) {
      const filePath = path.join(getRelatoriosDir(), relatorio.nomeArquivo);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nomeArquivo}"`);
        return res.sendFile(filePath);
      }
    }

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
    const pgrs = await prisma.pGR.findMany({ where: { empresaId: inspecao.empresaId }, include: { itens: true } });
    const asos = await prisma.aSO.findMany({ where: { empresaId: inspecao.empresaId }, include: { colaborador: true }, orderBy: { dataExame: 'desc' } });
    const cipas = await prisma.cIPA.findMany({ where: { empresaId: inspecao.empresaId } });

    const pdfBuffer = await generateRelatorioPDF({ inspecao, clRespostas, pgrs, asos, cipas });

    // Salva o PDF no disco e registra no banco para que fique disponível na plataforma
    const nomeArquivo = `relatorio-${inspecao.id.slice(0, 8)}-${Date.now()}.pdf`;
    await salvarPdfDisco(pdfBuffer, nomeArquivo);

    const i = inspecao as any;
    const existing = await prisma.relatorio.findFirst({ where: { inspecaoId } });
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
    res.setHeader('Content-Disposition', `attachment; filename=${nomeArquivo}`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório' });
  }
});

export default router;