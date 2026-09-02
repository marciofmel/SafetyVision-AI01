import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId } = req.query;
    const where: any = { userId };
    if (empresaId) where.empresaId = empresaId as string;
    const items = await prisma.pGR.findMany({
      where, include: { empresa: true, itens: true }, orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch { res.status(500).json({ error: 'Erro ao buscar PGRs' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await prisma.pGR.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true, itens: true },
    });
    if (!item) return res.status(404).json({ error: 'Não encontrado' });
    res.json(item);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId, titulo, descricao, responsavel, vigenciaInicio, vigenciaFim } = req.body;
    if (!empresaId || !titulo) return res.status(400).json({ error: 'empresaId e titulo obrigatórios' });
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    const count = await prisma.pGR.count({ where: { empresaId } });
    const item = await prisma.pGR.create({
      data: { userId, empresaId, titulo, descricao, responsavel, vigenciaInicio, vigenciaFim, revisao: count + 1 },
    });
    res.status(201).json(item);
  } catch { res.status(500).json({ error: 'Erro ao criar PGR' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { titulo, descricao, responsavel, vigenciaInicio, vigenciaFim, aprovado } = req.body;
    const existing = await prisma.pGR.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });
    const item = await prisma.pGR.update({
      where: { id },
      data: { titulo, descricao, responsavel, vigenciaInicio, vigenciaFim, aprovado },
    });
    res.json(item);
  } catch { res.status(500).json({ error: 'Erro ao atualizar' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.pGR.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });
    await prisma.pGR.delete({ where: { id } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Erro ao excluir' }); }
});

router.post('/:id/itens', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.pGR.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'PGR não encontrado' });
    const { processo, perigo, riscos, medidasControle, riscoResidual, prioridade, norma, responsavel, prazo } = req.body;
    if (!processo || !perigo) return res.status(400).json({ error: 'processo e perigo obrigatórios' });
    const item = await prisma.pGRItem.create({
      data: { pgrId: id, processo, perigo, riscos, medidasControle, riscoResidual, prioridade, norma, responsavel, prazo },
    });
    res.status(201).json(item);
  } catch { res.status(500).json({ error: 'Erro ao adicionar item' }); }
});

router.put('/item/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const itemId = String(req.params.itemId);
    const existing = await prisma.pGRItem.findFirst({
      where: { id: itemId, pgr: { userId: req.userId! } },
    });
    if (!existing) return res.status(404).json({ error: 'Item não encontrado' });
    const { processo, perigo, riscos, medidasControle, riscoResidual, prioridade, norma, responsavel, prazo, status } = req.body;
    const item = await prisma.pGRItem.update({
      where: { id: itemId },
      data: { processo, perigo, riscos, medidasControle, riscoResidual, prioridade, norma, responsavel, prazo, status },
    });
    res.json(item);
  } catch { res.status(500).json({ error: 'Erro ao atualizar item' }); }
});

router.delete('/item/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const itemId = String(req.params.itemId);
    const existing = await prisma.pGRItem.findFirst({
      where: { id: itemId, pgr: { userId: req.userId! } },
    });
    if (!existing) return res.status(404).json({ error: 'Item não encontrado' });
    await prisma.pGRItem.delete({ where: { id: itemId } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Erro ao excluir item' }); }
});

export default router;
