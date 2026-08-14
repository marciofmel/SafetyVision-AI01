import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { geminiConfigurada, geminiMidia, extrairJsonArray } from '../services/gemini';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const colaboradorSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  setorId: z.string().nullable().optional(),
  empresaId: z.string().min(1, 'Empresa é obrigatória'),
  telefone: z.string().nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional(),
  dataNascimento: z.string().nullable().optional(),
  admissao: z.string().nullable().optional(),
  matricula: z.string().nullable().optional(),
  aso: z.string().nullable().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: { userId: req.userId!, ativo: true },
      include: { setor: true },
      orderBy: { nome: 'asc' },
    });
    res.json(colaboradores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = colaboradorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { empresaId, ...data } = parsed.data;
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    const colab = await prisma.colaborador.create({
      data: { userId: req.userId!, ...data, empresaId },
    });
    res.status(201).json(colab);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/importar', async (req: AuthRequest, res) => {
  try {
    const { colaboradores, empresaId } = req.body;
    if (!Array.isArray(colaboradores) || colaboradores.length === 0) {
      return res.status(400).json({ error: 'Nenhum colaborador para importar' });
    }
    if (!empresaId) return res.status(400).json({ error: 'Empresa é obrigatória' });

    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    let criados = 0;
    let erros: string[] = [];

    for (let i = 0; i < colaboradores.length; i++) {
      const c = colaboradores[i];
      if (!c.nome) { erros.push(`Linha ${i + 1}: nome obrigatório`); continue; }
      try {
        await prisma.colaborador.create({
          data: {
            userId: req.userId!,
            nome: c.nome,
            cpf: c.cpf || null,
            rg: c.rg || null,
            cargo: c.cargo || null,
            setorId: c.setorId || null,
            empresaId,
            telefone: c.telefone || null,
            email: c.email || null,
            dataNascimento: c.dataNascimento || null,
            admissao: c.admissao || null,
            matricula: c.matricula || null,
            aso: c.aso || null,
          },
        });
        criados++;
      } catch (err: any) {
        erros.push(`Linha ${i + 1} (${c.nome}): ${err.message}`);
      }
    }
    res.json({ criados, erros, total: colaboradores.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/importar-pdf', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    const { empresaId } = req.body;
    if (!empresaId) return res.status(400).json({ error: 'Empresa é obrigatória' });

    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId: req.userId! } });
    if (!empresa) return res.status(400).json({ error: 'Empresa não encontrada' });

    if (!geminiConfigurada()) return res.status(500).json({ error: 'Chave de IA não configurada' });

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype === 'application/pdf' ? 'application/pdf' : 'image/png';

    const prompt = `Extraia TODOS os colaboradores/funcionários deste documento. Para cada pessoa, retorne um JSON array com objetos contendo: nome, cpf, rg, cargo, telefone, email, dataNascimento, admissao, matricula, aso (se disponível). Se um campo não for encontrado, use null. Retorne APENAS o JSON array, sem texto explicativo. Formato: [{"nome":"...","cpf":"...","rg":"...","cargo":"...","telefone":"...","email":"...","dataNascimento":"...","admissao":"...","matricula":"...","aso":"..."}]`;

    const content = await geminiMidia(prompt, mimeType, base64);
    const extracted = extrairJsonArray(content);
    let criados = 0;
    let erros: string[] = [];

    for (let i = 0; i < extracted.length; i++) {
      const c = extracted[i];
      if (!c.nome) { erros.push(`Item ${i + 1}: nome não encontrado`); continue; }
      try {
        await prisma.colaborador.create({
          data: {
            userId: req.userId!,
            nome: c.nome,
            cpf: c.cpf || null,
            rg: c.rg || null,
            cargo: c.cargo || null,
            empresaId,
            telefone: c.telefone || null,
            email: c.email || null,
            dataNascimento: c.dataNascimento || null,
            admissao: c.admissao || null,
            matricula: c.matricula || null,
            aso: c.aso || null,
          },
        });
        criados++;
      } catch (err: any) {
        erros.push(`Item ${i + 1} (${c.nome}): ${err.message}`);
      }
    }
    res.json({ criados, erros, total: extracted.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.colaborador.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
    const { nome, cpf, rg, cargo, setorId, empresaId, telefone, email, dataNascimento, admissao, matricula, aso } = req.body;
    const colab = await prisma.colaborador.update({
      where: { id },
      data: { nome, cpf, rg, cargo, setorId, empresaId, telefone, email, dataNascimento, admissao, matricula, aso },
    });
    res.json(colab);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.colaborador.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
    await prisma.colaborador.update({ where: { id }, data: { ativo: false } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
