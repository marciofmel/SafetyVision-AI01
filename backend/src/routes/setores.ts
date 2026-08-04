import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { empresaId } = req.query;
    const where: any = { userId: req.userId!, ativo: true };
    if (empresaId) where.empresaId = String(empresaId);
    const setores = await prisma.setor.findMany({ where, include: { empresa: true }, orderBy: { nome: 'asc' } });
    res.json(setores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const setor = await prisma.setor.findFirst({ where: { id, userId: req.userId! }, include: { empresa: true } });
    if (!setor) return res.status(404).json({ error: 'Setor não encontrado' });
    res.json(setor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { nome, descricao, empresaId } = req.body;
    if (!nome || !empresaId) return res.status(400).json({ error: 'Nome e empresa são obrigatórios' });
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });
    const setor = await prisma.setor.create({ data: { userId: req.userId!, nome, descricao, empresaId } });
    res.status(201).json(setor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.setor.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Setor não encontrado' });
    const { nome, descricao } = req.body;
    const setor = await prisma.setor.update({ where: { id }, data: { nome, descricao } });
    res.json(setor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.setor.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Setor não encontrado' });
    await prisma.setor.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
