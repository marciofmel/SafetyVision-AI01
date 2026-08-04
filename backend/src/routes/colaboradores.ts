import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: { userId: req.userId!, ativo: true },
      include: { setor: true },
      orderBy: { nome: 'asc' },
    });
    res.json(colaboradores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { nome, cargo, setorId, empresaId } = req.body;
    if (!nome || !empresaId) return res.status(400).json({ error: 'Nome e empresa são obrigatórios' });
    const colab = await prisma.colaborador.create({
      data: { userId: req.userId!, nome, cargo, setorId, empresaId },
    });
    res.status(201).json(colab);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.colaborador.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
    const { nome, cargo, setorId, empresaId } = req.body;
    const colab = await prisma.colaborador.update({ where: { id }, data: { nome, cargo, setorId, empresaId } });
    res.json(colab);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.colaborador.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
    await prisma.colaborador.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
