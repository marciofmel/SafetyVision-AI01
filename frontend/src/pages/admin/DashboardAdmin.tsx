import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiAlertTriangle, FiCheckCircle, FiClock, FiBriefcase, FiUsers, FiTrendingUp } from 'react-icons/fi';
import api from '../../api';

export default function DashboardAdmin() {
  const [stats, setStats] = useState({ empresas: 0, usuarios: 0, inspecoes: 0, riscos: 0, concluidas: 0, emAndamento: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/empresas').catch(() => ({ data: [] })),
      api.get('/inspecoes').catch(() => ({ data: [] })),
    ]).then(([empRes, inspRes]) => {
      const inspecoes = inspRes.data;
      setStats({
        empresas: empRes.data.length,
        usuarios: 0,
        inspecoes: inspecoes.length,
        riscos: inspecoes.reduce((acc: number, i: any) => acc + (i._count?.riscos || 0), 0),
        concluidas: inspecoes.filter((i: any) => i.status === 'concluida' || i.status === 'analisada').length,
        emAndamento: inspecoes.filter((i: any) => i.status === 'em_andamento').length,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Empresas', value: stats.empresas, icon: <FiBriefcase />, color: 'bg-navy-900', textColor: 'text-amber-400' },
    { label: 'Total Inspeções', value: stats.inspecoes, icon: <FiShield />, color: 'bg-amber-500', textColor: 'text-navy-900' },
    { label: 'Concluídas', value: stats.concluidas, icon: <FiCheckCircle />, color: 'bg-success-600', textColor: 'text-white' },
    { label: 'Riscos Encontrados', value: stats.riscos, icon: <FiAlertTriangle />, color: 'bg-danger-600', textColor: 'text-white' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-navy-500">Visão geral do sistema SafetyVision AI</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card overflow-hidden">
            <div className={`${c.color} p-5`}>
              <div className={`${c.textColor} opacity-80`}>{c.icon}</div>
              <p className={`mt-3 text-3xl font-extrabold ${c.textColor}`}>{c.value}</p>
              <p className={`mt-1 text-sm ${c.textColor} opacity-80`}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-900">Acesso Rápido</h2>
          <div className="space-y-3">
            {[
              { to: '/admin/empresas', label: 'Gerenciar Empresas', icon: <FiBriefcase size={18} />, desc: 'Adicionar, editar e remover empresas' },
              { to: '/admin/setores', label: 'Gerenciar Setores', icon: <FiBriefcase size={18} />, desc: 'Organizar setores por empresa' },
              { to: '/admin/colaboradores', label: 'Gerenciar Colaboradores', icon: <FiUsers size={18} />, desc: 'Cadastrar colaboradores' },
              { to: '/admin/inspecoes', label: 'Todas Inspeções', icon: <FiClock size={18} />, desc: 'Visualizar inspeções de todos os técnicos' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-4 rounded-xl border border-navy-100 p-4 transition-all hover:border-amber-300 hover:bg-amber-50/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{item.label}</p>
                  <p className="text-xs text-navy-400">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-900">Status do Sistema</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-navy-100 p-4">
              <div className="flex items-center gap-3">
                <FiCheckCircle size={20} className="text-success-600" />
                <span className="text-sm font-medium text-navy-900">Backend API</span>
              </div>
              <span className="rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-700">Online</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-navy-100 p-4">
              <div className="flex items-center gap-3">
                <FiTrendingUp size={20} className="text-amber-600" />
                <span className="text-sm font-medium text-navy-900">Análise IA</span>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Simulada</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-navy-100 p-4">
              <div className="flex items-center gap-3">
                <FiShield size={20} className="text-navy-400" />
                <span className="text-sm font-medium text-navy-900">NRs Atualizadas</span>
              </div>
              <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-bold text-navy-700">16</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
