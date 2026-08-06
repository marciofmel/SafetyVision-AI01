import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const epiSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ca: z.string().nullable().optional(),
  fabricante: z.string().nullable().optional(),
  validadeCa: z.string().nullable().optional(),
  dataCompra: z.string().nullable().optional(),
  vidaUtilMeses: z.number().nullable().optional(),
  empresaId: z.string().min(1, 'Empresa é obrigatória'),
  setorId: z.string().nullable().optional(),
  status: z.string().optional(),
  observacoes: z.string().nullable().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const epis = await prisma.epi.findMany({
      where: { userId: req.userId!, status: { not: 'inativo' } },
      include: { empresa: true, setor: true, entregas: { include: { colaborador: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(epis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const epi = await prisma.epi.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true, setor: true, entregas: { include: { colaborador: true } } },
    });
    if (!epi) return res.status(404).json({ error: 'EPI não encontrado' });
    res.json(epi);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = epiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const { empresaId, ...data } = parsed.data;
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    const epi = await prisma.epi.create({
      data: {
        userId: req.userId!,
        empresaId,
        ...data,
        validadeCa: data.validadeCa ? new Date(data.validadeCa) : null,
        dataCompra: data.dataCompra ? new Date(data.dataCompra) : null,
      },
      include: { empresa: true, setor: true },
    });
    res.status(201).json(epi);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.epi.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'EPI não encontrado' });

    const parsed = epiSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const data: any = { ...parsed.data };
    if (data.validadeCa) data.validadeCa = new Date(data.validadeCa);
    if (data.dataCompra) data.dataCompra = new Date(data.dataCompra);

    const epi = await prisma.epi.update({ where: { id }, data, include: { empresa: true, setor: true } });
    res.json(epi);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.epi.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'EPI não encontrado' });
    await prisma.epi.update({ where: { id }, data: { status: 'inativo' } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/entregar', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.epi.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'EPI não encontrado' });

    const { colaboradorId, assinatura, observacao } = req.body;
    if (!colaboradorId) return res.status(400).json({ error: 'Colaborador é obrigatório' });

    const entrega = await prisma.epiEntrega.create({
      data: {
        epiId: id,
        colaboradorId,
        assinatura: assinatura || null,
        observacao: observacao || null,
      },
      include: { colaborador: true },
    });
    res.status(201).json(entrega);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/entrega/:entregaId/devolver', async (req: AuthRequest, res) => {
  try {
    const entregaId = String(req.params.entregaId);
    const entrega = await prisma.epiEntrega.findUnique({ where: { id: entregaId }, include: { epi: true } });
    if (!entrega) return res.status(404).json({ error: 'Entrega não encontrada' });
    if (entrega.epi.userId !== req.userId) return res.status(403).json({ error: 'Acesso negado' });

    const updated = await prisma.epiEntrega.update({
      where: { id: entregaId },
      data: { dataDevolucao: new Date() },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alertas/vencidos', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const epis = await prisma.epi.findMany({
      where: {
        userId: req.userId!,
        status: 'ativo',
        validadeCa: { lt: hoje },
      },
      include: { empresa: true },
    });
    res.json(epis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alertas/proximos', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const daqui30 = new Date();
    daqui30.setDate(daqui30.getDate() + 30);

    const epis = await prisma.epi.findMany({
      where: {
        userId: req.userId!,
        status: 'ativo',
        validadeCa: { gte: hoje, lte: daqui30 },
      },
      include: { empresa: true },
    });
    res.json(epis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
