import { useEffect, useState } from 'react';
import { FiUsers, FiBriefcase, FiFileText, FiShield, FiAlertTriangle, FiCheckCircle, FiBarChart2 } from 'react-icons/fi';
import api from '../../api';

interface DashboardData {
  totalUsuarios: number; usuariosAtivos: number; totalEmpresas: number;
  totalInspecoes: number; inspecoesConcluidas: number; totalRiscos: number;
  riscosAbertos: number; totalLaudos: number; laudosAprovados: number;
  totalPGR: number; totalCronogramas: number; totalEPIs: number;
  totalTreinamentos: number; totalIncidentes: number; incidentesGraves: number;
  conformidadeGeral: number; usuariosPorCargo: any[];
  planosStats: any[]; topEmpresas: any[];
}

export default function DashboardAdminGlobal() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/dashboard-admin'); setData(data); } catch {}
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;
  if (!data) return <div className="card p-12 text-center"><p className="text-navy-500">Erro ao carregar dados</p></div>;

  const stats = [
    { label: 'Usuários', value: data.totalUsuarios, icon: <FiUsers size={20} />, color: 'bg-navy-900 text-white' },
    { label: 'Empresas', value: data.totalEmpresas, icon: <FiBriefcase size={20} />, color: 'bg-amber-500 text-navy-900' },
    { label: 'Inspeções', value: data.totalInspecoes, icon: <FiFileText size={20} />, color: 'bg-navy-800 text-amber-400' },
    { label: 'Riscos', value: data.totalRiscos, icon: <FiAlertTriangle size={20} />, color: 'bg-danger-500 text-white' },
    { label: 'Laudos', value: data.totalLaudos, icon: <FiFileText size={20} />, color: 'bg-success-500 text-white' },
    { label: 'Conformidade', value: `${data.conformidadeGeral}%`, icon: <FiBarChart2 size={20} />, color: 'bg-navy-700 text-amber-400' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Dashboard Admin Global</h1>
        <p className="mt-1 text-sm text-navy-500">Visão geral de toda a plataforma</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <div key={i} className={`rounded-2xl p-4 ${s.color}`}>
            <div className="flex items-center gap-2 mb-2 opacity-70">{s.icon}</div>
            <p className="text-2xl font-extrabold">{s.value}</p>
            <p className="text-xs opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usuários por Cargo */}
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-bold text-navy-900">Usuários por Cargo</h3>
          <div className="space-y-3">
            {data.usuariosPorCargo.map((uc: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-navy-600">{uc.cargo || 'Sem cargo'}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-navy-100">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(uc._count / data.totalUsuarios) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-navy-900">{uc._count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planos */}
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-bold text-navy-900">Assinaturas por Status</h3>
          <div className="space-y-3">
            {data.planosStats.map((ps: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ps.status === 'ativo' ? 'bg-success-100 text-success-700' : 'bg-navy-100 text-navy-500'}`}>{ps.status}</span>
                <span className="text-sm font-bold text-navy-900">{ps._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Empresas */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="mb-4 text-lg font-bold text-navy-900">Top Empresas por Inspeções</h3>
          <div className="w-full">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy-100">
                <th className="px-3 py-2 text-left font-semibold text-navy-600">Empresa</th>
                <th className="px-3 py-2 text-center font-semibold text-navy-600">Inspeções</th>
                <th className="px-3 py-2 text-center font-semibold text-navy-600">Colaboradores</th>
                <th className="px-3 py-2 text-center font-semibold text-navy-600">Setores</th>
              </tr></thead>
              <tbody>
                {data.topEmpresas.map((e: any) => (
                  <tr key={e.id} className="border-b border-navy-50">
                    <td className="break-words px-3 py-2 font-medium text-navy-900">{e.nome}</td>
                    <td className="px-3 py-2 text-center">{e._count.inspecoes}</td>
                    <td className="px-3 py-2 text-center">{e._count.colaboradores}</td>
                    <td className="px-3 py-2 text-center">{e._count.setores}</td>
                  </tr>
                ))}
                {data.topEmpresas.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-navy-400">Nenhuma empresa</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
