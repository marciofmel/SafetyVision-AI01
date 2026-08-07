import { useEffect, useState } from 'react';
import { FiBarChart2, FiAlertTriangle, FiCheckCircle, FiShield, FiBriefcase, FiUsers } from 'react-icons/fi';
import api from '../../api';

interface ConformidadeEmpresa {
  empresaId: string; empresaNome: string; geral: number;
  conformidadeNR: number; resolucaoRiscos: number; conformidadeEPI: number;
  totalInspecoes: number; inspecoesConformes: number;
  totalRiscos: number; riscosFechados: number;
  totalSetores: number; totalColaboradores: number;
  totalEpis: number; episAtivos: number;
  totalIncidentes: number; incidentesGraves: number;
  totalTreinamentos: number;
}

function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central"
          className="text-2xl font-extrabold" fill="#0f172a">{value}%</text>
      </svg>
      <p className="mt-1 text-xs font-semibold text-navy-500">{label}</p>
    </div>
  );
}

export default function ConformidadeTecnico() {
  const [dados, setDados] = useState<ConformidadeEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const { data } = await api.get('/conformidade'); setDados(data); } catch {}
    finally { setLoading(false); }
  };

  const getCor = (v: number) => v >= 80 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444';
  const geralMedia = dados.length > 0 ? Math.round(dados.reduce((a, b) => a + b.geral, 0) / dados.length) : 0;

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Painel de Conformidade</h1>
        <p className="mt-1 text-sm text-navy-500">{dados.length} empresa(s) monitorada(s)</p>
      </div>

      {/* Geral */}
      <div className="card mb-6 p-6 bg-gradient-to-r from-navy-900 to-navy-800">
        <div className="flex items-center gap-6">
          <Gauge value={geralMedia} label="Conformidade Geral" color="#f59e0b" />
          <div className="grid grid-cols-3 gap-6 flex-1">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">{dados.reduce((a, b) => a + b.totalInspecoes, 0)}</p>
              <p className="text-xs text-amber-300">Inspeções</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">{dados.reduce((a, b) => a + b.totalRiscos, 0)}</p>
              <p className="text-xs text-amber-300">Riscos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white">{dados.reduce((a, b) => a + b.totalIncidentes, 0)}</p>
              <p className="text-xs text-amber-300">Incidentes</p>
            </div>
          </div>
        </div>
      </div>

      {dados.length === 0 ? (
        <div className="card p-12 text-center">
          <FiBarChart2 className="mx-auto mb-4 text-navy-300" size={40} />
          <p className="text-lg font-bold text-navy-900">Nenhuma empresa cadastrada</p>
          <p className="text-sm text-navy-400">Cadastre empresas para acompanhar a conformidade</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dados.map(d => (
            <div key={d.empresaId} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-navy-900"><FiBriefcase size={18} /></div>
                  <div>
                    <h3 className="font-bold text-white">{d.empresaNome}</h3>
                    <p className="text-xs text-amber-300">{d.totalSetores} setores · {d.totalColaboradores} colaboradores</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.incidentesGraves > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-danger-500 px-3 py-1 text-xs font-bold text-white">
                      <FiAlertTriangle size={12} /> {d.incidentesGraves} grave(s)
                    </span>
                  )}
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: getCor(d.geral), color: d.geral >= 50 ? '#0f172a' : '#fff' }}>
                    {d.geral}%
                  </span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-navy-50 p-3 text-center">
                  <Gauge value={d.conformidadeNR} label="NR/Inspeções" color={getCor(d.conformidadeNR)} />
                  <p className="mt-1 text-[10px] text-navy-400">{d.inspecoesConformes}/{d.totalInspecoes} conformes</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-3 text-center">
                  <Gauge value={d.resolucaoRiscos} label="Riscos Resolvidos" color={getCor(d.resolucaoRiscos)} />
                  <p className="mt-1 text-[10px] text-navy-400">{d.riscosFechados}/{d.totalRiscos} resolvidos</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-3 text-center">
                  <Gauge value={d.conformidadeEPI} label="EPIs Ativos" color={getCor(d.conformidadeEPI)} />
                  <p className="mt-1 text-[10px] text-navy-400">{d.episAtivos}/{d.totalEpis} ativos</p>
                </div>
                <div className="rounded-xl bg-navy-50 p-3 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-navy-600"><FiShield size={14} /> <strong>{d.totalTreinamentos}</strong> treinamentos</div>
                  <div className="flex items-center gap-2 text-sm text-navy-600"><FiUsers size={14} /> <strong>{d.totalColaboradores}</strong> colaboradores</div>
                  <div className="flex items-center gap-2 text-sm text-danger-600"><FiAlertTriangle size={14} /> <strong>{d.totalIncidentes}</strong> incidentes</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
