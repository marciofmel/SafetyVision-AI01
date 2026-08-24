import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiBriefcase, FiUsers, FiShield, FiClock, FiSettings, FiLogOut, FiAlertTriangle, FiMenu, FiX, FiChevronDown, FiUser } from 'react-icons/fi';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const links = [
    { to: '/admin', icon: <FiHome size={20} />, label: 'Dashboard', end: true },
    { to: '/admin/empresas', icon: <FiBriefcase size={20} />, label: 'Empresas' },
    { to: '/admin/setores', icon: <FiBriefcase size={20} />, label: 'Setores' },
    { to: '/admin/colaboradores', icon: <FiUsers size={20} />, label: 'Colaboradores' },
    { to: '/admin/usuarios', icon: <FiUsers size={20} />, label: 'Usuários' },
    { to: '/admin/inspecoes', icon: <FiClock size={20} />, label: 'Todas Inspeções' },
  ];

  const Sidebar = () => (
    <aside className="flex h-full w-72 flex-col border-r border-navy-100 bg-white">
      <div className="flex h-20 items-center justify-between border-b border-navy-100 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500">
            <FiShield className="text-navy-900" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-navy-900">Admin</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-600">Painel Administrativo</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-navy-400 lg:hidden hover:bg-navy-100">
          <FiX size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-navy-300">Administração</p>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-navy-900 shadow-lg shadow-amber-500/20'
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
          to="/admin/nrs"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              isActive ? 'bg-amber-500 text-navy-900 shadow-lg shadow-amber-500/20' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700'
            }`
          }
        >
          <FiAlertTriangle size={20} />
          <span>NRs Atualizadas</span>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">16</span>
        </NavLink>
        <NavLink
          to="/admin/configuracoes"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              isActive ? 'bg-amber-500 text-navy-900 shadow-lg shadow-amber-500/20' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-700'
            }`
          }
        >
          <FiSettings size={20} />
          <span>Configurações</span>
        </NavLink>
      </nav>

      <div className="border-t border-navy-100 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-navy-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-navy-900 overflow-hidden">
            {user?.foto ? <img src={user.foto} alt={user.nome} className="h-full w-full object-cover" /> : user?.nome?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">{user?.nome}</p>
            <p className="truncate text-xs text-navy-400">Administrador</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/admin/login'); }}
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
    <div className="flex h-screen overflow-hidden bg-navy-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex">
        <Sidebar />
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden lg:ml-72">
        {/* Header mobile */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-navy-100 bg-white px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-navy-600 hover:bg-navy-100">
            <FiMenu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <FiShield className="text-navy-900" size={14} />
            </div>
            <span className="text-sm font-bold text-navy-900">Admin</span>
          </div>
          {/* Avatar mobile */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-1 rounded-lg p-1 hover:bg-navy-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-navy-900 overflow-hidden">
                {user?.foto ? <img src={user.foto} alt="" className="h-full w-full object-cover" /> : user?.nome?.charAt(0)?.toUpperCase()}
              </div>
              <FiChevronDown size={14} className={`text-navy-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-navy-100 bg-white py-2 shadow-xl z-50">
                <div className="px-4 py-2 border-b border-navy-100">
                  <p className="text-sm font-bold text-navy-900 truncate">{user?.nome}</p>
                  <p className="text-xs text-navy-400 truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setMenuOpen(false); navigate('/admin/configuracoes'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-navy-600 hover:bg-navy-50">
                  <FiUser size={16} /> Editar Perfil
                </button>
                <button onClick={() => { setMenuOpen(false); logout(); navigate('/admin/login'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50">
                  <FiLogOut size={16} /> Sair
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Header desktop */}
        <div className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-navy-100 bg-white px-8 lg:flex">
          <div />
          <div className="relative z-50" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-3 rounded-xl p-2 hover:bg-navy-50 transition-colors cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-navy-900 overflow-hidden">
                {user?.foto ? <img src={user.foto} alt="" className="h-full w-full object-cover" /> : user?.nome?.charAt(0)?.toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-navy-900">{user?.nome}</p>
                <p className="text-[10px] text-navy-400">Administrador</p>
              </div>
              <FiChevronDown size={14} className={`text-navy-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-navy-100 bg-white py-2 shadow-xl z-[100]">
                <div className="px-4 py-3 border-b border-navy-100">
                  <p className="text-sm font-bold text-navy-900">{user?.nome}</p>
                  <p className="text-xs text-navy-400">{user?.email}</p>
                </div>
                <button onClick={() => { setMenuOpen(false); navigate('/admin/configuracoes'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-navy-600 hover:bg-navy-50 transition-colors cursor-pointer">
                  <FiUser size={16} /> Editar Perfil
                </button>
                <div className="my-1 border-t border-navy-100" />
                <button onClick={() => { setMenuOpen(false); logout(); navigate('/admin/login'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer">
                  <FiLogOut size={16} /> Sair
                </button>
              </div>
            )}
          </div>
        </div>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
