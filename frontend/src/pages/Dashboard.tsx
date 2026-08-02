import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiShield, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, concluidas: 0, emAndamento: 0, riscos: 0 });

  useEffect(() => {
    api.get('/inspecoes').then(({ data }) => {
      setStats({
        total: data.length,
        concluidas: data.filter((i: any) => i.status === 'concluida' || i.status === 'analisada').length,
        emAndamento: data.filter((i: any) => i.status === 'em_andamento').length,
        riscos: data.reduce((acc: number, i: any) => acc + (i._count?.riscos || 0), 0),
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Inspeções', value: stats.total, icon: <FiShield />, color: 'bg-primary-500' },
    { label: 'Concluídas', value: stats.concluidas, icon: <FiCheckCircle />, color: 'bg-success-500' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: <FiClock />, color: 'bg-warning-500' },
    { label: 'Riscos Encontrados', value: stats.riscos, icon: <FiAlertTriangle />, color: 'bg-danger-500' },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Visão geral das inspeções de segurança</p>
        </div>
        <Link to="/nova-inspecao" className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
          <FiPlus /> Nova Inspeção
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{c.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${c.color} text-white text-xl`}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Como usar</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {['1. Selecionar empresa', '2. Escolher setor', '3. Tirar fotos', '4. Analisar com IA', '5. Gerar relatório'].map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">{i + 1}</div>
              <span className="text-sm text-gray-700">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
