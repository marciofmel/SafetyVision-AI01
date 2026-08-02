import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function isAdmin(req: AuthRequest) {
  return (req as any).userCargo === 'Admin' || (req as any).userCargo === 'Administrador';
}

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin' && user?.cargo !== 'Administrador') return res.status(403).json({ error: 'Acesso negado' });

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
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin' && user?.cargo !== 'Administrador') return res.status(403).json({ error: 'Acesso negado' });

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
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin' && user?.cargo !== 'Administrador') return res.status(403).json({ error: 'Acesso negado' });

    const { nome, email, cargo, foto } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
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
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin' && user?.cargo !== 'Administrador') return res.status(403).json({ error: 'Acesso negado' });

    await prisma.user.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
