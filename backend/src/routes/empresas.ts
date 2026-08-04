import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const empresas = await prisma.empresa.findMany({
      where: { userId: req.userId!, ativo: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { setores: true } } },
    });
    res.json(empresas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const empresa = await prisma.empresa.findFirst({ where: { id, userId: req.userId! } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(empresa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (cnpj) {
      const existing = await prisma.empresa.findFirst({ where: { userId: req.userId!, cnpj, ativo: true } });
      if (existing) return res.status(409).json({ error: 'Empresa com este CNPJ já cadastrada' });
    }
    const empresa = await prisma.empresa.create({
      data: { userId: req.userId!, nome, cnpj, endereco, telefone, email },
    });
    res.status(201).json(empresa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.empresa.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Empresa não encontrada' });
    const { nome, cnpj, endereco, telefone, email } = req.body;
    const empresa = await prisma.empresa.update({ where: { id }, data: { nome, cnpj, endereco, telefone, email } });
    res.json(empresa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.empresa.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Empresa não encontrada' });
    await prisma.empresa.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
