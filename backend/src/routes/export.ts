import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/colaboradores', async (req: AuthRequest, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: { userId: req.userId!, ativo: true },
      include: { setor: true, empresa: true },
      orderBy: { nome: 'asc' },
    });

    const headers = ['Nome', 'CPF', 'RG', 'Cargo', 'Empresa', 'Setor', 'Telefone', 'Email', 'Data Nascimento', 'Admissão', 'Matrícula', 'ASO'];
    const rows = colaboradores.map(c => [
      escapeCsv(c.nome),
      escapeCsv(c.cpf),
      escapeCsv(c.rg),
      escapeCsv(c.cargo),
      escapeCsv(c.empresa?.nome),
      escapeCsv(c.setor?.nome),
      escapeCsv(c.telefone),
      escapeCsv(c.email),
      escapeCsv(c.dataNascimento),
      escapeCsv(c.admissao),
      escapeCsv(c.matricula),
      escapeCsv(c.aso),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=colaboradores-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inspecoes', async (req: AuthRequest, res) => {
  try {
    const inspecoes = await prisma.inspecao.findMany({
      where: { usuarioId: req.userId! },
      include: { empresa: true, setor: true, _count: { select: { riscos: true, epiViolacoes: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Data', 'Empresa', 'Setor', 'Status', 'Nota', 'Riscos', 'EPIs Ausentes', 'Latitude', 'Longitude'];
    const rows = inspecoes.map(i => [
      escapeCsv(new Date(i.createdAt).toLocaleDateString('pt-BR')),
      escapeCsv(i.empresa?.nome),
      escapeCsv(i.setor?.nome),
      escapeCsv(i.status === 'em_andamento' ? 'Em andamento' : i.status === 'analisada' ? 'Analisada' : 'Concluída'),
      escapeCsv(i.notaConformidade),
      escapeCsv(i._count?.riscos),
      escapeCsv(i._count?.epiViolacoes),
      escapeCsv(i.latitude),
      escapeCsv(i.longitude),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=inspecoes-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/riscos', async (req: AuthRequest, res) => {
  try {
    const riscos = await prisma.risco.findMany({
      where: { inspecao: { usuarioId: req.userId! } },
      include: { inspecao: { include: { empresa: true, setor: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Data', 'Empresa', 'Setor', 'Categoria', 'Descrição', 'Gravidade', 'Local', 'NRs', 'Prevenção', 'Correção'];
    const rows = riscos.map(r => [
      escapeCsv(new Date(r.createdAt).toLocaleDateString('pt-BR')),
      escapeCsv(r.inspecao?.empresa?.nome),
      escapeCsv(r.inspecao?.setor?.nome),
      escapeCsv(r.categoria),
      escapeCsv(r.descricao),
      escapeCsv(r.gravidade),
      escapeCsv(r.localIdentificado),
      escapeCsv(r.nrsRelacionadas),
      escapeCsv(r.medidasPreventivas),
      escapeCsv(r.medidasCorretivas),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=riscos-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
