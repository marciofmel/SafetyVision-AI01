import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    include: { setor: true },
    orderBy: { nome: 'asc' },
  });
  res.json(colaboradores);
});

router.post('/', async (req, res) => {
  const { nome, cargo, setorId, empresaId } = req.body;
  if (!nome || !empresaId) return res.status(400).json({ error: 'Nome e empresa são obrigatórios' });
  const colab = await prisma.colaborador.create({ data: { nome, cargo, setorId, empresaId } });
  res.status(201).json(colab);
});

router.put('/:id', async (req, res) => {
  const { nome, cargo, setorId, empresaId } = req.body;
  const colab = await prisma.colaborador.update({
    where: { id: req.params.id },
    data: { nome, cargo, setorId, empresaId },
  });
  res.json(colab);
});

router.delete('/:id', async (req, res) => {
  await prisma.colaborador.update({ where: { id: req.params.id }, data: { ativo: false } });
  res.json({ ok: true });
});

export default router;
