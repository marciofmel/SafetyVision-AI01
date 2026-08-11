import { Router } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const alertas = await prisma.alerta.findMany({
      where: { userId: req.userId! },
      include: { empresa: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(alertas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/nao-lidos', async (req: AuthRequest, res) => {
  try {
    const count = await prisma.alerta.count({
      where: { userId: req.userId!, lido: false },
    });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gerar', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const daqui30 = new Date();
    daqui30.setDate(daqui30.getDate() + 30);
    let criados = 0;

    // EPIs com CA vencido ou próximo
    const episVencidos = await prisma.epi.findMany({
      where: { userId: req.userId!, status: 'ativo', validadeCa: { lt: daqui30 } },
      include: { empresa: true },
    });
    for (const epi of episVencidos) {
      const existe = await prisma.alerta.findFirst({
        where: { userId: req.userId!, entidadeTipo: 'epi', entidadeId: epi.id, resolvido: false },
      });
      if (!existe) {
        const vencido = epi.validadeCa! < hoje;
        await prisma.alerta.create({
          data: {
            userId: req.userId!,
            empresaId: epi.empresaId,
            tipo: vencido ? 'epi_vencido' : 'epi_proximo',
            titulo: `EPI "${epi.nome}" ${vencido ? 'vencido' : 'próximo do vencimento'}`,
            descricao: `CA do EPI "${epi.nome}" (${epi.ca || 'S/N'}) ${vencido ? 'já venceu' : 'vence em breve'}. Fabricante: ${epi.fabricante || 'N/I'}.`,
            dataVencimento: epi.validadeCa,
            entidadeTipo: 'epi',
            entidadeId: epi.id,
          },
        });
        criados++;
      }
    }

    // ASOs vencidos ou próximos
    const asosProximos = await prisma.aSO.findMany({
      where: { userId: req.userId!, validoAte: { lt: daqui30 } },
      include: { colaborador: true, empresa: true },
    });
    for (const aso of asosProximos) {
      const existe = await prisma.alerta.findFirst({
        where: { userId: req.userId!, entidadeTipo: 'aso', entidadeId: aso.id, resolvido: false },
      });
      if (!existe) {
        const vencido = aso.validoAte < hoje;
        await prisma.alerta.create({
          data: {
            userId: req.userId!,
            empresaId: aso.empresaId,
            tipo: vencido ? 'aso_vencido' : 'aso_proximo',
            titulo: `ASO de "${aso.colaborador.nome}" ${vencido ? 'vencido' : 'próximo do vencimento'}`,
            descricao: `ASO (${aso.tipoExame}) do colaborador "${aso.colaborador.nome}" ${vencido ? 'já venceu' : 'vence em breve'}. Médico: ${aso.medico || 'N/I'}.`,
            dataVencimento: aso.validoAte,
            entidadeTipo: 'aso',
            entidadeId: aso.id,
          },
        });
        criados++;
      }
    }

    // Treinamentos vencidos ou próximos
    const treinamentosProximos = await prisma.treinamento.findMany({
      where: { userId: req.userId!, dataFim: { lt: daqui30 }, status: { not: 'concluido' } },
      include: { empresa: true },
    });
    for (const treinamento of treinamentosProximos) {
      const existe = await prisma.alerta.findFirst({
        where: { userId: req.userId!, entidadeTipo: 'treinamento', entidadeId: treinamento.id, resolvido: false },
      });
      if (!existe) {
        const vencido = treinamento.dataFim! < hoje;
        await prisma.alerta.create({
          data: {
            userId: req.userId!,
            empresaId: treinamento.empresaId,
            tipo: vencido ? 'treinamento_vencido' : 'treinamento_proximo',
            titulo: `Treinamento "${treinamento.nome}" ${vencido ? 'atrasado' : 'próximo do prazo'}`,
            descricao: `Treinamento "${treinamento.nome}" (NR ${treinamento.nr || 'N/I'}) ${vencido ? 'está atrasado' : 'está próximo do prazo final'}.`,
            dataVencimento: treinamento.dataFim,
            entidadeTipo: 'treinamento',
            entidadeId: treinamento.id,
          },
        });
        criados++;
      }
    }

    res.json({ criados, mensagem: `${criados} alertas criados` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/lido', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.alerta.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Alerta não encontrado' });
    const alerta = await prisma.alerta.update({ where: { id }, data: { lido: true } });
    res.json(alerta);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/resolver', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.alerta.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Alerta não encontrado' });
    const alerta = await prisma.alerta.update({ where: { id }, data: { resolvido: true, lido: true } });
    res.json(alerta);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.alerta.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Alerta não encontrado' });
    await prisma.alerta.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
