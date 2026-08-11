import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const cipaSchema = z.object({
  empresaId: z.string().min(1, 'Empresa é obrigatória'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().nullable().optional(),
  cnae: z.string().nullable().optional(),
  grauRisco: z.string().nullable().optional(),
  efetivo: z.number().nullable().optional(),
  siprat: z.number().nullable().optional(),
  dadosAtuais: z.string().nullable().optional(),
  mandatoInicio: z.string().nullable().optional(),
  mandatoFim: z.string().nullable().optional(),
  eleicaoData: z.string().nullable().optional(),
  eleicaoAta: z.string().nullable().optional(),
  reunioes: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const cipas = await prisma.cIPA.findMany({
      where: { userId: req.userId!, ativo: true },
      include: { empresa: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(cipas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const cipa = await prisma.cIPA.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true },
    });
    if (!cipa) return res.status(404).json({ error: 'CIPA não encontrada' });
    res.json(cipa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = cipaSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const { empresaId, mandatoInicio, mandatoFim, eleicaoData, ...data } = parsed.data;

    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    const cipa = await prisma.cIPA.create({
      data: {
        userId: req.userId!,
        empresaId,
        mandatoInicio: mandatoInicio ? new Date(mandatoInicio) : null,
        mandatoFim: mandatoFim ? new Date(mandatoFim) : null,
        eleicaoData: eleicaoData ? new Date(eleicaoData) : null,
        ...data,
      },
      include: { empresa: true },
    });
    res.status(201).json(cipa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.cIPA.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'CIPA não encontrada' });

    const parsed = cipaSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const data: any = { ...parsed.data };
    if (data.mandatoInicio) data.mandatoInicio = new Date(data.mandatoInicio);
    if (data.mandatoFim) data.mandatoFim = new Date(data.mandatoFim);
    if (data.eleicaoData) data.eleicaoData = new Date(data.eleicaoData);

    const cipa = await prisma.cIPA.update({ where: { id }, data, include: { empresa: true } });
    res.json(cipa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.cIPA.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'CIPA não encontrada' });
    await prisma.cIPA.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reunioes', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.cIPA.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'CIPA não encontrada' });

    const { data, pauta, presentes, decisoes } = req.body;
    if (!data) return res.status(400).json({ error: 'Data da reunião é obrigatória' });

    let reunioes: any[] = [];
    if (existing.reunioes) {
      try { reunioes = JSON.parse(existing.reunioes); } catch {}
    }

    reunioes.push({ data, pauta, presentes, decisoes, criadoEm: new Date().toISOString() });

    const updated = await prisma.cIPA.update({
      where: { id },
      data: { reunioes: JSON.stringify(reunioes) },
      include: { empresa: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
