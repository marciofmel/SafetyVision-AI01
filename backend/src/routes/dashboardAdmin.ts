import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

function requireAdmin(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } }).then(u => u?.cargo === 'Admin' || u?.cargo === 'Administrador');
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const isAdmin = await requireAdmin(userId);
    if (!isAdmin) return res.status(403).json({ error: 'Acesso negado' });

    const totalUsuarios = await prisma.user.count();
    const usuariosAtivos = await prisma.user.count({ where: { ativo: true } });
    const totalEmpresas = await prisma.empresa.count();
    const totalInspecoes = await prisma.inspecao.count();
    const inspecoesConcluidas = await prisma.inspecao.count({ where: { status: 'concluido' } });
    const totalRiscos = await prisma.risco.count();
    const riscosAbertos = await prisma.risco.count({ where: { status: 'aberto' } });
    const totalLaudos = await prisma.laudo.count();
    const laudosAprovados = await prisma.laudo.count({ where: { aprovado: true } });
    const totalPGR = await prisma.pGR.count();
    const totalCronogramas = await prisma.cronogramaInspecoes.count();
    const totalEPIs = await prisma.epi.count();
    const totalTreinamentos = await prisma.treinamento.count();
    const totalIncidentes = await prisma.incidente.count();
    const incidentesGraves = await prisma.incidente.count({ where: { gravidade: { in: ['grave', 'fatal'] } } });

    const inspecoesPorDia = await prisma.inspecao.groupBy({
      by: ['dataInicio'], _count: true,
      orderBy: { dataInicio: 'desc' }, take: 30,
    });

    const usuariosPorCargo = await prisma.user.groupBy({
      by: ['cargo'], _count: true,
    });

    const planosStats = await prisma.planoUsuario.groupBy({
      by: ['status'], _count: true,
    });

    const topEmpresas = await prisma.empresa.findMany({
      include: { _count: { select: { inspecoes: true, colaboradores: true, setores: true } } },
      orderBy: { inspecoes: { _count: 'desc' } }, take: 10,
    });

    const conformidadeGeral = totalInspecoes > 0 ? Math.round((inspecoesConcluidas / totalInspecoes) * 100) : 0;

    res.json({
      totalUsuarios, usuariosAtivos, totalEmpresas, totalInspecoes,
      inspecoesConcluidas, totalRiscos, riscosAbertos, totalLaudos,
      laudosAprovados, totalPGR, totalCronogramas, totalEPIs,
      totalTreinamentos, totalIncidentes, incidentesGraves,
      conformidadeGeral, inspecoesPorDia, usuariosPorCargo,
      planosStats, topEmpresas,
    });
  } catch { res.status(500).json({ error: 'Erro ao buscar dashboard' }); }
});

export default router;
