import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiPlus, FiClock, FiLogOut, FiShield, FiMenu, FiX, FiAlertTriangle, FiSettings, FiUser, FiBriefcase } from 'react-icons/fi';

export default function TecnicoLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = [
    { to: '/tecnico', icon: <FiHome size={20} />, label: 'Dashboard', end: true },
    { to: '/tecnico/nova-inspecao', icon: <FiPlus size={20} />, label: 'Nova Inspeção' },
    { to: '/tecnico/empresas', icon: <FiBriefcase size={20} />, label: 'Empresas' },
    { to: '/tecnico/colaboradores', icon: <FiUser size={20} />, label: 'Colaboradores' },
    { to: '/tecnico/historico', icon: <FiClock size={20} />, label: 'Histórico' },
  ];

  const Sidebar = () => (
    <aside className="flex h-full w-72 flex-col border-r border-navy-100 bg-white">
      <div className="flex h-20 items-center justify-between border-b border-navy-100 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900">
            <FiShield className="text-amber-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-navy-900">SafetyVision</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">Painel Técnico</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-navy-400 lg:hidden hover:bg-navy-100">
          <FiX size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-navy-300">Inspeções</p>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setSidebarOpen(false)}
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
        <NavLink
          to="/tecnico/nrs"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              isActive ? 'bg-navy-900 text-amber-400 shadow-lg shadow-navy-900/20' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700'
            }`
          }
        >
          <FiAlertTriangle size={20} />
          <span>NRs Atualizadas</span>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">16</span>
        </NavLink>
        <NavLink
          to="/tecnico/configuracoes"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              isActive ? 'bg-navy-900 text-amber-400 shadow-lg shadow-navy-900/20' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700'
            }`
          }
        >
          <FiSettings size={20} />
          <span>Configurações</span>
        </NavLink>
      </nav>

      <div className="border-t border-navy-100 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-navy-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-amber-400">
            {user?.nome?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">{user?.nome}</p>
            <p className="truncate text-xs text-navy-400">Técnico SST</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/tecnico/login'); }}
            className="shrink-0 rounded-lg p-2 text-navy-400 transition-colors hover:bg-navy-100 hover:text-danger-600"
            title="Sair"
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-navy-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex">
        <Sidebar />
      </div>

      <div className="flex-1 lg:ml-72">
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-navy-100 bg-white px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-navy-600 hover:bg-navy-100">
            <FiMenu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900">
              <FiShield className="text-amber-400" size={14} />
            </div>
            <span className="text-sm font-bold text-navy-900">SafetyVision</span>
          </div>
        </div>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
