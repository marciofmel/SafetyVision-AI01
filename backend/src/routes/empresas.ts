import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const empresaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  email: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().email('Email inválido').nullable().optional()),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  naturezaJuridica: z.string().nullable().optional(),
  porte: z.string().nullable().optional(),
  dataAbertura: z.string().nullable().optional(),
  capitalSocial: z.preprocess((v) => (v == null ? null : String(v)), z.string().nullable().optional()),
  situacao: z.string().nullable().optional(),
  atividadePrincipal: z.string().nullable().optional(),
  atividadeSecundaria: z.string().nullable().optional(),
  simplesNacional: z.boolean().nullable().optional(),
  empresaMEI: z.boolean().nullable().optional(),
  socios: z.string().nullable().optional(),
  site: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().url('URL inválida').nullable().optional()),
  observacoes: z.string().nullable().optional(),
});

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
    const parsed = empresaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { nome, cnpj, ...rest } = parsed.data;
    if (cnpj) {
      const existing = await prisma.empresa.findFirst({ where: { userId: req.userId!, cnpj, ativo: true } });
      if (existing) return res.status(409).json({ error: 'Empresa com este CNPJ já cadastrada' });
    }
    const empresa = await prisma.empresa.create({
      data: { userId: req.userId!, nome, cnpj, ...rest },
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
    const parsed = empresaSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const empresa = await prisma.empresa.update({ where: { id }, data: parsed.data });
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
