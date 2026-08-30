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
  try {
    const { empresaId, setorId, status } = req.query;
    const where: any = { usuarioId: req.userId! };
    if (empresaId) where.empresaId = String(empresaId);
    if (setorId) where.setorId = String(setorId);
    if (status) where.status = String(status);

    const inspecoes = await prisma.inspecao.findMany({
      where,
      include: { empresa: true, setor: true, _count: { select: { midias: true, riscos: true, epiViolacoes: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(inspecoes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const inspecao = await prisma.inspecao.findFirst({
      where: { id, usuarioId: req.userId! },
      include: { empresa: true, setor: true, midias: true, riscos: true, epiViolacoes: true, usuario: { select: { nome: true, email: true } } },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });
    res.json(inspecao);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { empresaId, setorId, observacoes, latitude, longitude } = req.body;
    if (!empresaId || !setorId) return res.status(400).json({ error: 'Empresa e setor são obrigatórios' });

    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada.' });

    const setor = await prisma.setor.findFirst({ where: { id: setorId, userId: req.userId! } });
    if (!setor) return res.status(400).json({ error: 'Setor não encontrado.' });

    const inspecao = await prisma.inspecao.create({
      data: {
        empresaId,
        setorId,
        usuarioId: req.userId!,
        observacoes,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
      include: { empresa: true, setor: true },
    });
    res.status(201).json(inspecao);
  } catch (err: any) {
    console.error('Erro ao criar inspeção:', err.message);
    res.status(500).json({ error: 'Erro ao criar inspeção.' });
  }
});

router.post('/:id/midias', upload.array('files', 20), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const inspecao = await prisma.inspecao.findFirst({
      where: { id, usuarioId: req.userId! },
      include: { empresa: true, setor: true },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const files = req.files as Express.Multer.File[];
    const midias = [];
    let fotos = 0, videos = 0;

    for (const file of files) {
      const tipo = file.mimetype.startsWith('video/') ? 'video' : 'foto';
      if (tipo === 'foto') fotos++; else videos++;
      let dadosBase64: string | null = null;
      if (tipo === 'foto') {
        try {
          const filePath = path.join(uploadDir, file.filename);
          const buf = fs.readFileSync(filePath);
          dadosBase64 = `data:${file.mimetype};base64,${buf.toString('base64')}`;
        } catch {}
      }
      const midia = await prisma.midia.create({
        data: { inspecaoId: id, tipo, url: `/uploads/${file.filename}`, nome: file.originalname, dadosBase64 },
      });
      midias.push(midia);
    }

    await prisma.inspecao.update({
      where: { id },
      data: { totalFotos: { increment: fotos }, totalVideos: { increment: videos } },
    });

    res.json(midias);
  } catch (err: any) {
    console.error('Erro ao enviar mídias:', err.message);
    res.status(500).json({ error: 'Erro ao enviar arquivos' });
  }
});

router.put('/:id/finalizar', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const inspecao = await prisma.inspecao.findFirst({ where: { id, usuarioId: req.userId! } });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });

    const { observacoes, notaConformidade } = req.body;
    const updated = await prisma.inspecao.update({
      where: { id },
      data: { status: 'concluida', dataFim: new Date(), observacoes, notaConformidade: parseFloat(notaConformidade) || null },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
