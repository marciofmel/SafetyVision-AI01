import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
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

// Rota pública SEM autenticação — usada para compartilhar o relatório via WhatsApp/Email/link
router.get('/:id/pdf', async (req, res) => {
  try {
    const id = String(req.params.id);
    const relatorio = await prisma.relatorio.findFirst({ where: { id } });
    if (!relatorio) {
      // Tenta pelo ID da inspeção (fallback para links antigos)
      const byInspecao = await prisma.relatorio.findFirst({ where: { inspecaoId: id } });
      if (!byInspecao) return res.status(404).json({ error: 'Relatório não encontrado' });
      return res.redirect(`/api/publico/${byInspecao.id}/pdf`);
    }

    const filePath = path.join(getRelatoriosDir(), relatorio.nomeArquivo);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${relatorio.nomeArquivo}"`);
      return res.sendFile(filePath);
    }

    // Regenera na hora se o arquivo não existir mais no disco
    const inspecao = await prisma.inspecao.findFirst({
      where: { id: relatorio.inspecaoId },
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

    // Persiste o PDF no disco para que fique disponível na plataforma
    try {
      fs.writeFileSync(path.join(getRelatoriosDir(), relatorio.nomeArquivo), pdfBuffer);
    } catch (err) {
      console.error('Erro ao salvar PDF público no disco:', err);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${relatorio.nomeArquivo}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erro ao servir relatório público:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

export default router;