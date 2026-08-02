import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const { empresaId } = req.query;
  const where = empresaId ? { empresaId: empresaId as string, ativo: true } : { ativo: true };
  const setores = await prisma.setor.findMany({ where, include: { empresa: true }, orderBy: { nome: 'asc' } });
  res.json(setores);
});

router.post('/', async (req, res) => {
  const { nome, descricao, empresaId } = req.body;
  if (!nome || !empresaId) return res.status(400).json({ error: 'Nome e empresa são obrigatórios' });
  const setor = await prisma.setor.create({ data: { nome, descricao, empresaId } });
  res.status(201).json(setor);
});

router.put('/:id', async (req, res) => {
  const { nome, descricao } = req.body;
  const setor = await prisma.setor.update({ where: { id: req.params.id }, data: { nome, descricao } });
  res.json(setor);
});

router.delete('/:id', async (req, res) => {
  await prisma.setor.update({ where: { id: req.params.id }, data: { ativo: false } });
  res.json({ ok: true });
});

export default router;
