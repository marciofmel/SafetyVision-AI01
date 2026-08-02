import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiShield, FiCheck, FiX, FiFileText } from 'react-icons/fi';
import api from '../api';
import toast from 'react-hot-toast';

export default function AnaliseIA() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState<any>(null);
  const [inspecao, setInspecao] = useState<any>(null);

  useEffect(() => {
    const analisar = async () => {
      try {
        const { data } = await api.post(`/analise/${id}/analisar`);
        setResultado(data);
        const { data: insp } = await api.get(`/inspecoes/${id}`);
        setInspecao(insp);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Erro na análise');
      } finally {
        setLoading(false);
      }
    };
    analisar();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-lg font-semibold text-gray-700">Analisando com IA...</p>
        <p className="text-sm text-gray-500">Processando fotos e identificando riscos</p>
      </div>
    );
  }

  if (!resultado) return <div className="text-center text-gray-500">Erro na análise</div>;

  const gravidadeColor: Record<string, string> = {
    crítica: 'bg-red-100 text-red-700 border-red-200',
    alta: 'bg-orange-100 text-orange-700 border-orange-200',
    média: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    baixa: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Resultado da Análise IA</h1>
      <p className="mb-6 text-sm text-gray-500">Inspeção analisada automaticamente por inteligência artificial</p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary-600">{resultado.totalMidias}</p>
          <p className="text-xs text-gray-500">Fotos/Vídeos</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-danger-600">{resultado.riscosEncontrados}</p>
          <p className="text-xs text-gray-500">Riscos</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-warning-600">{resultado.epiViolacoes}</p>
          <p className="text-xs text-gray-500">EPIs Ausentes</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
          <p className={`text-2xl font-bold ${resultado.notaConformidade >= 70 ? 'text-success-500' : resultado.notaConformidade >= 40 ? 'text-warning-500' : 'text-danger-600'}`}>{resultado.notaConformidade}/100</p>
          <p className="text-xs text-gray-500">Nota Conformidade</p>
        </div>
      </div>

      {/* EPIs */}
      {resultado.epiViolacoesList?.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FiShield /> Análise de EPIs</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {resultado.epiViolacoesList.map((epi: any, i: number) => (
              <div key={i} className={`flex items-center justify-between rounded-lg border p-3 ${epi.status === 'ausente' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <div className="flex items-center gap-2">
                  {epi.status === 'ausente' ? <FiX className="text-red-500" /> : <FiCheck className="text-green-500" />}
                  <span className="text-sm font-medium">{epi.epiNome}</span>
                </div>
                <span className="text-xs text-gray-500">{(epi.confianca * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riscos */}
      {resultado.riscos?.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FiAlertTriangle /> Riscos Identificados</h2>
          <div className="space-y-4">
            {resultado.riscos.map((risco: any, i: number) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{risco.descricao}</h3>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${gravidadeColor[risco.gravidade] || ''}`}>{risco.gravidade.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
                  <p><strong>Categoria:</strong> {risco.categoria}</p>
                  <p><strong>Confiança:</strong> {(risco.confianca * 100).toFixed(0)}%</p>
                  <p><strong>Consequências:</strong> {risco.consequencias}</p>
                  <p><strong>NRs:</strong> {risco.nrsRelacionadas}</p>
                  <p><strong>Prevenção:</strong> {risco.medidasPreventivas}</p>
                  <p><strong>Correção:</strong> {risco.medidasCorretivas}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => navigate(`/relatorio/${id}`)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700">
        <FiFileText /> Gerar Relatório PDF
      </button>
    </div>
  );
}
