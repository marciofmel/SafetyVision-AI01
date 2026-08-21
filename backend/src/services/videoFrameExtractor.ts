import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';

const TEMP_DIR = path.join(__dirname, '../../uploads/temp_frames');

export function getFfmpegPath(): string | null {
  return ffmpegStatic as string | null;
}

export async function extractFrames(
  videoPath: string,
  maxFrames: number = 3
): Promise<string[]> {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    throw new Error('ffmpeg não disponível no servidor');
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Arquivo de vídeo não encontrado: ${videoPath}`);
  }

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const videoName = path.basename(videoPath, path.extname(videoPath));
  const outputPattern = path.join(TEMP_DIR, `${videoName}_frame_%03d.jpg`);

  try {
    execSync(
      `"${ffmpegPath}" -i "${videoPath}" -vf "fps=1" -frames:v ${maxFrames} -q:v 2 "${outputPattern}" -y`,
      { timeout: 30000, stdio: 'pipe' }
    );
  } catch (err: any) {
    console.error('Erro ao extrair frames do vídeo:', err.message);
    throw new Error('Falha ao processar vídeo');
  }

  const frames: string[] = [];
  for (let i = 1; i <= maxFrames; i++) {
    const framePath = path.join(TEMP_DIR, `${videoName}_frame_${String(i).padStart(3, '0')}.jpg`);
    if (fs.existsSync(framePath)) {
      frames.push(framePath);
    }
  }

  return frames;
}

export function cleanupFrames(framePaths: string[]): void {
  for (const frame of framePaths) {
    try {
      if (fs.existsSync(frame)) {
        fs.unlinkSync(frame);
      }
    } catch { /* ignora erro de limpeza */ }
  }
}
