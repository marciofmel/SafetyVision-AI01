import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.plano.findMany({ where: { ativo: true }, orderBy: { preco: 'asc' } });
    res.json(plans);
  } catch { res.status(500).json({ error: 'Erro ao buscar planos' }); }
});

router.get('/meu', async (req: AuthRequest, res: Response) => {
  try {
    const plano = await prisma.planoUsuario.findFirst({
      where: { userId: req.userId!, status: 'ativo' },
      include: { plano: true },
    });
    res.json(plano || null);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.post('/assinar', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { planoId } = req.body;
    if (!planoId) return res.status(400).json({ error: 'planoId obrigatório' });
    const plano = await prisma.plano.findUnique({ where: { id: planoId } });
    if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });
    const existing = await prisma.planoUsuario.findFirst({ where: { userId, status: 'ativo' } });
    if (existing) {
      await prisma.planoUsuario.update({ where: { id: existing.id }, data: { status: 'cancelado' } });
    }
    const dataFim = new Date();
    if (plano.periodo === 'mensal') dataFim.setMonth(dataFim.getMonth() + 1);
    else if (plano.periodo === 'anual') dataFim.setFullYear(dataFim.getFullYear() + 1);
    const sub = await prisma.planoUsuario.create({
      data: { userId, planoId, dataFim },
      include: { plano: true },
    });
    res.status(201).json(sub);
  } catch { res.status(500).json({ error: 'Erro ao assinar' }); }
});

router.post('/cancelar', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.planoUsuario.findFirst({ where: { userId: req.userId!, status: 'ativo' } });
    if (!existing) return res.status(404).json({ error: 'Nenhuma assinatura ativa' });
    await prisma.planoUsuario.update({ where: { id: existing.id }, data: { status: 'cancelado' } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Erro ao cancelar' }); }
});

export default router;
