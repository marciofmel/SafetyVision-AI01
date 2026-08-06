import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const templateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().nullable().optional(),
  nr: z.string().min(1, 'NR é obrigatória'),
  itens: z.array(z.object({
    texto: z.string().min(1, 'Texto é obrigatório'),
    obrigatorio: z.boolean().optional(),
  })).min(1, 'Adicione pelo menos 1 item'),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.checklistTemplate.findMany({
      where: { userId: req.userId! },
      include: { _count: { select: { itens: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const template = await prisma.checklistTemplate.findFirst({
      where: { id, userId: req.userId! },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
    if (!template) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { nome, descricao, nr, itens } = parsed.data;
    const template = await prisma.checklistTemplate.create({
      data: {
        userId: req.userId!,
        nome,
        descricao,
        nr,
        itens: {
          create: itens.map((item, i) => ({
            texto: item.texto,
            obrigatorio: item.obrigatorio ?? true,
            ordem: i,
          })),
        },
      },
      include: { itens: true },
    });
    res.status(201).json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.checklistTemplate.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Template não encontrado' });

    const parsed = templateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { nome, descricao, nr, itens } = parsed.data as any;

    if (itens) {
      await prisma.checklistItem.deleteMany({ where: { templateId: id } });
    }

    const template = await prisma.checklistTemplate.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(nr && { nr }),
        ...(itens && {
          itens: {
            create: itens.map((item: any, i: number) => ({
              texto: item.texto,
              obrigatorio: item.obrigatorio ?? true,
              ordem: i,
            })),
          },
        }),
      },
      include: { itens: true },
    });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.checklistTemplate.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Template não encontrado' });
    await prisma.checklistTemplate.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:templateId/responder', async (req: AuthRequest, res) => {
  try {
    const templateId = String(req.params.templateId);
    const template = await prisma.checklistTemplate.findFirst({
      where: { id: templateId, userId: req.userId! },
      include: { itens: true },
    });
    if (!template) return res.status(404).json({ error: 'Template não encontrado' });

    const { inspecaoId, respostas } = req.body;
    if (!inspecaoId || !Array.isArray(respostas)) {
      return res.status(400).json({ error: 'inspecaoId e respostas são obrigatórios' });
    }

    const inspecao = await prisma.inspecao.findFirst({
      where: { id: inspecaoId, usuarioId: req.userId! },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const created = await prisma.checklistResposta.createMany({
      data: respostas.map((r: any) => ({
        inspecaoId,
        templateId,
        itemId: r.itemId,
        conformidade: r.conformidade,
        observacao: r.observacao || null,
      })),
    });

    res.status(201).json({ criados: created.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/respostas/:inspecaoId', async (req: AuthRequest, res) => {
  try {
    const inspecaoId = String(req.params.inspecaoId);
    const inspecao = await prisma.inspecao.findFirst({
      where: { id: inspecaoId, usuarioId: req.userId! },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const respostas = await prisma.checklistResposta.findMany({
      where: { inspecaoId },
      include: { template: true, item: true },
    });
    res.json(respostas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
