import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

async function authAdmin(req: any, res: any, next: any) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin' && user?.cargo !== 'Administrador') {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/* EMPRESAS */
router.get('/empresas', authAdmin, async (_req: AuthRequest, res) => {
  try {
    const empresas = await prisma.empresa.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { setores: true } }, user: { select: { nome: true, email: true } } },
    });
    res.json(empresas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/empresas', authAdmin, async (req: AuthRequest, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    const empresa = await prisma.empresa.create({ data: { userId: req.userId!, nome, ...req.body } });
    res.status(201).json(empresa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/empresas/:id', authAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.empresa.findFirst({ where: { id, ativo: true } });
    if (!existing) return res.status(404).json({ error: 'Empresa não encontrada' });
    const { nome, ...rest } = req.body;
    const empresa = await prisma.empresa.update({ where: { id }, data: { nome, ...rest } });
    res.json(empresa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/empresas/:id', authAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.empresa.findFirst({ where: { id, ativo: true } });
    if (!existing) return res.status(404).json({ error: 'Empresa não encontrada' });
    await prisma.empresa.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* SETORES */
router.get('/setores', authAdmin, async (_req: AuthRequest, res) => {
  try {
    const setores = await prisma.setor.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: { empresa: { select: { nome: true } } },
    });
    res.json(setores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/setores', authAdmin, async (req: AuthRequest, res) => {
  try {
    const { nome, empresaId } = req.body;
    if (!nome || !empresaId) return res.status(400).json({ error: 'Nome e empresa são obrigatórios' });
    const setor = await prisma.setor.create({ data: { userId: req.userId!, nome, empresaId, descricao: req.body.descricao } });
    res.status(201).json(setor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/setores/:id', authAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.setor.findFirst({ where: { id, ativo: true } });
    if (!existing) return res.status(404).json({ error: 'Setor não encontrado' });
    const setor = await prisma.setor.update({ where: { id }, data: req.body });
    res.json(setor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/setores/:id', authAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.setor.findFirst({ where: { id, ativo: true } });
    if (!existing) return res.status(404).json({ error: 'Setor não encontrado' });
    await prisma.setor.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* COLABORADORES */
router.get('/colaboradores', authAdmin, async (_req: AuthRequest, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: { setor: { select: { nome: true } }, empresa: { select: { nome: true } } },
    });
    res.json(colaboradores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/colaboradores', authAdmin, async (req: AuthRequest, res) => {
  try {
    const { nome, empresaId } = req.body;
    if (!nome || !empresaId) return res.status(400).json({ error: 'Nome e empresa são obrigatórios' });
    const colaborador = await prisma.colaborador.create({
      data: { userId: req.userId!, nome, empresaId, cargo: req.body.cargo, setorId: req.body.setorId || null },
    });
    res.status(201).json(colaborador);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/colaboradores/:id', authAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.colaborador.findFirst({ where: { id, ativo: true } });
    if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
    const colaborador = await prisma.colaborador.update({ where: { id }, data: req.body });
    res.json(colaborador);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/colaboradores/:id', authAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.colaborador.findFirst({ where: { id, ativo: true } });
    if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
    await prisma.colaborador.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* INSPEÇÕES */
router.get('/inspecoes', authAdmin, async (_req: AuthRequest, res) => {
  try {
    const inspecoes = await prisma.inspecao.findMany({
      include: {
        empresa: true,
        setor: true,
        usuario: { select: { nome: true, email: true } },
        _count: { select: { midias: true, riscos: true, epiViolacoes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(inspecoes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inspecoes/:id', authAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const inspecao = await prisma.inspecao.findFirst({
      where: { id },
      include: { empresa: true, setor: true, midias: true, riscos: true, epiViolacoes: true, usuario: { select: { nome: true, email: true } } },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });
    res.json(inspecao);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;