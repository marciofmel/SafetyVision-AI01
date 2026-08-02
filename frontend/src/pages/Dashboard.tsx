import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiShield, FiAlertTriangle, FiCheckCircle, FiClock, FiTrendingUp, FiCamera, FiArrowRight } from 'react-icons/fi';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, concluidas: 0, emAndamento: 0, riscos: 0, midias: 0 });
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    api.get('/inspecoes').then(({ data }) => {
      setStats({
        total: data.length,
        concluidas: data.filter((i: any) => i.status === 'concluida' || i.status === 'analisada').length,
        emAndamento: data.filter((i: any) => i.status === 'em_andamento').length,
        riscos: data.reduce((acc: number, i: any) => acc + (i._count?.riscos || 0), 0),
        midias: data.reduce((acc: number, i: any) => acc + (i._count?.midias || 0), 0),
      });
      setRecentes(data.slice(0, 5));
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Inspeções', value: stats.total, icon: <FiShield />, color: 'bg-navy-900', textColor: 'text-amber-400', change: '+12%' },
    { label: 'Concluídas', value: stats.concluidas, icon: <FiCheckCircle />, color: 'bg-success-600', textColor: 'text-white', change: '+8%' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: <FiClock />, color: 'bg-amber-500', textColor: 'text-navy-900', change: '0' },
    { label: 'Riscos Encontrados', value: stats.riscos, icon: <FiAlertTriangle />, color: 'bg-danger-600', textColor: 'text-white', change: stats.riscos > 0 ? 'Atenção' : 'OK' },
  ];

  const steps = [
    { num: 1, title: 'Selecionar Empresa', desc: 'Escolha a empresa para inspeção', icon: <FiShield size={20} /> },
    { num: 2, title: 'Escolher Setor', desc: 'Selecione o setor a ser inspecionado', icon: <FiAlertTriangle size={20} /> },
    { num: 3, title: 'Capturar Fotos', desc: 'Tire fotos do local com a câmera', icon: <FiCamera size={20} /> },
    { num: 4, title: 'Análise IA', desc: 'Inteligência artificial analisa riscos', icon: <FiTrendingUp size={20} /> },
    { num: 5, title: 'Gerar Relatório', desc: 'PDF completo com todas as findings', icon: <FiCheckCircle size={20} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Dashboard</h1>
          <p className="mt-1 text-sm text-navy-500">Visão geral das inspeções de segurança do trabalho</p>
        </div>
        <Link to="/nova-inspecao" className="btn-primary">
          <FiPlus size={18} />
          Nova Inspeção
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card overflow-hidden">
            <div className={`${c.color} p-5`}>
              <div className="flex items-center justify-between">
                <div className={`${c.textColor} opacity-80`}>{c.icon}</div>
                <span className={`text-xs font-bold ${c.textColor} opacity-80`}>{c.change}</span>
              </div>
              <p className={`mt-3 text-3xl font-extrabold ${c.textColor}`}>{c.value}</p>
              <p className={`mt-1 text-sm ${c.textColor} opacity-80`}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="card mb-8 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">Como funciona</h2>
          <Link to="/nova-inspecao" className="flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700">
            Começar agora <FiArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <div key={i} className="group relative">
              <div className="flex items-start gap-4 rounded-xl border-2 border-navy-100 p-4 transition-all hover:border-amber-400 hover:bg-amber-50/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-amber-400 transition-all group-hover:bg-amber-500 group-hover:text-navy-900">
                  {s.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-600">PASSO {s.num}</p>
                  <p className="text-sm font-semibold text-navy-900">{s.title}</p>
                  <p className="mt-1 text-xs text-navy-400">{s.desc}</p>
                </div>
              </div>
              {i < 4 && (
                <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-navy-200 md:block">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent */}
      {recentes.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-navy-900">Inspeções Recentes</h2>
          <div className="space-y-3">
            {recentes.map((insp: any) => (
              <div key={insp.id} className="flex items-center justify-between rounded-xl border border-navy-100 p-4 transition-all hover:border-amber-200 hover:bg-amber-50/30">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
                    <FiShield size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{insp.empresa?.nome} — {insp.setor?.nome}</p>
                    <p className="text-xs text-navy-400">
                      {new Date(insp.createdAt).toLocaleDateString('pt-BR')} · {insp._count?.riscos || 0} riscos · {insp._count?.midias || 0} mídias
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    insp.status === 'concluida' ? 'bg-success-100 text-success-700' :
                    insp.status === 'analisada' ? 'bg-navy-100 text-navy-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {insp.status === 'em_andamento' ? 'Em andamento' : insp.status === 'analisada' ? 'Analisada' : 'Concluída'}
                  </span>
                  {insp.notaConformidade !== null && (
                    <span className="text-sm font-bold text-navy-900">{insp.notaConformidade}/100</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
