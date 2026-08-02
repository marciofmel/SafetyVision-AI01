import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import empresasRoutes from './routes/empresas';
import setoresRoutes from './routes/setores';
import inspecoesRoutes from './routes/inspecoes';
import analiseRoutes from './routes/analise';
import relatorioRoutes from './routes/relatorio';
import usuariosRoutes from './routes/usuarios';
import colaboradoresRoutes from './routes/colaboradores';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/empresas', authMiddleware, empresasRoutes);
app.use('/api/setores', authMiddleware, setoresRoutes);
app.use('/api/inspecoes', authMiddleware, inspecoesRoutes);
app.use('/api/analise', authMiddleware, analiseRoutes);
app.use('/api/relatorio', authMiddleware, relatorioRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/colaboradores', authMiddleware, colaboradoresRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'SafetyVision AI' }));

const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SafetyVision AI rodando em http://localhost:${PORT}`);
});
