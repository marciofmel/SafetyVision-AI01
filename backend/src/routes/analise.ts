import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma';
import { analisarImagem } from '../services/visionAnalysis';
import { anotarImagem } from '../services/imageAnnotator';
import { extractFrames, cleanupFrames } from '../services/videoFrameExtractor';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const uploadsDir = path.join(__dirname, '../../uploads');
const anotadasDir = path.join(__dirname, '../../uploads/anotadas');
if (!fs.existsSync(anotadasDir)) fs.mkdirSync(anotadasDir, { recursive: true });

router.post('/:inspecaoId/analisar', async (req: AuthRequest, res) => {
  try {
    const inspecaoId = String(req.params.inspecaoId);
    const inspecao = await prisma.inspecao.findFirst({
      where: { id: inspecaoId, usuarioId: req.userId! },
      include: { midias: true },
    });
    if (!inspecao) return res.status(404).json({ error: 'Inspeção não encontrada' });
    if (inspecao.midias.length === 0) return res.status(400).json({ error: 'Adicione fotos ou vídeos antes de analisar' });

    const midias = inspecao.midias;
    if (midias.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mídia encontrada. Envie fotos ou vídeos para análise.' });
    }

    const todosRiscos: any[] = [];
    const todosEpi: any[] = [];
    const imagensAnotadas: string[] = [];
    let descricaoGeral = '';
    let erros: string[] = [];

    for (const midia of midias) {
      const mediaPath = path.join(uploadsDir, midia.url.replace('/uploads/', ''));

      if (!fs.existsSync(mediaPath)) {
        erros.push(`Arquivo não encontrado: ${midia.nome}`);
        continue;
      }

      let caminhosParaAnalisar: string[] = [];
      let framesTemporarios: string[] = [];

      if (midia.tipo === 'video') {
        try {
          framesTemporarios = await extractFrames(mediaPath, 3);
          caminhosParaAnalisar = framesTemporarios;
        } catch (videoErr: any) {
          console.error(`Erro ao extrair frames do vídeo ${midia.nome}:`, videoErr.message);
          erros.push(`Erro ao processar vídeo ${midia.nome}: ${videoErr.message}`);
          continue;
        }
      } else {
        caminhosParaAnalisar = [mediaPath];
      }

      try {
        for (const framePath of caminhosParaAnalisar) {
          const resultado = await analisarImagem(framePath, midia.nome);

          if (resultado.descricaoGeral) {
            descricaoGeral += resultado.descricaoGeral + ' ';
          }

          const riscosComRegiao = resultado.riscos || [];
          const episComRegiao = resultado.epiViolacoes || [];

          for (const risco of riscosComRegiao) {
            const created = await prisma.risco.create({
              data: {
                categoria: risco.categoria,
                descricao: risco.descricao,
                localIdentificado: risco.localIdentificado,
                imagemUrl: midia.url,
                confianca: risco.confianca,
                gravidade: risco.gravidade,
                consequencias: risco.consequencias,
                nrsRelacionadas: risco.nrsRelacionadas,
                medidasPreventivas: risco.medidasPreventivas,
                medidasCorretivas: risco.medidasCorretivas,
                prioridade: risco.gravidade === 'critica' ? 'critica' : risco.gravidade === 'alta' ? 'alta' : 'media',
                inspecaoId: inspecao.id,
              },
            });
            todosRiscos.push({ ...created, regiao: risco.regiao });
          }

          for (const epi of episComRegiao) {
            const created = await prisma.epiViolacao.create({
              data: {
                epiNome: epi.epiNome,
                status: epi.status,
                confianca: epi.confianca,
                descricao: epi.descricao,
                imagemUrl: midia.url,
                inspecaoId: inspecao.id,
              },
            });
            todosEpi.push({ ...created, regiao: epi.regiao });
          }

          if (midia.tipo === 'foto') {
            const riscosParaAnotar = riscosComRegiao.filter((r: any) => r.regiao).map((r: any) => ({
              descricao: r.descricao,
              gravidade: r.gravidade,
              regiao: r.regiao,
              categoria: r.categoria,
            }));

            const episParaAnotar = episComRegiao.filter((e: any) => e.regiao).map((e: any) => ({
              epiNome: e.epiNome,
              status: e.status,
              regiao: e.regiao,
            }));

            if (riscosParaAnotar.length > 0 || episParaAnotar.length > 0) {
              try {
                const anotada = await anotarImagem(mediaPath, riscosParaAnotar, episParaAnotar, anotadasDir);
                imagensAnotadas.push('/uploads/anotadas/' + path.basename(anotada));
              } catch (annotErr: any) {
                console.error(`Erro ao anotar imagem ${midia.nome}:`, annotErr.message);
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`Erro ao analisar midia ${midia.id}:`, err.message);
        erros.push(`Erro ao analisar ${midia.nome}: ${err.message}`);
      } finally {
        cleanupFrames(framesTemporarios);
      }
    }

    if (midias.length > 0 && erros.length === midias.length) {
      return res.status(502).json({
        error: 'Não foi possível analisar as mídias. Verifique a configuração da IA no servidor.',
        detalhes: erros,
      });
    }

    const totalRiscos = todosRiscos.length;
    const riscosGraves = todosRiscos.filter(r => r.gravidade === 'critica' || r.gravidade === 'alta').length;
    const nota = Math.max(0, Math.min(100, 100 - (totalRiscos * 8) - (riscosGraves * 12)));

    await prisma.inspecao.update({
      where: { id: inspecao.id },
      data: { status: 'analisada', notaConformidade: nota, observacoes: descricaoGeral.trim() || undefined },
    });

    res.json({
      inspecaoId: inspecao.id,
      totalMidias: midias.length,
      riscosEncontrados: totalRiscos,
      epiViolacoes: todosEpi.filter(e => e.status === 'ausente').length,
      notaConformidade: nota,
      riscos: todosRiscos,
      epiViolacoesList: todosEpi,
      imagensAnotadas,
      descricaoGeral: descricaoGeral.trim(),
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (err: any) {
    console.error('Erro na análise:', err);
    res.status(500).json({ error: err.message || 'Erro interno na análise' });
  }
});

export default router;
