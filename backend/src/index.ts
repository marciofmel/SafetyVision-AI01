import 'dotenv/config';
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
import cnpjRoutes from './routes/cnpj';
import checklistsRoutes from './routes/checklists';
import multasRoutes from './routes/multas';
import exportRoutes from './routes/export';
import episRoutes from './routes/epis';
import treinamentosRoutes from './routes/treinamentos';
import incidentesRoutes from './routes/incidentes';
import cronogramasRoutes from './routes/cronogramas';
import pgrRoutes from './routes/pgr';
import laudosRoutes from './routes/laudos';
import conformidadeRoutes from './routes/conformidade';
import planosRoutes from './routes/planos';
import dashboardAdminRoutes from './routes/dashboardAdmin';
import adminDataRoutes from './routes/adminData';
import asoRoutes from './routes/aso';
import cipaRoutes from './routes/cipa';
import alertasRoutes from './routes/alertas';
import relatoriosSalvosRoutes from './routes/relatorios';
import relatorioPublicoRoutes from './routes/relatorioPublico';

const app = express();
const PORT = process.env.PORT || 5173;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/empresas', authMiddleware, empresasRoutes);
app.use('/api/setores', authMiddleware, setoresRoutes);
app.use('/api/inspecoes', authMiddleware, inspecoesRoutes);
app.use('/api/analise', authMiddleware, analiseRoutes);
app.use('/api/relatorio', authMiddleware, relatorioRoutes);
app.use('/api/usuarios', authMiddleware, usuariosRoutes);
app.use('/api/colaboradores', authMiddleware, colaboradoresRoutes);
app.use('/api/cnpj', cnpjRoutes);
app.use('/api/checklists', authMiddleware, checklistsRoutes);
app.use('/api/multas', multasRoutes);
app.use('/api/export', authMiddleware, exportRoutes);
app.use('/api/epis', authMiddleware, episRoutes);
app.use('/api/treinamentos', authMiddleware, treinamentosRoutes);
app.use('/api/incidentes', authMiddleware, incidentesRoutes);
app.use('/api/cronogramas', authMiddleware, cronogramasRoutes);
app.use('/api/pgr', authMiddleware, pgrRoutes);
app.use('/api/laudos', authMiddleware, laudosRoutes);
app.use('/api/conformidade', authMiddleware, conformidadeRoutes);
app.use('/api/planos', authMiddleware, planosRoutes);
app.use('/api/dashboard-admin', authMiddleware, dashboardAdminRoutes);
app.use('/api/admin-data', authMiddleware, adminDataRoutes);
app.use('/api/asos', authMiddleware, asoRoutes);
app.use('/api/cipa', authMiddleware, cipaRoutes);
app.use('/api/alertas', authMiddleware, alertasRoutes);
app.use('/api/relatorios', authMiddleware, relatoriosSalvosRoutes);

// Rota pública para compartilhamento de relatórios (WhatsApp/Email/link) — SEM auth
app.use('/api/publico', relatorioPublicoRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'SafetyVision AI' }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Arquivo muito grande. Limite: 50MB' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo muito grande' });
  }
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`SafetyVision AI rodando em http://localhost:${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`A porta ${PORT} já está em uso.`);
    console.error(`Encerre o processo que usa a porta ${PORT} ou defina outra porta via PORT no arquivo .env.`);
    console.error(`Exemplo: PORT=5174`);
    process.exit(1);
  }
  throw err;
});
