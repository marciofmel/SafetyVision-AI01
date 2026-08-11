import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const asoSchema = z.object({
  colaboradorId: z.string().min(1, 'Colaborador é obrigatório'),
  empresaId: z.string().min(1, 'Empresa é obrigatória'),
  tipoExame: z.string().min(1, 'Tipo de exame é obrigatório'),
  dataExame: z.string().min(1, 'Data do exame é obrigatória'),
  validoAte: z.string().min(1, 'Data de validade é obrigatória'),
  medico: z.string().nullable().optional(),
  crm: z.string().nullable().optional(),
  resultado: z.string().optional(),
  restricoes: z.string().nullable().optional(),
  examesComplementares: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  arquivoUrl: z.string().nullable().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const asos = await prisma.aSO.findMany({
      where: { userId: req.userId! },
      include: { colaborador: true, empresa: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(asos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alertas', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const daqui30 = new Date();
    daqui30.setDate(daqui30.getDate() + 30);

    const vencidos = await prisma.aSO.findMany({
      where: { userId: req.userId!, validoAte: { lt: hoje } },
      include: { colaborador: true, empresa: true },
    });

    const proximos = await prisma.aSO.findMany({
      where: { userId: req.userId!, validoAte: { gte: hoje, lte: daqui30 } },
      include: { colaborador: true, empresa: true },
    });

    res.json({ vencidos, proximos, totalVencidos: vencidos.length, totalProximos: proximos.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const aso = await prisma.aSO.findFirst({
      where: { id, userId: req.userId! },
      include: { colaborador: true, empresa: true },
    });
    if (!aso) return res.status(404).json({ error: 'ASO não encontrado' });
    res.json(aso);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = asoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const { empresaId, colaboradorId, dataExame, validoAte, ...data } = parsed.data;

    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    const colaborador = await prisma.colaborador.findFirst({ where: { id: colaboradorId, userId: req.userId! } });
    if (!colaborador) return res.status(400).json({ error: 'Colaborador não encontrado' });

    const hoje = new Date();
    const validadeDate = new Date(validoAte);
    let status = 'valido';
    if (validadeDate < hoje) status = 'vencido';
    else {
      const daqui30 = new Date();
      daqui30.setDate(daqui30.getDate() + 30);
      if (validadeDate <= daqui30) status = 'proximo_vencimento';
    }

    const aso = await prisma.aSO.create({
      data: {
        userId: req.userId!,
        empresaId,
        colaboradorId,
        dataExame: new Date(dataExame),
        validoAte: validadeDate,
        status,
        ...data,
      },
      include: { colaborador: true, empresa: true },
    });
    res.status(201).json(aso);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.aSO.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'ASO não encontrado' });

    const parsed = asoSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const data: any = { ...parsed.data };
    if (data.dataExame) data.dataExame = new Date(data.dataExame);
    if (data.validoAte) {
      data.validoAte = new Date(data.validoAte);
      const hoje = new Date();
      const daqui30 = new Date();
      daqui30.setDate(daqui30.getDate() + 30);
      if (data.validoAte < hoje) data.status = 'vencido';
      else if (data.validoAte <= daqui30) data.status = 'proximo_vencimento';
      else data.status = 'valido';
    }

    const aso = await prisma.aSO.update({ where: { id }, data, include: { colaborador: true, empresa: true } });
    res.json(aso);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.aSO.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'ASO não encontrado' });
    await prisma.aSO.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
