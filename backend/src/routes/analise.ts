import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Base de dados de EPIs e riscos para simular análise IA
const EPI_CLASSES = [
  { nome: 'Capacete', nr: 'NR-6, NR-18', keywords: ['hardhat', 'helmet', 'capacete'] },
  { nome: 'Óculos de Proteção', nr: 'NR-6', keywords: ['goggles', 'safety glasses', 'óculos'] },
  { nome: 'Luvas', nr: 'NR-6', keywords: ['gloves', 'luvas'] },
  { nome: 'Botinas', nr: 'NR-6', keywords: ['boots', 'botinas', 'safety shoes'] },
  { nome: 'Cinto de Segurança', nr: 'NR-6, NR-35', keywords: ['harness', 'cinto'] },
  { nome: 'Protetor Auricular', nr: 'NR-6', keywords: ['earplug', 'protetor'] },
  { nome: 'Máscara', nr: 'NR-6', keywords: ['mask', 'máscara', 'respirator'] },
  { nome: 'Colete Refletivo', nr: 'NR-6, NR-18', keywords: ['vest', 'colete', 'high-vis'] },
  { nome: 'Protetor Facial', nr: 'NR-6', keywords: ['face shield', 'protetor facial'] },
];

const RISCO_CLASSES = [
  { categoria: 'Trabalho em Altura', descricao: 'Trabalho em altura sem proteção', nr: 'NR-35', gravidade: 'alta', consequencias: 'Queda com risco de lesão grave ou óbito' },
  { categoria: 'Piso', descricao: 'Piso molhado ou irregular', nr: 'NR-1', gravidade: 'média', consequencias: 'Escorregamento e queda' },
  { categoria: 'Buracos', descricao: 'Buracos no piso sem sinalização', nr: 'NR-1', gravidade: 'alta', consequencias: 'Queda ou torção de tornozelo' },
  { categoria: 'Escadas', descricao: 'Escadas inseguras ou sem corrimão', nr: 'NR-1', gravidade: 'alta', consequencias: 'Queda degrau' },
  { categoria: 'Elétrica', descricao: 'Fiação exposta ou quadro elétrico aberto', nr: 'NR-10', gravidade: 'crítica', consequencias: 'Choque elétrico, queimadura, óbito' },
  { categoria: 'Emergência', descricao: 'Extintor ausente ou obstruído', nr: 'NR-23', gravidade: 'alta', consequencias: 'Impossibilidade de combater incêndio inicial' },
  { categoria: 'Emergência', descricao: 'Rota de fuga bloqueada', nr: 'NR-23', gravidade: 'crítica', consequencias: 'Impossibilidade de evacuação em emergência' },
  { categoria: 'Sinalização', descricao: 'Falta de sinalização de segurança', nr: 'NR-1', gravidade: 'média', consequencias: 'Falha na identificação de riscos' },
  { categoria: 'Máquinas', descricao: 'Máquinas sem proteção', nr: 'NR-12', gravidade: 'crítica', consequencias: 'Amputação, compressão, corte' },
  { categoria: 'Organização', descricao: 'Organização deficiente do local', nr: 'NR-1', gravidade: 'baixa', consequencias: 'Acidentes menores, queda de objetos' },
  { categoria: 'Química', descricao: 'Produtos químicos expostos', nr: 'NR-9, NR-15', gravidade: 'alta', consequencias: 'Intoxicação, queimadura química' },
  { categoria: 'Queda', descricao: 'Objetos com risco de queda', nr: 'NR-18', gravidade: 'alta', consequencias: 'Traumatismo craniano, fraturas' },
  { categoria: 'Ferramentas', descricao: 'Ferramentas espalhadas', nr: 'NR-1', gravidade: 'baixa', consequencias: 'Cortes, escoriações' },
  { categoria: 'Iluminação', descricao: 'Iluminação insuficiente', nr: 'NR-17', gravidade: 'média', consequencias: 'Acidentes por baixa visibilidade' },
  { categoria: 'Armazenamento', descricao: 'Armazenamento inadequado de materiais', nr: 'NR-1', gravidade: 'média', consequencias: 'Queda de materiais, obstrução' },
];

function analisarImagem(midiaUrl: string) {
  // Simula análise de IA com dados realistas
  const epiDetectados: any[] = [];
  const riscosDetectados: any[] = [];

  // Simula detecção de EPIs (80% chance de encontrar violações)
  for (const epi of EPI_CLASSES) {
    const probabilidade = 0.6 + Math.random() * 0.3;
    const detectado = Math.random() < 0.85;
    if (detectado) {
      const ausente = Math.random() < probabilidade;
      epiDetectados.push({
        epiNome: epi.nome,
        status: ausente ? 'ausente' : 'correto',
        confianca: parseFloat((0.65 + Math.random() * 0.33).toFixed(2)),
        descricao: ausente
          ? `${epi.nome} não detectado no trabalhador`
          : `${epi.nome} detectado corretamente`,
      });
    }
  }

  // Simula detecção de riscos (40% chance por classe)
  for (const risco of RISCO_CLASSES) {
    if (Math.random() < 0.35) {
      const confianca = parseFloat((0.55 + Math.random() * 0.40).toFixed(2));
      const prioridades: Record<string, string> = { crítica: 'critica', alta: 'alta', média: 'media', baixa: 'baixa' };
      riscosDetectados.push({
        categoria: risco.categoria,
        descricao: risco.descricao,
        localIdentificado: 'Área inspecionada',
        confianca,
        gravidade: risco.gravidade,
        consequencias: risco.consequencias,
        nrsRelacionadas: risco.nr,
        medidasPreventivas: getMedidasPreventivas(risco.categoria),
        medidasCorretivas: getMedidasCorretivas(risco.categoria),
        prioridade: prioridades[risco.gravidade] || 'media',
      });
    }
  }

  return { epiDetectados, riscosDetectados };
}

