import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha, cargo, foto } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: { nome, email, senhaHash, cargo: cargo || 'Tecnico', foto: foto || null },
    });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo, foto: user.foto },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const valid = await bcrypt.compare(senha, user.senhaHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo, foto: user.foto },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, nome: true, email: true, cargo: true, foto: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', authMiddleware, async (req: any, res) => {
  try {
    const { nome, email, senha, foto } = req.body;
    const data: any = {};
    if (nome) data.nome = nome;
    if (email) data.email = email;
    if (foto !== undefined) data.foto = foto;
    if (senha) data.senhaHash = await bcrypt.hash(senha, 10);

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, nome: true, email: true, cargo: true, foto: true },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
