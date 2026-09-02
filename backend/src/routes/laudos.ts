import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

function generateLaudoHtml(laudo: any, empresa: any, inspecao: any, riscos: any[], midias: any[]): string {
  const riscosHtml = riscos.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.categoria}</td>
      <td>${r.descricao}</td>
      <td>${r.localIdentificado}</td>
      <td>${r.gravidade}</td>
      <td>${r.medidasPreventivas}</td>
      <td>${r.medidasCorretivas}</td>
      <td>${r.prioridade}</td>
    </tr>
  `).join('');

  const imagensHtml = midias.filter(m => m.tipo === 'foto').map(m => `
    <div class="img-item">
      <img src="${m.url}" alt="${m.nome}" />
      <p>${m.descricao || m.nome}</p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #1a1a2e; }
    .header { text-align: center; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0f172a; font-size: 24px; }
    .header h2 { color: #f59e0b; font-size: 16px; font-weight: normal; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
    .info-item { font-size: 13px; }
    .info-item strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #0f172a; color: #f59e0b; }
    .section-title { color: #0f172a; font-size: 16px; margin: 30px 0 10px; border-left: 4px solid #f59e0b; padding-left: 10px; }
    .imgs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
    .img-item { text-align: center; }
    .img-item img { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
    .img-item p { font-size: 11px; color: #64748b; margin-top: 5px; }
    .signature { margin-top: 60px; text-align: center; }
    .signature-line { border-top: 1px solid #1a1a2e; width: 250px; margin: 0 auto; padding-top: 5px; }
    .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LAUDO DE INSPEÇÃO DE SEGURANÇA</h1>
    <h2>SafetyVision AI - Soluções em SST</h2>
  </div>
  <div class="info-grid">
    <div class="info-item"><strong>Empresa:</strong> ${empresa.nome}</div>
    <div class="info-item"><strong>CNPJ:</strong> ${empresa.cnpj || '---'}</div>
    <div class="info-item"><strong>Endereço:</strong> ${empresa.endereco || '---'}, ${empresa.cidade || ''}/${empresa.estado || ''}</div>
    <div class="info-item"><strong>Telefone:</strong> ${empresa.telefone || '---'}</div>
    <div class="info-item"><strong>Título:</strong> ${laudo.titulo}</div>
    <div class="info-item"><strong>Nº:</strong> ${laudo.id.slice(0, 8).toUpperCase()}</div>
    <div class="info-item"><strong>Data de Emissão:</strong> ${new Date(laudo.dataEmissao).toLocaleDateString('pt-BR')}</div>
    <div class="info-item"><strong>NR:</strong> ${laudo.nr || 'Geral'}</div>
    <div class="info-item"><strong>Tipo:</strong> ${laudo.tipo === 'inspecao' ? 'Inspeção' : laudo.tipo === 'pgr' ? 'PGR' : 'APR'}</div>
    <div class="info-item"><strong>Status:</strong> ${laudo.aprovado ? 'APROVADO' : 'RASCUNHO'}</div>
  </div>
  ${inspecao ? `
  <h3 class="section-title">Dados da Inspeção</h3>
  <div class="info-grid">
    <div class="info-item"><strong>Data Início:</strong> ${new Date(inspecao.dataInicio).toLocaleDateString('pt-BR')}</div>
    <div class="info-item"><strong>Status:</strong> ${inspecao.status}</div>
    <div class="info-item"><strong>Total de Fotos:</strong> ${inspecao.totalFotos}</div>
    <div class="info-item"><strong>Nota Conformidade:</strong> ${inspecao.notaConformidade != null ? inspecao.notaConformidade.toFixed(1) + '%' : 'N/A'}</div>
  </div>
  ` : ''}
  ${riscos.length > 0 ? `
  <h3 class="section-title">Riscos Identificados (${riscos.length})</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Categoria</th><th>Descrição</th><th>Local</th><th>Gravidade</th><th>Medidas Preventivas</th><th>Medidas Corretivas</th><th>Prioridade</th></tr>
    </thead>
    <tbody>${riscosHtml}</tbody>
  </table>
  ` : '<p>Nenhum risco identificado nesta inspeção.</p>'}
  ${imagensHtml ? `
  <h3 class="section-title">Registro Fotográfico</h3>
  <div class="imgs">${imagensHtml}</div>
  ` : ''}
  <div class="signature">
    <p style="font-size: 12px; margin-bottom: 40px;">Responsável Técnico</p>
    <div class="signature-line">
      <p style="font-size: 12px;"><strong>${laudo.responsavel || '________________________'}</strong></p>
      <p style="font-size: 10px; color: #64748b;">${laudo.responsavelCargo || 'Engenheiro de Segurança do Trabalho'}</p>
      ${laudo.responsavelCPF ? `<p style="font-size: 10px; color: #64748b;">CPF: ${laudo.responsavelCPF}</p>` : ''}
    </div>
  </div>
  <div class="footer">
    <p>Laudo gerado por SafetyVision AI em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    <p>Este documento não substitui laudo técnico de profissional habilitado.</p>
  </div>
</body>
</html>`;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId } = req.query;
    const where: any = { userId };
    if (empresaId) where.empresaId = empresaId as string;
    const items = await prisma.laudo.findMany({
      where, include: { empresa: true, inspecao: true }, orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch { res.status(500).json({ error: 'Erro ao buscar laudos' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await prisma.laudo.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true, inspecao: true },
    });
    if (!item) return res.status(404).json({ error: 'Não encontrado' });
    res.json(item);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { empresaId, inspecaoId, titulo, nr, tipo, responsavel, responsavelCargo, responsavelCPF } = req.body;
    if (!empresaId || !titulo) return res.status(400).json({ error: 'empresaId e titulo obrigatórios' });
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    let riscos: any[] = [];
    let midias: any[] = [];
    let inspecao = null;
    if (inspecaoId) {
      inspecao = await prisma.inspecao.findUnique({ where: { id: inspecaoId } });
      riscos = await prisma.risco.findMany({ where: { inspecaoId } });
      midias = await prisma.midia.findMany({ where: { inspecaoId } });
    }
    const conteudoHtml = generateLaudoHtml(
      { titulo, id: 'pending', dataEmissao: new Date(), nr, tipo: tipo || 'inspecao', aprovado: false, responsavel, responsavelCargo, responsavelCPF },
      empresa, inspecao, riscos, midias,
    );
    const item = await prisma.laudo.create({
      data: { userId, empresaId, inspecaoId: inspecaoId || null, titulo, nr, tipo: tipo || 'inspecao', responsavel, responsavelCargo, responsavelCPF, conteudoHtml },
    });
    const finalHtml = generateLaudoHtml(
      { ...item, dataEmissao: item.dataEmissao },
      empresa, inspecao, riscos, midias,
    );
    await prisma.laudo.update({ where: { id: item.id }, data: { conteudoHtml: finalHtml } });
    res.status(201).json({ ...item, conteudoHtml: finalHtml });
  } catch { res.status(500).json({ error: 'Erro ao criar laudo' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { titulo, nr, tipo, responsavel, responsavelCargo, responsavelCPF, aprovado } = req.body;
    const existing = await prisma.laudo.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });
    const item = await prisma.laudo.update({
      where: { id },
      data: { titulo, nr, tipo, responsavel, responsavelCargo, responsavelCPF, aprovado },
    });
    res.json(item);
  } catch { res.status(500).json({ error: 'Erro ao atualizar' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.laudo.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });
    await prisma.laudo.delete({ where: { id } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Erro ao excluir' }); }
});

router.get('/:id/html', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await prisma.laudo.findFirst({
      where: { id, userId: req.userId! },
      include: { empresa: true, inspecao: true },
    });
    if (!item) return res.status(404).json({ error: 'Não encontrado' });
    if (item.conteudoHtml) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(item.conteudoHtml);
    }
    let riscos: any[] = [];
    let midias: any[] = [];
    if (item.inspecaoId) {
      riscos = await prisma.risco.findMany({ where: { inspecaoId: item.inspecaoId } });
      midias = await prisma.midia.findMany({ where: { inspecaoId: item.inspecaoId } });
    }
    const html = generateLaudoHtml(item, (item as any).empresa, (item as any).inspecao, riscos, midias);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

export default router;
