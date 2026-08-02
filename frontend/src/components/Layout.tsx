import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiPlus, FiClock, FiLogOut, FiShield } from 'react-icons/fi';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', icon: <FiHome />, label: 'Dashboard' },
    { to: '/nova-inspecao', icon: <FiPlus />, label: 'Nova Inspeção' },
    { to: '/historico', icon: <FiClock />, label: 'Histórico' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <FiShield className="text-primary-600" size={24} />
          <span className="text-lg font-bold text-gray-900">SafetyVision AI</span>
        </div>
        <nav className="space-y-1 p-4">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              {l.icon}{l.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
          <div className="mb-2 text-xs text-gray-500">{user?.nome}</div>
          <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <FiLogOut /> Sair
          </button>
        </div>
      </aside>
      <main className="ml-64 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
