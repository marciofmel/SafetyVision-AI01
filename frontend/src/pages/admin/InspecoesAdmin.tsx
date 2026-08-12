import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiClock, FiShield, FiAlertTriangle } from 'react-icons/fi';
import api from '../../api';

interface Inspecao { id: string; status: string; empresa?: { nome: string }; setor?: { nome: string }; usuario?: { nome: string }; createdAt: string; notaConformidade: number | null; _count?: { riscos: number; midias: number }; }

export default function InspecoesAdmin() {
  const [inspecoes, setInspecoes] = useState<Inspecao[]>([]);
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => { api.get('/admin-data/inspecoes').then(({ data }) => setInspecoes(data)).catch(() => {}); }, []);

  const filtradas = inspecoes.filter((i) => filtro === 'todas' || i.status === filtro);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      concluida: 'bg-success-100 text-success-700',
      analisada: 'bg-navy-100 text-navy-700',
      em_andamento: 'bg-amber-100 text-amber-700',
    };
    const label: Record<string, string> = { concluida: 'Concluída', analisada: 'Analisada', em_andamento: 'Em andamento' };
    return <span className={`rounded-full px-3 py-1 text-xs font-bold ${map[s] || 'bg-navy-100 text-navy-700'}`}>{label[s] || s}</span>;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900">Todas Inspeções</h1>
        <p className="mt-1 text-sm text-navy-500">{inspecoes.length} inspeções no sistema</p>
      </div>

      <div className="mb-6 flex gap-2">
        {[
          { value: 'todas', label: 'Todas' },
          { value: 'em_andamento', label: 'Em andamento' },
          { value: 'analisada', label: 'Analisadas' },
          { value: 'concluida', label: 'Concluídas' },
        ].map((f) => (
          <button key={f.value} onClick={() => setFiltro(f.value)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${filtro === f.value ? 'bg-navy-900 text-amber-400' : 'bg-navy-100 text-navy-600 hover:bg-navy-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="card p-12 text-center"><p className="text-sm text-navy-500">Nenhuma inspeção encontrada</p></div>
        ) : (
          filtradas.map((i) => (
            <div key={i.id} className="card flex items-center justify-between p-4 transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
                  <FiShield size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{i.empresa?.nome} — {i.setor?.nome}</p>
                  <p className="text-xs text-navy-400">
                    Técnico: {i.usuario?.nome} · {new Date(i.createdAt).toLocaleDateString('pt-BR')}
                    {i._count?.riscos ? ` · ${i._count.riscos} riscos` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(i.status)}
                {i.notaConformidade !== null && (
                  <span className="text-sm font-bold text-navy-900">{i.notaConformidade}/100</span>
                )}
                <Link to={`/admin/inspecoes/${i.id}`} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-700">
                  <FiEye size={16} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
