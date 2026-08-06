import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const treinamentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  nr: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  cargaHoraria: z.number().nullable().optional(),
  empresaId: z.string().min(1, 'Empresa é obrigatória'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().nullable().optional(),
  local: z.string().nullable().optional(),
  instrutor: z.string().nullable().optional(),
  status: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const treinamentos = await prisma.treinamento.findMany({
      where: { userId: req.userId! },
      include: { empresa: true, participacoes: { include: { colaborador: true } } },
      orderBy: { dataInicio: 'desc' },
    });
    res.json(treinamentos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const treinamento = await prisma.treinamento.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true, participacoes: { include: { colaborador: true } } },
    });
    if (!treinamento) return res.status(404).json({ error: 'Treinamento não encontrado' });
    res.json(treinamento);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = treinamentoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const { empresaId, dataInicio, dataFim, ...rest } = parsed.data;
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    const treinamento = await prisma.treinamento.create({
      data: {
        userId: req.userId!,
        empresaId,
        ...rest,
        dataInicio: new Date(dataInicio),
        dataFim: dataFim ? new Date(dataFim) : null,
      },
      include: { empresa: true },
    });
    res.status(201).json(treinamento);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.treinamento.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Treinamento não encontrado' });

    const parsed = treinamentoSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const data: any = { ...parsed.data };
    if (data.dataInicio) data.dataInicio = new Date(data.dataInicio);
    if (data.dataFim) data.dataFim = new Date(data.dataFim);

    const treinamento = await prisma.treinamento.update({ where: { id }, data, include: { empresa: true } });
    res.json(treinamento);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.treinamento.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Treinamento não encontrado' });
    await prisma.treinamento.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/participantes', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.treinamento.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Treinamento não encontrado' });

    const { colaboradorIds } = req.body;
    if (!Array.isArray(colaboradorIds) || colaboradorIds.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos 1 colaborador' });
    }

    const participacoes = await prisma.treinamentoParticipacao.createMany({
      data: colaboradorIds.map((colaboradorId: string) => ({
        treinamentoId: id,
        colaboradorId,
      })),
      skipDuplicates: true,
    });

    res.status(201).json({ criados: participacoes.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/participacao/:participacaoId', async (req: AuthRequest, res) => {
  try {
    const participacaoId = String(req.params.participacaoId);
    const participacao = await prisma.treinamentoParticipacao.findUnique({
      where: { id: participacaoId },
      include: { treinamento: true },
    });
    if (!participacao) return res.status(404).json({ error: 'Participação não encontrada' });
    if (participacao.treinamento.userId !== req.userId) return res.status(403).json({ error: 'Acesso negado' });

    const { status, dataConclusao, certificado, nota, observacao } = req.body;
    const updated = await prisma.treinamentoParticipacao.update({
      where: { id: participacaoId },
      data: {
        status: status || undefined,
        dataConclusao: dataConclusao ? new Date(dataConclusao) : undefined,
        certificado: certificado || undefined,
        nota: nota !== undefined ? parseFloat(nota) : undefined,
        observacao: observacao || undefined,
      },
      include: { colaborador: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
