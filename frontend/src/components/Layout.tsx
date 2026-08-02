import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiPlus, FiClock, FiLogOut, FiShield, FiAlertTriangle, FiSettings } from 'react-icons/fi';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', icon: <FiHome size={20} />, label: 'Dashboard' },
    { to: '/nova-inspecao', icon: <FiPlus size={20} />, label: 'Nova Inspeção' },
    { to: '/historico', icon: <FiClock size={20} />, label: 'Histórico' },
  ];

  return (
    <div className="flex min-h-screen bg-navy-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-navy-100 bg-white">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-navy-100 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900">
            <FiShield className="text-amber-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-navy-900">SafetyVision</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">Inteligência Artificial</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-navy-300">Menu</p>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-navy-900 text-amber-400 shadow-lg shadow-navy-900/20'
                    : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700'
                }`
              }
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}

          <p className="mb-3 mt-6 px-3 text-[10px] font-bold uppercase tracking-widest text-navy-300">Sistema</p>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-navy-400">
            <FiAlertTriangle size={20} />
            <span>NRs Atualizadas</span>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">16</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-navy-400">
            <FiSettings size={20} />
            <span>Configurações</span>
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-navy-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-navy-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-amber-400">
              {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-navy-900">{user?.nome}</p>
              <p className="truncate text-xs text-navy-400">{user?.email}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-navy-100 hover:text-danger-600"
              title="Sair"
            >
              <FiLogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-72 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
