import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getNextDate(freq: string, diaSemana?: number | null, diaMes?: number | null): Date {
  const now = new Date();
  let next = new Date(now);
  if (freq === 'semanal' && diaSemana != null) {
    const diff = ((diaSemana - now.getDay()) + 7) % 7 || 7;
    next.setDate(now.getDate() + diff);
  } else if (freq === 'quinzenal') {
    next.setDate(now.getDate() + 14);
  } else if (freq === 'mensal' && diaMes != null) {
    next.setDate(diaMes);
    if (next <= now) next = addMonths(next, 1);
  } else if (freq === 'trimestral') {
    next = addMonths(now, 3);
  } else if (freq === 'semestral') {
    next = addMonths(now, 6);
  } else if (freq === 'anual') {
    next = addMonths(now, 12);
  } else {
    next.setDate(now.getDate() + 30);
  }
  return next;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId } = req.query;
    const where: any = { userId };
    if (empresaId) where.empresaId = empresaId as string;
    const items = await prisma.cronogramaInspecoes.findMany({
      where, include: { empresa: true, inspecoes: true }, orderBy: { proximaData: 'asc' },
    });
    res.json(items);
  } catch { res.status(500).json({ error: 'Erro ao buscar cronogramas' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await prisma.cronogramaInspecoes.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true, inspecoes: true },
    });
    if (!item) return res.status(404).json({ error: 'Não encontrado' });
    res.json(item);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId, titulo, descricao, nr, frequencia, diaSemana, diaMes, horaPreferida, responsavelId } = req.body;
    if (!empresaId || !titulo || !frequencia) return res.status(400).json({ error: 'empresaId, titulo e frequencia são obrigatórios' });
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    const proximaData = getNextDate(frequencia, diaSemana, diaMes);
    const item = await prisma.cronogramaInspecoes.create({
      data: { userId, empresaId, titulo, descricao, nr, frequencia, diaSemana, diaMes, horaPreferida, responsavelId, proximaData },
    });
    res.status(201).json(item);
  } catch { res.status(500).json({ error: 'Erro ao criar' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { titulo, descricao, nr, frequencia, diaSemana, diaMes, horaPreferida, responsavelId, ativo } = req.body;
    const existing = await prisma.cronogramaInspecoes.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });
    const proximaData = frequencia ? getNextDate(frequencia, diaSemana, diaMes) : existing.proximaData;
    const item = await prisma.cronogramaInspecoes.update({
      where: { id },
      data: { titulo, descricao, nr, frequencia, diaSemana, diaMes, horaPreferida, responsavelId, ativo, proximaData },
    });
    res.json(item);
  } catch { res.status(500).json({ error: 'Erro ao atualizar' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.cronogramaInspecoes.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });
    await prisma.cronogramaInspecoes.delete({ where: { id } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Erro ao excluir' }); }
});

router.post('/:id/gerar', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const cronograma = await prisma.cronogramaInspecoes.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!cronograma) return res.status(404).json({ error: 'Não encontrado' });
    const items = await prisma.inspecoesAgendadas.findMany({
      where: { cronogramaId: cronograma.id, dataAgendada: cronograma.proximaData! },
    });
    if (items.length > 0) return res.status(400).json({ error: 'Já existe inspeção agendada para esta data' });
    const agendada = await prisma.inspecoesAgendadas.create({
      data: { cronogramaId: cronograma.id, dataAgendada: cronograma.proximaData! },
    });
    const nextDate = getNextDate(cronograma.frequencia, cronograma.diaSemana, cronograma.diaMes);
    await prisma.cronogramaInspecoes.update({
      where: { id: cronograma.id },
      data: { ultimaData: cronograma.proximaData, proximaData: nextDate },
    });
    res.status(201).json(agendada);
  } catch { res.status(500).json({ error: 'Erro ao gerar inspeção' }); }
});

router.get('/:id/agendadas', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.cronogramaInspecoes.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });
    const items = await prisma.inspecoesAgendadas.findMany({
      where: { cronogramaId: id }, orderBy: { dataAgendada: 'desc' },
    });
    res.json(items);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

export default router;
