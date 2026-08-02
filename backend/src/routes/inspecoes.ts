import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  const { empresaId, setorId } = req.query;
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { cargo: true } });
  const isAdmin = user?.cargo === 'Admin' || user?.cargo === 'Administrador';

  const where: any = {};
  if (!isAdmin) where.usuarioId = req.userId;
  if (empresaId) where.empresaId = empresaId as string;
  if (setorId) where.setorId = setorId as string;

  const inspecoes = await prisma.inspecao.findMany({
    where,
    include: { empresa: true, setor: true, usuario: { select: { nome: true, email: true } }, _count: { select: { midias: true, riscos: true, epiViolacoes: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(inspecoes);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const inspecao = await prisma.inspecao.findUnique({
    where: { id },
    include: { empresa: true, setor: true, midias: true, riscos: true, epiViolacoes: true, usuario: { select: { nome: true, email: true } } },
  });
  if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });
  res.json(inspecao);
});

router.post('/', async (req: AuthRequest, res) => {
  const { empresaId, setorId, observacoes } = req.body;
  if (!empresaId || !setorId) return res.status(400).json({ error: 'Empresa e setor são obrigatórios' });

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada. Cadastre uma empresa primeiro.' });

  const setor = await prisma.setor.findUnique({ where: { id: setorId } });
  if (!setor) return res.status(400).json({ error: 'Setor não encontrado. Cadastre um setor primeiro.' });

  const inspecao = await prisma.inspecao.create({
    data: { empresaId, setorId, usuarioId: req.userId!, observacoes },
    include: { empresa: true, setor: true },
  });
  res.status(201).json(inspecao);
});

router.post('/:id/midias', upload.array('files', 20), async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const inspecao = await prisma.inspecao.findUnique({ where: { id } });
  if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

  const files = req.files as Express.Multer.File[];
  const midias = [];
  let fotos = 0, videos = 0;

  for (const file of files) {
    const tipo = file.mimetype.startsWith('video/') ? 'video' : 'foto';
    if (tipo === 'foto') fotos++; else videos++;
    const midia = await prisma.midia.create({
      data: { inspecaoId: id, tipo, url: `/uploads/${file.filename}`, nome: file.originalname },
    });
    midias.push(midia);
  }

  await prisma.inspecao.update({
    where: { id },
    data: { totalFotos: { increment: fotos }, totalVideos: { increment: videos } },
  });

  res.json(midias);
});

router.put('/:id/finalizar', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { observacoes, notaConformidade } = req.body;
  const inspecao = await prisma.inspecao.update({
    where: { id },
    data: { status: 'concluida', dataFim: new Date(), observacoes, notaConformidade: parseFloat(notaConformidade) || null },
  });
  res.json(inspecao);
});

export default router;
