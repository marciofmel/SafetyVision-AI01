import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NovaInspecao from './pages/NovaInspecao';
import AnaliseIA from './pages/AnaliseIA';
import Relatorio from './pages/Relatorio';
import Historico from './pages/Historico';
import NRsAtualizadas from './pages/NRsAtualizadas';
import Configuracoes from './pages/Configuracoes';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="nova-inspecao" element={<NovaInspecao />} />
        <Route path="analise/:id" element={<AnaliseIA />} />
        <Route path="relatorio/:id" element={<Relatorio />} />
        <Route path="historico" element={<Historico />} />
        <Route path="nrs" element={<NRsAtualizadas />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
    </Routes>
  );
}
