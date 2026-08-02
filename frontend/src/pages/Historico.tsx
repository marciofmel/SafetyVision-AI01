import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiDownload, FiShield, FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import api from '../api';

export default function Historico() {
  const [inspecoes, setInspecoes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');

  useEffect(() => {
    api.get('/inspecoes').then(({ data }) => setInspecoes(data));
  }, []);

  const filtradas = inspecoes.filter((i) => {
    const matchTexto = !filtro || i.empresa?.nome?.toLowerCase().includes(filtro.toLowerCase()) || i.setor?.nome?.toLowerCase().includes(filtro.toLowerCase());
    const matchStatus = statusFiltro === 'todos' || i.status === statusFiltro;
    return matchTexto && matchStatus;
  });

  const statusConfig: Record<string, { label: string; color: string }> = {
    em_andamento: { label: 'Em Andamento', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    analisada: { label: 'Analisada', color: 'bg-navy-100 text-navy-700 border-navy-200' },
    concluida: { label: 'Concluída', color: 'bg-success-100 text-success-700 border-success-200' },
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">Histórico</h1>
          <p className="mt-1 text-sm text-navy-500">{inspecoes.length} inspeção(ões) realizada(s)</p>
        </div>
        <Link to="/nova-inspecao" className="btn-primary">
          <FiPlus size={18} />
          Nova Inspeção
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" size={16} />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="input-field pl-10"
              placeholder="Buscar por empresa ou setor..."
            />
          </div>
          <div className="flex items-center gap-2">
            <FiFilter size={16} className="text-navy-400" />
            {['todos', 'em_andamento', 'analisada', 'concluida'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFiltro(s)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  statusFiltro === s
                    ? 'bg-navy-900 text-amber-400'
                    : 'bg-navy-50 text-navy-500 hover:bg-navy-100'
                }`}
              >
                {s === 'todos' ? 'Todos' : statusConfig[s]?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {filtradas.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-100">
            <FiShield className="text-navy-300" size={28} />
          </div>
          <p className="text-lg font-semibold text-navy-700">Nenhuma inspeção encontrada</p>
          <p className="mt-1 text-sm text-navy-400">
            {inspecoes.length === 0 ? 'Comece criando sua primeira inspeção' : 'Tente ajustar os filtros'}
          </p>
          {inspecoes.length === 0 && (
            <Link to="/nova-inspecao" className="btn-primary mt-6">
              <FiPlus size={16} />
              Criar primeira inspeção
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((insp) => (
            <div key={insp.id} className="card flex items-center justify-between p-5 transition-all hover:border-amber-200 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
                  <FiShield size={20} />
                </div>
                <div>
                  <p className="font-bold text-navy-900">{insp.empresa?.nome}</p>
                  <p className="text-sm text-navy-500">{insp.setor?.nome}</p>
                  <p className="mt-1 text-xs text-navy-400">
                    {new Date(insp.createdAt).toLocaleDateString('pt-BR')} às {new Date(insp.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-navy-400">{insp._count?.midias || 0} mídias · {insp._count?.riscos || 0} riscos</p>
                  {insp.notaConformidade !== null && (
                    <p className={`mt-1 text-lg font-extrabold ${
                      insp.notaConformidade >= 70 ? 'text-success-600' :
                      insp.notaConformidade >= 40 ? 'text-amber-600' : 'text-danger-600'
                    }`}>
                      {insp.notaConformidade}<span className="text-sm font-normal text-navy-400">/100</span>
                    </p>
                  )}
                </div>

                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusConfig[insp.status]?.color || 'bg-navy-100 text-navy-500'}`}>
                  {statusConfig[insp.status]?.label || insp.status}
                </span>

                <div className="flex gap-2">
                  {insp.status !== 'em_andamento' && (
                    <>
                      <Link
                        to={`/analise/${insp.id}`}
                        className="rounded-lg border border-navy-200 p-2 text-navy-500 transition-all hover:border-navy-300 hover:bg-navy-50"
                        title="Ver análise"
                      >
                        <FiEye size={16} />
                      </Link>
                      <a
                        href={`/api/relatorio/${insp.id}/relatorio`}
                        target="_blank"
                        className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-600 transition-all hover:bg-amber-100"
                        title="Baixar PDF"
                      >
                        <FiDownload size={16} />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
