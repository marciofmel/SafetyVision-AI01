import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const incidenteSchema = z.object({
  empresaId: z.string().min(1, 'Empresa é obrigatória'),
  setorId: z.string().nullable().optional(),
  dataIncidente: z.string().min(1, 'Data é obrigatória'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  gravidade: z.string().min(1, 'Gravidade é obrigatória'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  localIncidente: z.string().nullable().optional(),
  colaboradoresEnvolvidos: z.string().nullable().optional(),
  testemunhas: z.string().nullable().optional(),
  causas: z.string().nullable().optional(),
  acoesCorretivas: z.string().nullable().optional(),
  acoesPreventivas: z.string().nullable().optional(),
  danos: z.string().nullable().optional(),
  catNumero: z.string().nullable().optional(),
  catData: z.string().nullable().optional(),
  status: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const incidentes = await prisma.incidente.findMany({
      where: { userId: req.userId! },
      include: { empresa: true, setor: true },
      orderBy: { dataIncidente: 'desc' },
    });
    res.json(incidentes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const incidente = await prisma.incidente.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true, setor: true },
    });
    if (!incidente) return res.status(404).json({ error: 'Incidente não encontrado' });
    res.json(incidente);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = incidenteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const { empresaId, dataIncidente, catData, ...rest } = parsed.data;
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    const incidente = await prisma.incidente.create({
      data: {
        userId: req.userId!,
        empresaId,
        ...rest,
        dataIncidente: new Date(dataIncidente),
        catData: catData ? new Date(catData) : null,
      },
      include: { empresa: true, setor: true },
    });
    res.status(201).json(incidente);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.incidente.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Incidente não encontrado' });

    const parsed = incidenteSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const data: any = { ...parsed.data };
    if (data.dataIncidente) data.dataIncidente = new Date(data.dataIncidente);
    if (data.catData) data.catData = new Date(data.catData);

    const incidente = await prisma.incidente.update({ where: { id }, data, include: { empresa: true, setor: true } });
    res.json(incidente);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.incidente.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Incidente não encontrado' });
    await prisma.incidente.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