function getMedidasPreventivas(categoria: string): string {
  const medidas: Record<string, string> = {
    'Trabalho em Altura': 'Usar cinturão type II, instalar guard-corpo, treinar NR-35',
    'Piso': 'Sinalizar área, usar tapetes antiderrapantes, limpar regularmente',
    'Buracos': 'Sinalizar com cones e fitas, cobrir buracos, sinalizar permanentemente',
    'Escadas': 'Instalar corrimão, verificar degraus, sinalizar extremidades',
    'Elétrica': 'Isolar área, usar EPI NR-10, bloquear energia, treitar',
    'Emergência': 'Manter extintores validados, treinar uso, manter rotas livres',
    'Sinalização': 'Instalar placas de advertência, sinalizar riscos, atualizar MAPA',
    'Máquinas': 'Instalar proteções fixas, usar intertravamentos, treinar operadores',
    'Organização': 'Aplicar 5S, definir locais de armazenamento, rotinas de limpeza',
    'Química': 'Usar EPI químico, SDS disponível, armazenar em local adequado',
    'Queda': 'Fixar objetos, usar telas de proteção, limitar áreas',
    'Ferramentas': 'Organizar em bancadas, usar carrinhos, treinar armazenamento',
    'Iluminação': 'Instalar iluminação adequada, manter lâmpadas, limpar refletores',
    'Armazenamento': 'Seguir hierarquia de estantes, não empilhar acima do limite',
  };
  return medidas[categoria] || 'Medidas gerais de segurança';
}

function getMedidasCorretivas(categoria: string): string {
  const medidas: Record<string, string> = {
    'Trabalho em Altura': 'Parar trabalho, instalar proteção, registrar ocorrência',
    'Piso': 'Secar/limpar piso, instalar sinalização, relatar à manutenção',
    'Buracos': 'Barriar área, acionar engenharia para reparo, documentar',
    'Escadas': 'Interditir escada, chamar manutenção, usar alternativa',
    'Elétrica': 'Cortar energia, isolar quadro, chamar eletricista habilitado',
    'Emergência': 'Desobstruir, recarregar/extinctor, treinar equipe',
    'Sinalização': 'Instalar placas imediatamente, registrar demanda',
    'Máquinas': 'Parar máquina, instalar proteção, só operar após vistoria',
    'Organização': 'Organizar imediatamente, aplicar 5S, definir responsável',
    'Química': 'Isolar produto, usar EPI, contactar responsável',
    'Queda': 'Remover objeto, instalar proteção, evacuar se necessário',
    'Ferramentas': 'Recolher e organizar, treinar equipe',
    'Iluminação': 'Instalar iluminação temporária, solicitar manutenção',
    'Armazenamento': 'Reorganizar materiais, verificar capacidade de carga',
  };
  return medidas[categoria] || 'Corrigir imediatamente e documentar';
}

router.post('/:inspecaoId/analisar', async (req: any, res) => {
  try {
    const inspecao = await prisma.inspecao.findUnique({
      where: { id: req.params.inspecaoId },
      include: { midias: true },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });
    if (inspecao.midias.length === 0) return res.status(400).json({ error: 'Adicione fotos ou vídeos antes de analisar' });

    const todosRiscos: any[] = [];
    const todosEpi: any[] = [];

    for (const midia of inspecao.midias) {
      const resultado = analisarImagem(midia.url);
      for (const risco of resultado.riscosDetectados) {
        const created = await prisma.risco.create({
          data: { ...risco, inspecaoId: inspecao.id, imagemUrl: midia.url },
        });
        todosRiscos.push(created);
      }
      for (const epi of resultado.epiDetectados) {
        const created = await prisma.epiViolacao.create({
          data: { ...epi, inspecaoId: inspecao.id, imagemUrl: midia.url },
        });
        todosEpi.push(created);
      }
    }

    const totalRiscos = todosRiscos.length;
    const riscosGraves = todosRiscos.filter(r => r.gravidade === 'crítica' || r.gravidade === 'alta').length;
    const nota = Math.max(0, Math.min(100, 100 - (totalRiscos * 8) - (riscosGraves * 12)));

    await prisma.inspecao.update({
      where: { id: inspecao.id },
      data: { status: 'analisada', notaConformidade: nota },
    });

    res.json({
      inspecaoId: inspecao.id,
      totalMidias: inspecao.midias.length,
      riscosEncontrados: totalRiscos,
      epiViolacoes: todosEpi.filter(e => e.status === 'ausente').length,
      notaConformidade: nota,
      riscos: todosRiscos,
      epiViolacoesList: todosEpi,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
