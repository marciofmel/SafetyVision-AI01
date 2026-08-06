import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const multaSchema = z.object({
  gravidade: z.enum(['leve', 'media', 'grave', 'gravissima']),
  tipo: z.enum(['sem_risco', 'risco_controle', 'risco_epidemiologico', 'acidente']),
  empresaCnpjrural: z.boolean().optional(),
});

const valoresBase: Record<string, Record<string, number>> = {
  sem_risco: { leve: 3000, media: 6000, grave: 12000, gravissima: 24000 },
  risco_controle: { leve: 6000, media: 12000, grave: 24000, gravissima: 48000 },
  risco_epidemiologico: { leve: 12000, media: 24000, grave: 48000, gravissima: 96000 },
  acidente: { leve: 24000, media: 48000, grave: 96000, gravissima: 192000 },
};

const multasNR28: Record<string, { item: string; valor: number }> = {
  NR01: { item: '1.5.3 - Programa de Prevenção de Riscos Ambientais', valor: 3000 },
  NR04: { item: '4.1 - Serviços Especializados em Engenharia de Segurança', valor: 3000 },
  NR05: { item: '5.3 - CIPA', valor: 3000 },
  NR06: { item: '6.6.1 - Certificado de Aprovação do EPI', valor: 6000 },
  NR07: { item: '7.3 - Programa de Controle Médico de Saúde Ocupacional', valor: 3000 },
  NR09: { item: '9.1 - Programa de Riscos Ambientais', valor: 3000 },
  NR10: { item: '10.1 - Serviços de Eletricidade', valor: 6000 },
  NR12: { item: '12.1 - Segurança no Trabalho em Máquinas', valor: 6000 },
  NR15: { item: '15.1 - Atividades e Operações Insalubres', valor: 3000 },
  NR17: { item: '17.1 - Ergonomia', valor: 3000 },
  NR20: { item: '20.1 - Líquidos Inflamáveis', valor: 6000 },
  NR23: { item: '23.1 - Proteção contra Incêndios', valor: 3000 },
  NR33: { item: '33.1 - Segurança em Espaços Confinados', valor: 6000 },
  NR35: { item: '35.1 - Trabalho em Altura', valor: 6000 },
};

router.post('/calcular', async (req, res) => {
  try {
    const parsed = multaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { gravidade, tipo, empresaCnpjrural } = parsed.data;
    let valor = valoresBase[tipo]?.[gravidade] || 0;

    if (empresaCnpjrural) {
      valor = valor * 0.5;
    }

    res.json({
      gravidade,
      tipo,
      empresaCnpjrural: empresaCnpjrural || false,
      valorMulta: valor,
      valorFormatado: `R$ ${valor.toLocaleString('pt-BR')}`,
      detalhes: {
        sem_risco: 'Sem risco ao trabalhador',
        risco_controle: 'Com controle de risco',
        risco_epidemiologico: 'Risco epidemiológico',
        acidente: 'Com acidente de trabalho',
      }[tipo],
      observacao: empresaCnpjrural ? 'CNPJ rural: redução de 50%' : '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/nr28', async (_req, res) => {
  res.json(multasNR28);
});

router.post('/calcular-nr', async (req, res) => {
  try {
    const { nr, gravidade } = req.body;
    if (!nr) return res.status(400).json({ error: 'NR é obrigatória' });

    const multaBase = multasNR28[nr];
    if (!multaBase) return res.status(404).json({ error: 'NR não encontrada na tabela' });

    const multiplicador: Record<string, number> = { leve: 1, media: 2, grave: 4, gravissima: 8 };
    const multa = multaBase.valor * (multiplicador[gravidade] || 1);

    res.json({
      nr,
      item: multaBase.item,
      gravidade,
      valorBase: multaBase.valor,
      multiplicador: multiplicador[gravidade] || 1,
      valorFinal: multa,
      valorFormatado: `R$ ${multa.toLocaleString('pt-BR')}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
