import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
  if (user?.cargo !== 'Admin' && user?.cargo !== 'Administrador') {
    res.status(403).json({ error: 'Acesso negado' });
    return false;
  }
  return true;
}

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const users = await prisma.user.findMany({
      select: { id: true, nome: true, email: true, cargo: true, foto: true, ativo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req: any, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { nome, email, senha, cargo, foto } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' });

    const senhaHash = await bcrypt.hash(senha, 10);
    const newUser = await prisma.user.create({
      data: { nome, email, senhaHash, cargo: cargo || 'Tecnico', foto: foto || null },
      select: { id: true, nome: true, email: true, cargo: true, foto: true, createdAt: true },
    });
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const id = String(req.params.id);
    const { nome, email, cargo, foto } = req.body;
    const updated = await prisma.user.update({
      where: { id },
      data: { nome, email, cargo, foto: foto !== undefined ? foto : undefined },
      select: { id: true, nome: true, email: true, cargo: true, foto: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const id = String(req.params.id);
    await prisma.user.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
