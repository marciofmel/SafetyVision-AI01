import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const empresas = await prisma.empresa.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  res.json(empresas);
});

router.post('/', async (req, res) => {
  const { nome, cnpj, endereco, telefone, email } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  const empresa = await prisma.empresa.create({ data: { nome, cnpj, endereco, telefone, email } });
  res.status(201).json(empresa);
});

router.put('/:id', async (req, res) => {
  const { nome, cnpj, endereco, telefone, email } = req.body;
  const empresa = await prisma.empresa.update({
    where: { id: req.params.id },
    data: { nome, cnpj, endereco, telefone, email },
  });
  res.json(empresa);
});

router.delete('/:id', async (req, res) => {
  await prisma.empresa.update({ where: { id: req.params.id }, data: { ativo: false } });
  res.json({ ok: true });
});

export default router;
