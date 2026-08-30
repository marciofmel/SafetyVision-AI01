import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import LoginAdmin from './pages/admin/LoginAdmin';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import EmpresasAdmin from './pages/admin/EmpresasAdmin';
import SetoresAdmin from './pages/admin/SetoresAdmin';
import ColaboradoresAdmin from './pages/admin/ColaboradoresAdmin';
import UsuariosAdmin from './pages/admin/UsuariosAdmin';
import InspecoesAdmin from './pages/admin/InspecoesAdmin';
import AdminLayout from './components/AdminLayout';

import LoginTecnico from './pages/tecnico/LoginTecnico';
import CadastroTecnico from './pages/tecnico/CadastroTecnico';
import DashboardTecnico from './pages/tecnico/DashboardTecnico';
import EmpresasTecnico from './pages/tecnico/EmpresasTecnico';
import EmpresaDetalhe from './pages/tecnico/EmpresaDetalhe';
import ColaboradoresTecnico from './pages/tecnico/ColaboradoresTecnico';
import SetoresTecnico from './pages/tecnico/SetoresTecnico';
import NRTecnico from './pages/tecnico/NRTecnico';
import RelatoriosTecnico from './pages/tecnico/RelatoriosTecnico';
import ConfigTecnico from './pages/tecnico/ConfigTecnico';
import ChecklistsTecnico from './pages/tecnico/ChecklistsTecnico';
import CalculadoraNR28 from './pages/tecnico/CalculadoraNR28';
import EpiTecnico from './pages/tecnico/EpiTecnico';
import TreinamentosTecnico from './pages/tecnico/TreinamentosTecnico';
import IncidentesTecnico from './pages/tecnico/IncidentesTecnico';
import CronogramaTecnico from './pages/tecnico/CronogramaTecnico';
import PGRTecnico from './pages/tecnico/PGRTecnico';
import LaudosTecnico from './pages/tecnico/LaudosTecnico';
import ConformidadeTecnico from './pages/tecnico/ConformidadeTecnico';
import PlanosTecnico from './pages/tecnico/PlanosTecnico';
import ASOTecnico from './pages/tecnico/ASOTecnico';
import CIPATecnico from './pages/tecnico/CIPATecnico';
import DashboardAdminGlobal from './pages/admin/DashboardAdminGlobal';
import NovaInspecao from './pages/NovaInspecao';
import AnaliseIA from './pages/AnaliseIA';
import Relatorio from './pages/Relatorio';
import EditarRelatorio from './pages/tecnico/EditarRelatorio';
import Historico from './pages/Historico';
import TecnicoLayout from './components/TecnicoLayout';

import NRsAtualizadas from './pages/NRsAtualizadas';
import Configuracoes from './pages/Configuracoes';
import LandingPage from './pages/LandingPage';

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-navy-950"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;
  if (!user) return <Navigate to="/" />;
  if (requiredRole) {
    const isAdmin = user.cargo === 'Admin' || user.cargo === 'Administrador';
    if (requiredRole === 'Admin' && !isAdmin) return <Navigate to="/tecnico" />;
    if (requiredRole === 'Tecnico' && isAdmin) return <Navigate to="/admin" />;
  }
  return <>{children}</>;
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-navy-950"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;
  if (user) {
    const isAdmin = user.cargo === 'Admin' || user.cargo === 'Administrador';
    return <Navigate to={isAdmin ? '/admin' : '/tecnico'} />;
  }
  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthRedirect />} />

      <Route path="/admin/login" element={<LoginAdmin />} />
      <Route path="/admin" element={<PrivateRoute requiredRole="Admin"><AdminLayout /></PrivateRoute>}>
        <Route index element={<DashboardAdminGlobal />} />
        <Route path="empresas" element={<EmpresasAdmin />} />
        <Route path="setores" element={<SetoresAdmin />} />
        <Route path="colaboradores" element={<ColaboradoresAdmin />} />
        <Route path="usuarios" element={<UsuariosAdmin />} />
        <Route path="inspecoes" element={<InspecoesAdmin />} />
        <Route path="nrs" element={<NRsAtualizadas />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="/tecnico/login" element={<LoginTecnico />} />
      <Route path="/tecnico/cadastro" element={<CadastroTecnico />} />
      <Route path="/tecnico" element={<PrivateRoute><TecnicoLayout /></PrivateRoute>}>
        <Route index element={<DashboardTecnico />} />
        <Route path="nova-inspecao" element={<NovaInspecao />} />
        <Route path="empresas" element={<EmpresasTecnico />} />
        <Route path="empresas/:id" element={<EmpresaDetalhe />} />
        <Route path="colaboradores" element={<ColaboradoresTecnico />} />
        <Route path="setores" element={<SetoresTecnico />} />
        <Route path="analise/:id" element={<AnaliseIA />} />
        <Route path="relatorio/:id" element={<Relatorio />} />
        <Route path="relatorio/:id/editar" element={<EditarRelatorio />} />
        <Route path="historico" element={<Historico />} />
        <Route path="checklists" element={<ChecklistsTecnico />} />
        <Route path="calculadora-nr28" element={<CalculadoraNR28 />} />
        <Route path="epis" element={<EpiTecnico />} />
        <Route path="treinamentos" element={<TreinamentosTecnico />} />
        <Route path="incidentes" element={<IncidentesTecnico />} />
        <Route path="cronograma" element={<CronogramaTecnico />} />
        <Route path="pgr" element={<PGRTecnico />} />
        <Route path="laudos" element={<LaudosTecnico />} />
        <Route path="conformidade" element={<ConformidadeTecnico />} />
        <Route path="planos" element={<PlanosTecnico />} />
        <Route path="asos" element={<ASOTecnico />} />
        <Route path="cipa" element={<CIPATecnico />} />
        <Route path="nrs" element={<NRTecnico />} />
        <Route path="configuracoes" element={<ConfigTecnico />} />
        <Route path="relatorios" element={<RelatoriosTecnico />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
