import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId } = req.query;
    const empresaWhere: any = { userId };
    if (empresaId) empresaWhere.id = empresaId as string;

    const empresas = await prisma.empresa.findMany({ where: empresaWhere });

    const result = await Promise.all(empresas.map(async (emp) => {
      const totalInspecoes = await prisma.inspecao.count({ where: { empresaId: emp.id } });
      const inspecoesConformes = await prisma.inspecao.count({
        where: { empresaId: emp.id, notaConformidade: { gte: 70 } },
      });
      const totalRiscos = await prisma.risco.count({
        where: { inspecao: { empresaId: emp.id } },
      });
      const riscosFechados = await prisma.risco.count({
        where: { inspecao: { empresaId: emp.id }, status: 'resolvido' },
      });
      const totalSetores = await prisma.setor.count({ where: { empresaId: emp.id } });
      const totalColaboradores = await prisma.colaborador.count({ where: { empresaId: emp.id } });
      const totalEpis = await prisma.epi.count({ where: { empresaId: emp.id } });
      const episAtivos = await prisma.epi.count({ where: { empresaId: emp.id, status: 'ativo' } });
      const totalIncidentes = await prisma.incidente.count({ where: { empresaId: emp.id } });
      const incidentesGraves = await prisma.incidente.count({
        where: { empresaId: emp.id, gravidade: { in: ['grave', 'fatal'] } },
      });
      const totalTreinamentos = await prisma.treinamento.count({ where: { empresaId: emp.id } });

      const conformidadeNR = totalInspecoes > 0
        ? Math.round((inspecoesConformes / totalInspecoes) * 100)
        : 0;
      const resolucaoRiscos = totalRiscos > 0
        ? Math.round((riscosFechados / totalRiscos) * 100)
        : 0;
      const conformidadeEPI = totalEpis > 0
        ? Math.round((episAtivos / totalEpis) * 100)
        : 0;

      const geral = totalInspecoes > 0 || totalRiscos > 0 || totalEpis > 0
        ? Math.round((conformidadeNR + resolucaoRiscos + conformidadeEPI) / 3)
        : 0;

      return {
        empresaId: emp.id, empresaNome: emp.nome,
        geral, conformidadeNR, resolucaoRiscos, conformidadeEPI,
        totalInspecoes, inspecoesConformes,
        totalRiscos, riscosFechados,
        totalSetores, totalColaboradores,
        totalEpis, episAtivos,
        totalIncidentes, incidentesGraves,
        totalTreinamentos,
      };
    }));

    res.json(result);
  } catch { res.status(500).json({ error: 'Erro ao calcular conformidade' }); }
});

router.get('/por-nr', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId } = req.query;
    if (!empresaId) return res.status(400).json({ error: 'empresaId obrigatório' });

    const riscos = await prisma.risco.findMany({
      where: { inspecao: { empresaId: empresaId as string, usuarioId: userId } },
      select: { nrsRelacionadas: true, status: true },
    });

    const nrMap: Record<string, { total: number; resolvidos: number }> = {};
    riscos.forEach(r => {
      if (!r.nrsRelacionadas) return;
      r.nrsRelacionadas.split(',').map(s => s.trim()).filter(Boolean).forEach(nr => {
        if (!nrMap[nr]) nrMap[nr] = { total: 0, resolvidos: 0 };
        nrMap[nr].total++;
        if (r.status === 'resolvido') nrMap[nr].resolvidos++;
      });
    });

    const result = Object.entries(nrMap).map(([nr, data]) => ({
      nr, total: data.total, resolvidos: data.resolvidos,
      percentual: data.total > 0 ? Math.round((data.resolvidos / data.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    res.json(result);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.get('/por-setor', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId } = req.query;
    if (!empresaId) return res.status(400).json({ error: 'empresaId obrigatório' });

    const setores = await prisma.setor.findMany({
      where: { empresaId: empresaId as string },
      include: { inspecoes: { select: { notaConformidade: true, status: true } } },
    });

    const result = setores.map(s => {
      const specs = s.inspecoes;
      const conformes = specs.filter(i => (i.notaConformidade ?? 0) >= 70).length;
      return {
        setorId: s.id, setorNome: s.nome,
        totalInspecoes: specs.length,
        conformes,
        percentual: specs.length > 0 ? Math.round((conformes / specs.length) * 100) : 0,
      };
    });

    res.json(result);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

export default router;
