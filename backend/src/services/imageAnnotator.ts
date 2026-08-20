import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

interface Regiao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

interface RiscoParaAnotar {
  descricao: string;
  gravidade: string;
  regiao: Regiao;
  categoria: string;
}

interface EpiParaAnotar {
  epiNome: string;
  status: string;
  regiao?: Regiao;
}

const COR_RISCO = {
  critica: '#DC2626',
  alta: '#EA580C',
  media: '#D97706',
  baixa: '#16A34A',
};

const COR_EPI_AUSENTE = '#DC2626';
const COR_EPI_INCORRETO = '#EA580C';
const COR_EPI_CORRETO = '#16A34A';

function criarSvgOverlays(
  largura: number,
  altura: number,
  riscos: RiscoParaAnotar[],
  epis: EpiParaAnotar[]
): Buffer {
  let svg = `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">`;

  let labelIndex = 1;

  for (const risco of riscos) {
    if (!risco.regiao) continue;
    const { x, y, largura: w, altura: h } = risco.regiao;
    const cor = COR_RISCO[risco.gravidade as keyof typeof COR_RISCO] || '#F59E0B';

    svg += `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" 
            fill="none" stroke="${cor}" stroke-width="4" stroke-dasharray="8,4" rx="8" ry="8" />
      <circle cx="${x - 10}" cy="${y - 10}" r="18" fill="${cor}" />
      <text x="${x - 10}" y="${y - 4}" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial">${labelIndex}</text>
      <rect x="${x}" y="${y + h + 4}" width="${Math.min(w, 200)}" height="24" fill="${cor}" rx="4" />
      <text x="${x + 6}" y="${y + h + 21}" fill="white" font-size="11" font-weight="bold" font-family="Arial">${risco.categoria.toUpperCase()}</text>
    `;
    labelIndex++;
  }

  for (const epi of epis) {
    if (!epi.regiao) continue;
    const { x, y, largura: w, altura: h } = epi.regiao;
    const cor = epi.status === 'ausente' ? COR_EPI_AUSENTE : epi.status === 'incorreto' ? COR_EPI_INCORRETO : COR_EPI_CORRETO;
    const label = epi.status === 'ausente' ? '✗ AUSENTE' : epi.status === 'incorreto' ? '⚠ INCORRETO' : '✓ OK';

    svg += `
      <circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.max(w, h) / 2 + 8}" 
              fill="none" stroke="${cor}" stroke-width="4" />
      <rect x="${x}" y="${y + h + 4}" width="${Math.min(w + 20, 160)}" height="22" fill="${cor}" rx="4" />
      <text x="${x + 4}" y="${y + h + 19}" fill="white" font-size="10" font-weight="bold" font-family="Arial">${epi.epiNome}: ${label}</text>
    `;
  }

  svg += '</svg>';
  return Buffer.from(svg);
}

export async function anotarImagem(
  imagemPath: string,
  riscos: RiscoParaAnotar[],
  epis: EpiParaAnotar[],
  outputDir: string
): Promise<string> {
  const filename = path.basename(imagemPath, path.extname(imagemPath));
  const outputPath = path.join(outputDir, `anotada_${filename}.png`);

  const metadata = await sharp(imagemPath).metadata();
  const largura = metadata.width || 800;
  const altura = metadata.height || 600;

  const svgBuffer = criarSvgOverlays(largura, altura, riscos, epis);

  await sharp(imagemPath)
    .composite([{
      input: svgBuffer,
      top: 0,
      left: 0,
    }])
    .png()
    .toFile(outputPath);

  return outputPath;
}

export async function criarThumbnail(
  imagemPath: string,
  outputDir: string,
  maxWidth: number = 400
): Promise<string> {
  const filename = path.basename(imagemPath, path.extname(imagemPath));
  const outputPath = path.join(outputDir, `thumb_${filename}.jpg`);

  await sharp(imagemPath)
    .resize(maxWidth, null, { fit: 'inside' })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  return outputPath;
}
