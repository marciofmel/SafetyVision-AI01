import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDownload, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import api from '../api';

export default function Relatorio() {
  const { id } = useParams();
  const [inspecao, setInspecao] = useState<any>(null);

  useEffect(() => {
    api.get(`/inspecoes/${id}`).then(({ data }) => setInspecao(data));
  }, [id]);

  if (!inspecao) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>;

  const downloadPDF = () => {
    window.open(`/api/relatorio/${id}/relatorio`, '_blank');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"><FiArrowLeft /> Voltar ao Dashboard</Link>
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-500"><FiCheckCircle size={32} /></div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Relatório Pronto!</h1>
        <p className="mb-6 text-gray-500">Sua inspeção foi analisada e o relatório PDF está pronto para download.</p>
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Empresa</p><p className="font-semibold">{inspecao.empresa?.nome}</p></div>
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Setor</p><p className="font-semibold">{inspecao.setor?.nome}</p></div>
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Nota</p><p className="font-semibold">{inspecao.notaConformidade ?? '---'}/100</p></div>
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Riscos</p><p className="font-semibold">{inspecao.riscos?.length || 0}</p></div>
        </div>
        <button onClick={downloadPDF} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700">
          <FiDownload /> Baixar Relatório PDF
        </button>
      </div>
    </div>
  );
}
