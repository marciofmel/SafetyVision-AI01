import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin') return res.status(403).json({ error: 'Acesso negado' });

    const users = await prisma.user.findMany({
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin') return res.status(403).json({ error: 'Acesso negado' });

    const { nome, email, cargo } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { nome, email, cargo },
      select: { id: true, nome: true, email: true, cargo: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { cargo: true } });
    if (user?.cargo !== 'Admin') return res.status(403).json({ error: 'Acesso negado' });

    await prisma.user.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
