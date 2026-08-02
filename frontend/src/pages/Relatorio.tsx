import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDownload, FiArrowLeft, FiCheckCircle, FiShield, FiAlertTriangle } from 'react-icons/fi';
import api from '../api';

export default function Relatorio() {
  const { id } = useParams();
  const [inspecao, setInspecao] = useState<any>(null);

  useEffect(() => {
    api.get(`/inspecoes/${id}`).then(({ data }) => setInspecao(data));
  }, [id]);

  if (!inspecao) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-amber-500" />
      </div>
    );
  }

  const downloadPDF = () => {
    window.open(`/api/relatorio/${id}/relatorio`, '_blank');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/tecnico" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-navy-500 hover:text-navy-700">
        <FiArrowLeft size={14} /> Voltar ao Dashboard
      </Link>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20">
            <FiCheckCircle className="text-amber-400" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Relatório Pronto!</h1>
          <p className="mt-2 text-navy-300">Sua inspeção foi analisada com sucesso</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-6 grid grid-cols-2 gap-4">
            {[
              { label: 'Empresa', value: inspecao.empresa?.nome },
              { label: 'Setor', value: inspecao.setor?.nome },
              { label: 'Nota', value: `${inspecao.notaConformidade ?? '---'}/100` },
              { label: 'Riscos', value: `${inspecao.riscos?.length || 0} encontrados` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-navy-50 p-4">
                <p className="text-xs font-bold text-navy-400">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border-2 border-navy-100 p-4 text-center">
              <FiShield className="mx-auto mb-2 text-navy-400" size={24} />
              <p className="text-2xl font-extrabold text-navy-900">{inspecao.epiViolacoes?.filter((e: any) => e.status === 'ausente').length || 0}</p>
              <p className="text-xs text-navy-400">EPIs Ausentes</p>
            </div>
            <div className="rounded-xl border-2 border-navy-100 p-4 text-center">
              <FiAlertTriangle className="mx-auto mb-2 text-danger-500" size={24} />
              <p className="text-2xl font-extrabold text-navy-900">{inspecao.riscos?.length || 0}</p>
              <p className="text-xs text-navy-400">Riscos Encontrados</p>
            </div>
            <div className="rounded-xl border-2 border-navy-100 p-4 text-center">
              <FiCheckCircle className="mx-auto mb-2 text-success-500" size={24} />
              <p className="text-2xl font-extrabold text-navy-900">{inspecao.midias?.length || 0}</p>
              <p className="text-xs text-navy-400">Fotos Analisadas</p>
            </div>
          </div>

          <button onClick={downloadPDF} className="btn-primary w-full py-4 text-base">
            <FiDownload size={18} />
            Baixar Relatório PDF
          </button>
        </div>
      </div>
    </div>
  );
}
