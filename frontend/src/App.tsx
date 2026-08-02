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
import DashboardTecnico from './pages/tecnico/DashboardTecnico';
import NovaInspecao from './pages/NovaInspecao';
import AnaliseIA from './pages/AnaliseIA';
import Relatorio from './pages/Relatorio';
import Historico from './pages/Historico';
import TecnicoLayout from './components/TecnicoLayout';

import NRsAtualizadas from './pages/NRsAtualizadas';
import Configuracoes from './pages/Configuracoes';

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;
  if (!user) return <Navigate to="/admin/login" />;
  if (requiredRole && user.cargo !== requiredRole) {
    return <Navigate to={user.cargo === 'Admin' ? '/admin' : '/tecnico'} />;
  }
  return <>{children}</>;
}

function LandingRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;
  if (user) return <Navigate to={user.cargo === 'Admin' ? '/admin' : '/tecnico'} />;
  return <Navigate to="/admin/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />

      <Route path="/admin/login" element={<LoginAdmin />} />
      <Route path="/admin" element={<PrivateRoute requiredRole="Admin"><AdminLayout /></PrivateRoute>}>
        <Route index element={<DashboardAdmin />} />
        <Route path="empresas" element={<EmpresasAdmin />} />
        <Route path="setores" element={<SetoresAdmin />} />
        <Route path="colaboradores" element={<ColaboradoresAdmin />} />
        <Route path="usuarios" element={<UsuariosAdmin />} />
        <Route path="inspecoes" element={<InspecoesAdmin />} />
        <Route path="nrs" element={<NRsAtualizadas />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="/tecnico/login" element={<LoginTecnico />} />
      <Route path="/tecnico" element={<PrivateRoute><TecnicoLayout /></PrivateRoute>}>
        <Route index element={<DashboardTecnico />} />
        <Route path="nova-inspecao" element={<NovaInspecao />} />
        <Route path="analise/:id" element={<AnaliseIA />} />
        <Route path="relatorio/:id" element={<Relatorio />} />
        <Route path="historico" element={<Historico />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
