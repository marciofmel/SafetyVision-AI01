import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiDownload } from 'react-icons/fi';
import api from '../api';

export default function Historico() {
  const [inspecoes, setInspecoes] = useState<any[]>([]);

  useEffect(() => {
    api.get('/inspecoes').then(({ data }) => setInspecoes(data));
  }, []);

  const statusBadge: Record<string, string> = {
    em_andamento: 'bg-yellow-100 text-yellow-700',
    analisada: 'bg-blue-100 text-blue-700',
    concluida: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Histórico de Inspeções</h1>
      {inspecoes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">Nenhuma inspeção encontrada</p>
          <Link to="/nova-inspecao" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline">Criar primeira inspeção</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inspecoes.map((insp) => (
            <div key={insp.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div>
                <p className="font-semibold text-gray-900">{insp.empresa?.nome} — {insp.setor?.nome}</p>
                <p className="text-sm text-gray-500">
                  {new Date(insp.createdAt).toLocaleDateString('pt-BR')} | {insp._count?.riscos || 0} riscos | {insp._count?.midias || 0} mídias
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[insp.status] || 'bg-gray-100 text-gray-700'}`}>
                  {insp.status === 'em_andamento' ? 'Em andamento' : insp.status === 'analisada' ? 'Analisada' : 'Concluída'}
                </span>
                {insp.notaConformidade !== null && <span className="text-sm font-bold text-primary-600">{insp.notaConformidade}/100</span>}
                {insp.status !== 'em_andamento' && (
                  <>
                    <Link to={`/analise/${insp.id}`} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"><FiEye size={16} /></Link>
                    <a href={`/api/relatorio/${insp.id}/relatorio`} target="_blank" className="rounded-lg bg-primary-100 p-2 text-primary-600 hover:bg-primary-200"><FiDownload size={16} /></a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
